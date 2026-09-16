'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getSavingsGoal(userId: string) {
  try {
    const goal = await prisma.savingsGoal.findUnique({
      where: { userId },
    })
    return goal
  } catch (error) {
    console.error('Error getting savings goal:', error)
    return null
  }
}

export async function createOrUpdateSavingsGoal(
  userId: string,
  targetAmount: number,
  name?: string,
  targetDate?: Date
) {
  try {
    const existing = await prisma.savingsGoal.findUnique({
      where: { userId },
    })

    let goal
    if (existing) {
      goal = await prisma.savingsGoal.update({
        where: { userId },
        data: {
          targetAmount,
          name: name ?? existing.name,
          targetDate: targetDate ?? existing.targetDate,
        },
      })
    } else {
      goal = await prisma.savingsGoal.create({
        data: {
          userId,
          targetAmount,
          name: name ?? 'Fondo de Emergencia',
          targetDate,
          currentAmount: 0,
        },
      })
    }

    revalidatePath('/dashboard')
    revalidatePath('/settings')

    return { success: true, goal }
  } catch (error) {
    console.error('Error creating/updating savings goal:', error)
    return { error: 'Error al guardar la meta de ahorro' }
  }
}

export async function updateSavingsCurrentAmount(userId: string, currentAmount: number) {
  try {
    const existing = await prisma.savingsGoal.findUnique({
      where: { userId },
    })

    if (!existing) {
      return { error: 'No hay una meta de ahorro configurada' }
    }

    const goal = await prisma.savingsGoal.update({
      where: { userId },
      data: { currentAmount },
    })

    revalidatePath('/dashboard')

    return { success: true, goal }
  } catch (error) {
    console.error('Error updating savings current amount:', error)
    return { error: 'Error al actualizar el ahorro actual' }
  }
}

export async function deleteSavingsGoal(userId: string) {
  try {
    await prisma.savingsGoal.delete({
      where: { userId },
    })

    revalidatePath('/dashboard')
    revalidatePath('/settings')

    return { success: true }
  } catch (error) {
    console.error('Error deleting savings goal:', error)
    return { error: 'Error al eliminar la meta de ahorro' }
  }
}
