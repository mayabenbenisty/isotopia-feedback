export type Role = 'hr' | 'manager' | 'employee'
export type Site = 'israel' | 'usa'
export type ReviewStatus = 'pending' | 'employee_done' | 'in_progress' | 'completed'
export type ReviewType = 'semi_annual' | 'annual'

export interface Profile {
  id: string
  full_name: string
  email: string | null
  role: Role
  site: Site
  manager_id: string | null
  created_at: string
  employee_number?: string | null
  location?: string | null
  department?: string | null
  is_admin?: boolean
  active?: boolean
  must_change_password?: boolean
}

export interface ReviewPeriod {
  id: string
  name: string
  type: ReviewType
  site: Site
  start_date: string
  end_date: string
  is_active: boolean
  created_at: string
}

export interface Review {
  id: string
  period_id: string
  employee_id: string
  manager_id: string
  status: ReviewStatus
  manager_scores: Record<string, number>
  employee_scores: Record<string, number>
  manager_open: Record<string, string>
  employee_open: Record<string, string>
  goals: Goal[]
  values_assessment: Record<string, number>
  fit_assessment: string | null
  final_score: 1 | 2 | 3 | null
  final_score_override: boolean
  manager_summary: string | null
  employee_response: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
  // joined
  employee?: Profile
  manager?: Profile
  period?: ReviewPeriod
}

export interface Goal {
  id: string
  title: string
  description: string
  achieved: boolean | null
  comment: string
}

export const REVIEW_CATEGORIES = [
  {
    id: 'professionalism',
    label: 'מקצוענות',
    items: [
      'ידע מקצועי ומומחיות בתחום',
      'עמידה בלוחות זמנים ומועדי הגשה',
      'יכולת תכנון וסדר עדיפויות',
      'פתרון בעיות ויוזמה',
    ],
  },
  {
    id: 'quality',
    label: 'איכות',
    items: [
      'דיוק ואיכות תפוקות',
      'תשומת לב לפרטים',
      'אחריות על תוצאות',
    ],
  },
  {
    id: 'teamwork',
    label: 'עבודת צוות ויחסי אנוש',
    items: [
      'שיתוף פעולה עם עמיתים',
      'תקשורת פתוחה וברורה',
      'תמיכה וסיוע לחברי צוות',
      'גמישות ויכולת הסתגלות',
    ],
  },
  {
    id: 'values',
    label: 'התנהגות מנותבת ערכים',
    items: [
      'מחויבות לערכי החברה',
      'יושרה ואמינות',
      'גישה חיובית ומוטיבציה',
    ],
  },
]

export const OPEN_QUESTIONS_MANAGER = [
  { id: 'excellence', label: 'הצטיינות – במה העובד בלט לטובה?' },
  { id: 'challenges', label: 'קשיים – אילו אתגרים ניתן לשפר?' },
  { id: 'burnout', label: 'שחיקה – האם ישנם סימנים לשחיקה?' },
  { id: 'improvement', label: 'נקודות לשיפור' },
  { id: 'promotion', label: 'מוכנות לקידום / שינוי תפקיד' },
]

export const OPEN_QUESTIONS_EMPLOYEE = [
  { id: 'excellence', label: 'הצטיינות – במה בלטת לטובה לדעתך?' },
  { id: 'challenges', label: 'קשיים – אילו אתגרים נתקלת בהם?' },
  { id: 'burnout', label: 'שחיקה – האם אתה חש שחיקה כלשהי?' },
  { id: 'improvement', label: 'נקודות לשיפור עצמי' },
]

export const FIT_OPTIONS = [
  { value: 'a', label: 'א – מתאים מאוד לתפקיד' },
  { value: 'b', label: 'ב – מתאים לתפקיד' },
  { value: 'c', label: 'ג – נדרש שיפור' },
]
