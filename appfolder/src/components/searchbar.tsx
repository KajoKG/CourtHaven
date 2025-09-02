"use client";
import { useMemo, useState } from "react";
import CourtBookingModal from "./CourtBookingModal";

type Court = {
  id: string;
  name: string;
  sport: string;
  address: string;
  city: string;
  description: string | null;
  image_url: string | null;
  // pricing fields from /api/courts/search
  price_per_hour?: number | null;
  effective_price_per_hour?: number | null;
  active_offer?: {
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

type SearchResult = {
  available: Court[];
  conflicting: Court[];
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

export default function SearchBar() {
  const [sport, setSport] = useState("");        // canonical: lowercase values
  const [city, setCity] = useState("");          // NEW
  const [date, setDate] = useState("");
  const [hour, setHour] = useState("");
  const [duration, setDuration] = useState("1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SearchResult | null>(null);
  const [selected, setSelected] = useState<Court | null>(null);

  const hours = useMemo(() => Array.from({ length: 17 }, (_, i) => i + 7), []);
  const minDate = todayISO();
  const maxDate = in14DaysISO();

  const performSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (sport) qs.set("sport", sport);     // 👈 no toLowerCase; values already canonical
      if (city) qs.set("city", city);
      if (date) qs.set("date", date);
      if (hour) qs.set("hour", hour);
      if (date && hour) qs.set("duration", duration);

      const res = await fetch(`/api/courts/search?${qs.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Search failed");
      setData(json);
    } catch (err: any) {
      setError(err.message ?? "Search error");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await performSearch();
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-8 w-full">
      {/* SEARCH FORM */}
      <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
        <div className="flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0">

          {/* Sport */}
          <div className="flex-1">
            <label htmlFor="sport" className="font-bold text-lg mb-2 block text-black">
              Select Sport
            </label>
            <select
              id="sport"
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              className="p-3 border rounded-md w-full focus:ring-2 focus:ring-green-400 text-black"
              required
            >
              <option value="" disabled>Sport</option>
              <option value="padel">Padel</option>
              <option value="tennis">Tennis</option>
              <option value="basketball">Basketball</option>
              <option value="football">Football</option>
              <option value="badminton">Badminton</option>
            </select>
          </div>

          {/* City (NEW) */}
          <div className="flex-1">
            <label htmlFor="city" className="font-bold text-lg mb-2 block text-black">
              City
            </label>
            <input
              id="city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Zagreb"
              className="p-3 border rounded-md w-full focus:ring-2 focus:ring-green-400 text-black"
            />
          </div>

          {/* Date */}
          <div className="flex-1">
            <label htmlFor="date" className="font-bold text-lg mb-2 block text-black">
              Select Date
            </label>
            <input
              id="date"
              type="date"
              value={date}
              min={minDate}
              max={maxDate}
              onChange={(e) => setDate(e.target.value)}
              className="p-3 border rounded-md w-full focus:ring-2 focus:ring-green-400 text-black"
            />
          </div>

          {/* Time */}
          <div className="flex-1">
            <label htmlFor="time" className="font-bold text-lg mb-2 block text-black">
              Select Time
            </label>
            <select
              id="time"
              value={hour}
              onChange={(e) => setHour(e.target.value)}
              className="p-3 border rounded-md w-full focus:ring-2 focus:ring-green-400 text-black"
            >
              <option value="">-- : --</option>
              {hours.map((h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, "0")}:00
                </option>
              ))}
            </select>

            {/* Duration (samo kada imamo date+time) */}
            {date && hour && (
              <div className="mt-2">
                <label className="text-sm">Duration</label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="ml-2 p-2 border rounded-md"
                >
                  <option value="1">1h</option>
                  <option value="2">2h</option>
                  <option value="3">3h</option>
                </select>
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-green-500 hover:bg-green-600 text-white py-3 px-6 rounded-md shadow-lg w-full disabled:opacity-60"
        >
          {loading ? "Searching…" : "Search Courts"}
        </button>
      </form>

      {/* ERROR */}
      {error && <p className="text-red-600 mt-4">{error}</p>}

      {/* RESULTS */}
      {data && (
        <div className="mt-6 space-y-6">
          {data.available.length > 0 ? (
            <section>
              <h3 className="font-semibold text-green-700 mb-3">Available Courts</h3>
              <Cards
                courts={data.available}
                onPick={setSelected}
                showPricing
              />
            </section>
          ) : (
            <p className="text-sm text-gray-600">No courts available. Try different date/time.</p>
          )}

          {date && hour && data.conflicting.length > 0 && (
            <section>
              <h3 className="font-semibold text-gray-700 mb-3">
                Booked at that time — try different hours
              </h3>
              <Cards courts={data.conflicting} dim onPick={setSelected} showPricing />
            </section>
          )}
        </div>
      )}

      {/* MODAL */}
      {selected && (
        <CourtBookingModal
          court={selected}
          initialDate={date || undefined}
          initialHour={hour || undefined}
          onClose={(changed) => {
            setSelected(null);
            if (changed) performSearch(); // refresh nakon bookinga
          }}
        />
      )}
    </div>
  );
}

/* --- helper: grid kartica --- */
function Cards({
  courts,
  dim = false,
  onPick,
  showPricing = false,
}: {
  courts: Court[];
  dim?: boolean;
  onPick: (c: Court) => void;
  showPricing?: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {courts.map((c) => {
        const base = c.price_per_hour ?? null;
        const eff  = c.effective_price_per_hour ?? base;
        const discounted = base != null && eff != null && eff < base;
        const pct = discounted && c.active_offer?.discount_pct != null ? c.active_offer.discount_pct : null;

        return (
          <button
            type="button"
            key={c.id}
            onClick={() => onPick(c)}
            className={`text-left overflow-hidden rounded-xl border bg-white shadow hover:shadow-md transition ${
              dim ? "opacity-70" : ""
            }`}
          >
            <div className="h-40 w-full overflow-hidden bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.image_url || "/images/courts/placeholder.jpg"}
                alt={c.name}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="font-semibold line-clamp-1">{c.name}</h4>
                  <p className="text-sm text-gray-600">
                    {c.address}, {c.city}
                  </p>
                </div>
                {showPricing && base != null && (
                  <div className="text-right">
                    {discounted ? (
                      <>
                        <div className="text-lg font-semibold">{eff!.toFixed(2)} € / h</div>
                        <div className="text-xs text-gray-500 line-through">{base!.toFixed(2)} € / h</div>
                        {pct != null && (
                          <div className="mt-0.5 inline-block rounded-full border px-2 py-0.5 text-[11px] text-green-700">
                            -{pct}%
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-lg font-semibold">{base!.toFixed(2)} € / h</div>
                    )}
                  </div>
                )}
              </div>

              {c.description && (
                <p className="mt-2 text-sm text-gray-500 line-clamp-2">{c.description}</p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
