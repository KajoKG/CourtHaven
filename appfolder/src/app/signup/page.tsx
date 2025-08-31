'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'

export default function SignupPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName,  setLastName]  = useState('')
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [info,      setInfo]      = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError(null); setInfo(null)

    try {
      const full_name = `${firstName.trim()} ${lastName.trim()}`.trim()

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // ovo se sprema u user_metadata
          data: { first_name: firstName, last_name: lastName, full_name }
        }
      })
      if (error) throw error

      // budući da je email verification uključen:
      setInfo('Check your email to verify your account, then log in.')
      setFirstName(''); setLastName(''); setEmail(''); setPassword('')
    } catch (err: any) {
      setError(err.message ?? 'Signup error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center pt-20 bg-gray-50 p-6">
      <h1 className="text-4xl font-bold text-gray-800 mb-6">Create your account</h1>

      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white p-6 rounded-lg shadow-md space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">First name</label>
          <input
            value={firstName}
            onChange={(e)=>setFirstName(e.target.value)}
            required
            className="w-full mt-1 p-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Enter your first name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Last name</label>
          <input
            value={lastName}
            onChange={(e)=>setLastName(e.target.value)}
            required
            className="w-full mt-1 p-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Enter your last name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            required
            className="w-full mt-1 p-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Enter your email"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e)=>setPassword(e.target.value)}
            required
            className="w-full mt-1 p-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Enter your password"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {info  && <p className="text-sm text-green-600">{info}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-500 text-white py-3 rounded-lg font-semibold hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-60"
        >
          {loading ? 'Please wait…' : 'Sign up'}
        </button>

        <p className="text-sm text-gray-600 text-center">
          Already have an account?{' '}
          <Link href="/login" className="text-green-600 hover:underline">Log in</Link>
        </p>
      </form>
    </main>
  )
}
