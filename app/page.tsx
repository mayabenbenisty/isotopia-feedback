'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Image from 'next/image'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    // Allow login by employee number OR email: if the identifier has no "@",
    // treat it as an employee number and map it to the internal login email.
    const identifier = email.trim()
    const loginEmail = identifier.includes('@') ? identifier : `${identifier}@isotopia.internal`
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email: loginEmail, password })

    if (authError) {
      setError('מספר עובד/אימייל או סיסמה שגויים. אנא נסה שוב.')
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, must_change_password')
      .eq('id', data.user.id)
      .single()

    // First-time / reset users must set their own password before entering.
    if (profile?.must_change_password) { router.push('/change-password'); return }

    if (profile?.role === 'hr') router.push('/hr')
    else if (profile?.role === 'manager') router.push('/manager')
    else router.push('/employee')
  }

  return (
    <div className="min-h-screen flex" dir="rtl">
      {/* Left panel - purple brand */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12"
        style={{ background: 'linear-gradient(135deg, #4A2D7F 0%, #6B46C1 100%)' }}
      >
        <div className="text-center text-white">
          <div className="mb-8 flex justify-center">
            <div className="w-32 h-32 bg-white rounded-2xl flex items-center justify-center shadow-2xl p-3">
              <Image src="/logo.png" alt="Isotopia Logo" width={110} height={110} style={{ objectFit: 'contain' }} />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-4">Isotopia</h1>
          <p className="text-xl opacity-80 mb-2">מערכת משוב והערכת עובדים</p>
          <p className="text-sm opacity-60">Employee Feedback &amp; Review System</p>
          <div className="mt-12 space-y-4 text-right">
            <div className="flex items-center gap-3 bg-white/10 rounded-xl p-4">
              <span className="text-2xl">📊</span>
              <div>
                <p className="font-semibold">דשבורד מרכזי</p>
                <p className="text-sm opacity-70">מעקב בזמן אמת אחר כל המשובים</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/10 rounded-xl p-4">
              <span className="text-2xl">🔄</span>
              <div>
                <p className="font-semibold">תהליך דו-כיווני</p>
                <p className="text-sm opacity-70">משוב עצמי + הערכת מנהל</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/10 rounded-xl p-4">
              <span className="text-2xl">📧</span>
              <div>
                <p className="font-semibold">שליחה אוטומטית</p>
                <p className="text-sm opacity-70">דיווחים ישירות למייל</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex justify-center mb-8">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center p-2"
              style={{ background: 'linear-gradient(135deg, #4A2D7F, #6B46C1)' }}
            >
              <Image src="/logo.png" alt="Isotopia" width={60} height={60} style={{ objectFit: 'contain' }} />
            </div>
          </div>

          <h2 className="text-3xl font-bold mb-2" style={{ color: '#4A2D7F' }}>ברוכים הבאים</h2>
          <p className="text-gray-500 mb-8">התחברו עם פרטי הכניסה שלכם</p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">מספר עובד או אימייל</label>
              <input
                type="text"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="מספר עובד או your@email.com"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-left"
                style={{ direction: 'ltr' }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">סיסמה</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-white font-semibold text-lg transition-opacity disabled:opacity-60 cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #4A2D7F, #6B46C1)' }}
            >
              {loading ? 'מתחבר...' : 'כניסה למערכת'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-8">
            לאיפוס סיסמה פנו ל-HR
          </p>
        </div>
      </div>
    </div>
  )
}
