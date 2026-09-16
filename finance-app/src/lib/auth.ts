import NextAuth from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export const { handlers, auth } = NextAuth(authOptions)
