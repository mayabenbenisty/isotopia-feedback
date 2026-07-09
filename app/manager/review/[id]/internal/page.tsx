'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Review, Profile, ReviewPeriod } from '@/lib/types'
import { REVIEW_CATEGORIES, OPEN_QUESTIONS_MANAGER, OPEN_QUESTIONS_EMPLOYEE, FIT_OPTIONS, ORG_VALUES } from '@/lib/types'

type FullReview = Review & { employee: Profile; manager: Profile; period: ReviewPeriod }

const SCORE_LABEL: Record<number, string> = { 0: 'לא רלוונטי', 1: 'מתחת לציפיות', 2: 'נדרש שיפור', 3: 'עומד בציפיות', 4: 'מעל הציפיות' }

// The COMPLETE review, including internal-only fields (fit assessment, promotion
// question) — for filing in the employee's personnel file / for HR. Deliberately
// styled very differently from /manager/review/[id]/summary (which is what actually
// goes to the employee) so the two can never be mixed up at a glance.
export default function ManagerReviewInternalPage() {
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
    <div className="min-h-screen" style={{ background: '#fef2f2', direction: 'rtl' }}>
      <header className="text-white shadow-lg print:hidden" style={{ background: '#7f1d1d' }}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <button onClick={() => router.push(`/manager/review/${id}/summary`)} className="text-white/70 hover:text-white text-sm mb-1">← חזרה לסיכום העובד</button>
            <h1 className="text-xl font-bold">מסמך פנימי מלא: {review.employee?.full_name}</h1>
          </div>
          <button onClick={() => window.print()} className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-sm">🖨️ הדפסה / שמירה כ-PDF</button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div className="border-4 border-red-700 bg-red-100 rounded-2xl p-5 text-center">
          <p className="text-xl font-bold text-red-900">⚠️ מסמך פנימי — לתיוק בתיק העובד בלבד</p>
          <p className="text-red-900 font-semibold mt-1">אסור לשלוח מסמך זה לעובד! כולל פרטים פנימיים (התאמה לתפקיד, המלצת קידום).</p>
          <p className="text-sm text-red-800 mt-1">לגרסה שמותר לשלוח לעובד — <button onClick={() => router.push(`/manager/review/${id}/summary`)} className="underline font-semibold">לחצו כאן</button>.</p>
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-bold" style={{ color: '#7f1d1d' }}>משוב והערכת עובדים – Isotopia (מלא)</h1>
          <p className="text-gray-700 mt-1">
            <b>עובד:</b> {review.employee?.full_name}&nbsp;&nbsp;·&nbsp;&nbsp;<b>מנהל:</b> {review.manager?.full_name}&nbsp;&nbsp;·&nbsp;&nbsp;{review.period?.name}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="font-bold text-lg text-red-800 mb-4">חלק א׳ – דירוגים</h2>
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

        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <h2 className="font-bold text-lg text-red-800">חלק ב׳ – שאלות פתוחות</h2>
          {OPEN_QUESTIONS_MANAGER.map(q => {
            const v = review.manager_open[q.id]
            if (!v) return null
            const display = q.type === 'yesno' ? (v === 'yes' ? 'כן' : 'לא') : v
            return (
              <div key={q.id}>
                <p className="font-medium text-gray-800 text-sm">{q.label} {q.internal && <span className="text-xs font-bold text-red-600">(פנימי)</span>}</p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{display}</p>
              </div>
            )
          })}
          {fitLabel && (
            <div>
              <p className="font-medium text-gray-800 text-sm">התאמה לתפקיד <span className="text-xs font-bold text-red-600">(פנימי)</span></p>
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

        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-3">
          <h2 className="font-bold text-lg text-red-800">חלק ג׳ – יעדים, ערכים וסיכום</h2>
          {review.part_c?.unit_goals && <p className="text-sm"><b>יעדי היחידה:</b> {review.part_c.unit_goals}</p>}
          {review.part_c?.dept_goals && <p className="text-sm"><b>יעדי מחלקה:</b> {review.part_c.dept_goals}</p>}
          {(review.part_c?.achievements?.length ?? 0) > 0 && (
            <div><p className="font-medium text-gray-800 text-sm">הישגים</p>
              {review.part_c!.achievements!.map((r, i) => <p key={i} className="text-sm text-gray-600">• {r.title} — {r.detail}</p>)}
            </div>
          )}
          {(review.part_c?.improvements?.length ?? 0) > 0 && (
            <div><p className="font-medium text-gray-800 text-sm">לשיפור</p>
              {review.part_c!.improvements!.map((r, i) => <p key={i} className="text-sm text-gray-600">• {r.title} — {r.detail}</p>)}
            </div>
          )}
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
