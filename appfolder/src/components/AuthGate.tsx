'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '../lib/supabase'

type Props = {
  children?: React.ReactNode
  redirect?: boolean           // ako je true, odmah šalje na /login
  message?: string             // default poruka (ako ne koristiš fallback)
  fallback?: React.ReactNode   // custom UI kad user NIJE logiran
}

export default function AuthGate({ children, redirect = false, message, fallback }: Props) {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const router = useRouter()
  const pathname = usePathname()

useEffect(() => {
  let mounted = true
  const run = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!mounted) return
    const signed = !!session
    setAuthed(signed)
    if (!signed && redirect) {
      router.replace(`/login?reason=auth&from=${encodeURIComponent(pathname)}`)
    }
  }
  run()
  const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
    if (!mounted) return
    setAuthed(!!session)
  })
  return () => {
    mounted = false
    sub.subscription.unsubscribe()
  }
}, [redirect, router, pathname])


  if (authed === null) return <div className="py-10 text-center text-gray-500">Loading…</div>

  if (!authed && !redirect) {
    if (fallback) return <>{fallback}</>
    return (
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow p-6 text-center">
        <h2 className="text-lg font-semibold mb-2">Please log in</h2>
        <p className="text-sm text-gray-600">{message ?? 'You need to be signed in to use this feature.'}</p>
      </div>
    )
  }

  return <>{children}</>
}
