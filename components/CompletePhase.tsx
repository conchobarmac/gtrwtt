interface Props {
  ownParagraph: string | null
  receivedReview: string | null
}

export function CompletePhase({ ownParagraph, receivedReview }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 text-2xl mb-4">✓</div>
        <h2 className="text-xl font-semibold text-slate-700 mb-1">Session complete</h2>
        <p className="text-slate-400 text-sm">Your facilitator will discuss the group insights shortly.</p>
      </div>

      {ownParagraph && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Your paragraph</h3>
          <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{ownParagraph}</p>
        </div>
      )}

      {receivedReview ? (
        <div className="bg-white rounded-2xl border border-amber-200 p-5">
          <h3 className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-3">Feedback you received</h3>
          <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{receivedReview}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 text-center">
          <p className="text-slate-400 text-sm">No feedback was submitted for your paragraph.</p>
        </div>
      )}
    </div>
  )
}
