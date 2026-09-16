import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { createTransaction, getTransactions, deleteTransaction, updateTransaction } from '@/services/transaction.service'
import { parseNaturalLanguageInput } from '@/services/parser.service'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const type = searchParams.get('type') as 'INCOME' | 'EXPENSE' | null
    const categoryId = searchParams.get('categoryId')

    const transactions = await getTransactions(session.user.id, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      type: type || undefined,
      categoryId: categoryId || undefined,
    })

    return NextResponse.json(transactions)
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json(
      { error: 'Error al obtener transacciones' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { quickInput, ...transactionData } = body

    // Si viene quickInput, procesar con el parser
    if (quickInput) {
      const categories = await prisma.category.findMany({
        where: {
          OR: [
            { userId: session.user.id },
            { isDefault: true },
          ],
        },
      })

      const parseResult = parseNaturalLanguageInput(quickInput, categories)
      
      if (!parseResult.success) {
        return NextResponse.json(
          { error: parseResult.error, needsConfirmation: true },
          { status: 400 }
        )
      }

      // Si hay múltiples transacciones o necesita confirmación
      if (parseResult.transactions.length > 1 || parseResult.transactions[0]?.needsConfirmation) {
        return NextResponse.json({
          needsConfirmation: true,
          transactions: parseResult.transactions,
        })
      }

      // Crear la transacción parseada
      const parsed = parseResult.transactions[0]
      const result = await createTransaction({
        userId: session.user.id,
        type: parsed.type,
        amount: parsed.amount,
        categoryId: parsed.categoryId!,
        description: parsed.description,
        notes: parsed.notes,
        date: parsed.date || new Date(),
      })

      return NextResponse.json(result)
    }

    // Creación normal de transacción
    const result = await createTransaction({
      userId: session.user.id,
      ...transactionData,
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error creating transaction:', error)
    return NextResponse.json(
      { error: 'Error al crear transacción' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...data } = body

    const result = await updateTransaction(id, session.user.id, data)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error updating transaction:', error)
    return NextResponse.json(
      { error: 'Error al actualizar transacción' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID de transacción requerido' },
        { status: 400 }
      )
    }

    await deleteTransaction(id, session.user.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting transaction:', error)
    return NextResponse.json(
      { error: 'Error al eliminar transacción' },
      { status: 500 }
    )
  }
}
