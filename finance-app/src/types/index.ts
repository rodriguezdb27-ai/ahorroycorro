export interface Transaction {
  id: string
  userId: string
  type: 'INCOME' | 'EXPENSE'
  amount: number
  categoryId: string
  category: Category
  description?: string | null
  notes?: string | null
  date: Date
  createdAt: Date
  updatedAt: Date
}

export interface Category {
  id: string
  userId?: string | null
  name: string
  type: 'INCOME' | 'EXPENSE'
  icon?: string | null
  color?: string | null
  isDefault: boolean
}

export interface Budget {
  id: string
  userId: string
  categoryId: string
  category: Category
  amount: number
  period: 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  startDate: Date
  endDate?: Date | null
}

export interface SavingsGoal {
  id: string
  userId: string
  targetAmount: number
  currentAmount: number
  targetDate?: Date | null
  name: string
}

export interface UserSettings {
  id: string
  userId: string
  currency: string
  currencySymbol: string
  locale: string
  weekStartsOn: number
}

export interface DashboardSummary {
  totalIncome: number
  totalExpenses: number
  balance: number
  percentageSpent: number
  savingsRate: number
  transactionsCount: number
}

export interface CategoryAnalysis {
  categoryId: string
  categoryName: string
  total: number
  percentage: number
  count: number
  icon?: string | null
  color?: string | null
}

export interface MonthlyTrend {
  month: string
  income: number
  expenses: number
  balance: number
}

export interface ParseResult {
  success: boolean
  transactions: ParsedTransaction[]
  error?: string
}

export interface ParsedTransaction {
  type: 'INCOME' | 'EXPENSE'
  amount: number
  categoryId?: string
  categoryName?: string
  description?: string
  notes?: string
  date?: Date
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  needsConfirmation: boolean
}

export interface AssistantResponse {
  answer: string
  data?: Record<string, unknown>
  sources?: string[]
}
