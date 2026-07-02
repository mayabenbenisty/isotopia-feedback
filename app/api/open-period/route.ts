import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const { token, period_id } = await req.json()

  // --- Authorize: caller must be HR / admin ---
  if (!token) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 })
  const { data: userData, error: userErr } = await admin.auth.getUser(token)
  if (userErr || !userData.user) return NextResponse.json({ error: 'הרשאה לא תקינה' }, { status: 401 })
  const { data: caller } = await admin.from('profiles').select('role, is_admin').eq('id', userData.user.id).single()
  if (!caller || (caller.role !== 'hr' && !caller.is_admin)) {
    return NextResponse.json({ error: 'רק HR יכול לפתוח תקופת משוב' }, { status: 403 })
  }

  if (!period_id) return NextResponse.json({ error: 'חסרה תקופת משוב' }, { status: 400 })

  // Active employees who have a manager (everyone reviewed by their direct manager)
  const { data: people } = await admin
    .from('profiles')
    .select('id, manager_id, active')
    .not('manager_id', 'is', null)

  const active = (people || []).filter(p => p.active !== false)

  // Skip anyone who already has a review for this period
  const { data: existing } = await admin.from('reviews').select('employee_id').eq('period_id', period_id)
  const done = new Set((existing || []).map(r => r.employee_id))

  const toCreate = active
    .filter(p => !done.has(p.id))
    .map(p => ({
      period_id,
      employee_id: p.id,
      manager_id: p.manager_id,
      status: 'pending',
      manager_scores: {},
      employee_scores: {},
      manager_open: {},
      employee_open: {},
      goals: [],
      values_assessment: {},
      part_c: {},
      fit_assessment: null,
      final_score: null,
      final_score_override: false,
      manager_summary: null,
      employee_response: null,
    }))

  let created = 0
  if (toCreate.length > 0) {
    const { error } = await admin.from('reviews').insert(toCreate)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    created = toCreate.length
  }

  return NextResponse.json({ created, skipped: active.length - toCreate.length })
}
