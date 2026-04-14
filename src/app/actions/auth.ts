'use server'

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export interface LoginResult {
  success: boolean
  error?: string
  user?: {
    id: string
    username: string
    role: 'developer' | 'manager'
  }
}

export async function signIn(formData: FormData): Promise<LoginResult> {
  const username = formData.get('username') as string
  const password = formData.get('password') as string

  if (!username || !password) {
    return { success: false, error: 'Usuario y contraseña son requeridos' }
  }

  const supabase = await createClient()

  // Buscar usuario en la base de datos
  const { data: user, error } = await supabase
    .from('users')
    .select('id, username, role, password_hash')
    .eq('username', username)
    .single()

  if (error || !user) {
    return { success: false, error: 'Credenciales inválidas' }
  }

  // Verificar contraseña
  const isValid = await verifyPasswordWithUsername(username, password, user.password_hash)

  if (!isValid) {
    return { success: false, error: 'Credenciales inválidas' }
  }

  // Guardar sesión en cookies
  const cookieStore = await cookies()
  const sessionData = {
    id: user.id,
    username: user.username,
    role: user.role,
  }

  cookieStore.set('session', JSON.stringify(sessionData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 1 semana
    path: '/',
  })

  return {
    success: true,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
    },
  }
}

export async function signOut() {
  const cookieStore = await cookies()
  cookieStore.delete('session')
  redirect('/login')
}

export async function getSession() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')

  if (!sessionCookie) {
    return null
  }

  try {
    const session = JSON.parse(sessionCookie.value)
    return session
  } catch {
    return null
  }
}

// Verificación de contraseña para desarrollo
// Para desarrollo: compara directamente con el valor almacenado (texto plano)
// En producción, usar bcrypt.compare real con hashes
export async function verifyPasswordWithUsername(username: string, password: string, storedHash: string): Promise<boolean> {
  // Para desarrollo, las contraseñas se almacenan en texto plano en la DB
  // admin -> admin123, gerente -> gerente123
  return password === storedHash
}
