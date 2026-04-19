// Constantes del sistema - Proección y Moda JLS

import { DayOfWeek, EmployeeType, WorkPermission } from '@/types/schedule'

// Días de la semana en español
export const DIAS_SEMANA: Record<string, string> = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo',
}

// Días de la semana en formato corto
export const DIAS_SEMANA_CORTO: Record<string, string> = {
  monday: 'Lun',
  tuesday: 'Mar',
  wednesday: 'Mié',
  thursday: 'Jue',
  friday: 'Vie',
  saturday: 'Sáb',
  sunday: 'Dom',
}

// Tipos de empleado en español
export const TIPOS_EMPLEADO: Record<EmployeeType, string> = {
  complete: 'Completo',
  weekends_only: 'Solo fines de semana',
  weekends_half: 'Fines de semana y medios turnos',
  hourly: 'Por horas',
  on_call: 'Disponible cuando puede',
}

// Permisos de trabajo en español
export const PERMISOS_TRABAJO: Record<WorkPermission, string> = {
  koaj_only: 'Solo KOAJ',
  quest_only: 'Solo QUEST',
  both: 'Ambos',
}

// Colores de las tiendas
export const COLORES_TIENDA: Record<string, { bg: string; text: string; border: string; light: string }> = {
  blue: {
    bg: 'bg-blue-500',
    text: 'text-blue-500',
    border: 'border-blue-500',
    light: 'bg-blue-50',
  },
  green: {
    bg: 'bg-green-500',
    text: 'text-green-500',
    border: 'border-green-500',
    light: 'bg-green-50',
  },
  purple: {
    bg: 'bg-purple-500',
    text: 'text-purple-500',
    border: 'border-purple-500',
    light: 'bg-purple-50',
  },
  orange: {
    bg: 'bg-orange-500',
    text: 'text-orange-500',
    border: 'border-orange-500',
    light: 'bg-orange-50',
  },
}

// Configuración de turnos por defecto
export const CONFIGURACION_TURNOS = {
  // Ventana de visualización: 15 días
  DIAS_VISUALIZACION: 15,

  // Slots mínimos por tienda
  SLOTS_KOAJ: 2,
  SLOTS_QUEST: 1,

  // Restricciones de auto-programación
  MAX_TURNOS_POR_SEMANA: 6,
  MIN_DIAS_DESCANSO: 1,
  NO_REPETIR_COMPANEROS: true,
  DIAS_NO_REPETIR_COMPANEROS: 7,
}

// Mensajes del sistema
export const MENSAJES = {
  // Éxito
  EMPLEADO_CREADO: 'Empleado creado exitosamente',
  EMPLEADO_ACTUALIZADO: 'Empleado actualizado exitosamente',
  EMPLEADO_ELIMINADO: 'Empleado eliminado exitosamente',
  TIENDA_CREADA: 'Tienda creada exitosamente',
  TIENDA_ACTUALIZADA: 'Tienda actualizada exitosamente',
  TIENDA_ELIMINADA: 'Tienda eliminada exitosamente',
  TURNO_CREADO: 'Turno creado exitosamente',
  TURNO_ACTUALIZADO: 'Turno actualizado exitosamente',
  TURNO_ELIMINADO: 'Turno eliminado exitosamente',
  AUTO_PROGRAMACION_EXITOSA: 'Auto-programación completada exitosamente',
  EXPORTACION_EXITOSA: 'Horario exportado exitosamente',

  // Error
  ERROR_CREACION: 'Error al crear. Por favor intenta de nuevo',
  ERROR_ACTUALIZACION: 'Error al actualizar. Por favor intenta de nuevo',
  ERROR_ELIMINACION: 'Error al eliminar. Por favor intenta de nuevo',
  ERROR_AUTO_PROGRAMACION: 'Error en auto-programación. Por favor intenta de nuevo',
  ERROR_EXPORTACION: 'Error al exportar. Por favor intenta de nuevo',
  ERROR_AUTENTICACION: 'Credenciales inválidas',
  ERROR_SIN_PERMISO: 'No tienes permiso para realizar esta acción',

  // Validación
  VALIDACION_NOMBRE: 'El nombre completo es requerido',
  VALIDACION_DOCUMENTO: 'El documento es requerido y debe ser único',
  VALIDACION_TELEFONO: 'El teléfono es requerido',
  VALIDACION_PERMISO: 'El permiso de trabajo es requerido',
  VALIDACION_TIPO: 'El tipo de empleado es requerido',
}

// Footer attribution
export const FOOTER_ATTRIBUTION = 'Organizador de empleados Proección y Moda JLS hecho por Finance Master by Santiago Bermúdez'

// Festivos de Colombia 2026 (formato: YYYY-MM-DD)
// Usado para determinar qué días usan el horario "Dom-Fest" en auto-programación
export const FESTIVOS_COLOMBIA_2026: string[] = [
  '2026-01-01', // Año Nuevo
  '2026-01-12', // Reyes Magos (lunes siguiente)
  '2026-03-19', // San José (lunes siguiente)
  '2026-04-02', // Jueves Santo
  '2026-04-03', // Viernes Santo
  '2026-04-06', // Lunes de Pascua
  '2026-05-01', // Día del Trabajo
  '2026-05-18', // Ascensión del Señor (lunes siguiente)
  '2026-06-08', // Corpus Christi (lunes siguiente)
  '2026-06-15', // Sagrado Corazón (lunes siguiente)
  '2026-06-29', // San Pedro y San Pablo (lunes siguiente)
  '2026-07-20', // Grito de Independencia
  '2026-08-07', // Batalla de Boyacá
  '2026-08-17', // Asunción de la Virgen (lunes siguiente)
  '2026-10-12', // Día de la Raza (lunes siguiente)
  '2026-11-02', // Todos los Santos (lunes siguiente)
  '2026-11-16', // Independencia de Cartagena (lunes siguiente)
  '2026-12-08', // Inmaculada Concepción
  '2026-12-25', // Navidad
]
