'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { buildChildrenMap } from '@/lib/orgTree'
import TeamReviewTree from '@/components/TeamReviewTree'
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'employees' | 'periods' | 'view_as_manager'>('dashboard')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }

    const { data: profile } = await supabase.from('profiles').select('role, must_change_password').eq('id', user.id).single()
    if (profile?.must_change_password) { router.push('/change-password'); return }
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
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1">
              <Image src="/logo.png" alt="Isotopia" width={32} height={32} style={{ objectFit: 'contain' }} />
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
            { id: 'view_as_manager', label: 'צפייה כמנהל' },
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
        {activeTab === 'view_as_manager' && <ViewAsManagerTab reviews={reviews} />}
      </main>
    </div>
  )
}

// --- CSV import helpers ---
type ImportRow = {
  employee_number: string
  full_name: string
  email: string | null
  department: string | null
  site: string
  location: string | null
  role: 'hr' | 'manager' | 'employee'
  manager_employee_number: string | null
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let field = '', row: string[] = [], inQuotes = false
  const s = text.replace(/^﻿/, '') // strip BOM
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (inQuotes) {
      if (c === '"') { if (s[i + 1] === '"') { field += '"'; i++ } else inQuotes = false }
      else field += c
    } else {
      if (c === '"') inQuotes = true
      else if (c === ',') { row.push(field); field = '' }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
      else if (c === '\r') { /* ignore */ }
      else field += c
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row) }
  return rows.filter(r => r.some(c => c.trim() !== ''))
}

