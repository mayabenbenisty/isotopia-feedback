'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { ScoreSelector } from '@/components/ScoreSelector'
import type { Review, ReviewPeriod } from '@/lib/types'
import { REVIEW_CATEGORIES, OPEN_QUESTIONS_EMPLOYEE } from '@/lib/types'

type FullReview = Review & { period: ReviewPeriod }

export default function EmployeeReviewPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [review, setReview] = useState<FullReview | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState(0)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => { loadReview() }, [id])

  async function loadReview() {
    const supabase = createClient()
    const { data } = await supabase
      .from('reviews')
      .select('*, period:review_periods(*)')
      .eq('id', id)
      .single()
    if (data) setReview(data as FullReview)
    setLoading(false)
  }

  const autoSave = useCallback(async (updated: FullReview) => {
    setSaving(true)
    const supabase = createClient()
    await supabase.from('reviews').update({
      employee_scores: updated.employee_scores,
      employee_open: updated.employee_open,
      employee_response: updated.employee_response,
    }).eq('id', id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [id])

  function update(patch: Partial<FullReview>) {
    if (!review) return
    const updated = { ...review, ...patch }
    setReview(updated)
    autoSave(updated)
  }

  function updateScore(cat: string, item: string, score: number) {
    if (!review) return
    const key = `${cat}__${item}`
    update({ employee_scores: { ...review.employee_scores, [key]: score } })
  }

  function updateOpen(field: string, value: string) {
    if (!review) return
    update({ employee_open: { ...review.employee_open, [field]: value } })
  }

  async function submitSelfReview() {
    setSaving(true)
    const supabase = createClient()
    await supabase.from('reviews').update({ status: 'employee_done' }).eq('id', id)
    setSaving(false)
    setSubmitted(true)
    setTimeout(() => router.push('/employee'), 2000)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ background: '#f8f5ff' }}><div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div></div>
  if (!review) return <div className="min-h-screen flex items-center justify-center text-gray-400">משוב לא נמצא</div>

  const isReadonly = review.status === 'completed' || review.status === 'in_progress'
  const sections = ['חלק א׳ – דירוגים', 'חלק ב׳ – שאלות פתוחות']
  if (review.status === 'completed') sections.push('התייחסות לסיכום')

  return (
    <div className="min-h-screen" style={{ background: '#f8f5ff', direction: 'rtl' }}>
      <header className="text-white shadow-lg" style={{ background: 'linear-gradient(135deg, #4A2D7F, #6B46C1)' }}>
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <button onClick={() => router.push('/employee')} className="text-white/70 hover:text-white text-sm mb-1">← חזרה</button>
              <h1 className="text-xl font-bold">משוב עצמי</h1>
              <p className="text-xs opacity-70">{review.period?.name}</p>
            </div>
            <div className="text-sm">
              {saving && <span className="opacity-70">שומר...</span>}
              {saved && <span className="text-green-300">✓ נשמר</span>}
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            {sections.map((s, i) => (
              <button key={i} onClick={() => setActiveSection(i)}
                className={`px-4 py-2 rounded-t-xl text-sm font-medium transition-colors ${activeSection === i ? 'bg-white text-purple-800' : 'text-white/70 hover:text-white'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </header>

      {submitted && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 text-center shadow-2xl">
            <p className="text-4xl mb-3">✅</p>
            <p className="text-xl font-bold text-gray-800">המשוב הוגש בהצלחה!</p>
            <p className="text-gray-500 mt-2">מעביר אותך חזרה...</p>
          </div>
        </div>
      )}

      <main className="max-w-3xl mx-auto px-6 py-8">
        {isReadonly && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6 text-sm text-blue-700">
            {review.status === 'completed' ? '✅ המשוב הושלם. אתה רואה את הסיכום הסופי.' : '⏳ המנהל שלך ממלא כעת את המשוב.'}
          </div>
        )}

        {activeSection === 0 && (
          <div className="space-y-6">
            {REVIEW_CATEGORIES.map(cat => (
              <div key={cat.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100" style={{ background: '#f3eeff' }}>
                  <h3 className="font-bold text-gray-800">{cat.label}</h3>
                </div>
                <div className="divide-y divide-gray-50">
                  {cat.items.map(item => (
                    <div key={item} className="px-6 py-4 flex items-center justify-between flex-wrap gap-4">
                      <p className="text-sm text-gray-700 flex-1">{item}</p>
                      <ScoreSelector
                        value={review.employee_scores[`${cat.id}__${item}`]}
                        onChange={v => !isReadonly && updateScore(cat.id, item, v)}
                        readonly={isReadonly}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeSection === 1 && (
          <div className="space-y-5">
            {OPEN_QUESTIONS_EMPLOYEE.map(q => (
              <div key={q.id} className="bg-white rounded-2xl shadow-sm p-6">
                <label className="font-semibold text-gray-800 block mb-3">{q.label}</label>
                <textarea
                  value={review.employee_open[q.id] || ''}
                  onChange={e => !isReadonly && updateOpen(q.id, e.target.value)}
                  readOnly={isReadonly}
                  rows={4}
                  placeholder="כתוב את תשובתך..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none"
                />
              </div>
            ))}

            {!isReadonly && (
              <button
                onClick={submitSelfReview}
                disabled={saving}
                className="w-full py-4 rounded-2xl text-white text-lg font-bold disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #4A2D7F, #6B46C1)' }}
              >
                {saving ? 'שולח...' : '✓ הגשת המשוב העצמי'}
              </button>
            )}
          </div>
        )}

        {activeSection === 2 && review.status === 'completed' && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <label className="font-bold text-gray-800 block mb-3">התייחסות לסיכום המנהל</label>
            <textarea
              value={review.employee_response || ''}
              onChange={e => update({ employee_response: e.target.value })}
              rows={5}
              placeholder="כתוב את התייחסותך לסיכום..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none"
            />
          </div>
        )}
      </main>
    </div>
  )
}
