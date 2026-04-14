'use client'

import { useEffect, useState, useRef } from 'react'
import { getStores } from '@/app/actions/stores'
import { getEmployees } from '@/app/actions/employees'
import { getShifts, createShift, deleteShift, runAutoSchedule } from '@/app/actions/schedule'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { ChevronLeft, ChevronRight, Calendar, Plus, Play, Download, Sparkles, Trash2 } from 'lucide-react'
import type { Store, Employee, Shift } from '@/types/schedule'
import { DIAS_SEMANA_CORTO, CONFIGURACION_TURNOS, FOOTER_ATTRIBUTION } from '@/lib/constants'
import { format, addMonths, startOfMonth, addDays, isSameDay, parseISO, getDaysInMonth } from 'date-fns'
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
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; storeId: string; storeSchedule?: { start: string; end: string } } | null>(null)
  const [isAutoScheduling, setIsAutoScheduling] = useState(false)
  const [currentRange, setCurrentRange] = useState<'first' | 'second'>('first')

  // Vista de 15 días: primer rango (1-15) o segundo rango (16-30/31)
  const monthStart = startOfMonth(currentDate)
  const daysInMonth = getDaysInMonth(currentDate)
  const rangeStart = currentRange === 'first' ? monthStart : addDays(monthStart, 15)
  const rangeEndDay = currentRange === 'first' ? 14 : Math.min(daysInMonth - 1, 29)
  const dates = Array.from({ length: currentRange === 'first' ? 15 : Math.min(15, daysInMonth - 15) }, (_, i) => addDays(rangeStart, i))

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
  }, [rangeStart, stores, currentRange, currentDate])

  async function loadShifts() {
    const endDate = addDays(rangeStart, dates.length - 1)
    const shiftsData = await getShifts(
      format(rangeStart, 'yyyy-MM-dd'),
      format(endDate, 'yyyy-MM-dd')
    )
    setShifts(shiftsData)
  }

  function handlePrevRange() {
    if (currentRange === 'second') {
      setCurrentRange('first')
    } else {
      setCurrentDate(addMonths(currentDate, -1))
      setCurrentRange('second')
    }
  }

  function handleNextRange() {
    if (currentRange === 'first' && daysInMonth > 15) {
      setCurrentRange('second')
    } else {
      setCurrentDate(addMonths(currentDate, 1))
      setCurrentRange('first')
    }
  }

  function getShiftsForDateAndStore(date: Date, storeId: string) {
    return shifts.filter(shift =>
      isSameDay(parseISO(shift.shift_date), date) &&
      shift.store_id === storeId
    )
  }

  function getAssignedEmployeeIdsForDate(date: Date): string[] {
    const dateStr = format(date, 'yyyy-MM-dd')
    return shifts
      .filter(shift => shift.shift_date === dateStr)
      .map(shift => shift.employee_id)
  }

  function getActiveEmployeesForStore(storeId: string): Employee[] {
    const store = getStoreById(storeId)
    if (!store) return []

    // El manager puede añadir cualquier empleado activo (sin filtro por permiso)
    // Solo auto-programar debe respetar permisos
    return employees.filter(emp => {
      if (!emp.is_active) return false
      return true
    })
  }

  function getEmployeeById(id: string) {
    return employees.find(e => e.id === id)
  }

  function getStoreById(id: string) {
    return stores.find(s => s.id === id)
  }

  function handleAddShift(date: Date, storeId: string) {
    const store = getStoreById(storeId)
    const isWeekend = date.getDay() === 0 || date.getDay() === 6
    const schedule = isWeekend ? store?.schedule_weekend : store?.schedule_weekday

    // Parsear horario de la tienda (ej: "9:00-19:00" → start: "09:00", end: "19:00")
    let startTime = "09:00"
    let endTime = "19:00"
    if (schedule) {
      const [start, end] = schedule.split('-').map(s => s.trim())
      // Asegurar formato HH:00
      startTime = start.includes(':') ? start.padStart(2, '0') : start + ':00'
      endTime = end.includes(':') ? end.padStart(2, '0') : end + ':00'
    }

    setSelectedSlot({
      date: format(date, 'yyyy-MM-dd'),
      storeId,
      storeSchedule: { start: startTime, end: endTime }
    })
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
    const endDate = addDays(rangeStart, dates.length - 1)

    const result = await runAutoSchedule(
      format(rangeStart, 'yyyy-MM-dd'),
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

  const exportRef = useRef<HTMLDivElement>(null)

  async function handleExportImage() {
    const element = exportRef.current
    if (!element) return

    try {
      toast.info('Generando imagen...')

      // Ocultar header temporalmente para capturar solo la grilla
      const header = document.querySelector('header')
      const main = document.querySelector('main')
      if (header) header.style.display = 'none'
      if (main) main.style.padding = '0'

      await new Promise(resolve => setTimeout(resolve, 50))

      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: false,
        logging: false,
        scrollX: 0,
        scrollY: -window.scrollY,
        ignoreElements: (el) => {
          if (el.classList?.contains('no-print')) return true
          if (el.classList?.contains('add-shift-btn')) return true
          return false
        },
      })

      // Restaurar layout
      if (header) header.style.display = ''
      if (main) main.style.padding = ''

      const dataUrl = canvas.toDataURL('image/png')
      const filename = `horario-${format(rangeStart, 'yyyy-MM-dd')}.png`

      // Try to use Web Share API on mobile
      if (navigator.share && navigator.canShare) {
        const blob = await (await fetch(dataUrl)).blob()
        const file = new File([blob], filename, { type: 'image/png' })
        const shareData = { files: [file], title: 'Horario Proección y Moda JLS' }

        if (navigator.canShare(shareData)) {
          await navigator.share(shareData)
          toast.success('Imagen compartida exitosamente')
          return
        }
      }

      // Fallback: download
      const link = document.createElement('a')
      link.download = filename
      link.href = dataUrl
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success('Horario exportado exitosamente')
    } catch (err) {
      console.error('Export error:', err)
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
                  {format(rangeStart, "d 'de' MMMM yyyy", { locale: es })} - {format(addDays(rangeStart, dates.length - 1), "d 'de' MMMM yyyy", { locale: es })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 no-print flex-wrap">
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={handlePrevRange}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setCurrentDate(new Date()); setCurrentRange('first') }}>
                  <Calendar className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Hoy</span>
                </Button>
                <Button variant="outline" size="sm" onClick={handleNextRange}>
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
        <div id="schedule-grid" ref={exportRef} className="space-y-4">
          {stores.map((store) => (
            <Card key={store.id}>
              <CardContent className="p-4">
                <div className={`mb-3 p-2 rounded-lg border-l-4 ${getStoreColorClass(store.color_theme)}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-bold text-lg">{store.display_name}</h2>
                      <p className="text-sm opacity-80">
                        {store.schedule_weekday} (Lun-Sab) | {store.schedule_weekend} (Dom-Fest)
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
                          className={`border rounded-md p-2 min-h-[140px] w-36 flex-shrink-0 ${
                            isWeekend ? 'bg-slate-50' : 'bg-white'
                          }`}
                        >
                          <div className="text-center mb-2 pb-2 border-b">
                            <p className="text-xs font-bold text-slate-700">
                              {format(date, 'EEEE', { locale: es })}
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
                                  className="text-xs p-2 rounded bg-blue-100 border border-blue-200 flex items-center justify-between group"
                                >
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{employee.full_name}</p>
                                    <p className="text-slate-500 text-[10px]">
                                      {shift.start_time} - {shift.end_time}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteShift(shift.id)}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-100 rounded p-1 no-print ml-1 transition-colors"
                                    title="Eliminar turno"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              )
                            })}

                            {/* Botón siempre visible para añadir manualmente */}
                            <button
                              onClick={() => handleAddShift(date, store.id)}
                              className="w-full text-xs p-2 rounded border-2 border-dashed border-slate-200 text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-colors no-print add-shift-btn"
                            >
                              <Plus className="h-3 w-3 mx-auto" />
                            </button>
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
                <SelectTrigger className="min-w-[200px]">
                  <SelectValue placeholder="Selecciona un empleado" />
                </SelectTrigger>
                <SelectContent className="min-w-[200px]">
                  {selectedSlot && getActiveEmployeesForStore(selectedSlot.storeId)
                    .filter(emp => {
                      // Filtrar empleados que ya tienen turno ese día
                      const assignedIds = getAssignedEmployeeIdsForDate(parseISO(selectedSlot.date))
                      return !assignedIds.includes(emp.id)
                    })
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
                  defaultValue={selectedSlot?.storeSchedule?.start || "09:00"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time">Hora Fin</Label>
                <Input
                  id="end_time"
                  name="end_time"
                  type="time"
                  required
                  defaultValue={selectedSlot?.storeSchedule?.end || "19:00"}
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
