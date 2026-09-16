'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { startOfMonth, endOfMonth, subMonths } from 'date-fns'

interface CreateTransactionInput {
  userId: string
  type: 'INCOME' | 'EXPENSE'
  amount: number
  categoryId: string
  description?: string
  notes?: string
  date?: Date
}

export async function createTransaction(input: CreateTransactionInput) {
  try {
    const transaction = await prisma.transaction.create({
      data: {
        userId: input.userId,
        type: input.type,
        amount: input.amount,
        categoryId: input.categoryId,
        description: input.description,
        notes: input.notes,
        date: input.date || new Date(),
      },
      include: {
        category: true,
      },
    })

    revalidatePath('/dashboard')
    revalidatePath('/analysis')

    return { success: true, transaction }
  } catch (error) {
    console.error('Error creating transaction:', error)
    return { error: 'Error al crear la transacción' }
  }
}

export async function getTransactions(
  userId: string,
  options?: {
    startDate?: Date
    endDate?: Date
    type?: 'INCOME' | 'EXPENSE'
    categoryId?: string
    limit?: number
    offset?: number
  }
) {
  try {
    const where: Record<string, unknown> = { userId }

    if (options?.startDate && options?.endDate) {
      where.date = {
        gte: options.startDate,
        lte: options.endDate,
      }
    }

    if (options?.type) {
      where.type = options.type
    }

    if (options?.categoryId) {
      where.categoryId = options.categoryId
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: { date: 'desc' },
      take: options?.limit,
      skip: options?.offset,
    })

    return transactions
  } catch (error) {
    console.error('Error getting transactions:', error)
    return []
  }
}

export async function getTransactionById(id: string, userId: string) {
  try {
    const transaction = await prisma.transaction.findFirst({
      where: { id, userId },
      include: {
        category: true,
      },
    })
    return transaction
  } catch (error) {
    console.error('Error getting transaction by id:', error)
    return null
  }
}

export async function updateTransaction(
  id: string,
  userId: string,
  data: Partial<CreateTransactionInput>
) {
  try {
    // Verificar que la transacción pertenece al usuario
    const existing = await prisma.transaction.findFirst({
      where: { id, userId },
    })

    if (!existing) {
      return { error: 'Transacción no encontrada' }
    }

    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        ...(data.type && { type: data.type }),
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.categoryId && { categoryId: data.categoryId }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.date && { date: data.date }),
      },
      include: {
        category: true,
      },
    })

    revalidatePath('/dashboard')
    revalidatePath('/analysis')

    return { success: true, transaction }
  } catch (error) {
    console.error('Error updating transaction:', error)
    return { error: 'Error al actualizar la transacción' }
  }
}

export async function deleteTransaction(id: string, userId: string) {
  try {
    // Verificar que la transacción pertenece al usuario
    const existing = await prisma.transaction.findFirst({
      where: { id, userId },
    })

    if (!existing) {
      return { error: 'Transacción no encontrada' }
    }

    await prisma.transaction.delete({
      where: { id },
    })

    revalidatePath('/dashboard')
    revalidatePath('/analysis')

    return { success: true }
  } catch (error) {
    console.error('Error deleting transaction:', error)
    return { error: 'Error al eliminar la transacción' }
  }
}

export async function getDashboardSummary(userId: string, month: Date = new Date()) {
  try {
    const startDate = startOfMonth(month)
    const endDate = endOfMonth(month)

    const [incomeResult, expenseResult] = await Promise.all([
      prisma.transaction.aggregate({
        where: {
          userId,
          type: 'INCOME',
          date: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          userId,
          type: 'EXPENSE',
          date: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
      }),
    ])

    const totalIncome = Number(incomeResult._sum.amount) || 0
    const totalExpenses = Number(expenseResult._sum.amount) || 0
    const balance = totalIncome - totalExpenses
    const percentageSpent = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0

    const transactionsCount = await prisma.transaction.count({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
      },
    })

    return {
      totalIncome,
      totalExpenses,
      balance,
      percentageSpent,
      savingsRate,
      transactionsCount,
    }
  } catch (error) {
    console.error('Error getting dashboard summary:', error)
    return {
      totalIncome: 0,
      totalExpenses: 0,
      balance: 0,
      percentageSpent: 0,
      savingsRate: 0,
      transactionsCount: 0,
    }
  }
}

export async function getCategoryAnalysis(
  userId: string,
  startDate: Date,
  endDate: Date
) {
  try {
    const expenses = await prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        type: 'EXPENSE',
        date: { gte: startDate, lte: endDate },
      },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    })

    const totalExpenses = expenses.reduce(
      (sum, e) => sum + Number(e._sum.amount),
      0
    )

    const categories = await prisma.category.findMany({
      where: {
        id: { in: expenses.map((e) => e.categoryId) },
      },
    })

    const categoryMap = new Map(categories.map((c) => [c.id, c]))

    return expenses
      .map((expense) => {
        const category = categoryMap.get(expense.categoryId)
        const total = Number(expense._sum.amount) || 0
        return {
          categoryId: expense.categoryId,
          categoryName: category?.name || 'Desconocida',
          total,
          percentage: totalExpenses > 0 ? (total / totalExpenses) * 100 : 0,
          count: expense._count.id,
          icon: category?.icon,
          color: category?.color,
        }
      })
      .sort((a, b) => b.total - a.total)
  } catch (error) {
    console.error('Error getting category analysis:', error)
    return []
  }
}

export async function getMonthlyTrends(userId: string, months: number = 6) {
  try {
    const trends = []
    const now = new Date()

    for (let i = months - 1; i >= 0; i--) {
      const monthDate = subMonths(now, i)
      const startDate = startOfMonth(monthDate)
      const endDate = endOfMonth(monthDate)

      const [income, expenses] = await Promise.all([
        prisma.transaction.aggregate({
          where: {
            userId,
            type: 'INCOME',
            date: { gte: startDate, lte: endDate },
          },
          _sum: { amount: true },
        }),
        prisma.transaction.aggregate({
          where: {
            userId,
            type: 'EXPENSE',
            date: { gte: startDate, lte: endDate },
          },
          _sum: { amount: true },
        }),
      ])

      trends.push({
        month: monthDate.toLocaleDateString('es-MX', { month: 'short' }),
        income: Number(income._sum.amount) || 0,
        expenses: Number(expenses._sum.amount) || 0,
        balance: (Number(income._sum.amount) || 0) - (Number(expenses._sum.amount) || 0),
      })
    }

    return trends
  } catch (error) {
    console.error('Error getting monthly trends:', error)
    return []
  }
}
