'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Profile, Review, ReviewPeriod } from '@/lib/types'

type ReviewWithDetails = Review & { employee: Profile; period: ReviewPeriod }

export default function ManagerDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [team, setTeam] = useState<Profile[]>([])
  const [reviews, setReviews] = useState<ReviewWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (prof?.must_change_password) { router.push('/change-password'); return }
    if (!prof || prof.role !== 'manager') { router.push('/'); return }
    setProfile(prof)

    const [{ data: teamData }, { data: reviewsData }] = await Promise.all([
      supabase.from('profiles').select('*').eq('manager_id', user.id).order('full_name'),
      supabase.from('reviews').select('*, employee:profiles!reviews_employee_id_fkey(*), period:review_periods(*)').eq('manager_id', user.id).order('created_at', { ascending: false }),
    ])

    setTeam(teamData || [])
    setReviews((reviewsData || []) as ReviewWithDetails[])
    setLoading(false)
  }

  function statusLabel(s: string) {
    return { pending: 'ממתין', employee_done: 'עובד סיים', in_progress: 'בתהליך', completed: 'הושלם' }[s] || s
  }

  function statusColor(s: string) {
    return {
      pending: 'bg-gray-100 text-gray-600',
      employee_done: 'bg-blue-100 text-blue-700',
      in_progress: 'bg-yellow-100 text-yellow-700',
      completed: 'bg-green-100 text-green-700',
    }[s] || 'bg-gray-100 text-gray-600'
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f8f5ff' }}>
      <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: '#f8f5ff', direction: 'rtl' }}>
      <header className="text-white shadow-lg" style={{ background: 'linear-gradient(135deg, #4A2D7F, #6B46C1)' }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">שלום, {profile?.full_name} 👋</h1>
            <p className="text-xs opacity-70">פאנל מנהל | {team.length} עובדים בצוות</p>
          </div>
          <button onClick={handleLogout} className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-sm transition-colors">
            התנתקות
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <h2 className="text-xl font-bold text-gray-800 mb-5">הצוות שלי</h2>

        {team.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-gray-400">
            <p className="text-4xl mb-3">👥</p>
            <p>אין עובדים בצוות שלך עדיין</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {team.map(emp => {
              const empReviews = reviews.filter(r => r.employee_id === emp.id)
              const activeReview = empReviews.find(r => r.status !== 'completed')
              const lastCompleted = empReviews.find(r => r.status === 'completed')

              return (
                <div key={emp.id} className="bg-white rounded-2xl shadow-sm p-5">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold"
                        style={{ background: 'linear-gradient(135deg, #4A2D7F, #9B72B0)' }}>
                        {emp.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{emp.full_name}</p>
                        <p className="text-sm text-gray-500">{emp.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {activeReview && (
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor(activeReview.status)}`}>
                          {statusLabel(activeReview.status)}
                        </span>
                      )}
                      {activeReview ? (
                        <button
                          onClick={() => router.push(`/manager/review/${activeReview.id}`)}
                          className="px-4 py-2 rounded-xl text-white text-sm font-medium"
                          style={{ background: '#4A2D7F' }}
                        >
                          {activeReview.status === 'employee_done' ? 'המשך לשיחה' : 'מלא משוב'}
                        </button>
                      ) : (
                        <span className="text-sm text-gray-400">אין משוב פעיל</span>
                      )}
                      {lastCompleted && (
                        <button
                          onClick={() => router.push(`/manager/review/${lastCompleted.id}`)}
                          className="px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-600"
                        >
                          משוב קודם
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
