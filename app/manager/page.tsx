'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { getSubtreeProfiles, buildChildrenMap } from '@/lib/orgTree'
import TeamReviewTree from '@/components/TeamReviewTree'
import type { Profile, Review } from '@/lib/types'

type ReviewLite = Pick<Review, 'id' | 'employee_id' | 'manager_id' | 'status'>

export default function ManagerDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [subtree, setSubtree] = useState<Profile[]>([])
  const [reviews, setReviews] = useState<ReviewLite[]>([])
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

    // Covers both a regular manager (subtree = direct reports only) and a
    // manager-of-managers (subtree = their whole unit, all levels down).
    const tree = await getSubtreeProfiles(supabase, user.id)
    const employeeIds = tree.map(p => p.id)
    const { data: reviewsData } = employeeIds.length
      ? await supabase.from('reviews').select('id, employee_id, manager_id, status').in('employee_id', employeeIds)
      : { data: [] }

    setSubtree(tree)
    setReviews((reviewsData || []) as ReviewLite[])
    setLoading(false)
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

  const directReportsCount = subtree.filter(p => p.manager_id === profile?.id).length
  const childrenMap = profile ? buildChildrenMap(subtree) : new Map()

  return (
    <div className="min-h-screen" style={{ background: '#f8f5ff', direction: 'rtl' }}>
      <header className="text-white shadow-lg" style={{ background: 'linear-gradient(135deg, #4A2D7F, #6B46C1)' }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1">
              <Image src="/logo.png" alt="Isotopia" width={32} height={32} style={{ objectFit: 'contain' }} />
            </div>
            <div>
              <h1 className="text-xl font-bold">שלום, {profile?.full_name} 👋</h1>
              <p className="text-xs opacity-70">פאנל מנהל | {directReportsCount} עובדים בצוות</p>
            </div>
          </div>
          <button onClick={handleLogout} className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-sm transition-colors">
            התנתקות
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <h2 className="text-xl font-bold text-gray-800 mb-5">הצוות שלי</h2>

        {profile && (
          <TeamReviewTree
            managerId={profile.id}
            childrenMap={childrenMap}
            reviews={reviews}
            viewerId={profile.id}
            editLinkBase="/manager/review"
            readOnlyLinkBase="/hr/review"
            getActiveLabel={(r) => (r.status === 'employee_done' ? 'המשך לשיחה' : 'מלא משוב')}
          />
        )}
      </main>
    </div>
  )
}
