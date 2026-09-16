'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getCategories(userId: string, type?: 'INCOME' | 'EXPENSE') {
  try {
    const where: Record<string, unknown> = {
      OR: [
        { userId },
        { userId: null, isDefault: true },
      ],
    }

    if (type) {
      where.type = type
    }

    const categories = await prisma.category.findMany({
      where,
      orderBy: { name: 'asc' },
    })

    return categories
  } catch (error) {
    console.error('Error getting categories:', error)
    return []
  }
}

export async function createCategory(
  userId: string,
  name: string,
  type: 'INCOME' | 'EXPENSE',
  icon?: string,
  color?: string
) {
  try {
    // Verificar si ya existe una categoría con el mismo nombre para este usuario
    const existing = await prisma.category.findFirst({
      where: {
        userId,
        name,
        type,
      },
    })

    if (existing) {
      return { error: 'Ya existe una categoría con este nombre' }
    }

    const category = await prisma.category.create({
      data: {
        userId,
        name,
        type,
        icon,
        color,
        isDefault: false,
      },
    })

    revalidatePath('/dashboard')
    revalidatePath('/settings')

    return { success: true, category }
  } catch (error) {
    console.error('Error creating category:', error)
    return { error: 'Error al crear la categoría' }
  }
}

export async function updateCategory(
  id: string,
  userId: string,
  data: { name?: string; icon?: string; color?: string }
) {
  try {
    // Verificar que la categoría pertenece al usuario o es personalizada
    const existing = await prisma.category.findFirst({
      where: { id },
    })

    if (!existing || (existing.userId !== userId && existing.isDefault)) {
      return { error: 'No se puede editar esta categoría' }
    }

    const category = await prisma.category.update({
      where: { id },
      data,
    })

    revalidatePath('/dashboard')
    revalidatePath('/settings')

    return { success: true, category }
  } catch (error) {
    console.error('Error updating category:', error)
    return { error: 'Error al actualizar la categoría' }
  }
}

export async function deleteCategory(id: string, userId: string) {
  try {
    // Verificar que la categoría es del usuario y no es por defecto
    const existing = await prisma.category.findFirst({
      where: { id },
    })

    if (!existing) {
      return { error: 'Categoría no encontrada' }
    }

    if (existing.isDefault) {
      return { error: 'No se pueden eliminar categorías por defecto' }
    }

    if (existing.userId !== userId) {
      return { error: 'No se puede eliminar esta categoría' }
    }

    // Verificar si hay transacciones usando esta categoría
    const transactionsCount = await prisma.transaction.count({
      where: { categoryId: id },
    })

    if (transactionsCount > 0) {
      return { error: 'No se puede eliminar una categoría con transacciones asociadas' }
    }

    await prisma.category.delete({
      where: { id },
    })

    revalidatePath('/dashboard')
    revalidatePath('/settings')

    return { success: true }
  } catch (error) {
    console.error('Error deleting category:', error)
    return { error: 'Error al eliminar la categoría' }
  }
}
