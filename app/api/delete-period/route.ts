import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const { token, period_id } = await req.json()

  if (!token) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 })
  const { data: userData, error: userErr } = await admin.auth.getUser(token)
  if (userErr || !userData.user) return NextResponse.json({ error: 'הרשאה לא תקינה' }, { status: 401 })
  const { data: caller } = await admin.from('profiles').select('role, is_admin').eq('id', userData.user.id).single()
  if (!caller || (caller.role !== 'hr' && !caller.is_admin)) {
    return NextResponse.json({ error: 'רק HR יכול למחוק תקופת משוב' }, { status: 403 })
  }
  if (!period_id) return NextResponse.json({ error: 'חסרה תקופה' }, { status: 400 })

  await admin.from('reviews').delete().eq('period_id', period_id)
  const { error } = await admin.from('review_periods').delete().eq('id', period_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
