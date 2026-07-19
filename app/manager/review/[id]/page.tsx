'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { ScoreSelector } from '@/components/ScoreSelector'
import type { Review, Profile, ReviewPeriod, PartC } from '@/lib/types'
import { REVIEW_CATEGORIES, OPEN_QUESTIONS_MANAGER, FIT_OPTIONS, ORG_VALUES, MIN_OPEN_CHARS } from '@/lib/types'

type FullReview = Review & { employee: Profile; period: ReviewPeriod }

export default function ManagerReviewPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [review, setReview] = useState<FullReview | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState(0)
  const [formError, setFormError] = useState('')

  useEffect(() => { loadReview() }, [id])

  async function loadReview() {
    const supabase = createClient()
    const { data } = await supabase
      .from('reviews')
      .select('*, employee:profiles!reviews_employee_id_fkey(*), period:review_periods(*)')
      .eq('id', id)
      .single()
    if (data) setReview(data as FullReview)
    setLoading(false)
  }

  const autoSave = useCallback(async (updated: FullReview) => {
    setSaving(true)
    const supabase = createClient()
    await supabase.from('reviews').update({
      manager_scores: updated.manager_scores,
      manager_open: updated.manager_open,
      goals: updated.goals,
      values_assessment: updated.values_assessment,
      fit_assessment: updated.fit_assessment,
      final_score: updated.final_score,
      final_score_override: updated.final_score_override,
      manager_summary: updated.manager_summary,
      part_c: updated.part_c,
      employee_response: updated.employee_response,
      status: updated.status,
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
    update({ manager_scores: { ...review.manager_scores, [key]: score } })
  }

  function updateOpen(field: string, value: string) {
    if (!review) return
    update({ manager_open: { ...review.manager_open, [field]: value } })
  }

  function updatePartC(patch: Partial<PartC>) {
    if (!review) return
    update({ part_c: { ...(review.part_c || {}), ...patch } })
  }

  function isVisible(q: { conditionalOn?: { id: string; value: string } }) {
    if (!q.conditionalOn) return true
    return review?.manager_open[q.conditionalOn.id] === q.conditionalOn.value
  }

  function validate(): string | null {
    if (!review) return 'שגיאה'
    for (const cat of REVIEW_CATEGORIES) {
      for (const item of cat.items) {
        if (review.manager_scores[`${cat.id}__${item}`] === undefined) return 'יש לדרג את כל השאלות בחלק א׳ (דירוגים)'
      }
    }
    for (const q of OPEN_QUESTIONS_MANAGER) {
      if (!isVisible(q)) continue
      const val = (review.manager_open[q.id] || '').trim()
      if (q.type === 'yesno') {
        if (val !== 'yes' && val !== 'no') return 'יש לענות על כל השאלות בחלק ב׳'
      } else if (val.length < MIN_OPEN_CHARS) {
        return `יש לענות על כל השאלות הפתוחות (לפחות ${MIN_OPEN_CHARS} תווים)`
      }
    }
    if (!review.fit_assessment) return 'יש לבחור התאמה לתפקיד (חלק ב׳)'
    if (!(review.manager_summary || '').trim()) return 'יש למלא סיכום שנתי (חלק ג׳)'
    return null
  }

  function calcAutoScore(): 1 | 2 | 3 {
    if (!review) return 2
    const scores = Object.values(review.manager_scores).filter(s => s > 0)
    if (!scores.length) return 2
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
    if (avg >= 3.5) return 3
    if (avg >= 2.5) return 2
    return 1
  }

  type RowField = 'achievements' | 'improvements'
  function addRow(field: RowField) {
    const rows = [...(review?.part_c?.[field] || []), { title: '', detail: '' }]
    updatePartC({ [field]: rows })
  }
  function setRow(field: RowField, i: number, patch: Partial<{ title: string; detail: string }>) {
    const rows = [...(review?.part_c?.[field] || [])]
    rows[i] = { ...rows[i], ...patch }
    updatePartC({ [field]: rows })
  }
  function delRow(field: RowField, i: number) {
    const rows = [...(review?.part_c?.[field] || [])]
    rows.splice(i, 1)
    updatePartC({ [field]: rows })
  }
  function goalTable(field: RowField, title: string) {
    const rows = review?.part_c?.[field] || []
    return (
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between" style={{ background: '#f3eeff' }}>
          <h3 className="font-bold text-gray-800">{title}</h3>
          {!isReadonly && <button onClick={() => addRow(field)} className="text-sm text-purple-600 hover:text-purple-800 font-medium">+ הוסף</button>}
        </div>
        <div className="p-6 space-y-3">
          {rows.length === 0 && <p className="text-gray-400 text-sm text-center py-2">אין רשומות. לחץ &quot;+ הוסף&quot;.</p>}
          {rows.map((r, i) => (
            <div key={i} className="flex gap-2 items-start">
              <input value={r.title} onChange={e => !isReadonly && setRow(field, i, { title: e.target.value })} readOnly={isReadonly} placeholder="יעד" className="w-1/3 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-300" />
              <input value={r.detail} onChange={e => !isReadonly && setRow(field, i, { detail: e.target.value })} readOnly={isReadonly} placeholder="פירוט" className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-300" />
              {!isReadonly && <button onClick={() => delRow(field, i)} className="text-red-400 hover:text-red-600 text-xs pt-2">הסר</button>}
            </div>
          ))}
        </div>
      </div>
    )
  }

  async function reopenForEditing() {
    if (!review) return
    if (!window.confirm('לפתוח מחדש את המשוב לעריכה? בסיום השינויים תצטרך/י לאשר ולהדפיס/לשלוח מחדש.')) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('reviews').update({
      status: 'in_progress',
      approved_at: null,
      summary_sent_at: null,
    }).eq('id', id)
    setSaving(false)
    loadReview()
  }

  async function approveReview() {
    if (!review) return
    const err = validate()
    if (err) {
      setFormError(err)
      if (err.includes('חלק א׳')) setActiveSection(0)
      else if (err.includes('חלק ב׳')) setActiveSection(1)
      else setActiveSection(2)
      return
    }
    setFormError('')
    setSaving(true)
    const supabase = createClient()
    const finalScore = review.final_score_override ? review.final_score : calcAutoScore()
    await supabase.from('reviews').update({
      status: 'completed',
      approved_at: new Date().toISOString(),
      final_score: finalScore,
      manager_scores: review.manager_scores,
      manager_open: review.manager_open,
      goals: review.goals,
      values_assessment: review.values_assessment,
      fit_assessment: review.fit_assessment,
      manager_summary: review.manager_summary,
      part_c: review.part_c,
      employee_response: review.employee_response,
    }).eq('id', id)

    setSaving(false)
    // No more automatic email — manager downloads/sends the summary as a PDF instead
    // (see /manager/review/[id]/summary), which also carries the send-it-yourself reminder.
    router.push(`/manager/review/${id}/summary`)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ background: '#f8f5ff' }}><div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div></div>
  if (!review) return <div className="min-h-screen flex items-center justify-center text-gray-400">משוב לא נמצא</div>

  const isReadonly = review.status === 'completed'
  const sections = ['חלק א׳ – דירוגים', 'חלק ב׳ – שאלות פתוחות', 'חלק ג׳ – יעדים וסיכום']
  const autoScore = calcAutoScore()

  return (
    <div className="min-h-screen" style={{ background: '#f8f5ff', direction: 'rtl' }}>
      <header className="text-white shadow-lg" style={{ background: 'linear-gradient(135deg, #4A2D7F, #6B46C1)' }}>
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <button onClick={() => router.push('/manager')} className="text-white/70 hover:text-white text-sm mb-1 flex items-center gap-1">
                ← חזרה
              </button>
              <h1 className="text-xl font-bold">{review.employee?.full_name}</h1>
              <p className="text-xs opacity-70">{review.period?.name} · {review.period?.type === 'semi_annual' ? 'חצי שנתי' : 'שנתי'}</p>
            </div>
            <div className="flex items-center gap-3 text-sm">
              {saving && <span className="opacity-70">שומר...</span>}
              {saved && <span className="text-green-300">✓ נשמר</span>}
              {isReadonly && (
                <>
                  <span className="bg-green-500 px-3 py-1 rounded-full text-xs font-medium">הושלם</span>
                  <button
                    onClick={() => router.push(`/manager/review/${id}/summary`)}
                    className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full text-xs font-medium"
                  >
                    📄 סיכום להדפסה/שליחה
                  </button>
                  <button
                    onClick={reopenForEditing}
                    className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full text-xs font-medium"
                  >
                    🔓 פתיחה מחדש לעריכה
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Section tabs */}
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

      <main className="max-w-4xl mx-auto px-6 py-8">
        {formError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-5">{formError}</div>
        )}
        {/* Section A – Scores */}
        {activeSection === 0 && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm p-4 text-sm text-gray-600">
              <p className="font-semibold text-gray-800 mb-2">סקאלת הדירוג:</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1">
                <span><b>1</b> – מתחת לציפיות</span>
                <span><b>2</b> – נדרש שיפור</span>
                <span><b>3</b> – עומד בציפיות</span>
                <span><b>4</b> – מעל הציפיות</span>
                <span><b>0</b> – לא רלוונטי</span>
              </div>
            </div>
            {/* Employee scores side by side */}
            {Object.keys(review.employee_scores).length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-700">
                💡 משוב עצמי של העובד זמין להשוואה בטבלה למטה
              </div>
            )}

            {REVIEW_CATEGORIES.map(cat => (
              <div key={cat.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100" style={{ background: '#f3eeff' }}>
                  <h3 className="font-bold text-gray-800">{cat.label}</h3>
                </div>
                <div className="divide-y divide-gray-50">
                  {cat.items.map(item => {
                    const key = `${cat.id}__${item}`
                    const empScore = review.employee_scores[key]
                    const mgrScore = review.manager_scores[key]
                    const hasDiff = empScore !== undefined && mgrScore !== undefined && empScore !== mgrScore

                    return (
                      <div key={item} className={`px-6 py-4 ${hasDiff ? 'bg-yellow-50/50' : ''}`}>
                        <div className="flex items-start justify-between flex-wrap gap-4">
                          <p className="text-sm text-gray-700 flex-1 pt-1">{item}</p>
                          <div className="flex flex-col gap-2 items-end">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400 w-16 text-left">מנהל:</span>
                              <ScoreSelector value={mgrScore} onChange={v => !isReadonly && updateScore(cat.id, item, v)} readonly={isReadonly} />
                            </div>
                            {empScore !== undefined && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-blue-400 w-16 text-left">עובד:</span>
                                <ScoreSelector value={empScore} readonly />
                              </div>
                            )}
                          </div>
                        </div>
                        {hasDiff && <p className="text-xs text-yellow-600 mt-2">⚠️ פער בדירוג – מומלץ לדון בשיחה</p>}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
            {!isReadonly && (
              <button onClick={() => setActiveSection(1)} className="w-full py-3 rounded-2xl text-white font-semibold" style={{ background: 'linear-gradient(135deg, #4A2D7F, #6B46C1)' }}>
                המשך לשאלות הפתוחות ←
              </button>
            )}
          </div>
        )}

        {/* Section B – Open questions */}
        {activeSection === 1 && (
          <div className="space-y-5">
            {OPEN_QUESTIONS_MANAGER.filter(isVisible).map(q => (
              <div key={q.id} className="bg-white rounded-2xl shadow-sm p-6">
                <label className="font-semibold text-gray-800 block mb-3">
                  {q.label}
                  {q.internal && <span className="mr-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">פנימי – לא נשלח לעובד</span>}
                </label>
                {review.employee_open[q.id] && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-3 text-sm text-blue-700">
                    <span className="font-medium">תשובת העובד: </span>
                    {q.type === 'yesno' ? (review.employee_open[q.id] === 'yes' ? 'כן' : 'לא') : review.employee_open[q.id]}
                  </div>
                )}
                {q.type === 'yesno' ? (
                  <div className="flex gap-3">
                    {([['yes', 'כן'], ['no', 'לא']] as const).map(([val, lbl]) => (
                      <button
                        key={val}
                        type="button"
                        disabled={isReadonly}
                        onClick={() => !isReadonly && updateOpen(q.id, val)}
                        className={`px-8 py-2 rounded-xl border-2 text-sm font-medium ${review.manager_open[q.id] === val ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-500'}`}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                ) : (
                  <textarea
                    value={review.manager_open[q.id] || ''}
                    onChange={e => !isReadonly && updateOpen(q.id, e.target.value)}
                    readOnly={isReadonly}
                    rows={4}
                    placeholder={`כתוב את התייחסותך (לפחות ${MIN_OPEN_CHARS} תווים)...`}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none"
                  />
                )}
              </div>
            ))}

            <div className="bg-white rounded-2xl shadow-sm p-6">
              <label className="font-semibold text-gray-800 block mb-3">התאמה לתפקיד</label>
              <div className="flex flex-wrap gap-3">
                {FIT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={isReadonly}
                    onClick={() => !isReadonly && update({ fit_assessment: opt.value })}
                    className={`px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all ${review.fit_assessment === opt.value ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-500'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            {!isReadonly && (
              <button onClick={() => setActiveSection(2)} className="w-full py-3 rounded-2xl text-white font-semibold" style={{ background: 'linear-gradient(135deg, #4A2D7F, #6B46C1)' }}>
                המשך לחלק ג׳ (יעדים וסיכום) ←
              </button>
            )}
          </div>
        )}

        {/* Section C – Goals & Summary */}
        {activeSection === 2 && (
          <div className="space-y-6">
            {/* Goals: achievements & improvements */}
            {goalTable('achievements', 'הישגים (משימות ויעדים בהם הצליח)')}
            {goalTable('improvements', 'לשיפור (משימות ויעדים שבהם לא עמד)')}

            {/* Unit & department goals */}
            <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
              <h3 className="font-bold text-gray-800">יעדים (מילוי ע"י המנהל)</h3>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">יעדי היחידה</label>
                <textarea value={review.part_c?.unit_goals || ''} onChange={e => !isReadonly && updatePartC({ unit_goals: e.target.value })} readOnly={isReadonly} rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-purple-300" />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">יעדי מחלקה</label>
                <textarea value={review.part_c?.dept_goals || ''} onChange={e => !isReadonly && updatePartC({ dept_goals: e.target.value })} readOnly={isReadonly} rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-purple-300" />
              </div>
            </div>

            {/* Organizational values */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100" style={{ background: '#f3eeff' }}>
                <h3 className="font-bold text-gray-800">עבודה בהתאם לערכי החברה</h3>
              </div>
              <div className="p-6 space-y-4">
                {ORG_VALUES.map(v => (
                  <div key={v.id}>
                    <p className="font-medium text-gray-800 text-sm">{v.value}</p>
                    <p className="text-xs text-gray-400 mb-1">{v.desc}</p>
                    <textarea
                      value={review.part_c?.org_values?.[v.id] || ''}
                      onChange={e => !isReadonly && updatePartC({ org_values: { ...(review.part_c?.org_values || {}), [v.id]: e.target.value } })}
                      readOnly={isReadonly}
                      rows={2}
                      placeholder="כיצד זה מתבטא בעבודתו?"
                      className="w-full border border-gray-100 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-purple-300"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Final score */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="font-bold text-gray-800 mb-4">סיכום הערכה</h3>
              <div className="flex items-center gap-4 mb-4">
                <span className="text-sm text-gray-600">ציון מחושב אוטומטית:</span>
                <span className="text-2xl font-bold" style={{ color: '#4A2D7F' }}>{autoScore}</span>
                <span className="text-sm text-gray-400">מתוך 3</span>
              </div>
              {!isReadonly && (
                <div className="flex items-center gap-3 mb-4">
                  <input
                    type="checkbox"
                    id="override"
                    checked={review.final_score_override}
                    onChange={e => update({ final_score_override: e.target.checked, final_score: autoScore })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="override" className="text-sm text-gray-600">עקוף ידנית</label>
                </div>
              )}
              {review.final_score_override && !isReadonly && (
                <div className="flex gap-3">
                  {[1, 2, 3].map(s => (
                    <button key={s} type="button" onClick={() => update({ final_score: s as 1 | 2 | 3 })}
                      className={`w-14 h-14 rounded-xl border-2 text-xl font-bold transition-all ${review.final_score === s ? 'border-purple-500 bg-purple-50 text-purple-700 scale-110' : 'border-gray-200 text-gray-400'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <label className="font-bold text-gray-800 block mb-3">סיכום שנתי / חצי שנתי</label>
              <textarea
                value={review.manager_summary || ''}
                onChange={e => !isReadonly && update({ manager_summary: e.target.value })}
                readOnly={isReadonly}
                rows={5}
                placeholder="כתוב סיכום כולל..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none"
              />
            </div>

            {/* Employee response – recorded by the manager during the conversation */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <label className="font-bold text-gray-800 block mb-1">התייחסות העובד לסיכום</label>
              <p className="text-xs text-gray-400 mb-3">רשום/מי כאן את מה שהעובד אמר בשיחת המשוב.</p>
              <textarea
                value={review.employee_response || ''}
                onChange={e => !isReadonly && update({ employee_response: e.target.value })}
                readOnly={isReadonly}
                rows={3}
                placeholder="התייחסות העובד כפי שנאמרה בשיחה..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none"
              />
            </div>

            {!isReadonly && (
              <button
                onClick={approveReview}
                disabled={saving}
                className="w-full py-4 rounded-2xl text-white text-lg font-bold transition-opacity disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #4A2D7F, #6B46C1)' }}
              >
                {saving ? 'שומר...' : '✓ אישור המשוב'}
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

