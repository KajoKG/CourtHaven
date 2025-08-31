import Link from "next/link";
import AuthGate from "../components/AuthGate";
import BookContent from "../components/bookContent";

export default function HomePage() {
  return (
    <main className="relative bg-gradient-to-b from-white via-green-200 to-white min-h-screen flex flex-col justify-center px-4">
      {/* Pozadinske slike */}
      <div className="absolute top-0 left-0 w-full h-full">
        <img
          src="/images/BronBron.png"
          alt="Player 1"
          className="absolute top-1/4 left-[10%] w-[900px] md:w-[1200px] opacity-10 hidden md:block"
        />
        <img
          src="/images/Picture2.png"
          alt="Player 2"
          className="absolute top-5 right-[5%] w-[300px] md:w-[450px] opacity-10 hidden md:block"
        />
      </div>

      {/* Hero Section */}
      <section className="relative text-center py-16">
        <h1 className="text-4xl md:text-9xl font-bold text-green-700">
          Court<span className="text-green-500">Haven</span>
        </h1>
        <p className="text-lg md:text-3xl text-gray-700 mt-4">The Court Awaits</p>

        <div className="mt-8">
          <AuthGate
            // NEMA redirecta; samo zamijeni formu porukom
            fallback={
              <div className="max-w-xl mx-auto bg-white rounded-2xl shadow p-6 text-center">
                <p className="text-sm text-gray-700">
                  You must be{" "}
                  <Link href="/login" className="font-semibold underline text-green-700">
                    logged in
                  </Link>{" "}
                  to continue.
                </p>
              </div>
            }
          >
            {/* Ako je user logiran, prikaži formu */}
            <BookContent />
          </AuthGate>
        </div>
      </section>

      {/* tvoje info kartice (Why / Featured / Explore) ostaju kakve jesu */}
    </main>
  );
}
