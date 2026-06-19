'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Session, Insight } from '@/lib/types'
import { Timer } from '@/components/Timer'

interface Props {
  sessionId: string
}

export function AdminSessionClient({ sessionId }: Props) {
  const [session, setSession] = useState<Session | null>(null)
  const [participantCount, setParticipantCount] = useState(0)
  const [submissionCount, setSubmissionCount] = useState(0)
  const [reviewCount, setReviewCount] = useState(0)
  const [insight, setInsight] = useState<Insight | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current
  const loadSeqRef = useRef(0)

  useEffect(() => {
    async function load() {
      // Stamp this call; if a newer call starts before this one finishes, discard our results
      const seq = ++loadSeqRef.current

      const [sessionRes, pcRes, scRes, rcRes, insRes] = await Promise.all([
        supabase.from('sessions').select('*').eq('id', sessionId).single(),
        supabase.from('participants').select('*', { count: 'exact', head: true }).eq('session_id', sessionId),
        supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('session_id', sessionId).not('submitted_at', 'is', null),
        supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('session_id', sessionId).not('submitted_at', 'is', null),
        supabase.from('insights').select('*').eq('session_id', sessionId).order('generated_at', { ascending: false }).limit(1).single(),
      ])

      if (seq !== loadSeqRef.current) return // stale — a newer load() already in flight

      if (sessionRes.data) setSession(sessionRes.data)
      setParticipantCount(pcRes.count ?? 0)
      setSubmissionCount(scRes.count ?? 0)
      setReviewCount(rcRes.count ?? 0)
      if (insRes.data) setInsight(insRes.data)
    }

    load()

    const isThisSession = (payload: { new: Record<string, unknown> }) =>
      payload.new.session_id === sessionId

    const channel = supabase
      .channel(`admin:${sessionId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` },
        payload => setSession(payload.new as Session))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'participants' },
        payload => { if (isThisSession(payload)) load() })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'submissions' },
        payload => { if (isThisSession(payload)) load() })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'submissions' },
        payload => { if (isThisSession(payload)) load() })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reviews' },
        payload => { if (isThisSession(payload)) load() })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'reviews' },
        payload => { if (isThisSession(payload)) load() })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  async function startWriting() {
    setLoading('writing')
    setError('')
    const res = await fetch(`/api/sessions/${sessionId}/start-writing`, { method: 'POST' })
    if (!res.ok) setError('Failed to start writing phase.')
    setLoading(null)
  }

  async function startReview() {
    setLoading('review')
    setError('')
    const res = await fetch(`/api/sessions/${sessionId}/start-review`, { method: 'POST' })
    if (!res.ok) {
      const body = await res.json()
      setError(body.error ?? 'Failed to start review phase.')
    }
    setLoading(null)
  }

  async function generateInsights() {
    setLoading('insights')
    setError('')
    const res = await fetch(`/api/sessions/${sessionId}/insights`, { method: 'POST' })
    if (!res.ok) {
      const body = await res.json()
      setError(body.error ?? 'Failed to generate insights.')
      setLoading(null)
      return
    }
    const data = await res.json()
    setInsight(data)
    setLoading(null)
  }

  if (!session) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-400">Loading session...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-2xl mx-auto space-y-6">

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-xl font-semibold text-slate-800">Session Control</h1>
              <p className="text-slate-500 text-sm mt-1">Share this code with participants</p>
            </div>
            <div className="text-right">
              <span className="text-4xl font-mono font-bold tracking-widest text-slate-800">
                {session.join_code}
              </span>
              <p className="text-xs text-slate-400 mt-1">Join code</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <Stat label="Joined" value={participantCount} />
            <Stat label="Submitted" value={submissionCount} />
            <Stat label="Reviews in" value={reviewCount} />
          </div>

          <div className="flex items-center gap-2 mb-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${phaseColors[session.phase]}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
              {phaseLabels[session.phase]}
            </span>
          </div>

          {(session.phase === 'writing' || session.phase === 'review') && (
            <Timer
              startedAt={session.phase === 'writing' ? session.writing_started_at! : session.review_started_at!}
              durationSeconds={session.phase === 'writing' ? session.writing_duration_seconds : session.review_duration_seconds}
            />
          )}
        </div>

        {error && <p className="text-red-500 text-sm px-1">{error}</p>}

        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
          <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-4">Controls</h2>

          <button
            onClick={startWriting}
            disabled={session.phase !== 'lobby' || loading !== null}
            className="w-full py-3 px-4 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            {loading === 'writing' ? 'Starting...' : 'Start Writing (20 min)'}
          </button>

          <button
            onClick={startReview}
            disabled={session.phase !== 'writing' || loading !== null}
            className="w-full py-3 px-4 rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600 disabled:opacity-40 transition-colors"
          >
            {loading === 'review' ? 'Assigning reviews...' : 'End Writing & Start Peer Review (10 min)'}
          </button>

          <button
            onClick={generateInsights}
            disabled={session.phase !== 'review' || loading !== null}
            className="w-full py-3 px-4 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-40 transition-colors"
          >
            {loading === 'insights' ? 'Generating insights...' : 'End Review & Generate Insights'}
          </button>
        </div>

        {insight && <InsightsDisplay insight={insight} />}
      </div>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3 text-center">
      <div className="text-2xl font-bold text-slate-800">{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  )
}

function InsightsDisplay({ insight }: { insight: Insight }) {
  const c = insight.content
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
      <h2 className="text-lg font-semibold text-slate-800">Insights Report</h2>

      <div>
        <h3 className="text-sm font-semibold text-emerald-700 uppercase tracking-wide mb-3">What went well</h3>
        <ul className="space-y-2">
          {c.strengths.map((s, i) => (
            <li key={i} className="flex gap-2 text-slate-700 text-sm">
              <span className="text-emerald-500 mt-0.5">✓</span> {s}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-red-600 uppercase tracking-wide mb-3">Areas to improve</h3>
        <ul className="space-y-2">
          {c.weaknesses.map((w, i) => (
            <li key={i} className="flex gap-2 text-slate-700 text-sm">
              <span className="text-red-400 mt-0.5">→</span> {w}
            </li>
          ))}
        </ul>
      </div>

      {c.exemplary_paragraphs.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-blue-700 uppercase tracking-wide mb-3">Highlighted examples</h3>
          <div className="space-y-4">
            {c.exemplary_paragraphs.map((ex, i) => (
              <div key={i} className="border border-slate-200 rounded-xl p-4">
                <blockquote className="text-slate-700 text-sm italic mb-2">&ldquo;{ex.text}&rdquo;</blockquote>
                <p className="text-xs text-slate-500">{ex.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-2">Summary</h3>
        <p className="text-slate-700 text-sm">{c.summary}</p>
      </div>
    </div>
  )
}

const phaseLabels: Record<string, string> = {
  lobby: 'Waiting for participants',
  writing: 'Writing phase',
  review: 'Peer review phase',
  complete: 'Session complete',
}

const phaseColors: Record<string, string> = {
  lobby: 'bg-slate-100 text-slate-600',
  writing: 'bg-blue-100 text-blue-700',
  review: 'bg-amber-100 text-amber-700',
  complete: 'bg-emerald-100 text-emerald-700',
}
