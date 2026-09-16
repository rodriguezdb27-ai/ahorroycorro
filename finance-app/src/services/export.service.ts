'use server'

import ExcelJS from 'exceljs'
import { prisma } from '@/lib/prisma'
import { startOfMonth, endOfMonth, subMonths } from 'date-fns'

interface ExportData {
  userId: string
  startDate?: Date
  endDate?: Date
}

export async function generateExcelReport({ userId, startDate, endDate }: ExportData): Promise<{ buffer: Buffer; filename: string }> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Finance Assistant'
  workbook.created = new Date()

  // Obtener datos necesarios
  const now = new Date()
  const periodStart = startDate || startOfMonth(now)
  const periodEnd = endDate || endOfMonth(now)

  const [transactions, categories] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: periodStart, lte: periodEnd },
      },
      include: { category: true },
      orderBy: { date: 'desc' },
    }),
    prisma.category.findMany({
      where: { userId },
    }),
  ])

  // Calcular totales
  const totalIncome = transactions
    .filter((t) => t.type === 'INCOME')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const totalExpenses = transactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const balance = totalIncome - totalExpenses
  const percentageSpent = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0

  // ==================== HOJA 1: RESUMEN ====================
  const summarySheet = workbook.addWorksheet('Resumen')

  // Encabezado
  summarySheet.addRow(['REPORTE FINANCIERO'])
  summarySheet.getRow(1).font = { bold: true, size: 16 }
  summarySheet.getRow(1).alignment = { horizontal: 'center' }
  summarySheet.mergeCells('A1:B1')

  summarySheet.addRow(['Período:', `${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`])
  summarySheet.addRow(['Fecha de generación:', new Date().toLocaleDateString()])
  summarySheet.addRow([])

  // Resumen principal
  summarySheet.addRow(['CONCEPTO', 'MONTO'])
  summarySheet.getRow(5).font = { bold: true }

  const summaryData = [
    ['Ingresos Totales', totalIncome],
    ['Gastos Totales', totalExpenses],
    ['Balance', balance],
    ['% de Ingresos Gastado', `${percentageSpent.toFixed(2)}%`],
    ['% de Ahorro', `${savingsRate.toFixed(2)}%`],
  ]

  for (const row of summaryData) {
    summarySheet.addRow(row)
  }

  // Formato de moneda para las celdas de montos
  for (let i = 6; i <= 10; i++) {
    summarySheet.getCell(`B${i}`).numFmt = '$#,##0.00'
  }

  summarySheet.addRow([])

  // Análisis por categorías
  summarySheet.addRow(['ANÁLISIS POR CATEGORÍAS'])
  summarySheet.getRow(13).font = { bold: true }

  summarySheet.addRow(['Categoría', 'Total', '% del Gasto'])
  summarySheet.getRow(14).font = { bold: true }

  // Agrupar gastos por categoría
  const categoryTotals = new Map<string, { name: string; total: number; count: number }>()
  for (const transaction of transactions.filter((t) => t.type === 'EXPENSE')) {
    const existing = categoryTotals.get(transaction.categoryId)
    if (existing) {
      existing.total += Number(transaction.amount)
      existing.count += 1
    } else {
      categoryTotals.set(transaction.categoryId, {
        name: transaction.category.name,
        total: Number(transaction.amount),
        count: 1,
      })
    }
  }

  let rowNumber = 15
  for (const [_, data] of Array.from(categoryTotals.entries()).sort((a, b) => b[1].total - a[1].total)) {
    const percentage = totalExpenses > 0 ? (data.total / totalExpenses) * 100 : 0
    summarySheet.addRow([data.name, data.total, `${percentage.toFixed(2)}%`])
    summarySheet.getCell(`B${rowNumber}`).numFmt = '$#,##0.00'
    rowNumber++
  }

  // Ajustar ancho de columnas
  summarySheet.getColumn(1).width = 25
  summarySheet.getColumn(2).width = 20

  // ==================== HOJA 2: MOVIMIENTOS ====================
  const movementsSheet = workbook.addWorksheet('Movimientos')

  // Encabezados
  const headers = ['Fecha', 'Hora', 'Tipo', 'Categoría', 'Descripción', 'Ingreso', 'Gasto', 'Balance Acumulado']
  movementsSheet.addRow(headers)
  movementsSheet.getRow(1).font = { bold: true }
  movementsSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD3D3D3' },
  }

  // Congelar encabezados
  movementsSheet.views = [{ state: 'frozen', ySplit: 1 }]

  // Agregar transacciones
  let runningBalance = 0
  for (const transaction of transactions.sort((a, b) => b.date.getTime() - a.date.getTime())) {
    const date = transaction.date
    const isIncome = transaction.type === 'INCOME'
    const amount = Number(transaction.amount)

    if (isIncome) {
      runningBalance += amount
    } else {
      runningBalance -= amount
    }

    movementsSheet.addRow([
      date.toLocaleDateString(),
      date.toLocaleTimeString(),
      isIncome ? 'INGRESO' : 'GASTO',
      transaction.category.name,
      transaction.description || '',
      isIncome ? amount : 0,
      isIncome ? 0 : amount,
      runningBalance,
    ])
  }

  // Formato de las celdas
  const lastRow = movementsSheet.rowCount
  for (let i = 2; i <= lastRow; i++) {
    movementsSheet.getCell(`F${i}`).numFmt = '$#,##0.00'
    movementsSheet.getCell(`G${i}`).numFmt = '$#,##0.00'
    movementsSheet.getCell(`H${i}`).numFmt = '$#,##0.00'

    // Colorear ingresos y gastos
    const typeCell = movementsSheet.getCell(`C${i}`).value
    if (typeCell === 'INGRESO') {
      movementsSheet.getCell(`F${i}`).font = { color: { argb: 'FF27AE60' } }
    } else {
      movementsSheet.getCell(`G${i}`).font = { color: { argb: 'FFE74C3C' } }
    }
  }

  // Filtros en los encabezados
  movementsSheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: 8 },
  }

  // Ajustar ancho de columnas
  movementsSheet.getColumn(1).width = 12
  movementsSheet.getColumn(2).width = 10
  movementsSheet.getColumn(3).width = 10
  movementsSheet.getColumn(4).width = 15
  movementsSheet.getColumn(5).width = 30
  movementsSheet.getColumn(6).width = 15
  movementsSheet.getColumn(7).width = 15
  movementsSheet.getColumn(8).width = 18

  // ==================== HOJA 3: ANÁLISIS ====================
  const analysisSheet = workbook.addWorksheet('Análisis')

  analysisSheet.addRow(['ANÁLISIS FINANCIERO DETALLADO'])
  analysisSheet.getRow(1).font = { bold: true, size: 14 }
  analysisSheet.mergeCells('A1:B1')
  analysisSheet.addRow([])

  // Estadísticas generales
  analysisSheet.addRow(['ESTADÍSTICAS GENERALES'])
  analysisSheet.getRow(3).font = { bold: true }

  const avgDailyExpense = totalExpenses / 30 // Simplificado
  const avgWeeklyExpense = totalExpenses / 4
  const avgMonthlyExpense = totalExpenses

  const statsData = [
    ['Gasto Total', totalExpenses],
    ['Ingreso Total', totalIncome],
    ['Balance Neto', balance],
    ['Número de Transacciones', transactions.length],
    ['Gasto Promedio Diario', avgDailyExpense],
    ['Gasto Promedio Semanal', avgWeeklyExpense],
    ['Gasto Promedio Mensual', avgMonthlyExpense],
  ]

  analysisSheet.addRow(['Concepto', 'Valor'])
  analysisSheet.getRow(5).font = { bold: true }

  let statRow = 6
  for (const [concept, value] of statsData) {
    analysisSheet.addRow([concept, typeof value === 'number' ? value : value])
    if (typeof value === 'number') {
      analysisSheet.getCell(`B${statRow}`).numFmt = '$#,##0.00'
    }
    statRow++
  }

  analysisSheet.addRow([])

  // Categoría con mayor gasto
  const topCategory = Array.from(categoryTotals.entries()).sort((a, b) => b[1].total - a[1].total)[0]
  if (topCategory) {
    analysisSheet.addRow(['CATEGORÍA CON MAYOR GASTO'])
    analysisSheet.getRow(statRow + 1).font = { bold: true }
    statRow++
    analysisSheet.addRow([topCategory[1].name, `$${topCategory[1].total.toFixed(2)}`, `${((topCategory[1].total / totalExpenses) * 100).toFixed(2)}% del total`])
    statRow += 2
  }

  // Tendencias mensuales (últimos 6 meses)
  analysisSheet.addRow([])
  analysisSheet.addRow(['TENDENCIAS MENSUALES (Últimos 6 meses)'])
  analysisSheet.getRow(statRow + 1).font = { bold: true }
  statRow++

  analysisSheet.addRow(['Mes', 'Ingresos', 'Gastos', 'Balance'])
  analysisSheet.getRow(statRow + 1).font = { bold: true }
  statRow++

  for (let i = 5; i >= 0; i--) {
    const monthDate = subMonths(now, i)
    const monthStart = startOfMonth(monthDate)
    const monthEnd = endOfMonth(monthDate)

    const monthTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: monthStart, lte: monthEnd },
      },
    })

    const monthIncome = monthTransactions
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + Number(t.amount), 0)

    const monthExpenses = monthTransactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + Number(t.amount), 0)

    const monthBalance = monthIncome - monthExpenses

    analysisSheet.addRow([
      monthDate.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }),
      monthIncome,
      monthExpenses,
      monthBalance,
    ])

    for (let col = 2; col <= 4; col++) {
      analysisSheet.getCell(`${String.fromCharCode(65 + col)}${statRow + 1}`).numFmt = '$#,##0.00'
    }

    statRow++
  }

  // Ajustar ancho de columnas
  analysisSheet.getColumn(1).width = 25
  analysisSheet.getColumn(2).width = 20
  analysisSheet.getColumn(3).width = 20

  // Generar buffer
  const buffer = await workbook.xlsx.writeBuffer()

  const filename = `reporte-financiero-${now.toISOString().split('T')[0]}.xlsx`

  return { buffer: Buffer.from(buffer), filename }
}
