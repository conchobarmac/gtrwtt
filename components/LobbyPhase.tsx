export function LobbyPhase() {
  return (
    <div className="text-center py-24">
      <div className="inline-flex items-center gap-2 mb-4">
        <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <h2 className="text-xl font-semibold text-slate-700 mb-2">Waiting to start</h2>
      <p className="text-slate-400 text-sm">Your facilitator will start the session shortly.</p>
    </div>
  )
}
