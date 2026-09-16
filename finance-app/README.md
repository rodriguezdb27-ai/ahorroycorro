# Finance Assistant - Tu Asistente Financiero Personal

Una aplicación web moderna para registrar ingresos y gastos de manera sencilla, con análisis financieros inteligentes y exportación a Excel.

## Características Principales

- 💬 **Registro tipo chat** - Interfaz conversacional para registrar transacciones rápidamente
- ⚡ **Registro ultrarrápido** - Escribe "250 comida" y la app entiende automáticamente
- 📊 **Dashboard financiero** - Visualiza tus ingresos, gastos y balance del mes
- 📈 **Análisis por categorías** - Gráficas y porcentajes de gastos por categoría
- 🤖 **Asistente financiero** - Haz preguntas sobre tus finanzas y obtén respuestas basadas en datos reales
- 💰 **Presupuestos** - Establece límites por categoría y recibe alertas
- 🎯 **Metas de ahorro** - Define objetivos y sigue tu progreso
- 📁 **Exportación Excel** - Genera reportes completos con 3 hojas (Resumen, Movimientos, Análisis)
- 🔍 **Detección inteligente** - Identifica gastos inusuales y oportunidades de ahorro

## Stack Tecnológico

- **Frontend**: Next.js 14+ (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Server Actions
- **Base de datos**: PostgreSQL con Prisma ORM
- **Autenticación**: NextAuth.js
- **Gráficas**: Recharts
- **Excel**: ExcelJS
- **Notificaciones**: Sonner

## Requisitos Previos

- Node.js 18+ 
- PostgreSQL (local o servicio cloud como Neon/Supabase)
- npm o yarn

## Instalación

1. **Clonar el repositorio**
```bash
cd finance-app
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
cp .env.example .env
```

Edita `.env` con tus credenciales:
```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/finance_app?schema=public"
NEXTAUTH_SECRET="tu-secreto-largo-y-aleatorio"
NEXTAUTH_URL="http://localhost:3000"
```

4. **Configurar la base de datos**
```bash
npx prisma migrate dev --name init
npx prisma generate
```

5. **Iniciar el servidor de desarrollo**
```bash
npm run dev
```

La aplicación estará disponible en http://localhost:3000

## Uso

### Registro Rápido

En la pantalla principal, simplemente escribe:
- `250 comida` - Registra un gasto de $250 en Comida
- `gasto 350 transporte` - Registra un gasto de $350 en Transporte
- `15000 sueldo` - Registra un ingreso de $15,000 en Sueldo
- `hoy gasté 250 en comida y 80 en transporte` - Registra múltiples transacciones

### Dashboard

Visualiza:
- Ingresos del mes
- Gastos del mes
- Balance (Ingresos - Gastos)
- Porcentaje de ingresos gastado
- Tasa de ahorro

### Análisis

- Gráficas de ingresos vs gastos por mes
- Distribución de gastos por categoría
- Tendencias financieras
- Detección de gastos inusuales

### Exportar a Excel

Ve a Configuración → Exportar Datos para generar un archivo .xlsx con:
1. **Hoja Resumen**: Totales, porcentajes y análisis por categoría
2. **Hoja Movimientos**: Todas las transacciones con formato profesional
3. **Hoja Análisis**: Estadísticas detalladas y tendencias

## Estructura del Proyecto

```
finance-app/
├── prisma/
│   └── schema.prisma          # Esquema de base de datos
├── src/
│   ├── app/
│   │   ├── (auth)/            # Páginas de autenticación
│   │   ├── (dashboard)/       # Páginas principales
│   │   └── api/               # API routes
│   ├── components/
│   │   ├── ui/                # Componentes UI reutilizables
│   │   ├── chat/              # Componentes del chat financiero
│   │   ├── dashboard/         # Componentes del dashboard
│   │   └── analysis/          # Componentes de análisis
│   ├── services/
│   │   ├── auth.service.ts    # Servicio de autenticación
│   │   ├── transaction.service.ts
│   │   ├── category.service.ts
│   │   ├── budget.service.ts
│   │   ├── savings.service.ts
│   │   ├── insights.service.ts
│   │   ├── parser.service.ts  # Parser de lenguaje natural
│   │   └── export.service.ts  # Exportación Excel
│   ├── lib/
│   │   ├── prisma.ts          # Cliente Prisma
│   │   └── auth.ts            # Configuración NextAuth
│   └── types/
│       └── index.ts           # Tipos TypeScript
└── .env                       # Variables de entorno
```

## Seguridad

- Las contraseñas se hashean con bcrypt
- Autenticación basada en JWT con NextAuth
- Cada usuario solo puede acceder a sus propios datos
- Validación de inputs en el servidor
- Variables de entorno para datos sensibles

## Datos de Prueba

Al crear una cuenta nueva, se generan automáticamente:
- 9 categorías de gastos (Comida, Recibos, Transporte, etc.)
- 6 categorías de ingresos (Sueldo, Negocio, Inversiones, etc.)
- Configuración predeterminada (MXN, locale es-MX)

## Contribución

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Añadir nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## Licencia

MIT License

---

**Finance Assistant** - Tu asistente financiero personal para tomar mejores decisiones sobre tu dinero.
