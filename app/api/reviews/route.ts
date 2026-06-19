import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const { assignment_id, session_id, comments, submitted } = await req.json()

  if (!assignment_id || !session_id) {
    return Response.json({ error: 'Missing required fields.' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  const { data, error } = await supabase
    .from('reviews')
    .upsert(
      {
        assignment_id,
        session_id,
        comments,
        submitted_at: submitted ? new Date().toISOString() : null,
      },
      { onConflict: 'assignment_id' }
    )
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
