import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const { session_id, participant_id, content, submitted } = await req.json()

  if (!session_id || !participant_id) {
    return Response.json({ error: 'Missing required fields.' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  const { data, error } = await supabase
    .from('submissions')
    .upsert(
      {
        session_id,
        participant_id,
        content,
        submitted_at: submitted ? new Date().toISOString() : null,
      },
      { onConflict: 'session_id,participant_id' }
    )
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
