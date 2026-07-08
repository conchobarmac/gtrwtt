import { createServiceClient } from '@/lib/supabase/server'
import { generateAlias } from '@/lib/aliases'

const UNIQUE_VIOLATION = '23505'
const MAX_ATTEMPTS = 20

export async function POST(req: Request) {
  const { session_id } = await req.json()

  if (!session_id) {
    return Response.json({ error: 'Missing session_id.' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const { count } = await supabase
      .from('participants')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', session_id)

    const alias = generateAlias((count ?? 0) + attempt)

    const { data, error } = await supabase
      .from('participants')
      .insert({ session_id, alias })
      .select()
      .single()

    if (!error) {
      return Response.json(data)
    }

    if (error.code !== UNIQUE_VIOLATION) {
      return Response.json({ error: error.message }, { status: 500 })
    }
    // Alias collision from a concurrent joiner — re-read the count and retry.
  }

  return Response.json({ error: 'Failed to join session. Please try again.' }, { status: 500 })
}
