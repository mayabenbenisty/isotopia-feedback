import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Keep-alive endpoint: hit on a daily schedule (see vercel.json crons) so the
// Supabase project registers activity and is never auto-paused for inactivity.
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { error } = await supabase.from('profiles').select('id').limit(1)
    return NextResponse.json({ ok: !error, ts: new Date().toISOString() })
  } catch {
    return NextResponse.json({ ok: false, ts: new Date().toISOString() })
  }
}
