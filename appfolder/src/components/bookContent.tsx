"use client";

import SearchBar from "./searchbar";

export default function BookContent() {
  return (
    <div className="flex flex-col items-center mt-10 w-full">
      {/* SearchBar */}
      <div className="w-full max-w-3xl px-4">
        <SearchBar />
      </div>
    </div>
  );
}