function mapHeader(h: string): keyof ImportRow | 'first_name' | 'last_name' | 'manager_name' | null {
  const t = h.replace(/`/g, '').trim()
  if (t.includes('מס') && t.includes('מנהל')) return 'manager_employee_number'
  if (t.includes('מס') && t.includes('עובד')) return 'employee_number'
  if (t.includes('פרטי')) return 'first_name'
  if (t.includes('משפחה')) return 'last_name'
  if (t.includes('מייל') || t.toLowerCase().includes('mail')) return 'email'
  if (t.includes('מחלקה')) return 'department'
  if (t.includes('אתר')) return 'site'
  if (t.includes('מיקום')) return 'location'
  if (t.includes('תפקיד')) return 'role'
  return null // e.g. "מנהל ישיר" (name) — ignored
}

function normalizeRole(v: string): 'hr' | 'manager' | 'employee' {
  const t = (v || '').trim().toLowerCase()
  if (t.includes('hr') || t.includes('אנוש')) return 'hr'
  if (t.includes('מנהל') || t === 'manager') return 'manager'
  return 'employee'
}

function normalizeSite(v: string): string {
  const t = (v || '').trim()
  if (t.includes('רה') || t.toLowerCase().includes('usa')) return 'usa'
  return 'israel'
}

function rowsFromCSV(text: string): ImportRow[] {
  const grid = parseCSV(text)
  if (grid.length < 2) return []
  const headers = grid[0].map(mapHeader)
  const out: ImportRow[] = []
  for (let i = 1; i < grid.length; i++) {
    const cells = grid[i]
    const rec: Record<string, string> = {}
    headers.forEach((key, idx) => { if (key) rec[key] = (cells[idx] || '').trim() })
    const empNo = (rec.employee_number || '').trim()
    if (!empNo) continue
    const full = `${rec.first_name || ''} ${rec.last_name || ''}`.trim()
    out.push({
      employee_number: empNo,
      full_name: full,
      email: rec.email ? rec.email.trim() : null,
      department: rec.department || null,
      site: normalizeSite(rec.site),
      location: rec.location || null,
      role: normalizeRole(rec.role),
      manager_employee_number: rec.manager_employee_number ? rec.manager_employee_number.trim() : null,
    })
  }
  return out
}

function EmployeesTab() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ full_name: '', employee_number: '', email: '', role: 'employee', site: 'israel', location: '', department: '', manager_id: '', password: 'Isotopia2026' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [empFilter, setEmpFilter] = useState<'active' | 'inactive'>('active')
  const [importRows, setImportRows] = useState<ImportRow[]>([])
  const [importResult, setImportResult] = useState<{ created: number; updated: number; errors: string[] } | null>(null)
  const [importing, setImporting] = useState(false)
  const [importErr, setImportErr] = useState('')
  const [editUser, setEditUser] = useState<Profile | null>(null)
  const [editForm, setEditForm] = useState<Partial<Profile>>({})
  const [editSaving, setEditSaving] = useState(false)
  const [editMsg, setEditMsg] = useState('')

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
    else {
      setMsg('המשתמש נוצר בהצלחה!')
      setShowAdd(false)
      setForm({ full_name: '', employee_number: '', email: '', role: 'employee', site: 'israel', location: '', department: '', manager_id: '', password: 'Isotopia2026' })
      loadProfiles()
    }
    setSaving(false)
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    setImportRows(rowsFromCSV(text))
    setImportResult(null)
    setImportErr('')
  }

  async function runImport() {
    setImporting(true)
    setImportErr('')
    setImportResult(null)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/bulk-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: session?.access_token, rows: importRows }),
    })
    const json = await res.json()
    if (json.error) setImportErr(json.error)
    else { setImportResult(json); setImportRows([]); loadProfiles() }
    setImporting(false)
  }

  function openEdit(p: Profile) {
    setEditUser(p)
    setEditForm({
      full_name: p.full_name,
      role: p.role,
      site: p.site,
      location: p.location,
      department: p.department,
      manager_id: p.manager_id || '',
      active: p.active !== false,
    })
    setEditMsg('')
  }

  async function callAdmin(action: string, body: Record<string, unknown>) {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: session?.access_token, id: editUser?.id, action, ...body }),
    })
    return res.json()
  }

  async function saveEdit() {
    setEditSaving(true); setEditMsg('')
    const json = await callAdmin('save', { fields: editForm })
    if (json.error) setEditMsg('שגיאה: ' + json.error)
    else { setEditUser(null); loadProfiles() }
    setEditSaving(false)
  }

  async function resetPwd() {
    setEditSaving(true); setEditMsg('')
    const json = await callAdmin('resetPassword', {})
    if (json.error) setEditMsg('שגיאה: ' + json.error)
    else setEditMsg('✓ הסיסמה אופסה ל-Isotopia2026. העובד יתבקש להחליף בכניסה הבאה.')
    setEditSaving(false)
  }

  async function deleteUser() {
    if (!editUser) return
    if (!window.confirm(`למחוק לצמיתות את ${editUser.full_name}?\nהפעולה בלתי הפיכה ותמחק גם את המשובים המשויכים אליו.`)) return
    setEditSaving(true); setEditMsg('')
    const json = await callAdmin('delete', {})
    if (json.error) setEditMsg('שגיאה: ' + json.error)
    else { setEditUser(null); loadProfiles() }
    setEditSaving(false)
  }

  const managers = profiles.filter(p => p.role === 'manager')
  const activeProfiles = profiles.filter(p => p.active !== false)
  const inactiveProfiles = profiles.filter(p => p.active === false)
  const shown = empFilter === 'active' ? activeProfiles : inactiveProfiles

  if (loading) return <div className="text-center py-12 text-gray-400">טוען...</div>

  return (
    <div>
      {/* Bulk import from CSV */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 border-2 border-dashed border-purple-200">
        <h3 className="font-bold text-gray-800 mb-1">📥 ייבוא עובדים מקובץ</h3>
        <p className="text-sm text-gray-500 mb-4">
          שמרי את קובץ האקסל בתור <b>CSV UTF-8</b> (קובץ → שמירה בשם → סוג: &quot;CSV UTF-8&quot;), והעלי אותו כאן.
          עובדים חדשים ייווצרו עם סיסמה זמנית <b>Isotopia2026</b> (יתבקשו להחליף בכניסה הראשונה). ריצה חוזרת רק מעדכנת, לא כופלת.
        </p>
        <input type="file" accept=".csv,text/csv" onChange={handleFile} className="text-sm" />
        {importRows.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-gray-700 mb-2">
              זוהו <b>{importRows.length}</b> עובדים בקובץ
              {' '}(מנהלים: {importRows.filter(r => r.role === 'manager').length},
              {' '}עובדים: {importRows.filter(r => r.role === 'employee').length},
              {' '}HR: {importRows.filter(r => r.role === 'hr').length}).
            </p>
            <button
              onClick={runImport}
              disabled={importing}
              className="px-6 py-2 rounded-xl text-white text-sm font-medium disabled:opacity-60"
              style={{ background: '#4A2D7F' }}
            >
              {importing ? 'מייבא... (עשוי לקחת דקה)' : `ייבא ${importRows.length} עובדים`}
            </button>
          </div>
        )}
        {importErr && <p className="mt-3 text-sm text-red-600">שגיאה: {importErr}</p>}
        {importResult && (
          <div className="mt-3 text-sm bg-green-50 border border-green-200 rounded-xl p-3">
            <p className="text-green-700 font-medium">
              ✓ הייבוא הסתיים — נוצרו {importResult.created}, עודכנו {importResult.updated}.
            </p>
            {importResult.errors.length > 0 && (
              <div className="mt-2 text-red-600">
                <p className="font-medium">שגיאות ({importResult.errors.length}):</p>
                <ul className="list-disc pr-5 max-h-32 overflow-auto">
                  {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">עובדים ומנהלים</h2>
        <button
          onClick={() => {
            if (!showAdd) { setForm({ full_name: '', employee_number: '', email: '', role: 'employee', site: 'israel', location: '', department: '', manager_id: '', password: 'Isotopia2026' }); setMsg('') }
            setShowAdd(!showAdd)
          }}
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
              <label className="text-sm text-gray-600 mb-1 block">מספר עובד</label>
              <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" style={{ direction: 'ltr' }} value={form.employee_number} onChange={e => setForm(f => ({ ...f, employee_number: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">אימייל (לא חובה — כניסה למערכת היא תמיד לפי מספר עובד)</label>
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
            <div>
              <label className="text-sm text-gray-600 mb-1 block">מיקום</label>
              <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}>
                <option value="">בחר מיקום</option>
                <option value="פתח תקווה">פתח תקווה</option>
                <option value="מודיעין">מודיעין</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">מחלקה</label>
              <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
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

      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setEmpFilter('active')}
          className={`px-4 py-2 rounded-xl text-sm font-medium ${empFilter === 'active' ? 'text-white' : 'bg-gray-100 text-gray-500'}`}
          style={empFilter === 'active' ? { background: '#4A2D7F' } : undefined}
        >
          פעילים ({activeProfiles.length})
        </button>
        <button
          onClick={() => setEmpFilter('inactive')}
          className={`px-4 py-2 rounded-xl text-sm font-medium ${empFilter === 'inactive' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-500'}`}
        >
          עזבו ({inactiveProfiles.length})
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-2">💡 לחצי על שורה כדי לערוך עובד (תפקיד, מנהל/צוות, מיקום, סטטוס, איפוס סיסמה). עובד שמסומן &quot;עזב&quot; עובר לרשימת ה&quot;עזבו&quot; ולא מופיע כאן.</p>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: '#f3eeff' }}>
              <th className="text-right px-5 py-4 font-semibold text-gray-700">שם</th>
              <th className="text-right px-5 py-4 font-semibold text-gray-700">מס׳ עובד</th>
              <th className="text-right px-5 py-4 font-semibold text-gray-700">אימייל</th>
              <th className="text-right px-5 py-4 font-semibold text-gray-700">מחלקה</th>
              <th className="text-right px-5 py-4 font-semibold text-gray-700">תפקיד</th>
              <th className="text-right px-5 py-4 font-semibold text-gray-700">מיקום</th>
              <th className="text-right px-5 py-4 font-semibold text-gray-700">מצב</th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">{empFilter === 'active' ? 'אין עובדים פעילים' : 'אין עובדים שעזבו'}</td></tr>
            )}
            {shown.map((p, i) => (
              <tr
                key={p.id}
                onClick={() => openEdit(p)}
                className={`cursor-pointer hover:bg-purple-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} ${p.active === false ? 'opacity-50' : ''}`}
              >
                <td className="px-5 py-4 font-medium text-gray-800">{p.full_name}</td>
                <td className="px-5 py-4 text-gray-500" style={{ direction: 'ltr' }}>{p.employee_number || '—'}</td>
                <td className="px-5 py-4 text-gray-500" style={{ direction: 'ltr' }}>{p.email || '—'}</td>
                <td className="px-5 py-4 text-gray-600">{p.department || '—'}</td>
                <td className="px-5 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${p.role === 'hr' ? 'bg-purple-100 text-purple-700' : p.role === 'manager' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                    {p.role === 'hr' ? 'HR' : p.role === 'manager' ? 'מנהל' : 'עובד'}
                  </span>
                </td>
                <td className="px-5 py-4 text-gray-600">{p.location || (p.site === 'usa' ? '🇺🇸' : '🇮🇱')}</td>
                <td className="px-5 py-4">
                  {p.active === false
                    ? <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">עזב</span>
                    : <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">פעיל</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit employee modal */}
      {editUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setEditUser(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg text-gray-800">{editUser.full_name}</h3>
                <p className="text-sm text-gray-400" style={{ direction: 'ltr' }}>
                  מס׳ עובד {editUser.employee_number || '—'} · {editUser.email || 'ללא מייל'}
                </p>
              </div>
              <button onClick={() => setEditUser(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">שם מלא</label>
                <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={editForm.full_name || ''} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">תפקיד</label>
                <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value as Profile['role'] }))}>
                  <option value="employee">עובד</option>
                  <option value="manager">מנהל</option>
                  <option value="hr">HR</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">מנהל ישיר</label>
                <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={editForm.manager_id || ''} onChange={e => setEditForm(f => ({ ...f, manager_id: e.target.value }))}>
                  <option value="">— ללא מנהל (ראש היררכיה) —</option>
                  {managers.filter(m => m.id !== editUser.id).map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">מחלקה</label>
                <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={editForm.department || ''} onChange={e => setEditForm(f => ({ ...f, department: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">מיקום</label>
                <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={editForm.location || ''} onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))}>
                  <option value="">בחר מיקום</option>
                  <option value="פתח תקווה">פתח תקווה</option>
                  <option value="מודיעין">מודיעין</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">אתר</label>
                <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" value={editForm.site} onChange={e => setEditForm(f => ({ ...f, site: e.target.value as Profile['site'] }))}>
                  <option value="israel">ישראל</option>
                  <option value="usa">ארה״ב</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between bg-gray-50 rounded-xl p-3">
              <div>
                <p className="text-sm font-medium text-gray-700">סטטוס עובד</p>
                <p className="text-xs text-gray-400">עובד שעזב לא יוכל להתחבר, אך היסטוריית המשובים שלו נשמרת.</p>
              </div>
              <button
                onClick={() => setEditForm(f => ({ ...f, active: !(f.active !== false) }))}
                className={`px-4 py-2 rounded-xl text-sm font-medium ${editForm.active !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
              >
                {editForm.active !== false ? '✓ פעיל' : 'עזב'}
              </button>
            </div>

            {editMsg && <p className={`mt-3 text-sm ${editMsg.includes('שגיאה') ? 'text-red-600' : 'text-green-600'}`}>{editMsg}</p>}

            <div className="flex flex-wrap gap-3 mt-5">
              <button onClick={saveEdit} disabled={editSaving} className="px-6 py-2 rounded-xl text-white text-sm font-medium disabled:opacity-60" style={{ background: '#4A2D7F' }}>
                {editSaving ? 'שומר...' : 'שמירת שינויים'}
              </button>
              <button onClick={resetPwd} disabled={editSaving} className="px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-600">
                איפוס סיסמה
              </button>
              <button onClick={deleteUser} disabled={editSaving} className="px-4 py-2 rounded-xl text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50">
                מחיקת עובד
              </button>
              <button onClick={() => setEditUser(null)} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-500">ביטול</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PeriodsTab({ periods, onRefresh }: { periods: ReviewPeriod[], onRefresh: () => void }) {
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'semi_annual', site: 'israel', start_date: '', end_date: '' })
  const [saving, setSaving] = useState(false)
  const [openingId, setOpeningId] = useState<string | null>(null)
  const [openMsg, setOpenMsg] = useState('')
  const [periodMsg, setPeriodMsg] = useState('')

  async function openPeriod(id: string) {
    setOpeningId(id); setOpenMsg('')
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/open-period', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: session?.access_token, period_id: id }),
    })
    const json = await res.json()
    if (json.error) setOpenMsg('שגיאה: ' + json.error)
    else setOpenMsg(`✓ נפתחו ${json.created} משובים חדשים (${json.skipped} כבר היו קיימים).`)
    setOpeningId(null)
    onRefresh()
  }

  async function deletePeriod(id: string, name: string) {
    if (!window.confirm(`למחוק את תקופת "${name}"?\nפעולה זו תמחק גם את כל המשובים שנפתחו בתקופה הזו. בלתי הפיך.`)) return
    setOpenMsg('')
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/delete-period', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: session?.access_token, period_id: id }),
    })
    const json = await res.json()
    if (json.error) setOpenMsg('שגיאה: ' + json.error)
    else { setOpenMsg('✓ התקופה נמחקה.'); onRefresh() }
  }

  async function addPeriod() {
    setPeriodMsg('')
    if (!form.name.trim()) { setPeriodMsg('יש להזין שם תקופה'); return }
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('review_periods').insert({
      name: form.name.trim(),
      type: form.type,
      site: form.site,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      is_active: true,
    })
    setSaving(false)
    if (error) { setPeriodMsg('שגיאה: ' + error.message); return }
    setShowAdd(false)
    setForm({ name: '', type: 'semi_annual', site: 'israel', start_date: '', end_date: '' })
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
          {periodMsg && <p className={`mt-3 text-sm ${periodMsg.includes('שגיאה') ? 'text-red-600' : 'text-green-600'}`}>{periodMsg}</p>}
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
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => openPeriod(p.id)}
                disabled={openingId === p.id}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-60"
                style={{ background: '#4A2D7F' }}
              >
                {openingId === p.id ? 'פותח...' : '📝 פתיחת משובים לעובדים'}
              </button>
              <button
                onClick={() => toggleActive(p.id, p.is_active)}
                className={`px-4 py-2 rounded-xl text-sm font-medium ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
              >
                {p.is_active ? '✓ פעיל' : 'לא פעיל'}
              </button>
              <button
                onClick={() => deletePeriod(p.id, p.name)}
                className="px-3 py-2 rounded-xl text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50"
              >
                מחיקה
              </button>
            </div>
          </div>
        ))}
        {openMsg && <p className={`text-sm ${openMsg.includes('שגיאה') ? 'text-red-600' : 'text-green-600'}`}>{openMsg}</p>}
        {periods.length === 0 && <p className="text-center text-gray-400 py-8">אין תקופות משוב עדיין</p>}
      </div>
    </div>
  )
}

// Lets HR see exactly what a manager's own panel shows (their whole unit, cascaded
// down through any sub-managers, + review status), reusing HR's already-unrestricted
// read access — no login-as-user, no password reset. Always read-only (links to the
// existing /hr/review/[id] view), regardless of how deep the selected manager's unit goes.
function ViewAsManagerTab({ reviews }: { reviews: ReviewWithDetails[] }) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedManagerId, setSelectedManagerId] = useState('')

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const { data } = await supabase.from('profiles').select('*').order('full_name')
      setProfiles(data || [])
      setLoading(false)
    })()
  }, [])

  const managers = profiles.filter(p => p.role === 'manager' && p.active !== false)
  const selectedManager = profiles.find(p => p.id === selectedManagerId)
  const childrenMap = buildChildrenMap(profiles)
  const directReportsCount = (childrenMap.get(selectedManagerId) ?? []).length

  if (loading) return <div className="text-center py-12 text-gray-400">טוען...</div>

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">צפייה כמנהל</h2>
      <p className="text-sm text-gray-500 mb-5">
        בחרי מנהל כדי לראות בדיוק את היחידה שלו (כולל צוותים של מנהלים תחתיו, אם יש) והמשובים — לצפייה בלבד, בלי להתחבר בתור המנהל ובלי לגעת בסיסמה שלו.
      </p>

      <div className="mb-6">
        <label className="text-sm text-gray-600 mb-1 block">מנהל</label>
        <select
          className="w-full max-w-sm border border-gray-200 rounded-xl px-3 py-2 text-sm"
          value={selectedManagerId}
          onChange={e => setSelectedManagerId(e.target.value)}
        >
          <option value="">בחר מנהל...</option>
          {managers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
        </select>
      </div>

      {selectedManagerId && (
        <>
          <p className="text-sm text-gray-500 mb-4">
            פאנל מנהל של <b>{selectedManager?.full_name}</b> | {directReportsCount} עובדים בצוות הישיר
          </p>
          <TeamReviewTree
            managerId={selectedManagerId}
            childrenMap={childrenMap}
            reviews={reviews}
            viewerId=""
            editLinkBase="/hr/review"
            readOnlyLinkBase="/hr/review"
            getActiveLabel={() => 'צפייה במשוב'}
          />
        </>
      )}
    </div>
  )
}
