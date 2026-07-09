'use client'
import { useRouter } from 'next/navigation'
import type { Profile, Review } from '@/lib/types'

type ReviewLite = Pick<Review, 'id' | 'employee_id' | 'manager_id' | 'status'>

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

function EmployeeCard({ emp, reviews, viewerId, editLinkBase, readOnlyLinkBase, getActiveLabel }: {
  emp: Profile
  reviews: ReviewLite[]
  viewerId: string
  editLinkBase: string
  readOnlyLinkBase: string
  getActiveLabel: (review: ReviewLite) => string
}) {
  const router = useRouter()
  const empReviews = reviews.filter(r => r.employee_id === emp.id)
  const activeReview = empReviews.find(r => r.status !== 'completed')
  const lastCompleted = empReviews.find(r => r.status === 'completed')

  // Only the manager who actually conducts a review gets the editable form; anyone
  // else viewing it further up the hierarchy (e.g. a unit head looking at a review
  // their sub-manager filled in) gets the read-only page instead.
  function linkFor(review: ReviewLite) {
    const base = review.manager_id === viewerId ? editLinkBase : readOnlyLinkBase
    return `${base}/${review.id}`
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
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
              onClick={() => router.push(linkFor(activeReview))}
              className="px-4 py-2 rounded-xl text-white text-sm font-medium"
              style={{ background: '#4A2D7F' }}
            >
              {activeReview.manager_id === viewerId ? getActiveLabel(activeReview) : 'צפייה במשוב'}
            </button>
          ) : (
            <span className="text-sm text-gray-400">אין משוב פעיל</span>
          )}
          {lastCompleted && (
            <button
              onClick={() => router.push(linkFor(lastCompleted))}
              className="px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-600"
            >
              משוב קודם
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Renders a manager's direct reports. Plain employees get a status card; a direct
// report who is themselves a manager gets a collapsible group (collapsed by default)
// containing their own reports, so a manager-of-managers sees their whole unit without
// a huge flat wall of cards.
export default function TeamReviewTree({
  managerId,
  childrenMap,
  reviews,
  viewerId,
  editLinkBase,
  readOnlyLinkBase,
  getActiveLabel,
}: {
  managerId: string
  childrenMap: Map<string, Profile[]>
  reviews: ReviewLite[]
  viewerId: string
  editLinkBase: string
  readOnlyLinkBase: string
  getActiveLabel: (review: ReviewLite) => string
}) {
  const directReports = childrenMap.get(managerId) ?? []

  if (directReports.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-gray-400">
        <p className="text-4xl mb-3">👥</p>
        <p>אין עובדים בצוות</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {directReports.map(person =>
        person.role === 'manager' ? (
          <details key={person.id} className="bg-purple-50/60 rounded-2xl border border-purple-100 overflow-hidden" open={false}>
            <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between hover:bg-purple-50">
              <div className="flex items-center gap-3">
                <span className="text-purple-700">▸</span>
                <span className="font-semibold text-gray-800">{person.full_name}</span>
                <span className="text-xs text-gray-500">מנהל/ת יחידה — {(childrenMap.get(person.id) ?? []).length} בצוות</span>
              </div>
            </summary>
            <div className="px-5 pb-5 pt-1 space-y-4">
              <EmployeeCard emp={person} reviews={reviews} viewerId={viewerId} editLinkBase={editLinkBase} readOnlyLinkBase={readOnlyLinkBase} getActiveLabel={getActiveLabel} />
              <div className="pr-6 border-r-2 border-purple-200">
                <TeamReviewTree
                  managerId={person.id}
                  childrenMap={childrenMap}
                  reviews={reviews}
                  viewerId={viewerId}
                  editLinkBase={editLinkBase}
                  readOnlyLinkBase={readOnlyLinkBase}
                  getActiveLabel={getActiveLabel}
                />
              </div>
            </div>
          </details>
        ) : (
          <EmployeeCard key={person.id} emp={person} reviews={reviews} viewerId={viewerId} editLinkBase={editLinkBase} readOnlyLinkBase={readOnlyLinkBase} getActiveLabel={getActiveLabel} />
        )
      )}
    </div>
  )
}
