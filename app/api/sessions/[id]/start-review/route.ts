import { createServiceClient } from '@/lib/supabase/server'

export async function POST(_req: Request, ctx: RouteContext<'/api/sessions/[id]/start-review'>) {
  const { id: sessionId } = await ctx.params
  const supabase = await createServiceClient()

  const { data: session } = await supabase
    .from('sessions')
    .select('phase')
    .eq('id', sessionId)
    .single()

  if (!session) {
    return Response.json({ error: 'Session not found.' }, { status: 404 })
  }

  // Already started — double-click, page refresh, or a second facilitator tab.
  // Return the existing assignments untouched instead of erroring or re-shuffling
  // (re-shuffling would cascade-delete any reviews already submitted).
  if (session.phase === 'review') {
    const { count } = await supabase
      .from('review_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)
    return Response.json({ ok: true, assignments: count ?? 0, already_started: true })
  }

  if (session.phase !== 'writing') {
    return Response.json({ error: 'Session must be in the writing phase to start review.' }, { status: 400 })
  }

  // Auto-submit any paragraphs that weren't manually submitted
  await supabase
    .from('submissions')
    .update({ submitted_at: new Date().toISOString() })
    .eq('session_id', sessionId)
    .is('submitted_at', null)
    .not('content', 'is', null)

  // Get all participants who have submitted content
  const { data: submissions } = await supabase
    .from('submissions')
    .select('id, participant_id')
    .eq('session_id', sessionId)
    .not('submitted_at', 'is', null)

  if (!submissions || submissions.length < 2) {
    return Response.json({ error: 'Need at least 2 submissions to start peer review.' }, { status: 400 })
  }

  // Fisher-Yates shuffle, then assign each reviewer the next submission in the
  // same shuffled order (circular). Since every element is distinct, shuffled[k]
  // can never equal shuffled[(k+1) % n], so nobody is ever assigned their own
  // submission, everyone reviews exactly one submission, and every submission is
  // reviewed exactly once.
  const shuffled = [...submissions]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  const assignments = shuffled.map((reviewer, k) => ({
    session_id: sessionId,
    reviewer_id: reviewer.participant_id,
    submission_id: shuffled[(k + 1) % shuffled.length].id,
  }))

  // Insert assignments BEFORE flipping the phase — students' clients react to the
  // phase change immediately (via Realtime/polling) and fetch their assignment
  // once at that moment, so the assignment rows must already exist by then.
  const { error: assignError } = await supabase.from('review_assignments').insert(assignments)

  if (assignError) {
    if (assignError.code === '23505') {
      // Lost a double-click race — another request already inserted assignments.
      const { count } = await supabase
        .from('review_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sessionId)
      return Response.json({ ok: true, assignments: count ?? 0, already_started: true })
    }
    return Response.json({ error: assignError.message }, { status: 500 })
  }

  const { error: phaseError } = await supabase
    .from('sessions')
    .update({ phase: 'review', review_started_at: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('phase', 'writing')

  if (phaseError) return Response.json({ error: phaseError.message }, { status: 500 })

  return Response.json({ ok: true, assignments: assignments.length })
}
