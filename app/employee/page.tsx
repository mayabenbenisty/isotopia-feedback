'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import type { Profile, Review, ReviewPeriod } from '@/lib/types'

type ReviewWithDetails = Review & { period: ReviewPeriod }

export default function EmployeeDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [reviews, setReviews] = useState<ReviewWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (prof?.must_change_password) { router.push('/change-password'); return }
    if (!prof || prof.role !== 'employee') { router.push('/'); return }
    setProfile(prof)

    const { data: reviewsData } = await supabase
      .from('reviews')
      .select('*, period:review_periods(*)')
      .eq('employee_id', user.id)
      .order('created_at', { ascending: false })

    setReviews((reviewsData || []) as ReviewWithDetails[])
    setLoading(false)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  function statusLabel(s: string) {
    return { pending: 'ממתין למילוי', employee_done: 'הגשת משוב עצמי', in_progress: 'שיחה עם מנהל', completed: 'הושלם' }[s] || s
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ background: '#f8f5ff' }}><div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div></div>

  const activeReview = reviews.find(r => r.status !== 'completed')
  const completedReviews = reviews.filter(r => r.status === 'completed')

  return (
    <div className="min-h-screen" style={{ background: '#f8f5ff', direction: 'rtl' }}>
      <header className="text-white shadow-lg" style={{ background: 'linear-gradient(135deg, #4A2D7F, #6B46C1)' }}>
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1">
              <Image src="/logo.png" alt="Isotopia" width={32} height={32} style={{ objectFit: 'contain' }} />
            </div>
            <div>
              <h1 className="text-xl font-bold">שלום, {profile?.full_name} 👋</h1>
              <p className="text-xs opacity-70">פורטל עובד</p>
            </div>
          </div>
          <button onClick={handleLogout} className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-sm">התנתקות</button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {activeReview ? (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100" style={{ background: '#f3eeff' }}>
              <h2 className="font-bold text-gray-800">משוב פעיל</h2>
            </div>
            <div className="p-6">
              <p className="text-lg font-semibold text-gray-800 mb-1">{activeReview.period?.name}</p>
              <p className="text-sm text-gray-500 mb-5">{statusLabel(activeReview.status)}</p>
              {activeReview.status === 'pending' || activeReview.status === 'employee_done' ? (
                <button
                  onClick={() => router.push(`/employee/review/${activeReview.id}`)}
                  className="px-6 py-3 rounded-xl text-white font-medium"
                  style={{ background: 'linear-gradient(135deg, #4A2D7F, #6B46C1)' }}
                >
                  {activeReview.status === 'pending' ? 'מלא משוב עצמי' : 'עדכן משוב עצמי'}
                </button>
              ) : (
                <p className="text-sm text-gray-500 bg-yellow-50 border border-yellow-100 rounded-xl p-3">
                  המנהל שלך ממלא כעת את המשוב. תקבל עותק במייל לאחר השלמתו.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-gray-400">
            <p className="text-4xl mb-3">✅</p>
            <p>אין משוב פעיל כרגע</p>
          </div>
        )}

        {completedReviews.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-gray-700 mb-4">משובים קודמים</h2>
            <div className="space-y-3">
              {completedReviews.map(r => (
                <div key={r.id} className="bg-white rounded-2xl shadow-sm p-5 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800">{r.period?.name}</p>
                    <p className="text-sm text-gray-400">{r.approved_at ? new Date(r.approved_at).toLocaleDateString('he-IL') : ''}</p>
                  </div>
                  <button onClick={() => router.push(`/employee/review/${r.id}`)} className="text-purple-600 text-sm font-medium hover:text-purple-800">
                    צפה →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
