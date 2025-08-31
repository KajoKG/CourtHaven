'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '../lib/supabase'

type Props = {
  children?: React.ReactNode
  message?: string
  redirect?: boolean // <- NOVO: ako je true, šaljemo usera na /login
}

export default function AuthGate({ children, message, redirect }: Props) {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    let mounted = true
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!mounted) return
      if (!session && redirect) {
        router.replace(`/login?reason=auth&from=${encodeURIComponent(pathname)}`)
        return setAuthed(false)
      }
      setAuthed(!!session)
    }
    check()
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session)
    })
    return () => { mounted = false; sub.subscription.unsubscribe() }
  }, [redirect, router, pathname])

  // dok provjeravamo session
  if (authed === null) {
    return <div className="grid place-items-center h-40 text-gray-500">Loading…</div>
  }

  if (!authed) {
    // ako ne radimo redirect, prikaži poruku
    if (!redirect) {
      return (
        <div className="max-w-xl mx-auto bg-white rounded-2xl shadow p-6 text-center">
          <h2 className="text-lg font-semibold mb-2">Please log in</h2>
          <p className="text-sm text-gray-600 mb-4">
            {message ?? 'You need to be signed in to use this feature.'}
          </p>
          <button
            onClick={() => router.push('/login?reason=auth')}
            className="rounded-xl bg-green-600 text-white px-4 py-2 hover:bg-green-700"
          >
            Go to Login
          </button>
        </div>
      )
    }
    return null
  }

  return <>{children}</>
}
