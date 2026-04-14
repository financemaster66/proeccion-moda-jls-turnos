'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getSession } from '@/app/actions/auth'
import { useEffect, useState } from 'react'
import { Save, Database, User } from 'lucide-react'
import { toast } from 'sonner'

export default function SettingsPage() {
  const [session, setSession] = useState<{ username: string; role: string } | null>(null)

  useEffect(() => {
    fetch('/api/session')
      .then(res => res.json())
      .then(data => setSession(data))
  }, [])

  function handleSave() {
    toast.success('Configuración guardada exitosamente')
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Configuración</h1>
        <p className="text-slate-500 mt-1">Administración del sistema</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Tu Cuenta
            </CardTitle>
            <CardDescription>Información de tu sesión actual</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Usuario</Label>
              <Input value={session?.username || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Input
                value={session?.role === 'developer' ? 'Desarrollador' : 'Gerente'}
                disabled
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Base de Datos
            </CardTitle>
            <CardDescription>Estado de la conexión a Supabase</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Estado</span>
              <span className="flex items-center gap-2 text-sm text-green-600">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Conectado
              </span>
            </div>
            <div className="space-y-2">
              <Label>URL de Supabase</Label>
              <Input
                value={process.env.NEXT_PUBLIC_SUPABASE_URL || 'No configurada'}
                disabled
              />
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Save className="h-5 w-5" />
              Acciones Rápidas
            </CardTitle>
            <CardDescription>Operaciones del sistema</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button variant="outline" onClick={handleSave}>
              Guardar Cambios
            </Button>
            <Button variant="outline">
              Exportar Datos
            </Button>
            <Button variant="destructive">
              Limpiar Caché
            </Button>
          </CardContent>
        </Card>
      </div>

      <footer className="mt-8 text-center">
        <p className="text-xs text-slate-400 italic">
          Organizador de empleados Proección y Moda JLS hecho por Finance Master by Santiago Bermúdez
        </p>
      </footer>
    </div>
  )
}
