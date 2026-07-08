// Simulates the review-assignment algorithm from
// app/api/sessions/[id]/start-review/route.ts and asserts, across many random
// trials for n = 2..20 participants, that:
//   1. every submission is reviewed exactly once (no double-review, no zero-review)
//   2. every participant reviews exactly one submission
//   3. nobody is ever assigned their own submission
//
// Run with: node scripts/verify-review-shuffle.mjs

const TRIALS_PER_N = 5000
const MIN_N = 2
const MAX_N = 20

function assignReviews(submissions) {
  const shuffled = [...submissions]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.map((reviewer, k) => ({
    reviewer_id: reviewer.participant_id,
    submission_id: shuffled[(k + 1) % shuffled.length].id,
  }))
}

let totalRuns = 0
let selfReviews = 0
let zeroReviewSubmissions = 0
let doubleReviewedSubmissions = 0
let reviewersWithWrongCount = 0

for (let n = MIN_N; n <= MAX_N; n++) {
  const submissions = Array.from({ length: n }, (_, i) => ({
    id: `sub-${i}`,
    participant_id: `p-${i}`,
  }))

  for (let trial = 0; trial < TRIALS_PER_N; trial++) {
    totalRuns++
    const assignments = assignReviews(submissions)

    const reviewCountBySubmission = new Map()
    const reviewCountByReviewer = new Map()

    for (const { reviewer_id, submission_id } of assignments) {
      reviewCountBySubmission.set(submission_id, (reviewCountBySubmission.get(submission_id) ?? 0) + 1)
      reviewCountByReviewer.set(reviewer_id, (reviewCountByReviewer.get(reviewer_id) ?? 0) + 1)

      const targetOwner = submission_id.replace('sub-', 'p-')
      if (targetOwner === reviewer_id) selfReviews++
    }

    for (const sub of submissions) {
      const count = reviewCountBySubmission.get(sub.id) ?? 0
      if (count === 0) zeroReviewSubmissions++
      if (count > 1) doubleReviewedSubmissions++
    }

    for (const sub of submissions) {
      const count = reviewCountByReviewer.get(sub.participant_id) ?? 0
      if (count !== 1) reviewersWithWrongCount++
    }
  }
}

console.log(`Simulated ${totalRuns} runs across n=${MIN_N}..${MAX_N} (${TRIALS_PER_N} trials per n)`)
console.log(`  self-reviews:                ${selfReviews}`)
console.log(`  zero-review submissions:      ${zeroReviewSubmissions}`)
console.log(`  double-reviewed submissions:  ${doubleReviewedSubmissions}`)
console.log(`  reviewers with != 1 review:   ${reviewersWithWrongCount}`)

const ok = selfReviews === 0 && zeroReviewSubmissions === 0 && doubleReviewedSubmissions === 0 && reviewersWithWrongCount === 0

if (!ok) {
  console.error('FAILED: shuffle invariants violated')
  process.exit(1)
}

console.log('PASSED: every submission reviewed exactly once, every reviewer assigned exactly once, no self-review')
