import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offers",
};

export default function OffersPage() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-gray-50 p-6">
      <h1 className="text-5xl font-bold text-gray-800 mb-8">Special Offers</h1>
      <p className="text-lg text-gray-600 mb-10 text-center">
        Check out our latest deals and promotions!
      </p>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 w-full max-w-6xl">
        {/* Offer Card 1 */}
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg">
          <h2 className="text-xl font-semibold text-green-600 mb-4">
            Weekend Discount
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            Book a court this weekend and get 20% off your reservation.
          </p>
          <button className="bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600">
            Claim Offer
          </button>
        </div>

        {/* Offer Card 2 */}
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg">
          <h2 className="text-xl font-semibold text-green-600 mb-4">
            Group Bookings
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            Reserve for 5 or more people and get an additional hour for free!
          </p>
          <button className="bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600">
            Learn More
          </button>
        </div>

        {/* Offer Card 3 */}
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg">
          <h2 className="text-xl font-semibold text-green-600 mb-4">
            Early Bird Special
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            Book a morning slot before 10 AM and enjoy a 15% discount.
          </p>
          <button className="bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600">
            Book Now
          </button>
        </div>
      </div>
    </main>
  );
}
