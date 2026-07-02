import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const INITIAL_PASSWORD = 'Isotopia2026'

type Row = {
  employee_number: string
  full_name: string
  email: string | null
  department: string | null
  site: string
  location: string | null
  role: 'hr' | 'manager' | 'employee'
  manager_employee_number: string | null
}

export async function POST(req: Request) {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const { token, rows } = (await req.json()) as { token: string; rows: Row[] }

  // --- Authorize: caller must be a logged-in HR / admin ---
  if (!token) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 })
  const { data: userData, error: userErr } = await admin.auth.getUser(token)
  if (userErr || !userData.user) return NextResponse.json({ error: 'הרשאה לא תקינה' }, { status: 401 })
  const { data: caller, error: callerErr } = await admin.from('profiles').select('role, is_admin').eq('id', userData.user.id).single()
  if (!caller || (caller.role !== 'hr' && !caller.is_admin)) {
    return NextResponse.json({
      error: `רק HR יכול לייבא עובדים [dbg uid=${(userData.user.id || '').slice(0, 8)} found=${!!caller} role=${caller?.role ?? '-'} admin=${caller?.is_admin ?? '-'} err=${callerErr?.message ?? '-'}]`,
    }, { status: 403 })
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'לא התקבלו שורות לייבוא' }, { status: 400 })
  }

  const result = { created: 0, updated: 0, errors: [] as string[] }

  // Existing profiles, matched by employee_number or email
  const { data: existingProfiles } = await admin.from('profiles').select('id, email, employee_number')
  const byEmpNo = new Map<string, string>()      // employee_number -> profile id
  const byEmail = new Map<string, string>()       // lower(email) -> profile id
  for (const p of existingProfiles || []) {
    if (p.employee_number) byEmpNo.set(String(p.employee_number), p.id)
    if (p.email) byEmail.set(String(p.email).toLowerCase(), p.id)
  }

  // Existing auth users by email — lets us re-link people whose auth account
  // was already created on a previous (partially failed) run, without duplicating.
  const authByEmail = new Map<string, string>()
  {
    let page = 1
    for (;;) {
      const { data: list } = await admin.auth.admin.listUsers({ page, perPage: 200 })
      const users = list?.users || []
      for (const u of users) { if (u.email) authByEmail.set(u.email.toLowerCase(), u.id) }
      if (users.length < 200) break
      page++
    }
  }

  // --- Pass 1: create or update each person (no manager link yet) ---
  for (const r of rows) {
    const empNo = String(r.employee_number || '').trim()
    if (!empNo) { result.errors.push(`שורה ללא מספר עובד (${r.full_name || '---'})`); continue }

    const email = r.email ? String(r.email).trim() : null
    const existingId = byEmpNo.get(empNo) || (email ? byEmail.get(email.toLowerCase()) : undefined)

    const profileFields = {
      employee_number: empNo,
      full_name: r.full_name,
      email,
      role: r.role,
      site: r.site,
      location: r.location,
      department: r.department,
      is_admin: r.role === 'hr',
      active: true,
    }

    if (existingId) {
      const { error } = await admin.from('profiles').update(profileFields).eq('id', existingId)
      if (error) { result.errors.push(`עדכון ${r.full_name}: ${error.message}`); continue }
      byEmpNo.set(empNo, existingId)
      result.updated++
    } else {
      const loginEmail = `${empNo}@isotopia.internal`
      // Reuse an already-created auth account if one exists (re-run safety),
      // otherwise create a fresh one.
      let authId = authByEmail.get(loginEmail.toLowerCase()) || (email ? authByEmail.get(email.toLowerCase()) : undefined)
      if (!authId) {
        const { data: authData, error: authError } = await admin.auth.admin.createUser({
          email: loginEmail,
          password: INITIAL_PASSWORD,
          email_confirm: true,
        })
        if (authError || !authData.user) {
          result.errors.push(`יצירת ${r.full_name} (${empNo}): ${authError?.message || 'שגיאה'}`)
          continue
        }
        authId = authData.user.id
      }
      const { error: profErr } = await admin.from('profiles').upsert({
        id: authId,
        ...profileFields,
        must_change_password: true,
      })
      if (profErr) { result.errors.push(`פרופיל ${r.full_name}: ${profErr.message}`); continue }
      byEmpNo.set(empNo, authId)
      result.created++
    }
  }

  // --- Pass 2: resolve manager_id from manager_employee_number ---
  for (const r of rows) {
    const empNo = String(r.employee_number || '').trim()
    const myId = byEmpNo.get(empNo)
    if (!myId) continue
    const mgrNo = r.manager_employee_number ? String(r.manager_employee_number).trim() : ''
    const managerId = mgrNo ? byEmpNo.get(mgrNo) || null : null
    await admin.from('profiles').update({ manager_id: managerId }).eq('id', myId)
  }

  return NextResponse.json(result)
}
