'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Review, Profile, ReviewPeriod } from '@/lib/types'
import { REVIEW_CATEGORIES, OPEN_QUESTIONS_MANAGER, OPEN_QUESTIONS_EMPLOYEE, FIT_OPTIONS, ORG_VALUES } from '@/lib/types'

type FullReview = Review & { employee: Profile; manager: Profile; period: ReviewPeriod }

const SCORE_LABEL: Record<number, string> = { 0: 'לא רלוונטי', 1: 'מתחת לציפיות', 2: 'נדרש שיפור', 3: 'עומד בציפיות', 4: 'מעל הציפיות' }

export default function HRReviewPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [review, setReview] = useState<FullReview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('reviews')
      .select('*, employee:profiles!reviews_employee_id_fkey(*), manager:profiles!reviews_manager_id_fkey(*), period:review_periods(*)')
      .eq('id', id)
      .single()
      .then(({ data }) => { if (data) setReview(data as FullReview); setLoading(false) })
  }, [id])

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ background: '#f8f5ff' }}><div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div></div>
  if (!review) return <div className="min-h-screen flex items-center justify-center text-gray-400">משוב לא נמצא</div>

  const fitLabel = FIT_OPTIONS.find(o => o.value === review.fit_assessment)?.label

  return (
    <div className="min-h-screen" style={{ background: '#f8f5ff', direction: 'rtl' }}>
      <header className="text-white shadow-lg print:hidden" style={{ background: 'linear-gradient(135deg, #4A2D7F, #6B46C1)' }}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <button onClick={() => router.push('/hr')} className="text-white/70 hover:text-white text-sm mb-1">← חזרה</button>
            <h1 className="text-xl font-bold">משוב: {review.employee?.full_name}</h1>
            <p className="text-xs opacity-70">מנהל: {review.manager?.full_name} · {review.period?.name}</p>
          </div>
          <button onClick={() => window.print()} className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-sm">🖨️ הדפסה</button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Part A – scores */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="font-bold text-lg text-purple-800 mb-4">חלק א׳ – דירוגים</h2>
          {REVIEW_CATEGORIES.map(cat => (
            <div key={cat.id} className="mb-4">
              <h3 className="font-semibold text-gray-800 mb-2">{cat.label}</h3>
              {cat.items.map(item => {
                const key = `${cat.id}__${item}`
                const emp = review.employee_scores[key]
                const mgr = review.manager_scores[key]
                return (
                  <div key={item} className="flex justify-between text-sm py-1 border-b border-gray-50">
                    <span className="text-gray-700 flex-1">{item}</span>
                    <span className="text-gray-500 w-40 text-left">
                      מנהל: {mgr !== undefined ? `${mgr} (${SCORE_LABEL[mgr]})` : '—'}
                      {emp !== undefined && <span className="text-blue-400"> · עובד: {emp}</span>}
                    </span>
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Part B – open + fit + promotion */}
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <h2 className="font-bold text-lg text-purple-800">חלק ב׳ – שאלות פתוחות</h2>
          {OPEN_QUESTIONS_MANAGER.map(q => {
            const v = review.manager_open[q.id]
            if (!v) return null
            const display = q.type === 'yesno' ? (v === 'yes' ? 'כן' : 'לא') : v
            return (
              <div key={q.id}>
                <p className="font-medium text-gray-800 text-sm">{q.label} {q.internal && <span className="text-xs text-gray-400">(פנימי)</span>}</p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{display}</p>
              </div>
            )
          })}
          {fitLabel && (
            <div>
              <p className="font-medium text-gray-800 text-sm">התאמה לתפקיד <span className="text-xs text-gray-400">(פנימי)</span></p>
              <p className="text-sm text-gray-600">{fitLabel}</p>
            </div>
          )}
          <div className="border-t border-gray-100 pt-4">
            <p className="font-medium text-gray-500 text-sm mb-2">תשובות המשוב העצמי של העובד:</p>
            {OPEN_QUESTIONS_EMPLOYEE.map(q => {
              const v = review.employee_open[q.id]
              if (!v) return null
              const display = q.type === 'yesno' ? (v === 'yes' ? 'כן' : 'לא') : v
              return <div key={q.id} className="mb-2"><p className="text-sm text-gray-700">{q.label}</p><p className="text-sm text-gray-500 whitespace-pre-wrap">{display}</p></div>
            })}
          </div>
        </div>

        {/* Part C */}
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-3">
          <h2 className="font-bold text-lg text-purple-800">חלק ג׳ – יעדים, ערכים וסיכום</h2>
          {review.part_c?.unit_goals && <p className="text-sm"><b>יעדי היחידה:</b> {review.part_c.unit_goals}</p>}
          {review.part_c?.dept_goals && <p className="text-sm"><b>יעדי מחלקה:</b> {review.part_c.dept_goals}</p>}
          <div className="pt-2">
            <p className="font-medium text-gray-800 text-sm mb-1">ערכי החברה</p>
            {ORG_VALUES.map(val => review.part_c?.org_values?.[val.id]
              ? <p key={val.id} className="text-sm text-gray-600"><b>{val.value}:</b> {review.part_c.org_values[val.id]}</p>
              : null)}
          </div>
          <div className="border-t border-gray-100 pt-3">
            <p className="text-sm"><b>ציון סופי:</b> {review.final_score || '—'} מתוך 3</p>
            {review.manager_summary && <p className="text-sm mt-2"><b>סיכום המנהל:</b><br />{review.manager_summary}</p>}
            {review.employee_response && <p className="text-sm mt-2"><b>התייחסות העובד:</b><br />{review.employee_response}</p>}
          </div>
        </div>
      </main>
    </div>
  )
}
