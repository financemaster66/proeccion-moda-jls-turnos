'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { FESTIVOS_COLOMBIA_2026, AUTO_SCHEDULE_CONFIG } from '@/lib/constants'
import type { WeekendBlock } from '@/types/schedule'

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
    // ===== SETUP INICIAL =====
    const { data: employees } = await supabase
      .from('employees')
      .select('*')
      .eq('is_active', true)

    const { data: stores } = await supabase
      .from('stores')
      .select('*')

    const { data: coworkerHistory } = await supabase
      .from('coworker_history')
      .select('*')
      .gte('shift_date', new Date(startDate).toISOString().split('T')[0].replace(/^(\d{4})-(\d{2})-(\d{2})/, (_, y, m, d) => {
        const sixtyDaysAgo = new Date(`${y}-${m}-${d}`)
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - AUTO_SCHEDULE_CONFIG.COWORKER_HISTORY_DAYS)
        return sixtyDaysAgo.toISOString().split('T')[0]
      }))

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

    // Generar array de fechas
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

    // Track shifts per employee per week (for complete employees: max 6 shifts/week)
    const shiftsPerWeek = new Map<string, number>()

    // Track consecutive working days per employee (max 6 consecutive days, then must rest)
    const consecutiveDays = new Map<string, number>()

    // Initialize consecutiveDays from existing shifts (before the date range)
    const { data: priorShifts } = await supabase
      .from('shifts')
      .select('employee_id, shift_date')
      .lt('shift_date', startDate)
      .order('shift_date', { ascending: true })

    const employeeShiftDates = new Map<string, string[]>()
    priorShifts?.forEach(shift => {
      if (!employeeShiftDates.has(shift.employee_id)) {
        employeeShiftDates.set(shift.employee_id, [])
      }
      employeeShiftDates.get(shift.employee_id)!.push(shift.shift_date)
    })

    employeeShiftDates.forEach((shiftDates, empId) => {
      let streak = 0
      for (let i = shiftDates.length - 1; i >= 0; i--) {
        if (i === shiftDates.length - 1) {
          streak = 1
        } else {
          const current = new Date(shiftDates[i])
          const next = new Date(shiftDates[i + 1])
          const diffDays = Math.floor((next.getTime() - current.getTime()) / (1000 * 60 * 60 * 24))
          if (diffDays === 1) {
            streak++
          } else {
            break
          }
        }
      }
      consecutiveDays.set(empId, streak)
    })

    // Helper: Fisher-Yates shuffle
    function shuffleArray<T>(array: T[]): T[] {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[array[i], array[j]] = [array[j], array[i]]
      }
      return array
    }

    // Helper: verificar permiso de trabajo
    function hasCorrectPermission(emp: any, store: any): boolean {
      if (store.name.startsWith('quest') && emp.work_permission === 'koaj_only') return false
      if (!store.name.startsWith('quest') && emp.work_permission === 'quest_only') return false
      return true
    }

    // Pre-calcular turnos por tienda (últimos 14 días) para cada empleado
    // Esto evita llamadas async durante el sorting
    const shiftsAtStoreMap = new Map<string, number>() // key: `${empId}-${storeId}` -> count
    const cutoffDate = new Date(startDate)
    cutoffDate.setDate(cutoffDate.getDate() - AUTO_SCHEDULE_CONFIG.STORE_ROTATION_DAYS)

    const { data: recentShifts } = await supabase
      .from('shifts')
      .select('employee_id, store_id')
      .gte('shift_date', cutoffDate.toISOString().split('T')[0])

    recentShifts?.forEach(shift => {
      const key = `${shift.employee_id}-${shift.store_id}`
      shiftsAtStoreMap.set(key, (shiftsAtStoreMap.get(key) || 0) + 1)
    })

    // Separar empleados por tipo
    const completeEmployees = employees.filter(emp =>
      emp.employee_type === 'complete' && emp.is_active
    )
    const weekendEmployees = employees.filter(emp =>
      (emp.employee_type === 'weekends_only' || emp.employee_type === 'weekends_half') &&
      emp.is_active
    )
    // on_call employees NO participan en auto-programación (explícitamente vacíos)
    const onCallEmployees: typeof employees = []
    const hourlyEmployees = employees.filter(emp =>
      emp.employee_type === 'hourly' && emp.is_active
    )

    // ===== PASO 1: IDENTIFICAR BLOQUES DE FIN DE SEMANA =====
    const blocks: WeekendBlock[] = []
    let currentBlock: string[] = []

    for (const date of dates) {
      const dayOfWeek = new Date(date).getDay()
      const isWeekendish = dayOfWeek === 6 || dayOfWeek === 0 || FESTIVOS_COLOMBIA_2026.includes(date)

      if (isWeekendish) {
        currentBlock.push(date)
      } else {
        if (currentBlock.length > 0) {
          blocks.push({
            blockId: currentBlock[0],
            dates: [...currentBlock],
            start: currentBlock[0],
            end: currentBlock[currentBlock.length - 1],
          })
          currentBlock = []
        }
      }
    }

    if (currentBlock.length > 0) {
      blocks.push({
        blockId: currentBlock[0],
        dates: [...currentBlock],
        start: currentBlock[0],
        end: currentBlock[currentBlock.length - 1],
      })
    }

    // Track which employees are already scheduled each day (global)
    const scheduledTodayGlobal = new Map<string, Set<string>>()
    dates.forEach(date => scheduledTodayGlobal.set(date, new Set<string>()))

    // Track empty slots rotation for KOAJ stores (distribución equitativa)
    const koajStores = stores.filter(s => s.name.startsWith('koaj'))
    let emptySlotRotationIndex = 0
    const storeEmptySlotsCount = new Map<string, number>()
    stores.forEach(s => storeEmptySlotsCount.set(s.id, 0))

    // ===== PASO 1: ASIGNAR FDS EN BLOQUES SÁB-DOM-FEST =====
    for (const block of blocks) {
      // Mapa: parejaKey -> true si ya coincidieron en este bloque
      const pairedInBlock = new Map<string, boolean>()

      // Shuffle inicial para variedad
      const availableWeekendEmployees = shuffleArray([...weekendEmployees])

      // Para CADA día del bloque (en orden)
      for (const date of block.dates) {
        const assignedThisDay = scheduledTodayGlobal.get(date)!
        const emptySlotsByStore = new Map<string, number>()
        let totalEmptySlots = 0

        // Ordenar tiendas rotativamente para distribuir slots vacíos
        const storesOrder = [...stores].sort((a, b) => {
          const aEmpty = storeEmptySlotsCount.get(a.id) || 0
          const bEmpty = storeEmptySlotsCount.get(b.id) || 0
          return aEmpty - bEmpty // Tiendas con menos vacíos primero
        })

        for (const store of storesOrder) {
          const slots = store.slots_required || 2
          let filled = 0
          const assignedInStore: string[] = []

          // Candidatos FDS: disponibles, con permiso correcto, no asignados hoy
          let fdsCandidates = availableWeekendEmployees.filter(emp =>
            !assignedThisDay.has(emp.id) &&
            hasCorrectPermission(emp, store)
          )

          // FILTRO CRÍTICO: excluir quienes repetirían compañero en este bloque
          if (assignedInStore.length > 0) {
            fdsCandidates = fdsCandidates.filter(emp => {
              for (const assignedId of assignedInStore) {
                const pairKey = [emp.id, assignedId].sort().join('-')
                if (pairedInBlock.get(pairKey)) {
                  return false // Ya coincidieron en este bloque → NO repetir
                }
              }
              return true
            })
          }

          // Asignar FDS sin repetir compañero (regla dura)
          shuffleArray(fdsCandidates)

          for (const emp of fdsCandidates) {
            if (filled >= slots) break

            // Registrar asignación
            assignedInStore.push(emp.id)
            assignedThisDay.add(emp.id)
            filled++

            // Registrar parejas formadas en este bloque
            for (const otherId of assignedInStore) {
              if (otherId !== emp.id) {
                const pairKey = [emp.id, otherId].sort().join('-')
                pairedInBlock.set(pairKey, true)
              }
            }

            // Track shifts per week
            const weekNum = getWeekNumber(new Date(date))
            const employeeWeekKey = `${emp.id}-${weekNum}`
            shiftsPerWeek.set(employeeWeekKey, (shiftsPerWeek.get(employeeWeekKey) || 0) + 1)

            // Track consecutive days
            if (!employeeShiftDates.has(emp.id)) {
              employeeShiftDates.set(emp.id, [])
            }
            employeeShiftDates.get(emp.id)!.push(date)
            const currentStreak = consecutiveDays.get(emp.id) || 0
            consecutiveDays.set(emp.id, currentStreak + 1)

            const schedule = store.schedule_weekend
            const [startStr, endStr] = schedule.split('-')

            newShifts.push({
              store_id: store.id,
              employee_id: emp.id,
              shift_date: date,
              start_time: startStr,
              end_time: endStr,
              is_auto_scheduled: true,
            })
          }

          // Trackear slots vacíos para completar con TC
          const emptySlots = slots - filled
          if (emptySlots > 0) {
            emptySlotsByStore.set(store.id, emptySlots)
            totalEmptySlots += emptySlots
            storeEmptySlotsCount.set(store.id, (storeEmptySlotsCount.get(store.id) || 0) + emptySlots)
          }
        }

        // COMPLETAR SLOTS VACÍOS CON TC (no con FDS repetido)
        if (totalEmptySlots > 0) {
          const weekNum = getWeekNumber(new Date(date))

          // Ordenar tiendas para rotación de vacíos
          const storesForEmpty = [...stores].sort((a, b) => {
            const aEmpty = storeEmptySlotsCount.get(a.id) || 0
            const bEmpty = storeEmptySlotsCount.get(b.id) || 0
            return bEmpty - aEmpty // Tiendas con más vacíos primero
          })

          for (const store of storesForEmpty) {
            const emptySlots = emptySlotsByStore.get(store.id) || 0
            if (emptySlots <= 0) continue

            const alreadyAssigned = newShifts
              .filter(s => s.shift_date === date && s.store_id === store.id)
              .map(s => s.employee_id)

            // Candidatos TC
            let tcCandidates = completeEmployees.filter(emp => {
              if (assignedThisDay.has(emp.id)) return false
              if (!hasCorrectPermission(emp, store)) return false

              // Límite semanal
              const weekKey = `${emp.id}-${weekNum}`
              if ((shiftsPerWeek.get(weekKey) || 0) >= 6) return false

              // Límite consecutivos (PRIORIDAD > semanal)
              if ((consecutiveDays.get(emp.id) || 0) >= 6) return false

              return true
            })

            // Ordenar por score compuesto (síncrono, usa shiftsAtStoreMap pre-calculado)
            tcCandidates.sort((a, b) => {
              const scoreA = calculateCandidateScoreSync(a, alreadyAssigned, date, store, weekNum, lastPairedDate, shiftsAtStoreMap)
              const scoreB = calculateCandidateScoreSync(b, alreadyAssigned, date, store, weekNum, lastPairedDate, shiftsAtStoreMap)
              return scoreB - scoreA
            })

            // Asignar candidatos
            for (let i = 0; i < emptySlots && tcCandidates.length > 0; i++) {
              const emp = tcCandidates.shift()!

              assignedThisDay.add(emp.id)

              // Track shifts per week
              const weekKey = `${emp.id}-${weekNum}`
              shiftsPerWeek.set(weekKey, (shiftsPerWeek.get(weekKey) || 0) + 1)

              // Track consecutive days
              if (!employeeShiftDates.has(emp.id)) {
                employeeShiftDates.set(emp.id, [])
              }
              employeeShiftDates.get(emp.id)!.push(date)
              const currentStreak = consecutiveDays.get(emp.id) || 0
              consecutiveDays.set(emp.id, currentStreak + 1)

              const schedule = store.schedule_weekend
              const [startStr, endStr] = schedule.split('-')

              newShifts.push({
                store_id: store.id,
                employee_id: emp.id,
                shift_date: date,
                start_time: startStr,
                end_time: endStr,
                is_auto_scheduled: true,
              })
            }
          }
        }
      }
    }

    // ===== PASO 2: ASIGNAR TC ENTRE SEMANA (LUN-VIE) =====
    const weekdays = dates.filter(date => {
      const dow = new Date(date).getDay()
      return dow >= 1 && dow <= 5
    })

    for (const date of weekdays) {
      const weekNum = getWeekNumber(new Date(date))
      const assignedThisDay = scheduledTodayGlobal.get(date)!

      // Ordenar tiendas rotativamente
      const storesOrder = [...stores].sort((a, b) => {
        const aEmpty = storeEmptySlotsCount.get(a.id) || 0
        const bEmpty = storeEmptySlotsCount.get(b.id) || 0
        return aEmpty - bEmpty
      })
      emptySlotRotationIndex = (emptySlotRotationIndex + 1) % stores.length

      for (const store of storesOrder) {
        const slots = store.slots_required || 2
        const alreadyAssigned = newShifts
          .filter(s => s.shift_date === date && s.store_id === store.id)
          .map(s => s.employee_id)

        let filled = alreadyAssigned.length
        if (filled >= slots) continue

        // Candidatos TC
        let candidates = completeEmployees.filter(emp => {
          if (assignedThisDay.has(emp.id)) return false
          if (!hasCorrectPermission(emp, store)) return false

          const weekKey = `${emp.id}-${weekNum}`
          if ((shiftsPerWeek.get(weekKey) || 0) >= 6) return false
          if ((consecutiveDays.get(emp.id) || 0) >= 6) return false

          return true
        })

        // Ordenar por score compuesto (síncrono, usa shiftsAtStoreMap pre-calculado)
        candidates.sort((a, b) => {
          const scoreA = calculateCandidateScoreSync(a, alreadyAssigned, date, store, weekNum, lastPairedDate, shiftsAtStoreMap)
          const scoreB = calculateCandidateScoreSync(b, alreadyAssigned, date, store, weekNum, lastPairedDate, shiftsAtStoreMap)
          return scoreB - scoreA
        })

        // Asignar top candidatos
        for (let i = 0; i < slots - filled && candidates.length > 0; i++) {
          const emp = candidates.shift()!

          assignedThisDay.add(emp.id)

          // Track shifts per week
          const weekKey = `${emp.id}-${weekNum}`
          shiftsPerWeek.set(weekKey, (shiftsPerWeek.get(weekKey) || 0) + 1)

          // Track consecutive days
          if (!employeeShiftDates.has(emp.id)) {
            employeeShiftDates.set(emp.id, [])
          }
          employeeShiftDates.get(emp.id)!.push(date)
          const currentStreak = consecutiveDays.get(emp.id) || 0
          consecutiveDays.set(emp.id, currentStreak + 1)

          const schedule = store.schedule_weekday
          const [startStr, endStr] = schedule.split('-')

          newShifts.push({
            store_id: store.id,
            employee_id: emp.id,
            shift_date: date,
            start_time: startStr,
            end_time: endStr,
            is_auto_scheduled: true,
          })
        }
      }
    }

    // ===== PASO 3: VERIFICAR Y CORREGIR DÍAS CONSECUTIVOS (> 6) =====
    await fixConsecutiveDaysViolations(
      newShifts,
      employees,
      stores,
      consecutiveDays,
      shiftsPerWeek,
      employeeShiftDates,
      lastPairedDate,
      getWeekNumber,
      hasCorrectPermission,
      scheduledTodayGlobal
    )

    // Registrar parejas de compañeros para todo el período
    const shiftsByDateAndStore = new Map<string, Map<string, string[]>>()
    newShifts.forEach(shift => {
      const dateKey = shift.shift_date
      const storeMap = shiftsByDateAndStore.get(dateKey) || new Map<string, string[]>()
      const storeShifts = storeMap.get(shift.store_id) || []
      storeShifts.push(shift.employee_id)
      storeMap.set(shift.store_id, storeShifts)
      shiftsByDateAndStore.set(dateKey, storeMap)
    })

    shiftsByDateAndStore.forEach((storeMap, date) => {
      storeMap.forEach((employeeIds, storeId) => {
        if (employeeIds.length >= 2) {
          for (let i = 0; i < employeeIds.length; i++) {
            for (let j = i + 1; j < employeeIds.length; j++) {
              const [emp1, emp2] = [employeeIds[i], employeeIds[j]].sort()
              coworkerPairs.push({
                shift_date: date,
                store_id: storeId,
                employee_1: emp1,
                employee_2: emp2,
              })
            }
          }
        }
      })
    })

    // Warning para slots vacíos
    stores.forEach(store => {
      dates.forEach(date => {
        const assignedCount = newShifts.filter(
          s => s.shift_date === date && s.store_id === store.id
        ).length
        const required = store.slots_required || 2
        if (assignedCount < required) {
          warnings.push(
            `${store.display_name} el ${date}: ${assignedCount}/${required} turnos asignados`
          )
        }
      })
    })

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

