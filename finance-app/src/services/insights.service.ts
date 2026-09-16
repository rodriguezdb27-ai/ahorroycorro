'use server'

import { prisma } from '@/lib/prisma'
import { startOfMonth, endOfMonth, subMonths, subWeeks, subDays, isWithinInterval } from 'date-fns'
import { getCategoryAnalysis, getMonthlyTrends, getTransactions } from './transaction.service'

interface FinancialInsight {
  type: 'warning' | 'info' | 'success' | 'tip'
  title: string
  message: string
  category?: string
  amount?: number
}

export async function generateFinancialInsights(userId: string): Promise<FinancialInsight[]> {
  const insights: FinancialInsight[] = []
  const now = new Date()
  const thisMonthStart = startOfMonth(now)
  const thisMonthEnd = endOfMonth(now)
  const lastMonthStart = startOfMonth(subMonths(now, 1))
  const lastMonthEnd = endOfMonth(subMonths(now, 1))

  // Obtener datos del mes actual y anterior
  const [currentAnalysis, lastMonthAnalysis] = await Promise.all([
    getCategoryAnalysis(userId, thisMonthStart, thisMonthEnd),
    getCategoryAnalysis(userId, lastMonthStart, lastMonthEnd),
  ])

  const currentTrends = await getMonthlyTrends(userId, 6)

  // Calcular totales
  const totalExpenses = currentAnalysis.reduce((sum, cat) => sum + cat.total, 0)
  const lastMonthTotal = lastMonthAnalysis.reduce((sum, cat) => sum + cat.total, 0)

  // 1. Detectar categorías con mayor gasto
  if (currentAnalysis.length > 0) {
    const topCategory = currentAnalysis[0]
    const percentageOfTotal = topCategory.percentage

    if (percentageOfTotal > 30) {
      insights.push({
        type: 'warning',
        title: 'Categoría dominante',
        message: `Tus gastos en "${topCategory.categoryName}" representan el ${percentageOfTotal.toFixed(1)}% de tus gastos totales. Podrías considerar revisar esta categoría para identificar oportunidades de ahorro.`,
        category: topCategory.categoryName,
        amount: topCategory.total,
      })
    }
  }

  // 2. Comparar con el mes anterior
  if (lastMonthTotal > 0) {
    const change = ((totalExpenses - lastMonthTotal) / lastMonthTotal) * 100

    if (change > 15) {
      insights.push({
        type: 'warning',
        title: 'Aumento de gastos',
        message: `Tus gastos este mes han aumentado un ${change.toFixed(1)}% comparado con el mes anterior. Revisa las categorías que más han crecido.`,
        amount: totalExpenses - lastMonthTotal,
      })
    } else if (change < -15) {
      insights.push({
        type: 'success',
        title: '¡Buen trabajo!',
        message: `Has reducido tus gastos un ${Math.abs(change).toFixed(1)}% comparado con el mes anterior. ¡Sigue así!`,
        amount: lastMonthTotal - totalExpenses,
      })
    }
  }

  // 3. Detectar gastos inusuales por categoría
  const transactions = await getTransactions(userId, {
    startDate: subMonths(now, 3),
    endDate: now,
    type: 'EXPENSE',
  })

  // Agrupar transacciones por categoría y calcular promedios
  const categoryStats = new Map<string, { amounts: number[]; avg: number; stdDev: number }>()

  for (const [categoryId, cats] of Object.entries(
    transactions.reduce((acc, t) => {
      acc[t.categoryId] = acc[t.categoryId] || []
      acc[t.categoryId].push(Number(t.amount))
      return acc
    }, {} as Record<string, number[]>)
  )) {
    const amounts = cats
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length
    const variance = amounts.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / amounts.length
    const stdDev = Math.sqrt(variance)

    categoryStats.set(categoryId, { amounts, avg, stdDev })
  }

  // Detectar transacciones inusuales (más de 2 desviaciones estándar)
  const recentTransactions = await getTransactions(userId, {
    startDate: thisMonthStart,
    endDate: thisMonthEnd,
    type: 'EXPENSE',
  })

  for (const transaction of recentTransactions) {
    const stats = categoryStats.get(transaction.categoryId)
    if (stats && stats.stdDev > 0) {
      const zScore = (Number(transaction.amount) - stats.avg) / stats.stdDev
      if (zScore > 2) {
        const category = currentAnalysis.find((c) => c.categoryId === transaction.categoryId)
        insights.push({
          type: 'info',
          title: 'Gasto inusual detectado',
          message: `Este gasto de $${Number(transaction.amount).toFixed(2)} en "${category?.categoryName || 'la categoría'}" es considerablemente superior a tu gasto habitual en esta categoría (promedio: $${stats.avg.toFixed(2)}).`,
          amount: Number(transaction.amount),
          category: category?.categoryName,
        })
      }
    }
  }

  // 4. Análisis de tendencia de ahorro
  if (currentTrends.length >= 3) {
    const recentTrends = currentTrends.slice(-3)
    const savingsTrend = recentTrends.map((t) => t.balance)

    const increasingSavings = savingsTrend.every((val, i, arr) => i === 0 || val >= arr[i - 1])
    const decreasingSavings = savingsTrend.every((val, i, arr) => i === 0 || val <= arr[i - 1])

    if (increasingSavings && savingsTrend[savingsTrend.length - 1] > 0) {
      insights.push({
        type: 'success',
        title: 'Tendencia positiva',
        message: 'Tu balance ha mejorado consistentemente en los últimos meses. ¡Excelente gestión financiera!',
      })
    } else if (decreasingSavings && savingsTrend[savingsTrend.length - 1] < 0) {
      insights.push({
        type: 'warning',
        title: 'Tendencia negativa',
        message: 'Tu balance ha disminuido consistentemente en los últimos meses. Considera revisar tus gastos.',
      })
    }
  }

  // 5. Recomendación de ahorro potencial
  if (currentAnalysis.length > 0) {
    // Encontrar la segunda o tercera categoría más grande
    const topCategories = currentAnalysis.slice(0, 3)
    const reducibleCategory = topCategories.find((c) => c.percentage > 15)

    if (reducibleCategory) {
      const potentialSavings = reducibleCategory.total * 0.1
      insights.push({
        type: 'tip',
        title: 'Oportunidad de ahorro',
        message: `Si redujeras tus gastos en "${reducibleCategory.categoryName}" un 10%, podrías ahorrar aproximadamente $${potentialSavings.toFixed(2)} al mes.`,
        category: reducibleCategory.categoryName,
        amount: potentialSavings,
      })
    }
  }

  // 6. Detección de días con mayor gasto
  const dailyExpenses = new Map<string, number>()
  for (const transaction of recentTransactions) {
    const dateKey = transaction.date.toISOString().split('T')[0]
    dailyExpenses.set(dateKey, (dailyExpenses.get(dateKey) || 0) + Number(transaction.amount))
  }

  if (dailyExpenses.size > 0) {
    const maxDay = Array.from(dailyExpenses.entries()).reduce((a, b) =>
      a[1] > b[1] ? a : b
    )
    const avgDailyExpense = totalExpenses / dailyExpenses.size

    if (maxDay[1] > avgDailyExpense * 3) {
      const date = new Date(maxDay[0])
      insights.push({
        type: 'info',
        title: 'Día de alto gasto',
        message: `El ${date.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })} concentraste gastos por $${maxDay[1].toFixed(2)}, significativamente más que tu promedio diario de $${avgDailyExpense.toFixed(2)}.`,
        amount: maxDay[1],
      })
    }
  }

  // Si no hay insights, dar un mensaje positivo por defecto
  if (insights.length === 0) {
    insights.push({
      type: 'success',
      title: 'Finanzas estables',
      message: 'Tus finanzas se ven equilibradas este mes. Continúa registrando tus movimientos para obtener análisis más detallados.',
    })
  }

  return insights
}

