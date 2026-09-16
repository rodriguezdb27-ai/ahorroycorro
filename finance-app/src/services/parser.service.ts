import { ParsedTransaction, ParseResult } from '@/types'

// Categorías comunes y sus variaciones en español
const CATEGORY_MAPPINGS: Record<string, string> = {
  // Comida
  comida: 'Comida',
  alimentos: 'Comida',
  restaurante: 'Comida',
  restaurantes: 'Comida',
  cenar: 'Comida',
  almorzar: 'Comida',
  desayunar: 'Comida',
  tacos: 'Comida',
  pizza: 'Comida',
  burger: 'Comida',
  hamburguesa: 'Comida',
  
  // Transporte
  transporte: 'Transporte',
  uber: 'Transporte',
  didi: 'Transporte',
  taxi: 'Transporte',
  gasolina: 'Transporte',
  gas: 'Transporte',
  estacionamiento: 'Transporte',
  metro: 'Transporte',
  autobus: 'Transporte',
  bus: 'Transporte',
  
  // Compras
  compras: 'Compras',
  shopping: 'Compras',
  tienda: 'Compras',
  amazon: 'Compras',
  mercado: 'Compras',
  walmart: 'Compras',
  target: 'Compras',
  ropa: 'Compras',
  
  // Recibos/Servicios
  recibos: 'Recibos',
  servicios: 'Recibos',
  luz: 'Recibos',
  agua: 'Recibos',
  internet: 'Recibos',
  telefono: 'Recibos',
  teléfono: 'Recibos',
  celular: 'Recibos',
  renta: 'Recibos',
  alquiler: 'Recibos',
  
  // Entretenimiento
  entretenimiento: 'Entretenimiento',
  cine: 'Entretenimiento',
  pelicula: 'Entretenimiento',
  película: 'Entretenimiento',
  netflix: 'Entretenimiento',
  spotify: 'Entretenimiento',
  juegos: 'Entretenimiento',
  videojuegos: 'Entretenimiento',
  
  // Salud
  salud: 'Salud',
  medico: 'Salud',
  médico: 'Salud',
  doctor: 'Salud',
  farmacia: 'Salud',
  medicina: 'Salud',
  medicamento: 'Salud',
  hospital: 'Salud',
  clinica: 'Salud',
  clínica: 'Salud',
  
  // Educación
  educacion: 'Educación',
  educación: 'Educación',
  escuela: 'Educación',
  universidad: 'Educación',
  curso: 'Educación',
  libros: 'Educación',
  libreria: 'Educación',
  librería: 'Educación',
  
  // Ingresos
  sueldo: 'Sueldo',
  salario: 'Sueldo',
  nomina: 'Sueldo',
  nómina: 'Sueldo',
  pago: 'Sueldo',
  negocio: 'Negocio',
  ventas: 'Negocio',
  freelance: 'Freelance',
  inversion: 'Inversiones',
  inversión: 'Inversiones',
  inversiones: 'Inversiones',
  regalo: 'Regalo',
  regalos: 'Regalo',
}

const INCOME_KEYWORDS = [
  'ingreso',
  'entrada',
  'ganancia',
  'gané',
  'gane',
  'cobré',
  'cobre',
  'recibí',
  'recibi',
  'deposito',
  'depósito',
  'sueldo',
  'salario',
  'nomina',
  'nómina',
  'pago',
  'venta',
  'freelance',
  'inversion',
  'inversión',
  'regalo',
]

const EXPENSE_KEYWORDS = [
  'gasto',
  'gasté',
  'gaste',
  'pagué',
  'pague',
  'compré',
  'compre',
  'salida',
  'costo',
  'precio',
  'cobro',
  'cobró',
]

