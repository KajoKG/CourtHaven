import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center pt-20 bg-gray-50 p-6">
      <h1 className="text-4xl font-bold text-gray-800 mb-6">Login to CourtHaven</h1>
      <form className="w-full max-w-sm bg-white p-6 rounded-lg shadow-md">
        {/* Email Field */}
        <div className="mb-4">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            className="w-full mt-1 p-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Enter your email"
          />
        </div>

        {/* Password Field */}
        <div className="mb-4">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            className="w-full mt-1 p-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Enter your password"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full bg-green-500 text-white py-3 rounded-lg font-semibold hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
        >
          Login
        </button>
      </form>

      {/* Link to Sign Up */}
      <p className="mt-6 text-sm text-gray-600">
        Don’t have an account?{" "}
        <a href="/signup" className="text-green-600 hover:underline">
          Sign up
        </a>
      </p>
    </main>
  );
}
