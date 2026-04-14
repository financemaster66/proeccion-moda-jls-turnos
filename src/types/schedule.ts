// Tipos para el sistema de turnos - Proección y Moda JLS

export type WorkPermission = 'koaj_only' | 'quest_only' | 'both'
export type EmployeeType = 'complete' | 'weekends_only' | 'weekends_half' | 'hourly' | 'on_call'
export type UserRole = 'developer' | 'manager'
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

export interface Store {
  id: string
  name: string
  display_name: string
  address: string | null
  schedule_weekday: string
  schedule_weekend: string
  lunch_minutes: number
  logo_url: string | null
  color_theme: string
  slots_required: number
  created_at: string
  updated_at: string
}

export interface Employee {
  id: string
  full_name: string
  document_id: string
  phone: string | null
  photo_url: string | null
  work_permission: WorkPermission
  employee_type: EmployeeType
  available_days: DayOfWeek[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Shift {
  id: string
  store_id: string
  employee_id: string
  shift_date: string
  start_time: string
  end_time: string
  created_by: string | null
  is_auto_scheduled: boolean
  created_at: string
  updated_at: string
  // Relaciones
  store?: Store
  employee?: Employee
}

export interface User {
  id: string
  username: string
  role: UserRole
  created_at: string
}

export interface CoworkerHistory {
  id: string
  shift_date: string
  store_id: string
  employee_1: string
  employee_2: string
  created_at: string
}

// Tipos para la UI del calendario
export interface DaySchedule {
  date: string
  dayOfWeek: string
  isWeekend: boolean
  isHoliday: boolean
  stores: StoreShift[]
}

export interface StoreShift {
  store: Store
  shifts: Shift[]
  slots: ShiftSlot[]
}

export interface ShiftSlot {
  id: string
  employee?: Employee
  isEmpty: boolean
}

// Tipos para auto-programación
export interface SchedulingConstraints {
  maxShiftsPerWeek: number
  minRestDays: number
  noRepeatedCoworkers: boolean
  coworkerRepeatDays: number
}

export interface ScheduleResult {
  success: boolean
  shifts: Shift[]
  errors: string[]
  warnings: string[]
}
