'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function JoinPage() {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const upperCode = code.trim().toUpperCase()

    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('join_code', upperCode)
      .single()

    if (sessionError || !session) {
      setError('Session not found. Check your code and try again.')
      setLoading(false)
      return
    }

    if (session.phase === 'complete') {
      setError('This session has already ended.')
      setLoading(false)
      return
    }

    // Reconnect if they already joined this session (e.g. closed the tab)
    const storedParticipantId = localStorage.getItem(`participant_${session.id}`)
    if (storedParticipantId) {
      const { data: existing } = await supabase
        .from('participants')
        .select('*')
        .eq('id', storedParticipantId)
        .single()
      if (existing) {
        localStorage.setItem('current_session_id', session.id)
        localStorage.setItem('current_participant_id', existing.id)
        localStorage.setItem('current_alias', existing.alias)
        router.push(`/session/${session.id}`)
        return
      }
    }

    const joinResponse = await fetch('/api/participants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: session.id }),
    })
    const participant = await joinResponse.json()

    if (!joinResponse.ok) {
      setError(participant.error ?? 'Failed to join session. Please try again.')
      setLoading(false)
      return
    }

    // Store identity — keyed by session so multiple sessions don't collide
    localStorage.setItem(`participant_${session.id}`, participant.id)
    localStorage.setItem('current_session_id', session.id)
    localStorage.setItem('current_participant_id', participant.id)
    localStorage.setItem('current_alias', participant.alias)

    router.push(`/session/${session.id}`)
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 w-full max-w-md">
        <h1 className="text-2xl font-semibold text-slate-800 mb-1">Graduate Programme</h1>
        <p className="text-slate-600 font-medium mb-1">Technical Report Writing</p>
        <p className="text-slate-500 mb-8 text-sm">Enter the session code from your facilitator to join.</p>

        <form onSubmit={handleJoin} className="space-y-4">
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. ABC123"
            maxLength={6}
            className="w-full text-center text-3xl font-mono tracking-widest border border-slate-300 rounded-xl px-4 py-4 focus:outline-none focus:ring-2 focus:ring-slate-400 uppercase"
            autoComplete="off"
            autoFocus
          />
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={code.length < 4 || loading}
            className="w-full bg-slate-800 text-white rounded-xl py-3 font-medium hover:bg-slate-700 disabled:opacity-40 transition-colors"
          >
            {loading ? 'Joining...' : 'Join Session'}
          </button>
        </form>
      </div>
    </main>
  )
}
