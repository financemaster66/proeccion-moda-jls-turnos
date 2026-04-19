---
name: reglas_auto_agendamiento
description: Reglas de auto-agendamiento: descanso semanal, obligatoriedad Sáb-Dom-Fest, exclusión eventuales, no repetir compañeros global
type: feedback
---

**Reglas de Auto-Agendamiento:**

1. **Tiempo completo (complete)**: Máximo 6 turnos/semana (descansan 1 día obligatorio)
   - Se usa `shiftsPerWeek` con número de semana ISO para trackear turnos
   - Cuando un empleado alcanza 6 turnos en una semana, se excluye automáticamente

2. **Fin de semana (weekends_only/weekends_half)**: OBLIGATORIO trabajar Sáb-Dom-Fest (prioridad máxima)
   - En días Sáb-Dom-Fest, estos empleados se asignan PRIMERO antes que cualquier otro
   - Solo se excluyen por permiso de tienda (koaj_only/quest_only) o si ya están asignados ese día

3. **Eventuales (on_call)**: NO participan en auto-programación (solo asignación manual)
   - El array `onCallEmployees` se vacía explícitamente en `runAutoSchedule`
   - Se pueden añadir manualmente desde la UI

4. **No repetir compañeros**: Regla GLOBAL - maximizar días sin repetir compañero en CUALQUIER tienda
   - Historial de 60 días (no 30) para mayor rotación
   - `coworker_history` no considera tienda para la restricción
   - Ordenamiento prioriza empleados con más días sin trabajar juntos

**Por qué:**
- Descanso semanal: cumplimiento laboral y bienestar de empleados
- Obligatoriedad Sáb-Dom-Fest: empleados contratados específicamente para fines de semana extendidos
- Eventuales manuales: flexibilidad según necesidad del negocio
- Compañeros globales: maximizar networking, evitar vicios y mejorar clima laboral

**Cómo aplicar:**
- `runAutoSchedule`: verificar `shiftsPerWeek` para complete, forzar weekend employees en Sáb-Dom-Fest, excluir on_call
- `coworker_history`: buscar 60 días, sin filtro por tienda en la lógica de pairing
- La clave de emparejamiento es `employee_1-employee_2` (ordenada) independiente de tienda

**Archivos clave:**
- `src/app/actions/schedule.ts`: Lógica principal de auto-programación
- `src/lib/constants.ts`: `FESTIVOS_COLOMBIA_2026` para determinar festivos
