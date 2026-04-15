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

    // Fetch coworker history from last 30 days
    const thirtyDaysAgo = new Date(startDate)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const { data: coworkerHistory } = await supabase
      .from('coworker_history')
      .select('*')
      .gte('shift_date', thirtyDaysAgo.toISOString().split('T')[0])

    if (!employees || !stores) {
      return { success: false, error: 'No hay empleados o tiendas disponibles' }
    }

    const newShifts: Array<{
      store_id: string
      employee_id: string
      shift_date: string
      start_time: string
      end_time: string
      is_auto_scheduled: boolean
    }> = []
    const coworkerPairs: Array<{
      shift_date: string
      store_id: string
      employee_1: string
      employee_2: string
    }> = []
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

    // Build map of last paired date for each employee pair
    const lastPairedDate = new Map<string, string>()
    coworkerHistory?.forEach(record => {
      const pairKey = [record.employee_1, record.employee_2].sort().join('-')
      if (!lastPairedDate.has(pairKey) || record.shift_date > lastPairedDate.get(pairKey)!) {
        lastPairedDate.set(pairKey, record.shift_date)
      }
    })

    // Track employee -> last store assignment for rotation
    const employeeLastStore = new Map<string, string>()

    // For each date
    for (const date of dates) {
      const dayOfWeek = new Date(date).getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

      // Track which employees are already scheduled this day
      const scheduledToday = new Set<string>()

      // Separate employees by type
      const completeEmployees = employees.filter(emp =>
        emp.employee_type === 'complete' && emp.is_active
      )
      const weekendEmployees = employees.filter(emp =>
        (emp.employee_type === 'weekends_only' || emp.employee_type === 'weekends_half') &&
        emp.is_active
      )
      const onCallEmployees = employees.filter(emp =>
        emp.employee_type === 'on_call' && emp.is_active
      )
      const hourlyEmployees = employees.filter(emp =>
        emp.employee_type === 'hourly' && emp.is_active
      )

      // Randomize employees for variety (Fisher-Yates shuffle)
      function shuffleArray<T>(array: T[]) {
        for (let i = array.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[array[i], array[j]] = [array[j], array[i]]
        }
        return array
      }

      // WEEKDAYS: Shuffle complete employees
      if (!isWeekend) {
        shuffleArray(completeEmployees)
      }

      // WEEKENDS: Shuffle weekend employees first
      if (isWeekend) {
        shuffleArray(weekendEmployees)
      }

      // For each store
      for (const store of stores) {
        const requiredSlots = store.slots_required || 2
        const assigned: string[] = []

        // Build candidate pool based on day type
        let candidatePool = isWeekend
          ? [...weekendEmployees, ...completeEmployees, ...onCallEmployees, ...hourlyEmployees]
          : [...completeEmployees, ...hourlyEmployees, ...onCallEmployees]

        // Filter eligible candidates
        let candidates = candidatePool.filter(emp => {
          // Check work permission
          if (store.name.startsWith('quest') && emp.work_permission === 'koaj_only') return false
          if (!store.name.startsWith('quest') && emp.work_permission === 'quest_only') return false

          // Check if already scheduled today
          if (scheduledToday.has(emp.id)) return false

          // Check on_call availability
          if (emp.employee_type === 'on_call') {
            const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek]
            if (!emp.available_days?.includes(dayName)) return false
          }

          return true
        })

        // Sort candidates by:
        // 1. Days since last paired with any already-assigned employee (higher = better)
        // 2. Store rotation (prefer different store than last time)
        // 3. Random tiebreaker
        candidates.sort((a, b) => {
          // Calculate minimum days since last pairing with any assigned coworker
          const getMinDaysSincePairing = (emp: typeof employees[0]) => {
            if (assigned.length === 0) return Infinity
            let minDays = Infinity
            for (const assignedId of assigned) {
              const pairKey = [emp.id, assignedId].sort().join('-')
              const lastDate = lastPairedDate.get(pairKey)
              if (lastDate) {
                const days = Math.floor(
                  (new Date(date).getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24)
                )
                minDays = Math.min(minDays, days)
              }
            }
            return minDays
          }

          const aDays = getMinDaysSincePairing(a)
          const bDays = getMinDaysSincePairing(b)

          // Prefer candidate who hasn't worked with assigned coworkers for longer
          if (aDays !== bDays) {
            return bDays - aDays
          }

          // Tiebreaker: prefer different store than last assignment
          const aStoreDiff = employeeLastStore.has(a.id) && employeeLastStore.get(a.id) !== store.id ? 1 : 0
          const bStoreDiff = employeeLastStore.has(b.id) && employeeLastStore.get(b.id) !== store.id ? 1 : 0
          if (aStoreDiff !== bStoreDiff) {
            return bStoreDiff - aStoreDiff
          }

          // Final tiebreaker: random
          return Math.random() - 0.5
        })

        // Assign employees to slots
        for (let i = 0; i < requiredSlots && candidates.length > 0; i++) {
          const employee = candidates.shift()!
          if (!employee) continue

          assigned.push(employee.id)
          scheduledToday.add(employee.id)
          employeeLastStore.set(employee.id, store.id)

          // Parse store schedule
          const schedule = isWeekend ? store.schedule_weekend : store.schedule_weekday
          const [startStr, endStr] = schedule.split('-')

          // Staggered shifts for lunch coverage
          let startTime = startStr

          if (i === 1 && requiredSlots === 2) {
            const startHour = parseInt(startStr.split(':')[0])
            startTime = `${startHour + 4}:00`
          }

          newShifts.push({
            store_id: store.id,
            employee_id: employee.id,
            shift_date: date,
            start_time: startTime,
            end_time: endStr,
            is_auto_scheduled: true,
          })
        }

        // Register coworker pairs for this store/date
        if (assigned.length >= 2) {
          for (let i = 0; i < assigned.length; i++) {
            for (let j = i + 1; j < assigned.length; j++) {
              const [emp1, emp2] = [assigned[i], assigned[j]].sort()
              coworkerPairs.push({
                shift_date: date,
                store_id: store.id,
                employee_1: emp1,
                employee_2: emp2,
              })
            }
          }
        }

        // Warning if couldn't fill all slots (acceptable - manager can fill manually)
        if (assigned.length < requiredSlots) {
          warnings.push(
            `${store.display_name} el ${date}: ${assigned.length}/${requiredSlots} turnos asignados (espacios vacíos disponibles)`
          )
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

    // Insert coworker history records
    if (coworkerPairs.length > 0) {
      const { error } = await supabase
        .from('coworker_history')
        .insert(coworkerPairs)

      if (error) {
        console.error('Error inserting coworker history:', error)
        // Don't fail the whole operation, just log
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
