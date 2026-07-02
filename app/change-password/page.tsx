'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function ChangePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/'); return }
      setChecking(false)
    })
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 6) { setError('הסיסמה חייבת להכיל לפחות 6 תווים.'); return }
    if (password !== confirm) { setError('הסיסמאות אינן תואמות.'); return }

    setLoading(true)
    const supabase = createClient()

    const { error: pwError } = await supabase.auth.updateUser({ password })
    if (pwError) {
      setError('שגיאה בעדכון הסיסמה. אנא נסה שוב.')
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }

    await supabase.from('profiles').update({ must_change_password: false }).eq('id', user.id)

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role === 'hr') router.push('/hr')
    else if (profile?.role === 'manager') router.push('/manager')
    else router.push('/employee')
  }

  if (checking) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f8f5ff' }}>
      <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-white" dir="rtl">
      <div className="w-full max-w-md">
        <h2 className="text-3xl font-bold mb-2" style={{ color: '#4A2D7F' }}>בחירת סיסמה חדשה</h2>
        <p className="text-gray-500 mb-8">זו הכניסה הראשונה שלך — אנא בחר/י סיסמה אישית להמשך.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">סיסמה חדשה</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="לפחות 6 תווים"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">אימות סיסמה</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              placeholder="הקלד/י שוב את הסיסמה"
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
            {loading ? 'שומר...' : 'שמירה והמשך'}
          </button>
        </form>
      </div>
    </div>
  )
}
