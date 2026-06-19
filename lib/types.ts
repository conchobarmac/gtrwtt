export type Phase = 'lobby' | 'writing' | 'review' | 'complete'

export interface Session {
  id: string
  join_code: string
  phase: Phase
  writing_started_at: string | null
  review_started_at: string | null
  writing_duration_seconds: number
  review_duration_seconds: number
}

export interface Participant {
  id: string
  session_id: string
  alias: string
}

export interface Submission {
  id: string
  session_id: string
  participant_id: string
  content: string | null
  submitted_at: string | null
}

export interface ReviewAssignment {
  id: string
  session_id: string
  reviewer_id: string
  submission_id: string
}

export interface Review {
  id: string
  assignment_id: string
  session_id: string
  comments: string | null
  submitted_at: string | null
}

export interface Insight {
  id: string
  session_id: string
  content: InsightContent
  generated_at: string
}

export interface InsightContent {
  strengths: string[]
  weaknesses: string[]
  exemplary_paragraphs: { alias: string; text: string; reason: string }[]
  summary: string
}
