'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Calendar, Users, Store, Settings, LogOut, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { signOut } from '@/app/actions/auth'
import { useState } from 'react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'

const navigation = [
  { name: 'Horarios', href: '/schedule', icon: Calendar },
  { name: 'Empleados', href: '/employees', icon: Users },
  { name: 'Tiendas', href: '/stores', icon: Store },
  { name: 'Configuración', href: '/settings', icon: Settings },
]

export default function AppSidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="mb-8 pt-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center mb-3">
          <span className="text-xl font-bold text-white">PM</span>
        </div>
        <h1 className="font-bold text-slate-800">Proección y Moda JLS</h1>
        <p className="text-xs text-slate-500">Sistema de Turnos</p>
      </div>

      <nav className="flex-1 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="pt-4 border-t space-y-2 pb-4">
        <form action={signOut}>
          <Button type="submit" variant="ghost" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50">
            <LogOut className="h-5 w-5 mr-3" />
            Cerrar Sesión
          </Button>
        </form>
        <p className="text-xs text-slate-400 text-center px-4">
          Organizador de empleados Proección y Moda JLS hecho por Finance Master by Santiago Bermúdez
        </p>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 bg-white border-r z-40">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
            <span className="text-sm font-bold text-white">PM</span>
          </div>
          <div>
            <h1 className="font-bold text-slate-800 text-sm">Proección y Moda JLS</h1>
            <p className="text-xs text-slate-500">Turnos</p>
          </div>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger>
            <Button variant="ghost" size="sm" className="h-10 w-10 p-0">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </header>
    </>
  )
}
