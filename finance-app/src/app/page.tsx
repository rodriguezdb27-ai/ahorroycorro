import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-green-50 via-white to-blue-50">
      {/* Header */}
      <header className="w-full py-6 px-4 sm:px-8">
        <nav className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💰</span>
            <h1 className="text-xl font-bold text-gray-900">Finance Assistant</h1>
          </div>
          <div className="flex gap-4">
            <Link
              href="/login"
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
            >
              Iniciar Sesión
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
            >
              Registrarse
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 sm:py-24">
        <div className="max-w-3xl mx-auto text-center">
          <div className="mb-8">
            <span className="text-6xl sm:text-8xl mb-4 block">🎯</span>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Tu Asistente Financiero Personal
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-8">
              Registra ingresos y gastos en segundos. Obtén análisis inteligentes. 
              Toma mejores decisiones sobre tu dinero.
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <span className="text-3xl mb-3 block">⚡</span>
              <h3 className="font-semibold text-gray-900 mb-2">Registro Rápido</h3>
              <p className="text-sm text-gray-600">Escribe "250 comida" y listo. Así de simple.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <span className="text-3xl mb-3 block">📊</span>
              <h3 className="font-semibold text-gray-900 mb-2">Análisis Inteligente</h3>
              <p className="text-sm text-gray-600">Gráficas, tendencias y recomendaciones automáticas.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <span className="text-3xl mb-3 block">📁</span>
              <h3 className="font-semibold text-gray-900 mb-2">Exporta a Excel</h3>
              <p className="text-sm text-gray-600">Reportes completos con un solo clic.</p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="px-8 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 font-semibold text-lg transition-all shadow-lg hover:shadow-xl"
            >
              Comenzar Gratis
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 bg-white text-gray-900 rounded-xl border-2 border-gray-200 hover:border-green-600 hover:text-green-600 font-semibold text-lg transition-all"
            >
              Ya tengo cuenta
            </Link>
          </div>

          {/* Demo hint */}
          <p className="mt-12 text-gray-500 text-sm">
            ✨ Sin tarjeta requerida • Registro en 30 segundos
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 px-4 border-t border-gray-100">
        <div className="max-w-6xl mx-auto text-center text-gray-500 text-sm">
          <p>&copy; 2024 Finance Assistant. Tus datos, siempre privados.</p>
        </div>
      </footer>
    </div>
  )
}