export function parseNaturalLanguageInput(
  input: string,
  categories: Array<{ id: string; name: string; type: string }>
): ParseResult {
  const transactions: ParsedTransaction[] = []
  const normalizedInput = input.toLowerCase().trim()

  // Detectar si es múltiple (ej: "250 en comida y 80 en transporte")
  const multiplePattern = /(\d+(?:\.\d+)?)\s*(?:en|de|por)?\s*([a-zA-Záéíóúñ]+)/gi
  const multipleMatches = [...normalizedInput.matchAll(multiplePattern)]

  if (multipleMatches.length >= 2) {
    // Múltiples transacciones detectadas
    for (const match of multipleMatches) {
      const amount = parseFloat(match[1])
      const categoryWord = match[2]
      const parsed = createParsedTransaction(amount, categoryWord, categories, normalizedInput)
      if (parsed) {
        transactions.push(parsed)
      }
    }

    if (transactions.length > 0) {
      return { success: true, transactions }
    }
  }

  // Patrón simple: "450 comida" o "gasto 250 comida"
  const simplePattern = /(?:^|[^\d])(\d+(?:\.\d+)?)\s+([a-zA-Záéíóúñ]+)/i
  const simpleMatch = normalizedInput.match(simplePattern)

  if (simpleMatch) {
    const amount = parseFloat(simpleMatch[1])
    const categoryWord = simpleMatch[2]
    const parsed = createParsedTransaction(amount, categoryWord, categories, normalizedInput)

    if (parsed) {
      // Extraer descripción adicional si existe
      const descriptionMatch = normalizedInput.match(/(?:en|para|por)\s+(.+)/i)
      if (descriptionMatch && descriptionMatch[1]) {
        parsed.description = descriptionMatch[1].trim().slice(0, 100)
      }

      transactions.push(parsed)
      return { success: true, transactions }
    }
  }

  // Intentar detectar tipo por palabras clave
  let detectedType: 'INCOME' | 'EXPENSE' | null = null

  for (const keyword of INCOME_KEYWORDS) {
    if (normalizedInput.includes(keyword)) {
      detectedType = 'INCOME'
      break
    }
  }

  if (!detectedType) {
    for (const keyword of EXPENSE_KEYWORDS) {
      if (normalizedInput.includes(keyword)) {
        detectedType = 'EXPENSE'
        break
      }
    }
  }

  // Si no se detectó nada claro
  return {
    success: false,
    transactions: [],
    error: 'No pude entender completamente tu entrada. Intenta algo como "250 comida" o "gasto 350 transporte".',
  }
}

function createParsedTransaction(
  amount: number,
  categoryWord: string,
  categories: Array<{ id: string; name: string; type: string }>,
  fullInput: string
): ParsedTransaction | null {
  // Determinar tipo basado en la entrada
  let type: 'INCOME' | 'EXPENSE' = 'EXPENSE' // Por defecto es gasto
  
  const hasIncomeKeyword = INCOME_KEYWORDS.some(k => fullInput.includes(k))
  const hasExpenseKeyword = EXPENSE_KEYWORDS.some(k => fullInput.includes(k))
  
  if (hasIncomeKeyword && !hasExpenseKeyword) {
    type = 'INCOME'
  }

  // Buscar categoría en el mapeo
  let categoryId: string | undefined
  let categoryName: string | undefined
  let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW'

  // Búsqueda exacta en el mapeo
  if (CATEGORY_MAPPINGS[categoryWord]) {
    const mappedName = CATEGORY_MAPPINGS[categoryWord]
    const category = categories.find(
      (c) => c.name.toLowerCase() === mappedName.toLowerCase() && c.type === type
    )
    if (category) {
      categoryId = category.id
      categoryName = category.name
      confidence = 'HIGH'
    }
  }

  // Búsqueda parcial si no hay match exacto
  if (!categoryId) {
    for (const [key, value] of Object.entries(CATEGORY_MAPPINGS)) {
      if (categoryWord.includes(key) || key.includes(categoryWord)) {
        const category = categories.find(
          (c) => c.name.toLowerCase() === value.toLowerCase() && c.type === type
        )
        if (category) {
          categoryId = category.id
          categoryName = category.name
          confidence = 'MEDIUM'
          break
        }
      }
    }
  }

  // Búsqueda directa en las categorías del usuario
  if (!categoryId) {
    const directMatch = categories.find(
      (c) => c.name.toLowerCase().includes(categoryWord) && c.type === type
    )
    if (directMatch) {
      categoryId = directMatch.id
      categoryName = directMatch.name
      confidence = confidence === 'HIGH' ? 'HIGH' : 'MEDIUM'
    }
  }

  // Si no hay categoría pero hay monto válido
  if (!categoryId && amount > 0) {
    return {
      type,
      amount,
      categoryName: categoryWord,
      description: undefined,
      notes: undefined,
      date: new Date(),
      confidence: 'LOW',
      needsConfirmation: true,
    }
  }

  return {
    type,
    amount,
    categoryId,
    categoryName,
    description: undefined,
    notes: undefined,
    date: new Date(),
    confidence,
    needsConfirmation: confidence !== 'HIGH' || !categoryId,
  }
}

export function formatTransactionForConfirmation(transaction: ParsedTransaction, currencySymbol: string = '$'): string {
  const typeText = transaction.type === 'INCOME' ? 'Ingreso' : 'Gasto'
  const categoryText = transaction.categoryName || 'Sin categoría'
  const amountText = `${currencySymbol}${transaction.amount.toFixed(2)}`

  let message = `${typeText}: ${amountText} en ${categoryText}`

  if (transaction.confidence === 'LOW') {
    message += ' ⚠️ (categoría no encontrada, se creará una nueva)'
  } else if (transaction.confidence === 'MEDIUM') {
    message += ' 🤔 (¿es esta la categoría correcta?)'
  }

  return message
}
