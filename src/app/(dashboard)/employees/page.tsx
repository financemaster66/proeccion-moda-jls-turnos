'use client'

import { useEffect, useState } from 'react'
import { getEmployees, createEmployee, updateEmployee, deleteEmployee } from '@/app/actions/employees'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { TIPOS_EMPLEADO, PERMISOS_TRABAJO, MENSAJES } from '@/lib/constants'
import type { Employee } from '@/types/schedule'
import { Plus, Pencil, Trash2, Copy, ChevronDown, ChevronRight, User } from 'lucide-react'
import { toast } from 'sonner'

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)

  useEffect(() => {
    loadEmployees()
  }, [])

  async function loadEmployees() {
    setIsLoading(true)
    const data = await getEmployees()
    setEmployees(data)
    setIsLoading(false)
  }

  async function handleAdd(formData: FormData) {
    const result = await createEmployee({
      full_name: formData.get('full_name') as string,
      document_id: formData.get('document_id') as string,
      phone: formData.get('phone') as string,
      work_permission: formData.get('work_permission') as 'koaj_only' | 'quest_only' | 'both',
      employee_type: formData.get('employee_type') as Employee['employee_type'],
    })

    if (result.success) {
      toast.success(MENSAJES.EMPLEADO_CREADO)
      setIsAddOpen(false)
      loadEmployees()
    } else {
      toast.error(result.error || MENSAJES.ERROR_CREACION)
    }
  }

  async function handleUpdate(formData: FormData) {
    if (!editingEmployee) return

    const result = await updateEmployee({
      id: editingEmployee.id,
      full_name: formData.get('full_name') as string,
      document_id: formData.get('document_id') as string,
      phone: formData.get('phone') as string,
      work_permission: formData.get('work_permission') as 'koaj_only' | 'quest_only' | 'both',
      employee_type: formData.get('employee_type') as Employee['employee_type'],
    })

    if (result.success) {
      toast.success(MENSAJES.EMPLEADO_ACTUALIZADO)
      setEditingEmployee(null)
      loadEmployees()
    } else {
      toast.error(result.error || MENSAJES.ERROR_ACTUALIZACION)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Estás seguro de eliminar este empleado?')) return

    const result = await deleteEmployee(id)
    if (result.success) {
      toast.success(MENSAJES.EMPLEADO_ELIMINADO)
      loadEmployees()
    } else {
      toast.error(result.error || MENSAJES.ERROR_ELIMINACION)
    }
  }

  function copyPhone(phone: string) {
    navigator.clipboard.writeText(phone)
    toast.success('Teléfono copiado al portapapeles')
  }

  function getInitials(name: string) {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Empleados</h1>
          <p className="text-slate-500 mt-1">Gestiona el equipo de trabajo</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger>
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Empleado
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nuevo Empleado</DialogTitle>
            </DialogHeader>
            <EmployeeForm onSubmit={handleAdd} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <p className="text-slate-500">Cargando empleados...</p>
        </div>
      ) : (
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="space-y-3">
            {employees.map((employee) => (
              <Card key={employee.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex items-center p-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedId(expandedId === employee.id ? null : employee.id)}
                      className="mr-3 h-8 w-8 p-0"
                    >
                      {expandedId === employee.id ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                    <Avatar className="h-12 w-12 mr-4">
                      <AvatarImage src={employee.photo_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                        {getInitials(employee.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-800">{employee.full_name}</h3>
                      <div className="flex gap-2 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {PERMISOS_TRABAJO[employee.work_permission]}
                        </span>
                        <span>•</span>
                        <span>{TIPOS_EMPLEADO[employee.employee_type]}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingEmployee(employee)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(employee.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {expandedId === employee.id && (
                    <div className="border-t bg-slate-50 p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-slate-500">Documento</p>
                          <p className="font-medium">{employee.document_id}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-500">Teléfono</p>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{employee.phone}</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => copyPhone(employee.phone || '')}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      {employee.available_days && employee.available_days.length > 0 && (
                        <div>
                          <p className="text-sm text-slate-500">Días disponibles</p>
                          <p className="font-medium capitalize">
                            {employee.available_days.join(', ')}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      {editingEmployee && (
        <Dialog open onOpenChange={() => setEditingEmployee(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Empleado</DialogTitle>
            </DialogHeader>
            <EmployeeForm
              employee={editingEmployee}
              onSubmit={handleUpdate}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function EmployeeForm({
  employee,
  onSubmit,
}: {
  employee?: Employee
  onSubmit: (formData: FormData) => void
}) {
  return (
    <form action={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="full_name">Nombre Completo</Label>
        <Input
          id="full_name"
          name="full_name"
          defaultValue={employee?.full_name}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="document_id">Documento (Cédula)</Label>
        <Input
          id="document_id"
          name="document_id"
          defaultValue={employee?.document_id}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Teléfono</Label>
        <Input
          id="phone"
          name="phone"
          defaultValue={employee?.phone ?? ''}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="work_permission">Permiso de Trabajo</Label>
        <Select name="work_permission" defaultValue={employee?.work_permission ?? 'koaj_only'}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona un permiso" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PERMISOS_TRABAJO).map(([key, value]) => (
              <SelectItem key={key} value={key}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="employee_type">Tipo de Empleado</Label>
        <Select name="employee_type" defaultValue={employee?.employee_type ?? 'complete'}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona un tipo" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(TIPOS_EMPLEADO).map(([key, value]) => (
              <SelectItem key={key} value={key}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full">
        {employee ? 'Actualizar' : 'Crear'}
      </Button>
    </form>
  )
}