export async function answerFinancialQuestion(
  userId: string,
  question: string
): Promise<{ answer: string; data?: Record<string, unknown> }> {
  const lowerQuestion = question.toLowerCase()
  const now = new Date()
  const thisMonthStart = startOfMonth(now)
  const thisMonthEnd = endOfMonth(now)
  const yesterday = subDays(now, 1)
  const yesterdayStart = startOfMonth(yesterday)
  const yesterdayEnd = endOfMonth(yesterday)

  // ¿Cuánto gasté en [categoría] este mes?
  const categoryMatch = lowerQuestion.match(/gast[ée] (.+?) (?:este|en) mes/)
  if (categoryMatch || lowerQuestion.includes('categoría') || lowerQuestion.includes('categoria')) {
    const analysis = await getCategoryAnalysis(userId, thisMonthStart, thisMonthEnd)
    const totalExpenses = analysis.reduce((sum, c) => sum + c.total, 0)

    if (analysis.length > 0) {
      const topCategory = analysis[0]
      return {
        answer: `Este mes has gastado $${topCategory.total.toFixed(2)} en ${topCategory.categoryName}, lo que representa el ${topCategory.percentage.toFixed(1)}% de tus gastos totales ($${totalExpenses.toFixed(2)}).`,
        data: { category: topCategory.categoryName, amount: topCategory.total, percentage: topCategory.percentage },
      }
    }
  }

  // ¿Cuánto gasté ayer?
  if (lowerQuestion.includes('ayer')) {
    const yesterdayTransactions = await getTransactions(userId, {
      startDate: startOfMonth(yesterday),
      endDate: endOfMonth(yesterday),
      type: 'EXPENSE',
    })
    const totalYesterday = yesterdayTransactions.reduce((sum, t) => sum + Number(t.amount), 0)
    return {
      answer: `Ayer gastaste un total de $${totalYesterday.toFixed(2)} en ${yesterdayTransactions.length} transacciones.`,
      data: { amount: totalYesterday, count: yesterdayTransactions.length },
    }
  }

  // ¿Cuál es mi categoría donde más gasto?
  if (lowerQuestion.includes('más gasto') || lowerQuestion.includes('mayor gasto')) {
    const analysis = await getCategoryAnalysis(userId, thisMonthStart, thisMonthEnd)
    if (analysis.length > 0) {
      const topCategory = analysis[0]
      return {
        answer: `Tu categoría con mayor gasto este mes es "${topCategory.categoryName}" con $${topCategory.total.toFixed(2)}, representando el ${topCategory.percentage.toFixed(1)}% de tus gastos.`,
        data: { category: topCategory.categoryName, amount: topCategory.total },
      }
    }
  }

  // ¿Cuánto he ahorrado este mes?
  if (lowerQuestion.includes('ahorrado') || lowerQuestion.includes('ahorro')) {
    const [income, expenses] = await Promise.all([
      getTransactions(userId, { startDate: thisMonthStart, endDate: thisMonthEnd, type: 'INCOME' }),
      getTransactions(userId, { startDate: thisMonthStart, endDate: thisMonthEnd, type: 'EXPENSE' }),
    ])
    const totalIncome = income.reduce((sum, t) => sum + Number(t.amount), 0)
    const totalExpenses = expenses.reduce((sum, t) => sum + Number(t.amount), 0)
    const savings = totalIncome - totalExpenses
    const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0

    return {
      answer: `Este mes has ahorrado $${savings.toFixed(2)}, lo que representa un ${savingsRate.toFixed(1)}% de tus ingresos ($${totalIncome.toFixed(2)}).`,
      data: { savings, rate: savingsRate, income: totalIncome, expenses: totalExpenses },
    }
  }

  // ¿En qué podría reducir mis gastos?
  if (lowerQuestion.includes('reducir') || lowerQuestion.includes('consejo') || lowerQuestion.includes('recomendación')) {
    const insights = await generateFinancialInsights(userId)
    const tipInsight = insights.find((i) => i.type === 'tip') || insights.find((i) => i.type === 'warning')

    if (tipInsight) {
      return {
        answer: tipInsight.message,
        data: { category: tipInsight.category, amount: tipInsight.amount },
      }
    }

    return {
      answer: 'No tengo recomendaciones específicas basadas en tus datos actuales. Continúa registrando tus gastos para recibir análisis más personalizados.',
    }
  }

  // Resumen general por defecto
  const [income, expenses] = await Promise.all([
    getTransactions(userId, { startDate: thisMonthStart, endDate: thisMonthEnd, type: 'INCOME' }),
    getTransactions(userId, { startDate: thisMonthStart, endDate: thisMonthEnd, type: 'EXPENSE' }),
  ])
  const totalIncome = income.reduce((sum, t) => sum + Number(t.amount), 0)
  const totalExpenses = expenses.reduce((sum, t) => sum + Number(t.amount), 0)
  const balance = totalIncome - totalExpenses

  return {
    answer: `Resumen de este mes: Ingresos $${totalIncome.toFixed(2)}, Gastos $${totalExpenses.toFixed(2)}, Balance $${balance.toFixed(2)}. ¿Hay algo específico en lo que pueda ayudarte?`,
    data: { income: totalIncome, expenses: totalExpenses, balance },
  }
}
