import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner'
import Providers from '@/components/Providers'

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Finance Assistant - Tu Asistente Financiero Personal",
  description: "Registra tus ingresos y gastos de manera sencilla y obtén análisis financieros inteligentes",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
      <Toaster position="top-right" richColors />
    </html>
  );
}
