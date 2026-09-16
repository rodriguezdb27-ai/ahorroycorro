'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { startOfMonth, endOfMonth } from 'date-fns'

export async function getBudgets(userId: string) {
  try {
    const budgets = await prisma.budget.findMany({
      where: { userId },
      include: {
        category: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return budgets
  } catch (error) {
    console.error('Error getting budgets:', error)
    return []
  }
}

export async function createOrUpdateBudget(
  userId: string,
  categoryId: string,
  amount: number,
  period: 'WEEKLY' | 'MONTHLY' | 'YEARLY' = 'MONTHLY'
) {
  try {
    const now = new Date()
    let startDate: Date
    let endDate: Date | null = null

    switch (period) {
      case 'WEEKLY':
        startDate = startOfMonth(now) // Simplificado para demo
        break
      case 'MONTHLY':
        startDate = startOfMonth(now)
        endDate = endOfMonth(now)
        break
      case 'YEARLY':
        startDate = startOfMonth(now)
        endDate = endOfMonth(new Date(now.getFullYear(), 11, 31))
        break
    }

    const budget = await prisma.budget.upsert({
      where: {
        userId_categoryId_period: {
          userId,
          categoryId,
          period,
        },
      },
      update: {
        amount,
        period,
        startDate: startDate!,
        endDate: endDate ?? null,
      },
      create: {
        userId,
        categoryId,
        amount,
        period,
        startDate: startDate!,
        endDate: endDate ?? null,
      },
      include: {
        category: true,
      },
    })

    revalidatePath('/budgets')
    revalidatePath('/dashboard')

    return { success: true, budget }
  } catch (error) {
    console.error('Error creating/updating budget:', error)
    return { error: 'Error al guardar el presupuesto' }
  }
}

export async function deleteBudget(id: string, userId: string) {
  try {
    const existing = await prisma.budget.findFirst({
      where: { id, userId },
    })

    if (!existing) {
      return { error: 'Presupuesto no encontrado' }
    }

    await prisma.budget.delete({
      where: { id },
    })

    revalidatePath('/budgets')

    return { success: true }
  } catch (error) {
    console.error('Error deleting budget:', error)
    return { error: 'Error al eliminar el presupuesto' }
  }
}

export async function getBudgetProgress(userId: string, period: 'WEEKLY' | 'MONTHLY' | 'YEARLY' = 'MONTHLY') {
  try {
    const now = new Date()
    let startDate: Date
    let endDate: Date

    switch (period) {
      case 'WEEKLY':
        startDate = startOfMonth(now)
        endDate = endOfMonth(now)
        break
      case 'MONTHLY':
        startDate = startOfMonth(now)
        endDate = endOfMonth(now)
        break
      case 'YEARLY':
        startDate = startOfMonth(now)
        endDate = endOfMonth(new Date(now.getFullYear(), 11, 31))
        break
    }

    const budgets = await prisma.budget.findMany({
      where: { userId, period },
      include: {
        category: true,
      },
    })

    const progress = await Promise.all(
      budgets.map(async (budget) => {
        const spent = await prisma.transaction.aggregate({
          where: {
            userId,
            categoryId: budget.categoryId,
            type: 'EXPENSE',
            date: { gte: startDate, lte: endDate },
          },
          _sum: { amount: true },
        })

        const spentAmount = Number(spent._sum.amount) || 0
        const percentage = budget.amount > 0 ? (spentAmount / Number(budget.amount)) * 100 : 0

        return {
          budget,
          spent: spentAmount,
          percentage,
          remaining: Number(budget.amount) - spentAmount,
          isOverBudget: spentAmount > Number(budget.amount),
        }
      })
    )

    return progress
  } catch (error) {
    console.error('Error getting budget progress:', error)
    return []
  }
}
