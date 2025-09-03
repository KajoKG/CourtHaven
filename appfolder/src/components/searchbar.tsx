"use client";
import { useMemo, useState } from "react";
import CourtBookingModal from "./CourtBookingModal";
import Image from "next/image";

type Court = {
  id: string;
  name: string;
  sport: string;
  address: string;
  city: string;
  description: string | null;
  image_url: string | null;
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

type SearchResult = { available: Court[]; conflicting: Court[] };

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

/* normalize helper (za city filter) */
function norm(s: string | null | undefined) {
  return (s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

type ApiError = { error?: unknown };

function isApiError(x: unknown): x is ApiError {
  return typeof x === "object" && x !== null && "error" in x;
}

function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  try {
    return JSON.stringify(e);
  } catch {
    return "Error";
  }
}

export default function SearchBar() {
  const [sport, setSport] = useState("");
  const [city, setCity] = useState("");
  const [date, setDate] = useState("");
  const [hour, setHour] = useState("");
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
      if (sport) qs.set("sport", sport);
      if (city) qs.set("city", city);
      if (date) qs.set("date", date);
      if (hour) qs.set("hour", hour);

      const res = await fetch(`/api/courts/search?${qs.toString()}`);
      const json: unknown = await res.json();

      if (!res.ok) {
        const msg =
          isApiError(json) && typeof (json as ApiError).error === "string"
            ? (json as ApiError).error
            : "Search failed";
      throw new Error(String(msg));
      }

      let result = json as SearchResult;

      const want = norm(city);
      if (want) {
        const byCity = (c: Court) => norm(c.city) === want;
        result = {
          available: (result.available || []).filter(byCity),
          conflicting: (result.conflicting || []).filter(byCity),
        };
      }

      setData(result);
    } catch (e: unknown) {
      setError(getErrorMessage(e) ?? "Search error");
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
    <div className="rounded-lg p-6 md:p-8 w-full bg-white dark:bg-[color:var(--card)] shadow-md">
      {/* SEARCH FORM */}
      <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
        <div className="flex flex-col md:flex-row md:space-x-4 space-y-3 md:space-y-0">
          {/* Sport */}
          <div className="flex-1">
            <select
              aria-label="Select sport"
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              required
              className="form-ctrl appearance-none p-3 w-full rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="" disabled hidden>
                Sport
              </option>
              <option value="padel">Padel</option>
              <option value="tennis">Tennis</option>
              <option value="basketball">Basketball</option>
              <option value="football">Football</option>
            </select>
          </div>

          {/* City */}
          <div className="flex-1">
            <input
              aria-label="City"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City"
              className="form-ctrl p-3 w-full rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Date */}
<div className="flex-1 relative">
  <input
    aria-label="Select date"
    type="date"
    value={date}
    min={minDate}
    max={maxDate}
    onChange={(e) => setDate(e.target.value)}
    className="form-ctrl p-3 w-full rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
  />
</div>


          {/* Time */}
          <div className="flex-1">
            <select
              aria-label="Select time"
              value={hour}
              onChange={(e) => setHour(e.target.value)}
              className="form-ctrl appearance-none p-3 w-full rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="" disabled hidden>
                Time
              </option>
              {hours.map((h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, "0")}:00
                </option>
              ))}
            </select>
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
      {error && <p className="text-red-600 dark:text-red-400 mt-4">{error}</p>}

      {/* RESULTS */}
      {data && (
        <div className="mt-6 space-y-6">
          {data.available.length > 0 ? (
            <section>
              <h3 className="font-semibold text-green-700 dark:text-emerald-400 mb-3">
                Available Courts
              </h3>
              <Cards courts={data.available} onPick={setSelected} showPricing />
            </section>
          ) : (
            <p className="text-sm text-gray-700 dark:text-gray-300">
              No courts available. Try different date/time.
            </p>
          )}

          {date && hour && data.conflicting.length > 0 && (
            <section>
              <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Booked at that time — try different hours
              </h3>
              <Cards courts={data.conflicting} dim onPick={setSelected} showPricing />
            </section>
          )}
        </div>
      )}

      {selected && (
        <CourtBookingModal
          court={selected}
          initialDate={date || undefined}
          initialHour={hour || undefined}
          onClose={(changed) => {
            setSelected(null);
            if (changed) performSearch();
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
        const eff = c.effective_price_per_hour ?? base;
        const discounted = base != null && eff != null && eff < base;
        const pct =
          discounted && c.active_offer?.discount_pct != null
            ? c.active_offer.discount_pct
            : null;

        return (
          <button
            type="button"
            key={c.id}
            onClick={() => onPick(c)}
            className={`text-left overflow-hidden rounded-xl border bg-white dark:bg-[color:var(--card)]
                        shadow hover:shadow-md transition ${dim ? "opacity-70" : ""}`}
          >
            <div className="relative h-40 w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
              <Image
                src={c.image_url || "/images/courts/placeholder.jpg"}
                alt={c.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                quality={60}
                priority={false}
              />
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="font-semibold line-clamp-1">{c.name}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {c.address}, {c.city}
                  </p>
                </div>
                {showPricing && base != null && (
                  <div className="text-right">
                    {discounted ? (
                      <>
                        <div className="text-lg font-semibold">
                          {eff!.toFixed(2)} € / h
                        </div>
                        <div className="text-xs text-gray-500 line-through">
                          {base!.toFixed(2)} € / h
                        </div>
                        {pct != null && (
                          <div className="mt-0.5 inline-block rounded-full border px-2 py-0.5 text-[11px] text-green-700 dark:text-emerald-400">
                            -{pct}%
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-lg font-semibold">
                        {base!.toFixed(2)} € / h
                      </div>
                    )}
                  </div>
                )}
              </div>

              {c.description && (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                  {c.description}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
