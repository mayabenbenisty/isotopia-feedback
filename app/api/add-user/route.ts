import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { full_name, employee_number, email, password, role, site, location, department, manager_id } = await req.json()

  const empNo = String(employee_number || '').trim()
  if (!empNo) return NextResponse.json({ error: 'חסר מספר עובד' }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  // Login always uses the synthetic employee-number email, same as bulk import —
  // this lets HR onboard people with no real email (e.g. drivers) and keeps a single
  // consistent login method for everyone. The real email, if any, is only for display/contact.
  const loginEmail = `${empNo}@isotopia.internal`

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: loginEmail,
    password,
    email_confirm: true,
  })

  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

  const { error: profileError } = await supabase.from('profiles').insert({
    id: authData.user.id,
    full_name,
    employee_number: empNo,
    email: email || null,
    role,
    site,
    location: location || null,
    department: department || null,
    manager_id: manager_id || null,
    must_change_password: true,
  })

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
