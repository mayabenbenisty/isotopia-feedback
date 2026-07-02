import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Called right after a user sets their own new password, to clear the
// must_change_password flag on their OWN profile (service key, so it isn't
// blocked by table grants). Only ever affects the caller's own row.
export async function POST(req: Request) {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const { token } = await req.json()
  if (!token) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 })

  const { data: userData, error } = await admin.auth.getUser(token)
  if (error || !userData.user) return NextResponse.json({ error: 'הרשאה לא תקינה' }, { status: 401 })

  const { error: upErr } = await admin
    .from('profiles')
    .update({ must_change_password: false })
    .eq('id', userData.user.id)

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
