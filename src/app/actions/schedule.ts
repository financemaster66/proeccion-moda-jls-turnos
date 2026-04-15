'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface CreateShiftData {
  store_id: string
  employee_id: string
  shift_date: string
  start_time: string
  end_time: string
  is_auto_scheduled?: boolean
}

export interface UpdateShiftData extends CreateShiftData {
  id: string
}

export async function getShifts(startDate: string, endDate: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('shifts')
    .select(`
      *,
      store:stores(*),
      employee:employees(*)
    `)
    .gte('shift_date', startDate)
    .lte('shift_date', endDate)
    .order('shift_date', { ascending: true })

  if (error) {
    console.error('Error fetching shifts:', error)
    return []
  }

  return data
}

export async function getShiftsByStore(storeId: string, startDate: string, endDate: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('shifts')
    .select(`
      *,
      employee:employees(*)
    `)
    .eq('store_id', storeId)
    .gte('shift_date', startDate)
    .lte('shift_date', endDate)
    .order('shift_date', { ascending: true })

  if (error) {
    console.error('Error fetching shifts by store:', error)
    return []
  }

  return data
}

export async function createShift(data: CreateShiftData) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('shifts')
    .insert({
      store_id: data.store_id,
      employee_id: data.employee_id,
      shift_date: data.shift_date,
      start_time: data.start_time,
      end_time: data.end_time,
      is_auto_scheduled: data.is_auto_scheduled || false,
    })

  if (error) {
    console.error('Error creating shift:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/schedule')
  return { success: true }
}

export async function updateShift(data: UpdateShiftData) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('shifts')
    .update({
      store_id: data.store_id,
      employee_id: data.employee_id,
      shift_date: data.shift_date,
      start_time: data.start_time,
      end_time: data.end_time,
      is_auto_scheduled: data.is_auto_scheduled,
    })
    .eq('id', data.id)

  if (error) {
    console.error('Error updating shift:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/schedule')
  return { success: true }
}

export async function deleteShift(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('shifts')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting shift:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/schedule')
  return { success: true }
}

export async function deleteShiftsByDateAndStore(date: string, storeId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('shifts')
    .delete()
    .eq('shift_date', date)
    .eq('store_id', storeId)

  if (error) {
    console.error('Error deleting shifts:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/schedule')
  return { success: true }
}

export async function deleteAllShifts(startDate: string, endDate: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('shifts')
    .delete()
    .gte('shift_date', startDate)
    .lte('shift_date', endDate)

  if (error) {
    console.error('Error deleting all shifts:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/schedule')
  return { success: true }
}

export async function runAutoSchedule(startDate: string, endDate: string) {
  const supabase = await createClient()

  try {
    // Fetch all active employees
    const { data: employees } = await supabase
      .from('employees')
      .select('*')
      .eq('is_active', true)

    // Fetch all stores
    const { data: stores } = await supabase
      .from('stores')
      .select('*')

    // Fetch existing shifts in the date range
    const { data: existingShifts } = await supabase
      .from('shifts')
      .select('*')
      .gte('shift_date', startDate)
      .lte('shift_date', endDate)

    if (!employees || !stores) {
      return { success: false, error: 'No hay empleados o tiendas disponibles' }
    }

    const newShifts = []
    const errors: string[] = []
    const warnings: string[] = []

    // Generate dates array
    const dates: string[] = []
    const currentDate = new Date(startDate)
    const end = new Date(endDate)
    while (currentDate <= end) {
      dates.push(currentDate.toISOString().split('T')[0])
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // For each date
    for (const date of dates) {
      const dayOfWeek = new Date(date).getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6 // Sunday or Saturday

      // Track which employees are already scheduled this day
      const scheduledToday = new Set<string>()
      const scheduledShifts = existingShifts?.filter(s => s.shift_date === date) || []
      scheduledShifts.forEach(s => scheduledToday.add(s.employee_id))

      // For each store
      for (const store of stores) {
        // Determine required slots
        const requiredSlots = store.slots_required || 2

        // Find eligible employees for this store
        let eligibleEmployees = employees.filter(emp => {
          // Check work permission
          if (store.name.startsWith('quest') && emp.work_permission === 'koaj_only') return false
          if (!store.name.startsWith('quest') && emp.work_permission === 'quest_only') return false

          // Check if already scheduled today
          if (scheduledToday.has(emp.id)) return false

          // Check employee type constraints
          if (emp.employee_type === 'weekends_only' && !isWeekend) return false

          // Check on_call availability
          if (emp.employee_type === 'on_call') {
            const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek]
            if (!emp.available_days?.includes(dayName)) return false
          }

          return true
        })

        // Sort by fewest shifts this week (fair distribution)
        const employeeShiftCounts = new Map<string, number>()
        scheduledShifts.forEach(s => {
          employeeShiftCounts.set(s.employee_id, (employeeShiftCounts.get(s.employee_id) || 0) + 1)
        })

        eligibleEmployees.sort((a, b) => {
          const countA = employeeShiftCounts.get(a.id) || 0
          const countB = employeeShiftCounts.get(b.id) || 0
          return countA - countB
        })

        // Assign employees to slots
        for (let i = 0; i < requiredSlots && eligibleEmployees.length > 0; i++) {
          const employee = eligibleEmployees.shift()
          if (!employee) continue

          // Parse store schedule
          const schedule = isWeekend ? store.schedule_weekend : store.schedule_weekday
          const [startStr, endStr] = schedule.split('-')

          // Adjust for lunch break (staggered shifts)
          let startTime = startStr
          let endTime = endStr

          if (i === 1 && requiredSlots === 2) {
            // Second shift starts later to cover lunch
            const startHour = parseInt(startStr.split(':')[0])
            startTime = `${startHour + 4}:00` // Start 4 hours later
          }

          newShifts.push({
            store_id: store.id,
            employee_id: employee.id,
            shift_date: date,
            start_time: startTime,
            end_time: endTime,
            is_auto_scheduled: true,
          })

          scheduledToday.add(employee.id)
        }

        if (eligibleEmployees.length === 0 && requiredSlots > (scheduledShifts.filter(s => s.store_id === store.id && s.shift_date === date).length || 0)) {
          warnings.push(`No hay suficientes empleados disponibles para ${store.display_name} el ${date}`)
        }
      }
    }

    // Insert new shifts
    if (newShifts.length > 0) {
      const { error } = await supabase
        .from('shifts')
        .insert(newShifts)

      if (error) {
        console.error('Error inserting auto-scheduled shifts:', error)
        return { success: false, error: error.message }
      }
    }

    revalidatePath('/schedule')

    return {
      success: true,
      shifts: newShifts,
      errors,
      warnings,
    }
  } catch (err) {
    console.error('Error in auto-schedule:', err)
    return { success: false, error: 'Error en auto-programación' }
  }
}
