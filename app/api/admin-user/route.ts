import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const INITIAL_PASSWORD = 'Isotopia2026'
const EDITABLE = ['full_name', 'role', 'site', 'location', 'department', 'manager_id', 'active'] as const

export async function POST(req: Request) {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const { token, action, id, fields } = await req.json()

  // --- Authorize: caller must be HR / admin ---
  if (!token) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 })
  const { data: userData, error: userErr } = await admin.auth.getUser(token)
  if (userErr || !userData.user) return NextResponse.json({ error: 'הרשאה לא תקינה' }, { status: 401 })
  const { data: caller } = await admin.from('profiles').select('role, is_admin').eq('id', userData.user.id).single()
  if (!caller || (caller.role !== 'hr' && !caller.is_admin)) {
    return NextResponse.json({ error: 'רק HR מורשה לפעולה זו' }, { status: 403 })
  }

  if (!id) return NextResponse.json({ error: 'חסר מזהה עובד' }, { status: 400 })

  // --- Reset password (silent — no email sent) ---
  if (action === 'resetPassword') {
    const { error: pwErr } = await admin.auth.admin.updateUserById(id, { password: INITIAL_PASSWORD })
    if (pwErr) return NextResponse.json({ error: pwErr.message }, { status: 400 })
    await admin.from('profiles').update({ must_change_password: true }).eq('id', id)
    return NextResponse.json({ ok: true })
  }

  // --- Save profile edits (role / manager / team / status) ---
  if (action === 'save') {
    const update: Record<string, unknown> = {}
    for (const k of EDITABLE) {
      if (fields && k in fields) update[k] = k === 'manager_id' && fields[k] === '' ? null : fields[k]
    }
    const { error: upErr } = await admin.from('profiles').update(update).eq('id', id)
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 })

    // When "active" is toggled, block/unblock login at the auth level (no email sent).
    if ('active' in update) {
      const ban_duration = update.active === false ? '876000h' : 'none'
      await admin.auth.admin.updateUserById(id, { ban_duration })
    }
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'פעולה לא מוכרת' }, { status: 400 })
}