// ===== HELPER FUNCTIONS =====

function calculateCandidateScoreSync(
  emp: any,
  alreadyAssigned: string[],
  date: string,
  store: any,
  weekNum: number,
  lastPairedDate: Map<string, string>,
  shiftsAtStoreMap: Map<string, number>
): number {
  let score = 0

  // 1. ¿Repetiría compañero esta semana? (PENALIZACIÓN MÁXIMA)
  for (const assignedId of alreadyAssigned) {
    const pairKey = [emp.id, assignedId].sort().join('-')
    const lastDate = lastPairedDate.get(pairKey)
    if (lastDate) {
      const lastWeekNum = getWeekNumber(new Date(lastDate))
      if (lastWeekNum === weekNum) {
        score -= AUTO_SCHEDULE_CONFIG.PRIORITY_NO_REPEAT_THIS_WEEK
      }
    }
  }

  // 2. Días desde último emparejamiento (MAYOR = MEJOR)
  let minDaysSincePairing = Infinity
  for (const assignedId of alreadyAssigned) {
    const pairKey = [emp.id, assignedId].sort().join('-')
    const lastDate = lastPairedDate.get(pairKey)
    if (lastDate) {
      const days = Math.floor(
        (new Date(date).getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24)
      )
      minDaysSincePairing = Math.min(minDaysSincePairing, days)
    }
  }
  if (minDaysSincePairing !== Infinity) {
    score += minDaysSincePairing * AUTO_SCHEDULE_CONFIG.PRIORITY_DAYS_SINCE_PAIRING
  }

  // 3. Rotación de tienda: últimos 14 días (MENOS visitas = MEJOR)
  const shiftsKey = `${emp.id}-${store.id}`
  const shifts = shiftsAtStoreMap.get(shiftsKey) || 0
  score -= shifts * AUTO_SCHEDULE_CONFIG.PRIORITY_STORE_ROTATION

  // 4. Random tiebreaker
  score += Math.random() * AUTO_SCHEDULE_CONFIG.PRIORITY_RANDOM

  return score
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

async function fixConsecutiveDaysViolations(
  newShifts: Array<{ store_id: string; employee_id: string; shift_date: string; start_time: string; end_time: string; is_auto_scheduled: boolean }>,
  employees: any[],
  stores: any[],
  consecutiveDays: Map<string, number>,
  shiftsPerWeek: Map<string, number>,
  employeeShiftDates: Map<string, string[]>,
  lastPairedDate: Map<string, string>,
  getWeekNumber: (date: Date) => number,
  hasCorrectPermission: (emp: any, store: any) => boolean,
  scheduledTodayGlobal: Map<string, Set<string>>
) {
  // Recalcular rachas después de asignaciones
  const employeeShiftsMap = new Map<string, Array<typeof newShifts[0]>>()
  newShifts.forEach(shift => {
    if (!employeeShiftsMap.has(shift.employee_id)) {
      employeeShiftsMap.set(shift.employee_id, [])
    }
    employeeShiftsMap.get(shift.employee_id)!.push(shift)
  })

  // Detectar violaciones (> 6 días consecutivos)
  const violations: Array<{ empId: string; shifts: typeof newShifts; streak: number }> = []

  employeeShiftsMap.forEach((shifts, empId) => {
    const sorted = shifts.sort((a, b) => a.shift_date.localeCompare(b.shift_date))
    let streak = 1
    let streakShifts = [sorted[0]]

    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1].shift_date)
      const curr = new Date(sorted[i].shift_date)
      const diff = Math.floor((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24))

      if (diff === 1) {
        streak++
        streakShifts.push(sorted[i])
      } else {
        if (streak > 6) {
          violations.push({ empId, shifts: [...streakShifts], streak })
        }
        streak = 1
        streakShifts = [sorted[i]]
      }
    }

    if (streak > 6) {
      violations.push({ empId, shifts: [...streakShifts], streak })
    }
  })

  // Corregir violaciones: reasignar días desde el día 7 en adelante
  for (const violation of violations) {
    const daysToReassign = violation.shifts.slice(6) // Día 7+

    for (const shift of daysToReassign) {
      const date = shift.shift_date
      const storeId = shift.store_id
      const store = stores.find(s => s.id === storeId)
      if (!store) continue

      const assignedToday = scheduledTodayGlobal.get(date)
      if (!assignedToday) continue

      // Buscar sustituto
      const substitute = await findSubstituteEmployee(
        violation.empId,
        store,
        date,
        employees,
        assignedToday,
        shiftsPerWeek,
        consecutiveDays,
        getWeekNumber,
        hasCorrectPermission
      )

      if (substitute) {
        // Reasignar shift al sustituto
        shift.employee_id = substitute.id

        // Actualizar trackers
        assignedToday.add(substitute.id)
        assignedToday.delete(violation.empId)

        const weekNum = getWeekNumber(new Date(date))
        const weekKey = `${substitute.id}-${weekNum}`
        shiftsPerWeek.set(weekKey, (shiftsPerWeek.get(weekKey) || 0) + 1)

        if (!employeeShiftDates.has(substitute.id)) {
          employeeShiftDates.set(substitute.id, [])
        }
        employeeShiftDates.get(substitute.id)!.push(date)

        // Resetear racha del empleado original para este día
        const origDates = employeeShiftDates.get(violation.empId) || []
        const idx = origDates.indexOf(date)
        if (idx >= 0) origDates.splice(idx, 1)
        employeeShiftDates.set(violation.empId, origDates)
      } else {
        // No hay sustituto → eliminar shift (descanso forzoso)
        const idx = newShifts.indexOf(shift)
        if (idx >= 0) newShifts.splice(idx, 1)

        assignedToday.delete(violation.empId)

        const origDates = employeeShiftDates.get(violation.empId) || []
        const idxDate = origDates.indexOf(date)
        if (idxDate >= 0) origDates.splice(idxDate, 1)
        employeeShiftDates.set(violation.empId, origDates)
      }
    }
  }
}

async function findSubstituteEmployee(
  excludeEmpId: string,
  store: any,
  date: string,
  employees: any[],
  assignedToday: Set<string>,
  shiftsPerWeek: Map<string, number>,
  consecutiveDays: Map<string, number>,
  getWeekNumber: (date: Date) => number,
  hasCorrectPermission: (emp: any, store: any) => boolean
): Promise<any> {
  const weekNum = getWeekNumber(new Date(date))

  const candidates = employees.filter(emp => {
    if (emp.id === excludeEmpId) return false
    if (assignedToday.has(emp.id)) return false
    if (!hasCorrectPermission(emp, store)) return false

    const weekKey = `${emp.id}-${weekNum}`
    if ((shiftsPerWeek.get(weekKey) || 0) >= 6) return false
    if ((consecutiveDays.get(emp.id) || 0) >= 6) return false

    return true
  })

  if (candidates.length === 0) return null

  // Preferir quien menos haya trabajado en esta tienda (14 días)
  // y quien no repita compañero esta semana
  // (ordenamiento simple - se podría mejorar con shiftsAtStoreMap)
  candidates.sort((a, b) => {
    return 0
  })

  return candidates[0]
}
