import { createServiceClient } from '@/lib/supabase/server'

export async function POST(_req: Request, ctx: RouteContext<'/api/sessions/[id]/start-review'>) {
  const { id: sessionId } = await ctx.params
  const supabase = await createServiceClient()

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

  // Fisher-Yates shuffle, ensure nobody reviews their own submission
  const shuffled = [...submissions]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  // Assign: participant i reviews submission i+1 (circular), skipping self
  const assignments: { session_id: string; reviewer_id: string; submission_id: string }[] = []

  for (let i = 0; i < submissions.length; i++) {
    const reviewer = submissions[i]
    // Find the next submission in the shuffled list that isn't their own
    let target = shuffled[(i + 1) % shuffled.length]
    let attempts = 0
    while (target.participant_id === reviewer.participant_id && attempts < shuffled.length) {
      target = shuffled[(i + 1 + attempts) % shuffled.length]
      attempts++
    }
    if (target.participant_id === reviewer.participant_id) continue
    assignments.push({
      session_id: sessionId,
      reviewer_id: reviewer.participant_id,
      submission_id: target.id,
    })
  }

  if (assignments.length === 0) {
    return Response.json({ error: 'Could not create review assignments.' }, { status: 400 })
  }

  const { error: assignError } = await supabase.from('review_assignments').insert(assignments)
  if (assignError) return Response.json({ error: assignError.message }, { status: 500 })

  const { error: phaseError } = await supabase
    .from('sessions')
    .update({ phase: 'review', review_started_at: new Date().toISOString() })
    .eq('id', sessionId)

  if (phaseError) return Response.json({ error: phaseError.message }, { status: 500 })

  return Response.json({ ok: true, assignments: assignments.length })
}
