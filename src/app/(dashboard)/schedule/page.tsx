'use client'

import { useEffect, useState } from 'react'
import { getStores } from '@/app/actions/stores'
import { getEmployees } from '@/app/actions/employees'
import { getShifts, createShift, deleteShift, runAutoSchedule } from '@/app/actions/schedule'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { ChevronLeft, ChevronRight, Calendar, Plus, Play, Download, Sparkles } from 'lucide-react'
import type { Store, Employee, Shift } from '@/types/schedule'
import { DIAS_SEMANA_CORTO, CONFIGURACION_TURNOS, FOOTER_ATTRIBUTION } from '@/lib/constants'
import { format, addMonths, startOfMonth, addDays, isSameDay, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import html2canvas from 'html2canvas'

export default function SchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [stores, setStores] = useState<Store[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddShiftOpen, setIsAddShiftOpen] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; storeId: string } | null>(null)
  const [isAutoScheduling, setIsAutoScheduling] = useState(false)

  // Vista de 15 días comenzando del día 1 del mes actual
  const startDate = startOfMonth(currentDate)
  const dates = Array.from({ length: 15 }, (_, i) => addDays(startDate, i))

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setIsLoading(true)
    const [storesData, employeesData] = await Promise.all([
      getStores(),
      getEmployees(),
    ])
    setStores(storesData)
    setEmployees(employeesData)
    setIsLoading(false)
  }

  useEffect(() => {
    if (stores.length > 0) {
      loadShifts()
    }
  }, [startDate, stores])

  async function loadShifts() {
    const endDate = addDays(startDate, 14)
    const shiftsData = await getShifts(
      format(startDate, 'yyyy-MM-dd'),
      format(endDate, 'yyyy-MM-dd')
    )
    setShifts(shiftsData)
  }

  function handlePrevMonth() {
    setCurrentDate(addMonths(currentDate, -1))
  }

  function handleNextMonth() {
    setCurrentDate(addMonths(currentDate, 1))
  }

  function getShiftsForDateAndStore(date: Date, storeId: string) {
    return shifts.filter(shift =>
      isSameDay(parseISO(shift.shift_date), date) &&
      shift.store_id === storeId
    )
  }

  function getEmployeeById(id: string) {
    return employees.find(e => e.id === id)
  }

  function getStoreById(id: string) {
    return stores.find(s => s.id === id)
  }

  function handleAddShift(date: Date, storeId: string) {
    setSelectedSlot({ date: format(date, 'yyyy-MM-dd'), storeId })
    setIsAddShiftOpen(true)
  }

  async function handleCreateShift(formData: FormData) {
    if (!selectedSlot) return

    const result = await createShift({
      store_id: selectedSlot.storeId,
      employee_id: formData.get('employee_id') as string,
      shift_date: selectedSlot.date,
      start_time: formData.get('start_time') as string,
      end_time: formData.get('end_time') as string,
    })

    if (result.success) {
      toast.success('Turno creado exitosamente')
      setIsAddShiftOpen(false)
      loadShifts()
    } else {
      toast.error(result.error || 'Error al crear turno')
    }
  }

  async function handleDeleteShift(shiftId: string) {
    if (!confirm('¿Eliminar este turno?')) return

    const result = await deleteShift(shiftId)
    if (result.success) {
      toast.success('Turno eliminado')
      loadShifts()
    } else {
      toast.error(result.error || 'Error al eliminar turno')
    }
  }

  async function handleAutoSchedule() {
    setIsAutoScheduling(true)
    const endDate = addDays(startDate, 14)

    const result = await runAutoSchedule(
      format(startDate, 'yyyy-MM-dd'),
      format(endDate, 'yyyy-MM-dd')
    )

    if (result.success) {
      toast.success('Auto-programación completada')
      if (result.warnings && result.warnings.length > 0) {
        result.warnings.forEach(w => toast.warning(w))
      }
      loadShifts()
    } else {
      toast.error(result.error || 'Error en auto-programación')
    }

    setIsAutoScheduling(false)
  }

  async function handleExportImage() {
    const element = document.getElementById('schedule-grid')
    if (!element) return

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        ignoreElements: (el) => {
          // Ignorar botones y elementos interactivos
          if (el.classList?.contains('no-print')) return true
          return false
        },
      })

      const link = document.createElement('a')
      link.download = `horario-${format(startDate, 'yyyy-MM-dd')}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()

      toast.success('Horario exportado exitosamente')
    } catch {
      toast.error('Error al exportar horario')
    }
  }

  function getStoreColorClass(color: string) {
    const colors: Record<string, string> = {
      blue: 'border-blue-500 bg-blue-50 text-blue-700',
      green: 'border-green-500 bg-green-50 text-green-700',
      purple: 'border-purple-500 bg-purple-50 text-purple-700',
      orange: 'border-orange-500 bg-orange-50 text-orange-700',
    }
    return colors[color] || 'border-slate-500 bg-slate-50 text-slate-700'
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Cargando horario...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Horarios</h1>
                <p className="text-sm text-slate-500">
                  {format(startDate, "MMMM yyyy", { locale: es })} - Primeros 15 días
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 no-print flex-wrap">
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={handlePrevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                  <Calendar className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Hoy</span>
                </Button>
                <Button variant="outline" size="sm" onClick={handleNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="h-4 w-px bg-slate-200 hidden sm:block" />

              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoSchedule}
                disabled={isAutoScheduling}
                className="flex-1 sm:flex-initial"
              >
                <Sparkles className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{isAutoScheduling ? 'Programando...' : 'Auto-programar'}</span>
              </Button>

              <Button variant="outline" size="sm" onClick={handleExportImage}>
                <Download className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Exportar</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Schedule Grid */}
      <main className="container mx-auto p-4">
        <div id="schedule-grid" className="space-y-4">
          {stores.map((store) => (
            <Card key={store.id}>
              <CardContent className="p-4">
                <div className={`mb-3 p-2 rounded-lg border-l-4 ${getStoreColorClass(store.color_theme)}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-bold text-lg">{store.display_name}</h2>
                      <p className="text-sm opacity-80">
                        {store.schedule_weekday} (Lun-Vie) | {store.schedule_weekend} (Sáb-Dom)
                        {store.lunch_minutes === 60 ? ' | 1h almuerzo' : ' | 30min almuerzo'}
                      </p>
                    </div>
                    <span className="text-sm font-medium">
                      {store.slots_required} turnos/día
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto pb-2">
                  <div className="flex gap-2 min-w-max">
                    {dates.map((date) => {
                      const dayShifts = getShiftsForDateAndStore(date, store.id)
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6

                      return (
                        <div
                          key={date.toISOString()}
                          className={`border rounded-md p-2 min-h-[120px] w-32 flex-shrink-0 ${
                            isWeekend ? 'bg-slate-50' : 'bg-white'
                          }`}
                        >
                          <div className="text-center mb-2 pb-2 border-b">
                          <p className="text-xs font-medium text-slate-500">
                            {DIAS_SEMANA_CORTO[format(date, 'EEEE', { locale: es }) as keyof typeof DIAS_SEMANA_CORTO]}
                          </p>
                          <p className="text-sm font-bold">{format(date, 'd')}</p>
                        </div>

                        <div className="space-y-1">
                          {dayShifts.map((shift) => {
                            const employee = getEmployeeById(shift.employee_id)
                            if (!employee) return null

                            return (
                              <div
                                key={shift.id}
                                className="text-xs p-1.5 rounded bg-blue-100 border border-blue-200 flex items-center justify-between group"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{employee.full_name}</p>
                                  <p className="text-slate-500 text-[10px]">
                                    {shift.start_time} - {shift.end_time}
                                  </p>
                                </div>
                                <button
                                  onClick={() => handleDeleteShift(shift.id)}
                                  className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 no-print ml-1"
                                >
                                  ×
                                </button>
                              </div>
                            )
                          })}

                          {/* Empty slots */}
                          {Array.from({ length: Math.max(0, store.slots_required - dayShifts.length) }).map((_, i) => (
                            <button
                              key={i}
                              onClick={() => handleAddShift(date, store.id)}
                              className="w-full text-xs p-1.5 rounded border-2 border-dashed border-slate-200 text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-colors no-print"
                            >
                              <Plus className="h-3 w-3 mx-auto" />
                            </button>
                          ))}
                        </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer Attribution */}
        <footer className="mt-8 pb-4 text-center">
          <p className="text-xs text-slate-400 italic">
            {FOOTER_ATTRIBUTION}
          </p>
        </footer>
      </main>

      {/* Add Shift Dialog */}
      <Dialog open={isAddShiftOpen} onOpenChange={setIsAddShiftOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar Turno</DialogTitle>
          </DialogHeader>
          <form action={handleCreateShift} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="employee_id">Empleado</Label>
              <Select name="employee_id" required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un empleado" />
                </SelectTrigger>
                <SelectContent>
                  {employees
                    .filter(e => e.is_active)
                    .map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.full_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_time">Hora Inicio</Label>
                <Input
                  id="start_time"
                  name="start_time"
                  type="time"
                  required
                  defaultValue="09:00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time">Hora Fin</Label>
                <Input
                  id="end_time"
                  name="end_time"
                  type="time"
                  required
                  defaultValue="19:00"
                />
              </div>
            </div>
            <Button type="submit" className="w-full">
              Agregar Turno
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
