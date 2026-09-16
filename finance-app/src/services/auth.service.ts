'use server'

import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function createUser(email: string, password: string, name?: string) {
  try {
    // Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return { error: 'El correo electrónico ya está registrado' }
    }

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, 12)

    // Crear usuario
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    })

    // Crear categorías por defecto para gastos
    const defaultExpenseCategories = [
      { name: 'Comida', icon: 'Utensils', color: '#FF6B6B' },
      { name: 'Recibos', icon: 'FileText', color: '#4ECDC4' },
      { name: 'Transporte', icon: 'Car', color: '#45B7D1' },
      { name: 'Compras', icon: 'ShoppingBag', color: '#96CEB4' },
      { name: 'Entretenimiento', icon: 'Film', color: '#FFEAA7' },
      { name: 'Salud', icon: 'Heart', color: '#DDA0DD' },
      { name: 'Educación', icon: 'Book', color: '#98D8C8' },
      { name: 'Servicios', icon: 'Zap', color: '#F7DC6F' },
      { name: 'Otros', icon: 'MoreHorizontal', color: '#AED6F1' },
    ]

    // Crear categorías por defecto para ingresos
    const defaultIncomeCategories = [
      { name: 'Sueldo', icon: 'Wallet', color: '#2ECC71' },
      { name: 'Negocio', icon: 'Store', color: '#27AE60' },
      { name: 'Inversiones', icon: 'TrendingUp', color: '#1ABC9C' },
      { name: 'Freelance', icon: 'Laptop', color: '#16A085' },
      { name: 'Regalo', icon: 'Gift', color: '#F39C12' },
      { name: 'Otros', icon: 'Plus', color: '#95A5A6' },
    ]

    // Crear todas las categorías
    await Promise.all([
      ...defaultExpenseCategories.map((cat) =>
        prisma.category.create({
          data: {
            userId: user.id,
            name: cat.name,
            type: 'EXPENSE',
            icon: cat.icon,
            color: cat.color,
            isDefault: true,
          },
        })
      ),
      ...defaultIncomeCategories.map((cat) =>
        prisma.category.create({
          data: {
            userId: user.id,
            name: cat.name,
            type: 'INCOME',
            icon: cat.icon,
            color: cat.color,
            isDefault: true,
          },
        })
      ),
    ])

    // Crear configuración por defecto
    await prisma.userSettings.create({
      data: {
        userId: user.id,
        currency: 'MXN',
        currencySymbol: '$',
        locale: 'es-MX',
        weekStartsOn: 1,
      },
    })

    return { success: true, userId: user.id }
  } catch (error) {
    console.error('Error creating user:', error)
    return { error: 'Error al crear el usuario' }
  }
}

export async function getUserByEmail(email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        settings: true,
      },
    })
    return user
  } catch (error) {
    console.error('Error getting user by email:', error)
    return null
  }
}

export async function getUserById(id: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        settings: true,
      },
    })
    return user
  } catch (error) {
    console.error('Error getting user by id:', error)
    return null
  }
}
