-- Sessions: one per workshop run
create table sessions (
  id uuid primary key default gen_random_uuid(),
  join_code text unique not null,
  phase text not null default 'lobby', -- lobby | writing | review | complete
  writing_started_at timestamptz,
  review_started_at timestamptz,
  writing_duration_seconds int not null default 1200,
  review_duration_seconds int not null default 600,
  created_at timestamptz default now()
);

-- Participants: anonymous, identified only by alias within a session
create table participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  alias text not null, -- e.g. "Participant 7"
  created_at timestamptz default now(),
  unique(session_id, alias)
);

-- Submissions: the paragraph written by each participant
create table submissions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  participant_id uuid references participants(id) on delete cascade,
  content text,
  submitted_at timestamptz,
  created_at timestamptz default now(),
  unique(session_id, participant_id)
);

-- Review assignments: who reviews whom
create table review_assignments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  reviewer_id uuid references participants(id) on delete cascade,
  submission_id uuid references submissions(id) on delete cascade,
  unique(session_id, reviewer_id)
);

-- Reviews: the peer review comments
create table reviews (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid references review_assignments(id) on delete cascade,
  session_id uuid references sessions(id) on delete cascade,
  comments text,
  submitted_at timestamptz,
  created_at timestamptz default now(),
  unique(assignment_id)
);

-- Insights: generated report, stored so it can be re-displayed
create table insights (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  content jsonb not null,
  generated_at timestamptz default now()
);

-- Row-level security: participants can only see their own session's data
alter table sessions enable row level security;
alter table participants enable row level security;
alter table submissions enable row level security;
alter table review_assignments enable row level security;
alter table reviews enable row level security;
alter table insights enable row level security;

-- Sessions: anyone can read (needed to join by code)
create policy "sessions_read" on sessions for select using (true);

-- Participants: can read others in same session (for alias display), insert own
create policy "participants_read" on participants for select using (true);
create policy "participants_insert" on participants for insert with check (true);

-- Submissions: participants can insert/update their own; read within session
create policy "submissions_read" on submissions for select using (true);
create policy "submissions_insert" on submissions for insert with check (true);
create policy "submissions_update" on submissions for update using (true);

-- Review assignments: read within session
create policy "assignments_read" on review_assignments for select using (true);
create policy "assignments_insert" on review_assignments for insert with check (true);

-- Reviews: insert/update own; read all within session
create policy "reviews_read" on reviews for select using (true);
create policy "reviews_insert" on reviews for insert with check (true);
create policy "reviews_update" on reviews for update using (true);

-- Insights: read all
create policy "insights_read" on insights for select using (true);
create policy "insights_insert" on insights for insert with check (true);
