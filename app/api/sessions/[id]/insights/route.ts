import { createServiceClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const INSIGHTS_SCHEMA = {
  type: 'object',
  properties: {
    strengths: { type: 'array', items: { type: 'string' } },
    weaknesses: { type: 'array', items: { type: 'string' } },
    exemplary_paragraphs: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['text', 'reason'],
        additionalProperties: false,
      },
    },
    summary: { type: 'string' },
  },
  required: ['strengths', 'weaknesses', 'exemplary_paragraphs', 'summary'],
  additionalProperties: false,
} as const

export async function POST(_req: Request, ctx: RouteContext<'/api/sessions/[id]/insights'>) {
  const { id: sessionId } = await ctx.params
  const supabase = await createServiceClient()

  // Auto-submit any reviews not yet submitted
  await supabase
    .from('reviews')
    .update({ submitted_at: new Date().toISOString() })
    .eq('session_id', sessionId)
    .is('submitted_at', null)

  // Fetch all submissions + their reviews
  const { data: submissions } = await supabase
    .from('submissions')
    .select('id, content')
    .eq('session_id', sessionId)
    .not('content', 'is', null)

  const { data: reviews } = await supabase
    .from('reviews')
    .select('assignment_id, comments')
    .eq('session_id', sessionId)
    .not('comments', 'is', null)

  const { data: assignments } = await supabase
    .from('review_assignments')
    .select('id, submission_id')
    .eq('session_id', sessionId)

  if (!submissions?.length || !reviews?.length) {
    return Response.json({ error: 'Not enough data to generate insights.' }, { status: 400 })
  }

  // Build a combined view: submission text + review comment(s)
  const submissionMap = Object.fromEntries(submissions.map(s => [s.id, s.content]))
  const assignmentMap = Object.fromEntries((assignments ?? []).map(a => [a.id, a.submission_id]))

  const pairs = reviews
    .filter(r => r.comments?.trim())
    .map(r => {
      const submissionId = assignmentMap[r.assignment_id]
      const text = submissionMap[submissionId] ?? ''
      return { paragraph: text, review: r.comments }
    })
    .filter(p => p.paragraph)

  const prompt = `You are analysing peer review feedback from a technical writing workshop.

Below are ${pairs.length} pairs of (paragraph, peer review comment). Your task is to synthesise insights across ALL of them.

${pairs.map((p, i) => `--- PAIR ${i + 1} ---\nParagraph: ${p.paragraph}\nReview comment: ${p.review}`).join('\n\n')}

Identify 3-5 common strengths and 3-5 common areas for improvement observed across the group, select 2-3 standout paragraphs (using the actual paragraph text) with a reason each, and write a 2-3 sentence overall summary for the facilitator.

Be specific and constructive. Do not identify individuals.`

  const anthropic = new Anthropic()

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 4096,
    thinking: { type: 'adaptive' },
    output_config: { format: { type: 'json_schema', schema: INSIGHTS_SCHEMA } },
    messages: [{ role: 'user', content: prompt }],
  })

  const textBlock = message.content.find((b): b is Anthropic.TextBlock => b.type === 'text')
  let content
  try {
    content = JSON.parse(textBlock?.text ?? '{}')
  } catch {
    return Response.json({ error: 'Failed to parse Claude response.' }, { status: 500 })
  }

  // Add anonymous aliases to exemplary paragraphs
  if (content.exemplary_paragraphs) {
    content.exemplary_paragraphs = content.exemplary_paragraphs.map(
      (ex: { text: string; reason: string }, i: number) => ({ ...ex, alias: `Example ${i + 1}` })
    )
  }

  const { data: insight, error: insightError } = await supabase
    .from('insights')
    .insert({ session_id: sessionId, content })
    .select()
    .single()

  if (insightError) return Response.json({ error: insightError.message }, { status: 500 })

  // Mark session complete
  await supabase
    .from('sessions')
    .update({ phase: 'complete' })
    .eq('id', sessionId)

  return Response.json(insight)
}
