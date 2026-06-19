'use client'

import { useCallback, useState } from 'react'
import type { Session, Review } from '@/lib/types'
import { Timer } from './Timer'

interface Props {
  session: Session
  assignmentId: string
  submissionContent: string
  review: Review | null
  onSubmit: (r: Review) => void
}

export function ReviewPhase({ session, assignmentId, submissionContent, review, onSubmit }: Props) {
  const [comments, setComments] = useState(review?.comments ?? '')
  const [submitted, setSubmitted] = useState(!!review?.submitted_at)

  const handleSubmit = useCallback(async () => {
    if (submitted || !comments.trim()) return
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignment_id: assignmentId, session_id: session.id, comments, submitted: true }),
    })
    if (res.ok) {
      const data = await res.json()
      setSubmitted(true)
      onSubmit(data)
    }
  }, [submitted, comments, assignmentId, session.id, onSubmit])

  const handleExpire = useCallback(() => {
    if (!submitted && comments.trim()) handleSubmit()
  }, [submitted, comments, handleSubmit])

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-800 mb-1">Peer review</h2>
        <p className="text-sm text-slate-500 mb-1">
          Read the paragraph below and leave constructive feedback. Consider clarity, structure, technical accuracy, and style.
        </p>
        <Timer
          startedAt={session.review_started_at!}
          durationSeconds={session.review_duration_seconds}
          onExpire={handleExpire}
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Paragraph to review</h3>
        <div className="bg-slate-50 rounded-xl p-4 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
          {submissionContent}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Your feedback</h3>
        <textarea
          value={comments}
          onChange={e => setComments(e.target.value)}
          disabled={submitted}
          placeholder="What worked well? What could be improved? Be specific and constructive."
          rows={7}
          className="w-full resize-none text-slate-800 text-sm leading-relaxed focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
        />

        <div className="flex justify-end pt-2 border-t border-slate-100">
          {submitted
            ? <span className="text-sm font-medium text-emerald-600">Review submitted ✓</span>
            : (
              <button
                onClick={handleSubmit}
                disabled={!comments.trim()}
                className="bg-amber-500 text-white text-sm px-5 py-2 rounded-lg hover:bg-amber-600 disabled:opacity-40 transition-colors font-medium"
              >
                Submit review
              </button>
            )
          }
        </div>
      </div>
    </div>
  )
}
