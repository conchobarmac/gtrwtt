import { createServiceClient } from '@/lib/supabase/server'

export async function POST(_req: Request, ctx: RouteContext<'/api/sessions/[id]/start-writing'>) {
  const { id } = await ctx.params
  const supabase = await createServiceClient()

  const { error } = await supabase
    .from('sessions')
    .update({ phase: 'writing', writing_started_at: new Date().toISOString() })
    .eq('id', id)
    .eq('phase', 'lobby')

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
