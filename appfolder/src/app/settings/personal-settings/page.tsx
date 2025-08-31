'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function PersonalSettings() {
  const [firstName, setFirstName] = useState('')
  const [lastName,  setLastName]  = useState('')
  const [saving,    setSaving]    = useState(false)
  const [msg,       setMsg]       = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: sess } = await supabase.auth.getSession()
      const user = sess.session?.user
      if (!user) return router.replace('/login')

      const { data: prof } = await supabase
        .from('profiles')
        .select('first_name,last_name')
        .eq('id', user.id)
        .maybeSingle()

      setFirstName(prof?.first_name ?? (user.user_metadata?.first_name ?? ''))
      setLastName(prof?.last_name ?? (user.user_metadata?.last_name ?? ''))
    }
    load()
  }, [router])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setMsg(null)

    const { data: sess } = await supabase.auth.getSession()
    const user = sess.session?.user
    if (!user) return

    const full_name = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ')

    // upiši u profiles
    await supabase.from('profiles').upsert({
      id: user.id,
      first_name: firstName,
      last_name: lastName,   // <-- ispravno mapiranje
      full_name: full_name,  // (može i samo full_name)
    })

    // i u user metadata (da bude konzistentno)
    await supabase.auth.updateUser({
      data: {
        first_name: firstName,
        last_name: lastName, // <-- ispravno mapiranje
        full_name: full_name,
      }
    })

    setSaving(false)
    setMsg('Saved ✓')
  }

  return (
    <div className="max-w-md mx-auto pt-12">
      <h1 className="text-2xl font-semibold mb-6">Personal Settings</h1>
      <form onSubmit={save} className="bg-white rounded-2xl shadow p-6 space-y-4">
        <div>
          <label className="text-sm">First name</label>
          <input value={firstName} onChange={e=>setFirstName(e.target.value)}
                 className="w-full mt-1 p-3 border rounded-lg"/>
        </div>
        <div>
          <label className="text-sm">Last name</label>
          <input value={lastName} onChange={e=>setLastName(e.target.value)}
                 className="w-full mt-1 p-3 border rounded-lg"/>
        </div>
        <button disabled={saving} className="rounded-xl bg-black text-white px-4 py-2 disabled:opacity-60">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        {msg && <p className="text-green-600 text-sm">{msg}</p>}
      </form>
    </div>
  )
}
