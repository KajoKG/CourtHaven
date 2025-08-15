"use client";
import { useState } from "react";

export default function SearchBar() {
  const [sport, setSport] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const sports = ["Padel", "Tennis", "Basketball", "Football"];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Search Parameters:", { sport, date, time });
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-8 w-full">
      <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
        {/* Group for inputs */}
        <div className="flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0">
          <div className="flex-1">
            <label
              htmlFor="sport"
              className="font-bold text-lg mb-2 block text-black"
            >
              Select Sport
            </label>
            <select
              id="sport"
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              className="p-3 border rounded-md w-full focus:ring-2 focus:ring-blue-400 text-black"
              required
            >
              <option value="" disabled>
                Sport
              </option>
              {sports.map((sport, index) => (
                <option key={index} value={sport}>
                  {sport}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label
              htmlFor="date"
              className="font-bold text-lg mb-2 block text-black"
            >
              Select Date
            </label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="p-3 border rounded-md w-full focus:ring-2 focus:ring-blue-400 text-black"
              required
            />
          </div>

          <div className="flex-1">
            <label
              htmlFor="time"
              className="font-bold text-lg mb-2 block text-black"
            >
              Select Time
            </label>
            <input
              id="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="p-3 border rounded-md w-full focus:ring-2 focus:ring-blue-400 text-black"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          className="bg-green-500 hover:bg-green-600 text-white py-3 px-6 rounded-md shadow-lg w-full"
        >
          Search Courts
        </button>
      </form>
    </div>
  );
}
