'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Session, Participant, Submission, ReviewAssignment, Review } from '@/lib/types'
import { LobbyPhase } from '@/components/LobbyPhase'
import { WritingPhase } from '@/components/WritingPhase'
import { ReviewPhase } from '@/components/ReviewPhase'
import { CompletePhase } from '@/components/CompletePhase'

interface Props {
  sessionId: string
}

export function SessionClient({ sessionId }: Props) {
  const [participant, setParticipant] = useState<Participant | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [assignment, setAssignment] = useState<ReviewAssignment | null>(null)
  const [assignedSubmission, setAssignedSubmission] = useState<Submission | null>(null)
  const [review, setReview] = useState<Review | null>(null)
  const [receivedReview, setReceivedReview] = useState<string | null>(null)
  const [error, setError] = useState('')

  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  useEffect(() => {
    const participantId = localStorage.getItem('current_participant_id')
    const storedSessionId = localStorage.getItem('current_session_id')
    const alias = localStorage.getItem('current_alias')

    if (!participantId || storedSessionId !== sessionId) {
      setError('Session not found. Please join again from the home page.')
      return
    }

    setParticipant({ id: participantId, session_id: sessionId, alias: alias ?? 'Unknown' })

    async function load() {
      const { data: sessionData } = await supabase
        .from('sessions').select('*').eq('id', sessionId).single()
      if (sessionData) setSession(sessionData)

      const { data: sub } = await supabase
        .from('submissions').select('*').eq('participant_id', participantId).eq('session_id', sessionId).single()
      if (sub) setSubmission(sub)

      const { data: asgn } = await supabase
        .from('review_assignments').select('*').eq('reviewer_id', participantId).eq('session_id', sessionId).single()
      if (asgn) {
        setAssignment(asgn)
        const { data: asgnSub } = await supabase
          .from('submissions').select('*').eq('id', asgn.submission_id).single()
        if (asgnSub) setAssignedSubmission(asgnSub)

        const { data: rev } = await supabase
          .from('reviews').select('*').eq('assignment_id', asgn.id).single()
        if (rev) setReview(rev)
      }

      // Load the review this participant received on their own submission
      if (sub) {
        const { data: inboundAssignment } = await supabase
          .from('review_assignments').select('id').eq('submission_id', sub.id).single()
        if (inboundAssignment) {
          const { data: inboundReview } = await supabase
            .from('reviews').select('comments').eq('assignment_id', inboundAssignment.id).single()
          if (inboundReview?.comments) setReceivedReview(inboundReview.comments)
        }
      }
    }

    load()

    const channel = supabase
      .channel(`session:${sessionId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'sessions',
        filter: `id=eq.${sessionId}`,
      }, payload => {
        setSession(payload.new as Session)
        if (payload.new.phase === 'review') {
          loadAssignment(participantId)
        }
        if (payload.new.phase === 'complete') {
          loadReceivedReview(participantId)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  async function loadReceivedReview(participantId: string) {
    const { data: sub } = await supabase
      .from('submissions').select('id').eq('participant_id', participantId).eq('session_id', sessionId).single()
    if (!sub) return
    const { data: inboundAssignment } = await supabase
      .from('review_assignments').select('id').eq('submission_id', sub.id).single()
    if (!inboundAssignment) return
    const { data: inboundReview } = await supabase
      .from('reviews').select('comments').eq('assignment_id', inboundAssignment.id).single()
    if (inboundReview?.comments) setReceivedReview(inboundReview.comments)
  }

  async function loadAssignment(participantId: string) {
    const { data: asgn } = await supabase
      .from('review_assignments').select('*').eq('reviewer_id', participantId).eq('session_id', sessionId).single()
    if (asgn) {
      setAssignment(asgn)
      const { data: asgnSub } = await supabase
        .from('submissions').select('*').eq('id', asgn.submission_id).single()
      if (asgnSub) setAssignedSubmission(asgnSub)
    }
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-8">
          <p className="text-red-500 mb-4">{error}</p>
          <a href="/" className="text-slate-600 underline">Go back to join page</a>
        </div>
      </main>
    )
  }

  if (!session || !participant) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-400">Loading...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-lg font-semibold text-slate-700">Graduate Programme: Technical Report Writing</h1>
          <span className="text-sm text-slate-400 font-mono bg-slate-100 px-3 py-1 rounded-full">
            {participant.alias}
          </span>
        </div>

        {session.phase === 'lobby' && <LobbyPhase />}

        {session.phase === 'writing' && (
          <WritingPhase
            session={session}
            participantId={participant.id}
            submission={submission}
            onSubmit={setSubmission}
          />
        )}

        {session.phase === 'review' && assignment && assignedSubmission && (
          <ReviewPhase
            session={session}
            assignmentId={assignment.id}
            submissionContent={assignedSubmission.content ?? ''}
            review={review}
            onSubmit={setReview}
          />
        )}

        {session.phase === 'review' && !assignment && (
          <div className="text-center py-20 text-slate-400">
            Waiting for review assignments...
          </div>
        )}

        {session.phase === 'complete' && (
          <CompletePhase
            ownParagraph={submission?.content ?? null}
            receivedReview={receivedReview}
          />
        )}
      </div>
    </main>
  )
}
