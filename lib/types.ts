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
  part_c: PartC
  approved_at: string | null
  summary_sent_at: string | null
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

// Part C (manager only) — unit/dept goals, achievements & improvements, org-values assessment
export interface PartC {
  unit_goals?: string
  dept_goals?: string
  achievements?: { title: string; detail: string }[]
  improvements?: { title: string; detail: string }[]
  org_values?: Record<string, string>
}

// Minimum characters required for an open-text answer (so answers can't be skipped).
export const MIN_OPEN_CHARS = 5

export interface OpenQuestion {
  id: string
  label: string
  type?: 'text' | 'yesno'
  // Only shown when another answer has a given value (e.g. burnout follow-up when burnout = 'yes')
  conditionalOn?: { id: string; value: string }
  // Internal field — never included in the employee's emailed copy
  internal?: boolean
}

// Part A – rating items (0–4 scale), shared keys so employee & manager answers align
export const REVIEW_CATEGORIES = [
  {
    id: 'professionalism',
    label: 'מקצוענות',
    items: [
      'מפגן ידע מקצועי בתחום העיסוק',
      'עובד ע"פ הנהלים המקובלים',
      'עובד לפי תכנון ומפגין סדר וארגון בביצוע המשימות',
      'עומד בלוחות הזמנים',
    ],
  },
  {
    id: 'quality',
    label: 'איכות',
    items: [
      'מתמודד היטב עם תקלות ובלת"מים',
      'ממלא בצורה איכותית את המשימות',
      'פועל ביעילות במצבי לחץ ועומס',
      'מקפיד על דיווח מלא ומהימן לממונים',
    ],
  },
  {
    id: 'teamwork',
    label: 'עבודת צוות ויחסי אנוש',
    items: [
      'יוצר קשרי עבודה טובים',
      'מקבל ביקורת מעמיתים וממונים באופן ענייני',
      'עובד היטב בצוות ובממשקים',
      'מצליח להתמודד היטב עם קונפליקטים בעבודה',
      'מסייע לעמיתים בעת הצורך',
    ],
  },
  {
    id: 'values',
    label: 'התנהגות מנותבת ערכים',
    items: [
      'מגלה מוטיבציה ללמוד ולהתפתח מקצועית',
      'משמש דוגמה לאחרים',
      'מקפיד על יושרה, אמינות ואתיקה מקצועית',
      'מפגין מחויבות ומסירות לתפקיד',
      'מגלה מעורבות ולוקח חלק פעיל גם במשימות שאינן בתחום אחריותו הישירה',
    ],
  },
]

export const OPEN_QUESTIONS_MANAGER: OpenQuestion[] = [
  { id: 'excellence', label: 'תאר משימות בהן העובד הצטיין / בלט לטובה' },
  { id: 'difficulty', label: 'תאר משימות בהן העובד התקשה' },
  { id: 'failure', label: 'תאר משימות בהן העובד נכשל' },
  { id: 'burnout', label: 'האם אתה חש כי ישנה אצל העובד שחיקה, והאם תפקודו נפגע כתוצאה מכך?', type: 'yesno' },
  { id: 'burnout_detail', label: 'כיצד לדעתך ניתן לשפר את תפקודו?', conditionalOn: { id: 'burnout', value: 'yes' } },
  { id: 'positives', label: 'ציין נקודות חיוביות בתפקודו של המוערך' },
  { id: 'improvements', label: 'ציין נקודות לשיפור בתפקודו של המוערך' },
  { id: 'promotion', label: 'האם לדעתך יש מקום לקידומו של העובד בחברה? אם כן, לאיזה תפקיד?', internal: true },
]

export const OPEN_QUESTIONS_EMPLOYEE: OpenQuestion[] = [
  { id: 'excellence', label: 'תאר משימות בהן הצטיינת / בלטת לטובה' },
  { id: 'difficulty', label: 'תאר משימות בהן התקשית / נכשלת' },
  { id: 'burnout', label: 'האם אתה חש כי ישנה אצלך שחיקה, והאם תפקודך נפגע כתוצאה מכך?', type: 'yesno' },
  { id: 'burnout_detail', label: 'כיצד לדעתך ניתן לשפר את תפקודך?', conditionalOn: { id: 'burnout', value: 'yes' } },
  { id: 'positives', label: 'ציין נקודות חיוביות בתפקודך' },
  { id: 'improvements', label: 'ציין נקודות לשיפור בתפקודך' },
]

// Part B – fit assessment (manager only, INTERNAL — not shown to employee)
export const FIT_OPTIONS = [
  { value: 'a', label: 'א. מתאים לתפקידו ומבצע אותו כנדרש' },
  { value: 'b', label: 'ב. אינו מתאים לתפקיד הנוכחי, מומלץ להעבירו לתפקיד אחר בחברה' },
  { value: 'c', label: 'ג. אינו מתאים לתפקיד ואינו מתאים לאופי החברה' },
]

// Part C – organizational values assessment (manager only)
export const ORG_VALUES = [
  { id: 'focus', value: 'מיקוד', desc: 'הפרדה בין מטרות טווח ארוך וקצר, הגדרת תעדופים; מיקוד הצוות במשימות והתמודדות עם אי-ודאות' },
  { id: 'commitment', value: 'מחויבות', desc: 'השלמת משימות בצורה מקצועית ומלאה; הירתמות ליעדים מאתגרים ומניעת עיכובים' },
  { id: 'excellence', value: 'מצוינות', desc: 'הוצאת תוצרים ברמה גבוהה; שליטה בפרטים, נתונים ועובדות' },
  { id: 'collaboration', value: 'שיתוף פעולה ודבֵקוּת', desc: 'שיתוף הממשקים במשימות ויצירת תחושת צוות; עידוד עבודה ישירה בין צוותים' },
  { id: 'initiative', value: 'יוזמה ותעוזה', desc: 'נטילת יוזמה מול משימות הנהלה; היערכות מראש לאירועים וסיכונים' },
  { id: 'wellbeing', value: 'רווחה והעצמת העובד', desc: 'יצירת מחוברות ומחויבות של העובדים לפי הערכים; עידוד יוזמה ועבודה עצמאית' },
]

// Final manager summary score (1–3)
export const FINAL_SCORE_OPTIONS = [
  { value: 1, label: 'מתחת לציפיות', desc: 'העובד לא עמד בחלק גדול מהיעדים האישיים שנקבעו, ולא מילא את כל המשימות בזמן ובאיכות המצופים.' },
  { value: 2, label: 'עמידה מלאה בציפיות', desc: 'העובד השיג את כל היעדים שנקבעו במלואם, והפגין ביצועים טובים בכל התחומים מול האתגרים והשינויים.' },
  { value: 3, label: 'מעבר לציפיות', desc: 'העובד עשה מעבר למצופה, הפגין תוצאות מעל המוגדר, פעל מעבר לתפקידו והשפיע על תוצאות הצוות.' },
]
