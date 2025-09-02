"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

type Court = {
  id: string;
  name: string;
  sport: string;
  address: string;
  city: string;
  description: string | null;
  image_url: string | null;
};

type DaySlot = {
  hour: number;                         // 7..23
  available: boolean;
  price_per_hour: number | null;
  effective_price_per_hour: number | null;
  active_offer: {
    id: string;
    title: string | null;
    discount_pct: number | null;
    starts_at: string;
    ends_at: string;
    valid_hour_start: number | null;
    valid_hour_end: number | null;
    price: number | null;
    original_price: number | null;
  } | null;
};

function todayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
}
function in14DaysISO() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
}

export default function CourtBookingModal({
  court,
  initialDate,
  initialHour,
  onClose,
}: {
  court: Court;
  initialDate?: string; // YYYY-MM-DD
  initialHour?: string; // "7".."23"
  onClose: (changed?: boolean) => void; // changed = true ako je booking uspio
}) {
  const [date, setDate] = useState<string>(initialDate || "");
  const [hour, setHour] = useState<string>(initialHour || "");
  const [duration, setDuration] = useState<string>("1");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // status termina za ovaj court
  const [slotStatus, setSlotStatus] =
    useState<"unknown" | "loading" | "available" | "conflicting">("unknown");

  // pricing state (za odabran sat)
  const [basePerHour, setBasePerHour] = useState<number | null>(null);
  const [effPerHour, setEffPerHour] = useState<number | null>(null);
  const [discountPct, setDiscountPct] = useState<number | null>(null);

  // Day view
  const [dayLoading, setDayLoading] = useState(false);
  const [daySlots, setDaySlots] = useState<DaySlot[] | null>(null);

  const hours = useMemo(() => Array.from({ length: 17 }, (_, i) => i + 7), []);
  const minDate = todayISO();
  const maxDate = in14DaysISO();

  // Fetch day view for the court
  const loadDay = async (d: string) => {
    if (!d) {
      setDaySlots(null);
      return;
    }
    setDayLoading(true);
    try {
      const res = await fetch(`/api/courts/${court.id}/day?date=${encodeURIComponent(d)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load day view");
      setDaySlots(json.slots as DaySlot[]);
    } catch {
      setDaySlots(null);
    } finally {
      setDayLoading(false);
    }
  };

  // provjeri zauzeće & cijene za točno odabrani slot
  const checkSlot = async (d: string, h: string, dur: string) => {
    if (!d || !h) {
      setSlotStatus("unknown");
      setBasePerHour(null);
      setEffPerHour(null);
      setDiscountPct(null);
      return;
    }
    setSlotStatus("loading");
    try {
      // Prefer daySlots ako ih imamo (brže i konzistentno s gridom)
      const fromDay = daySlots?.find(s => String(s.hour) === String(h));
      if (fromDay) {
        setSlotStatus(fromDay.available ? "available" : "conflicting");
        setBasePerHour(fromDay.price_per_hour);
        setEffPerHour(fromDay.effective_price_per_hour ?? fromDay.price_per_hour);
        setDiscountPct(fromDay.active_offer?.discount_pct ?? null);
        return;
      }

      // fallback: pogodak preko search endpointa
      const qs = new URLSearchParams({
        sport: court.sport,
        date: d,
        hour: h,
        duration: dur || "1",
      });
      const res = await fetch(`/api/courts/search?${qs.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Search failed");

      const isConflict = (json.conflicting as any[]).some((c: any) => c.id === court.id);
      setSlotStatus(isConflict ? "conflicting" : "available");

      const mine =
        (json.available as any[]).find((c: any) => c.id === court.id) ??
        (json.conflicting as any[]).find((c: any) => c.id === court.id) ??
        null;

      if (mine) {
        const base = Number(mine.price_per_hour ?? NaN);
        const eff = Number(mine.effective_price_per_hour ?? NaN);
        setBasePerHour(Number.isFinite(base) ? base : null);
        setEffPerHour(Number.isFinite(eff) ? eff : Number.isFinite(base) ? base : null);
        const pct =
          mine.active_offer && mine.active_offer.discount_pct != null
            ? Number(mine.active_offer.discount_pct)
            : null;
        setDiscountPct(Number.isFinite(pct as any) ? (pct as number) : null);
      } else {
        setBasePerHour(null);
        setEffPerHour(null);
        setDiscountPct(null);
      }
    } catch {
      setSlotStatus("unknown");
      setBasePerHour(null);
      setEffPerHour(null);
      setDiscountPct(null);
    }
  };

  // auto: day view kad se promijeni datum
  useEffect(() => {
    if (date) loadDay(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  // auto: provjera za odabrani slot
  useEffect(() => {
    if (date && hour) checkSlot(date, hour, duration);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, hour, duration, daySlots]);

  const book = async () => {
    setMsg(null);
    if (!date || !hour) {
      setMsg({ type: "err", text: "Please select date and time." });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          court_id: court.id,
          date,
          hour: Number(hour),
          duration: Number(duration),
        }),
      });

      if (res.status === 401) {
        setMsg({ type: "err", text: "Please log in to book this court." });
        return;
      }
      if (res.status === 409) {
        setMsg({ type: "err", text: "This court is already booked for the selected time." });
        return;
      }

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Booking failed");

      setMsg({ type: "ok", text: "Booked ✓" });
      setTimeout(() => onClose(true), 900);
    } catch (e: any) {
      setMsg({ type: "err", text: e.message ?? "Booking error" });
    } finally {
      setLoading(false);
    }
  };

  const total = effPerHour != null ? (Number(duration) * effPerHour).toFixed(2) : null;

  return (
    <div className="fixed inset-0 z-50">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => onClose(false)}
        aria-hidden
      />
      {/* modal */}
      <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-xl">
        {/* header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="min-w-0">
            <h3 className="truncate text-xl font-semibold">Book: {court.name}</h3>
            <p className="truncate text-sm text-gray-600">
              {court.address}, {court.city} • {court.sport}
            </p>
          </div>
          <button
            onClick={() => onClose(false)}
            className="rounded-lg px-3 py-1.5 text-sm hover:bg-gray-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* body */}
        <div className="grid gap-4 p-6 md:grid-cols-3">
          {/* date */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Date</label>
            <input
              type="date"
              min={minDate}
              max={maxDate}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border p-3"
            />
            <p className="mt-1 text-[11px] text-gray-500">Max 14 days in advance</p>
          </div>

          {/* hour */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Time</label>
            <select
              value={hour}
              onChange={(e) => setHour(e.target.value)}
              className="w-full rounded-lg border p-3"
            >
              <option value="">-- : --</option>
              {hours.map((h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, "0")}:00
                </option>
              ))}
            </select>
          </div>

          {/* duration */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Duration</label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full rounded-lg border p-3"
              disabled={!date || !hour}
            >
              <option value="1">1 h</option>
              <option value="2">2 h</option>
              <option value="3">3 h</option>
            </select>
            <p className="mt-1 text-[11px] text-gray-500">
              Latest start 23:00 → 1h (policy limits apply)
            </p>
          </div>

          {/* preview image (sharp) */}
          <div className="md:col-span-3">
            <div className="relative h-56 w-full overflow-hidden rounded-xl">
              <Image
                src={court.image_url || "/images/courts/placeholder.jpg"}
                alt={court.name}
                fill
                sizes="(max-width: 768px) 92vw, 768px"
                className="object-cover"
                priority
              />
            </div>
          </div>

          {/* DAY VIEW GRID */}
          <div className="md:col-span-3">
            <div className="mb-2 text-sm font-medium text-gray-700">Availability for the day</div>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {dayLoading && (
                Array.from({ length: 16 }).map((_, i) => (
                  <div key={i} className="h-9 rounded-lg bg-gray-200 animate-pulse" />
                ))
              )}
              {!dayLoading && daySlots?.map((s) => {
                const label = `${String(s.hour).padStart(2, "0")}:00`;
                const disabled = !s.available;
                return (
                  <button
                    key={s.hour}
                    type="button"
                    onClick={() => {
                      setHour(String(s.hour));
                      setBasePerHour(s.price_per_hour);
                      setEffPerHour(s.effective_price_per_hour ?? s.price_per_hour);
                      setDiscountPct(s.active_offer?.discount_pct ?? null);
                      setSlotStatus(s.available ? "available" : "conflicting");
                    }}
                    disabled={disabled}
                    className={`h-9 rounded-lg border text-sm transition ${
                      String(s.hour) === hour
                        ? "bg-green-600 text-white border-green-700"
                        : disabled
                          ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                          : "bg-white hover:bg-green-50 border-gray-200"
                    }`}
                    title={disabled ? "Unavailable (Booked/Event)" : "Select this hour"}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* slot status message */}
          {slotStatus === "conflicting" && (
            <div className="md:col-span-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              This court is already booked for the selected time. Try a different hour
              or duration.
            </div>
          )}

          {/* price panel */}
          {(basePerHour != null || effPerHour != null) && (
            <div className="md:col-span-3 rounded-lg border bg-gray-50 px-4 py-3">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-500">
                    Estimated price
                  </div>
                  <div className="flex items-baseline gap-3">
                    {effPerHour != null && basePerHour != null && effPerHour < basePerHour ? (
                      <>
                        <div className="text-xl font-semibold">
                          {effPerHour.toFixed(2)} € / h
                        </div>
                        <div className="text-sm text-gray-500 line-through">
                          {basePerHour.toFixed(2)} € / h
                        </div>
                        {discountPct != null && (
                          <span className="rounded-full border px-2 py-0.5 text-xs text-green-700">
                            -{discountPct}%
                          </span>
                        )}
                      </>
                    ) : (
                      <div className="text-xl font-semibold">
                        {(effPerHour ?? basePerHour)!.toFixed(2)} € / h
                      </div>
                    )}
                  </div>
                </div>

                {total && (
                  <div className="text-right">
                    <div className="text-xs text-gray-500">for {duration} h</div>
                    <div className="text-lg font-semibold">{total} €</div>
                  </div>
                )}
              </div>
              {discountPct != null && (
                <p className="mt-1 text-xs text-gray-600">
                  Changing date/time may remove the discount.
                </p>
              )}
            </div>
          )}

          {/* general message */}
          {msg && (
            <div
              className={`md:col-span-3 rounded-lg px-4 py-3 text-sm ${
                msg.type === "ok"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {msg.text}
            </div>
          )}
        </div>

        {/* footer */}
        <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
          <button
            onClick={() => onClose(false)}
            className="rounded-lg px-4 py-2 text-sm hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={book}
            disabled={loading || slotStatus === "conflicting" || !date || !hour}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
          >
            {slotStatus === "conflicting" ? "Unavailable" : loading ? "Booking…" : "Book"}
          </button>
        </div>
      </div>
    </div>
  );
}
