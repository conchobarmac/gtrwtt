'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Session, Submission } from '@/lib/types'
import { Timer } from './Timer'

interface Props {
  session: Session
  participantId: string
  submission: Submission | null
  onSubmit: (s: Submission) => void
}

const MIN_WORDS = 50
const MAX_WORDS = 200

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export function WritingPhase({ session, participantId, submission, onSubmit }: Props) {
  const [content, setContent] = useState(submission?.content ?? '')
  const [submitted, setSubmitted] = useState(!!submission?.submitted_at)
  const [saving, setSaving] = useState(false)
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const words = wordCount(content)
  const canSubmit = words >= MIN_WORDS && words <= MAX_WORDS

  // Auto-save draft while typing
  useEffect(() => {
    if (submitted) return
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => {
      if (content.trim()) saveDraft()
    }, 1500)
    return () => { if (saveTimeout.current) clearTimeout(saveTimeout.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content])

  async function saveDraft() {
    setSaving(true)
    await fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: session.id, participant_id: participantId, content, submitted: false }),
    })
    setSaving(false)
  }

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || submitted) return
    const res = await fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: session.id, participant_id: participantId, content, submitted: true }),
    })
    if (res.ok) {
      const data = await res.json()
      setSubmitted(true)
      onSubmit(data)
    }
  }, [canSubmit, submitted, session.id, participantId, content, onSubmit])

  // Auto-submit on timer expiry — bypasses word count so nothing is lost
  const handleExpire = useCallback(async () => {
    if (submitted || !content.trim()) return
    const res = await fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: session.id, participant_id: participantId, content, submitted: true }),
    })
    if (res.ok) {
      const data = await res.json()
      setSubmitted(true)
      onSubmit(data)
    }
  }, [submitted, content, session.id, participantId, onSubmit])

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-800 mb-1">Your paragraph</h2>
        <p className="text-sm text-slate-500 mb-1">
          Write one paragraph ({MIN_WORDS}–{MAX_WORDS} words) of a technical report. Your facilitator will provide the topic and context.
        </p>
        <Timer
          startedAt={session.writing_started_at!}
          durationSeconds={session.writing_duration_seconds}
          onExpire={handleExpire}
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          disabled={submitted}
          placeholder="Begin writing your paragraph here..."
          rows={10}
          className="w-full resize-none text-slate-800 text-sm leading-relaxed focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
        />

        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <span className={`text-xs font-mono ${words < MIN_WORDS ? 'text-slate-400' : words > MAX_WORDS ? 'text-red-500' : 'text-emerald-600'}`}>
            {words} / {MAX_WORDS} words
            {words < MIN_WORDS && ` (min ${MIN_WORDS})`}
          </span>

          <div className="flex items-center gap-3">
            {saving && !submitted && <span className="text-xs text-slate-400">Saving...</span>}
            {submitted
              ? <span className="text-sm font-medium text-emerald-600">Submitted ✓</span>
              : (
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="bg-blue-600 text-white text-sm px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors font-medium"
                >
                  Submit
                </button>
              )
            }
          </div>
        </div>
      </div>
    </div>
  )
}
