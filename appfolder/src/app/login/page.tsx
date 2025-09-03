'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabase';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const sp = useSearchParams();
  const reason = sp.get('reason'); // npr. "auth"
  const from = sp.get('from');     // putanja s koje je korisnik preusmjeren

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // ako postoji from → vrati tamo, inače na /
      router.push(from || '/');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login error';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center pt-20 bg-gray-50 p-6">
      <h1 className="text-4xl font-bold text-gray-800 mb-6">Login to CourtHaven</h1>

      {/* Banner ako je korisnik preusmjeren zbog zaštite */}
      {reason === 'auth' && (
        <div className="w-full max-w-sm mb-4 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          You must be logged in to continue.
        </div>
      )}

      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white p-6 rounded-lg shadow-md">
        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            className="w-full mt-1 p-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Enter your email"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e)=>setPassword(e.target.value)}
            className="w-full mt-1 p-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Enter your password"
          />
        </div>

        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-500 text-white py-3 rounded-lg font-semibold hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-60"
        >
          {loading ? 'Please wait…' : 'Login'}
        </button>
      </form>

      <p className="mt-6 text-sm text-gray-600">
        Don’t have an account?{' '}
        <a href="/signup" className="text-green-600 hover:underline">Sign up</a>
      </p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="p-6">Loading…</main>}>
      <LoginForm />
    </Suspense>
  );
}
