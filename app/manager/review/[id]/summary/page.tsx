'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Review, Profile, ReviewPeriod } from '@/lib/types'
import { REVIEW_CATEGORIES, OPEN_QUESTIONS_MANAGER } from '@/lib/types'

type FullReview = Review & { employee: Profile; period: ReviewPeriod }

// Employee-safe printable summary — mirrors exactly what used to go in the employee
// email (per-item manager scores, non-internal open questions, manager summary, final
// score). Deliberately excludes fit_assessment, the internal "promotion" question, and
// the employee's own self-review, none of which the employee should see here.
export default function ManagerReviewSummaryPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [review, setReview] = useState<FullReview | null>(null)
  const [loading, setLoading] = useState(true)

  const [marking, setMarking] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('reviews')
      .select('*, employee:profiles!reviews_employee_id_fkey(*), period:review_periods(*)')
      .eq('id', id)
      .single()
      .then(({ data }) => { if (data) setReview(data as FullReview); setLoading(false) })
  }, [id])

  async function printAndMarkSent() {
    window.print()
    if (review?.summary_sent_at || marking) return
    setMarking(true)
    const supabase = createClient()
    const now = new Date().toISOString()
    await supabase.from('reviews').update({ summary_sent_at: now }).eq('id', id)
    setReview(r => r && { ...r, summary_sent_at: now })
    setMarking(false)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ background: '#f8f5ff' }}><div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div></div>
  if (!review) return <div className="min-h-screen flex items-center justify-center text-gray-400">משוב לא נמצא</div>

  const sent = !!review.summary_sent_at

  return (
    <div className="min-h-screen" style={{ background: '#f8f5ff', direction: 'rtl' }}>
      <header className="text-white shadow-lg print:hidden" style={{ background: 'linear-gradient(135deg, #4A2D7F, #6B46C1)' }}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <button onClick={() => router.push('/manager')} className="text-white/70 hover:text-white text-sm mb-1">← חזרה לפאנל</button>
            <h1 className="text-xl font-bold">סיכום משוב לעובד: {review.employee?.full_name}</h1>
          </div>
          <button
            onClick={printAndMarkSent}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${sent ? 'bg-green-500 text-white' : 'bg-white/20 hover:bg-white/30 text-white'}`}
          >
            {sent ? '✓ הודפס / נשלח' : '🖨️ הדפסה / שמירה כ-PDF'}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div className={`border-2 rounded-2xl p-5 print:hidden ${sent ? 'bg-green-50 border-green-300' : 'bg-yellow-50 border-yellow-300'}`}>
          <p className={`text-lg font-bold mb-1 ${sent ? 'text-green-800' : 'text-yellow-800'}`}>
            {sent ? '✓ סומן כנשלח' : '⚠️ המשוב אושר — עכשיו צריך לשלוח אותו הלאה'}
          </p>
          <p className={`text-sm ${sent ? 'text-green-800' : 'text-yellow-800'}`}>
            שמרו את הדף הזה כ-PDF (הכפתור למעלה) ושלחו אותו <b>גם לעובד/ת וגם למשאבי אנוש</b>, במייל או בכל דרך אחרת.
          </p>
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-bold" style={{ color: '#4A2D7F' }}>סיכום המשוב שלך – Isotopia</h1>
          <p className="text-gray-700 mt-1">{review.employee?.full_name} · {review.period?.name}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="font-bold text-lg text-purple-800 mb-4">דירוגים</h2>
          {REVIEW_CATEGORIES.map(cat => (
            <div key={cat.id} className="mb-4">
              <h3 className="font-semibold text-gray-800 mb-2">{cat.label}</h3>
              {cat.items.map(item => {
                const score = review.manager_scores[`${cat.id}__${item}`]
                return (
                  <div key={item} className="flex justify-between text-sm py-1 border-b border-gray-50">
                    <span className="text-gray-700 flex-1">{item}</span>
                    <span className="text-gray-500 w-16 text-left">{score !== undefined ? score : '—'}</span>
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <h2 className="font-bold text-lg text-purple-800">שאלות פתוחות</h2>
          {OPEN_QUESTIONS_MANAGER.filter(q => !q.internal).map(q => {
            const v = review.manager_open[q.id]
            if (!v) return null
            const display = q.type === 'yesno' ? (v === 'yes' ? 'כן' : 'לא') : v
            return (
              <div key={q.id}>
                <p className="font-medium text-gray-800 text-sm">{q.label}</p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{display}</p>
              </div>
            )
          })}
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-2">
          {review.manager_summary && (
            <div>
              <p className="font-bold text-lg text-purple-800 mb-1">סיכום המנהל</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{review.manager_summary}</p>
            </div>
          )}
          <p className="text-base pt-2"><b>ציון סופי:</b> {review.final_score || '—'} מתוך 3</p>
        </div>
      </main>
    </div>
  )
}
