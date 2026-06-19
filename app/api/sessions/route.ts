import { createServiceClient } from '@/lib/supabase/server'
import { generateJoinCode } from '@/lib/aliases'

export async function POST() {
  const supabase = await createServiceClient()

  let joinCode = generateJoinCode()
  let attempts = 0

  // Retry on collision (astronomically unlikely but safe)
  while (attempts < 5) {
    const { data, error } = await supabase
      .from('sessions')
      .insert({ join_code: joinCode })
      .select()
      .single()

    if (!error && data) {
      return Response.json({ id: data.id, join_code: data.join_code })
    }
    joinCode = generateJoinCode()
    attempts++
  }

  return Response.json({ error: 'Failed to create session.' }, { status: 500 })
}
