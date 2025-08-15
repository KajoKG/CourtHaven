import SearchBar from "./searchbar";

export default function BookContent() {
  return (
    <div className="flex flex-col items-center mt-10">
      {/* SearchBar */}
      <div className="w-full max-w-3xl px-4">
        <SearchBar />
      </div>

      {/* Kartice ispod pretraživanja */}
      <div className="hidden md:grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 px-8">
        <div className="bg-white shadow-lg rounded-lg p-6 text-center max-w-md mx-auto">
          <h3 className="text-lg font-bold text-green-700">
            Why Choose CourtHaven
          </h3>
          <p className="text-gray-600 mt-4">
            CourtHaven makes it easy to find and book sports courts near you.
            Instantly reserve courts for your favorite sports, from tennis to
            basketball.
          </p>
        </div>
        <div className="bg-white shadow-lg rounded-lg p-6 text-center max-w-md mx-auto">
          <h3 className="text-lg font-bold text-green-700">Featured Courts</h3>
          <p className="text-gray-600 mt-4">
            Check out the most popular courts in your area, recommended by other
            users. See ratings, photos, and availability to choose the perfect
            spot for your next game.
          </p>
        </div>
        <div className="bg-white shadow-lg rounded-lg p-6 text-center max-w-md mx-auto">
          <h3 className="text-lg font-bold text-green-700">Explore Features</h3>
          <p className="text-gray-600 mt-4">
            Beyond bookings, CourtHaven offers tools to manage schedules, invite
            friends, and explore upcoming events. Discover everything you need
            for a seamless experience.
          </p>
        </div>
      </div>
    </div>
  );
}
