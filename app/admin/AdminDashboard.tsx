'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function AdminDashboard() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function createSession() {
    setLoading(true)
    setError('')
    const res = await fetch('/api/sessions', { method: 'POST' })
    if (!res.ok) {
      setError('Failed to create session.')
      setLoading(false)
      return
    }
    const { id } = await res.json()
    router.push(`/admin/sessions/${id}`)
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 w-full max-w-md text-center">
        <h1 className="text-2xl font-semibold text-slate-800 mb-2">Workshop Admin</h1>
        <p className="text-slate-500 mb-8">Create a new session to get a join code for participants.</p>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <button
          onClick={createSession}
          disabled={loading}
          className="w-full bg-slate-800 text-white rounded-xl py-3 font-medium hover:bg-slate-700 disabled:opacity-40 transition-colors"
        >
          {loading ? 'Creating...' : 'Create New Session'}
        </button>
      </div>
    </main>
  )
}
