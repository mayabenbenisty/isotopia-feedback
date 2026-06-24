'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Profile, Review, ReviewPeriod } from '@/lib/types'

type ReviewWithDetails = Review & {
  employee: Profile
  manager: Profile
  period: ReviewPeriod
}

type Stats = {
  total: number
  pending: number
  in_progress: number
  employee_done: number
  completed: number
}

export default function HRDashboard() {
  const router = useRouter()
  const [reviews, setReviews] = useState<ReviewWithDetails[]>([])
  const [periods, setPeriods] = useState<ReviewPeriod[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all')
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, in_progress: 0, employee_done: 0, completed: 0 })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'employees' | 'periods'>('dashboard')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'hr') { router.push('/'); return }

    const [{ data: periodsData }, { data: reviewsData }] = await Promise.all([
      supabase.from('review_periods').select('*').order('created_at', { ascending: false }),
      supabase.from('reviews').select('*, employee:profiles!reviews_employee_id_fkey(*), manager:profiles!reviews_manager_id_fkey(*), period:review_periods(*)').order('created_at', { ascending: false }),
    ])

    setPeriods(periodsData || [])
    setReviews((reviewsData || []) as ReviewWithDetails[])
    calcStats(reviewsData || [])
    setLoading(false)
  }

  function calcStats(data: Review[]) {
    const s: Stats = { total: data.length, pending: 0, in_progress: 0, employee_done: 0, completed: 0 }
    data.forEach(r => { s[r.status as keyof Stats] = (s[r.status as keyof Stats] || 0) + 1 })
    setStats(s)
  }

  const filtered = selectedPeriod === 'all' ? reviews : reviews.filter(r => r.period_id === selectedPeriod)

  function statusLabel(s: string) {
    return { pending: 'ממתין', employee_done: 'עובד סיים', in_progress: 'בתהליך', completed: 'הושלם' }[s] || s
  }

  function statusColor(s: string) {
    return {
      pending: 'bg-gray-100 text-gray-600',
      employee_done: 'bg-blue-100 text-blue-700',
      in_progress: 'bg-yellow-100 text-yellow-700',
      completed: 'bg-green-100 text-green-700',
    }[s] || 'bg-gray-100 text-gray-600'
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  async function downloadCSV() {
    const rows = [
      ['שם עובד', 'מנהל', 'תקופה', 'סטטוס', 'ציון סופי'],
      ...filtered.map(r => [
        r.employee?.full_name,
        r.manager?.full_name,
        r.period?.name,
        statusLabel(r.status),
        r.final_score || '',
      ])
    ]
    const csv = '﻿' + rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'feedback-report.csv'
    a.click()
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f8f5ff' }}>
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">טוען נתונים...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: '#f8f5ff', direction: 'rtl' }}>
      {/* Header */}
      <header className="text-white shadow-lg" style={{ background: 'linear-gradient(135deg, #4A2D7F, #6B46C1)' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="text-xl">📊</span>
            </div>
            <div>
              <h1 className="text-xl font-bold">מערכת משוב | Isotopia</h1>
              <p className="text-xs opacity-70">פאנל ניהול HR</p>
            </div>
          </div>
          <button onClick={handleLogout} className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-sm transition-colors">
            התנתקות
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-6 flex gap-2 pb-0">
          {[
            { id: 'dashboard', label: 'דשבורד' },
            { id: 'employees', label: 'עובדים ומנהלים' },
            { id: 'periods', label: 'תקופות משוב' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-5 py-3 text-sm font-medium rounded-t-xl transition-colors ${activeTab === tab.id ? 'bg-white text-purple-800' : 'text-white/70 hover:text-white'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'dashboard' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              {[
                { label: 'סה״כ משובים', value: stats.total, color: '#4A2D7F' },
                { label: 'ממתינים', value: stats.pending, color: '#6B7280' },
                { label: 'עובד סיים', value: stats.employee_done, color: '#3B82F6' },
                { label: 'בתהליך', value: stats.in_progress, color: '#F59E0B' },
                { label: 'הושלמו', value: stats.completed, color: '#10B981' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm text-center">
                  <p className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-sm text-gray-500 mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Filter + Download */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">סנן לפי תקופה:</label>
                <select
                  value={selectedPeriod}
                  onChange={e => setSelectedPeriod(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                >
                  <option value="all">כל התקופות</option>
                  {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <button
                onClick={downloadCSV}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium transition-opacity hover:opacity-90"
                style={{ background: '#4A2D7F' }}
              >
                <span>⬇️</span> ייצוא לאקסל
              </button>
            </div>

            {/* Reviews table */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: '#f3eeff' }}>
                    <th className="text-right px-5 py-4 font-semibold text-gray-700">שם עובד</th>
                    <th className="text-right px-5 py-4 font-semibold text-gray-700">מנהל</th>
                    <th className="text-right px-5 py-4 font-semibold text-gray-700">תקופה</th>
                    <th className="text-right px-5 py-4 font-semibold text-gray-700">סטטוס</th>
                    <th className="text-right px-5 py-4 font-semibold text-gray-700">ציון סופי</th>
                    <th className="px-5 py-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-12 text-gray-400">אין משובים להצגה</td></tr>
                  )}
                  {filtered.map((r, i) => (
                    <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className="px-5 py-4 font-medium text-gray-800">{r.employee?.full_name}</td>
                      <td className="px-5 py-4 text-gray-600">{r.manager?.full_name}</td>
                      <td className="px-5 py-4 text-gray-600">{r.period?.name}</td>
                      <td className="px-5 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor(r.status)}`}>
                          {statusLabel(r.status)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-600">{r.final_score || '—'}</td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => router.push(`/hr/review/${r.id}`)}
                          className="text-purple-600 hover:text-purple-800 text-xs font-medium"
                        >
                          צפה
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'employees' && <EmployeesTab />}
        {activeTab === 'periods' && <PeriodsTab periods={periods} onRefresh={loadData} />}
      </main>
    </div>
  )
}

function EmployeesTab() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ full_name: '', email: '', role: 'employee', site: 'israel', manager_id: '', password: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { loadProfiles() }, [])

  async function loadProfiles() {
    const supabase = createClient()
    const { data } = await supabase.from('profiles').select('*').order('full_name')
    setProfiles(data || [])
    setLoading(false)
  }

  async function addUser() {
    setSaving(true)
    setMsg('')
    const res = await fetch('/api/add-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json()
    if (json.error) setMsg('שגיאה: ' + json.error)
    else { setMsg('המשתמש נוצר בהצלחה!'); setShowAdd(false); loadProfiles() }
    setSaving(false)
  }

  const managers = profiles.filter(p => p.role === 'manager')

  if (loading) return <div className="text-center py-12 text-gray-400">טוען...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">עובדים ומנהלים ({profiles.length})</h2>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 rounded-xl text-white text-sm font-medium"
          style={{ background: '#4A2D7F' }}
        >
          + הוספת משתמש
        </button>
      </div>

      {showAdd && (
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 border-2 border-purple-100">
          <h3 className="font-bold text-gray-800 mb-4">הוספת משתמש חדש</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">שם מלא</label>
              <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">אימייל</label>
              <input type="email" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" style={{ direction: 'ltr' }} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">סיסמה ראשונית</label>
              <input type="password" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">תפקיד</label>
              <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="employee">עובד</option>
                <option value="manager">מנהל</option>
                <option value="hr">HR</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">אתר</label>
              <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={form.site} onChange={e => setForm(f => ({ ...f, site: e.target.value }))}>
                <option value="israel">ישראל</option>
                <option value="usa">ארה״ב</option>
              </select>
            </div>
            {form.role === 'employee' && (
              <div>
                <label className="text-sm text-gray-600 mb-1 block">מנהל ישיר</label>
                <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={form.manager_id} onChange={e => setForm(f => ({ ...f, manager_id: e.target.value }))}>
                  <option value="">בחר מנהל</option>
                  {managers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                </select>
              </div>
            )}
          </div>
          {msg && <p className={`mt-3 text-sm ${msg.includes('שגיאה') ? 'text-red-600' : 'text-green-600'}`}>{msg}</p>}
          <div className="flex gap-3 mt-4">
            <button onClick={addUser} disabled={saving} className="px-6 py-2 rounded-xl text-white text-sm font-medium disabled:opacity-60" style={{ background: '#4A2D7F' }}>
              {saving ? 'שומר...' : 'שמירה'}
            </button>
            <button onClick={() => setShowAdd(false)} className="px-6 py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-600">ביטול</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: '#f3eeff' }}>
              <th className="text-right px-5 py-4 font-semibold text-gray-700">שם</th>
              <th className="text-right px-5 py-4 font-semibold text-gray-700">אימייל</th>
              <th className="text-right px-5 py-4 font-semibold text-gray-700">תפקיד</th>
              <th className="text-right px-5 py-4 font-semibold text-gray-700">אתר</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p, i) => (
              <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                <td className="px-5 py-4 font-medium text-gray-800">{p.full_name}</td>
                <td className="px-5 py-4 text-gray-600" style={{ direction: 'ltr' }}>{p.email}</td>
                <td className="px-5 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${p.role === 'hr' ? 'bg-purple-100 text-purple-700' : p.role === 'manager' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                    {p.role === 'hr' ? 'HR' : p.role === 'manager' ? 'מנהל' : 'עובד'}
                  </span>
                </td>
                <td className="px-5 py-4 text-gray-600">{p.site === 'israel' ? '🇮🇱 ישראל' : '🇺🇸 ארה״ב'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PeriodsTab({ periods, onRefresh }: { periods: ReviewPeriod[], onRefresh: () => void }) {
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'semi_annual', site: 'israel', start_date: '', end_date: '' })
  const [saving, setSaving] = useState(false)

  async function addPeriod() {
    setSaving(true)
    const supabase = createClient()
    await supabase.from('review_periods').insert(form)
    setSaving(false)
    setShowAdd(false)
    onRefresh()
  }

  async function toggleActive(id: string, current: boolean) {
    const supabase = createClient()
    await supabase.from('review_periods').update({ is_active: !current }).eq('id', id)
    onRefresh()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">תקופות משוב</h2>
        <button onClick={() => setShowAdd(!showAdd)} className="px-4 py-2 rounded-xl text-white text-sm font-medium" style={{ background: '#4A2D7F' }}>
          + תקופה חדשה
        </button>
      </div>

      {showAdd && (
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 border-2 border-purple-100">
          <h3 className="font-bold text-gray-800 mb-4">הוספת תקופת משוב</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">שם התקופה</label>
              <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" placeholder='למשל: "חצי שנתי 2025"' value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">סוג</label>
              <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="semi_annual">חצי שנתי</option>
                <option value="annual">שנתי</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">אתר</label>
              <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={form.site} onChange={e => setForm(f => ({ ...f, site: e.target.value }))}>
                <option value="israel">ישראל</option>
                <option value="usa">ארה״ב</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">תאריך התחלה</label>
              <input type="date" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">תאריך סיום</label>
              <input type="date" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={addPeriod} disabled={saving} className="px-6 py-2 rounded-xl text-white text-sm font-medium disabled:opacity-60" style={{ background: '#4A2D7F' }}>
              {saving ? 'שומר...' : 'שמירה'}
            </button>
            <button onClick={() => setShowAdd(false)} className="px-6 py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-600">ביטול</button>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {periods.map(p => (
          <div key={p.id} className="bg-white rounded-2xl shadow-sm p-5 flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-800">{p.name}</p>
              <p className="text-sm text-gray-500 mt-1">
                {p.type === 'semi_annual' ? 'חצי שנתי' : 'שנתי'} · {p.site === 'israel' ? '🇮🇱 ישראל' : '🇺🇸 ארה״ב'} · {p.start_date} עד {p.end_date}
              </p>
            </div>
            <button
              onClick={() => toggleActive(p.id, p.is_active)}
              className={`px-4 py-2 rounded-xl text-sm font-medium ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
            >
              {p.is_active ? '✓ פעיל' : 'לא פעיל'}
            </button>
          </div>
        ))}
        {periods.length === 0 && <p className="text-center text-gray-400 py-8">אין תקופות משוב עדיין</p>}
      </div>
    </div>
  )
}
