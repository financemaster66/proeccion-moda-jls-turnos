'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface CreateEmployeeData {
  full_name: string
  document_id: string
  phone: string
  work_permission: 'koaj_only' | 'quest_only' | 'both'
  employee_type: 'complete' | 'weekends_only' | 'weekends_half' | 'hourly' | 'on_call'
  available_days?: string[]
}

export interface UpdateEmployeeData extends CreateEmployeeData {
  id: string
  photo_url?: string
  is_active?: boolean
}

export async function getEmployees() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('is_active', true)
    .order('full_name', { ascending: true })

  if (error) {
    console.error('Error fetching employees:', error)
    return []
  }

  return data
}

export async function getEmployee(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching employee:', error)
    return null
  }

  return data
}

export async function createEmployee(data: CreateEmployeeData) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('employees')
    .insert({
      ...data,
      available_days: data.available_days || [],
      is_active: true,
    })

  if (error) {
    console.error('Error creating employee:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/employees')
  return { success: true }
}

export async function updateEmployee(data: UpdateEmployeeData) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('employees')
    .update({
      full_name: data.full_name,
      document_id: data.document_id,
      phone: data.phone,
      work_permission: data.work_permission,
      employee_type: data.employee_type,
      available_days: data.available_days || [],
      photo_url: data.photo_url,
      is_active: data.is_active,
    })
    .eq('id', data.id)

  if (error) {
    console.error('Error updating employee:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/employees')
  return { success: true }
}

export async function deleteEmployee(id: string) {
  const supabase = await createClient()

  // Soft delete - set is_active to false
  const { error } = await supabase
    .from('employees')
    .update({ is_active: false })
    .eq('id', id)

  if (error) {
    console.error('Error deleting employee:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/employees')
  return { success: true }
}

export async function uploadEmployeePhoto(formData: FormData) {
  const supabase = await createClient()
  const file = formData.get('photo') as File
  const employeeId = formData.get('employeeId') as string

  if (!file || !employeeId) {
    return { success: false, error: 'Archivo o ID inválido' }
  }

  // Upload to Supabase Storage
  const fileExt = file.name.split('.').pop()
  const fileName = `${employeeId}-${Date.now()}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from('employee-photos')
    .upload(fileName, file)

  if (uploadError) {
    console.error('Error uploading photo:', uploadError)
    return { success: false, error: uploadError.message }
  }

  const { data: urlData } = supabase.storage
    .from('employee-photos')
    .getPublicUrl(fileName)

  // Update employee with photo URL
  const { error: updateError } = await supabase
    .from('employees')
    .update({ photo_url: urlData.publicUrl })
    .eq('id', employeeId)

  if (updateError) {
    console.error('Error updating employee photo:', updateError)
    return { success: false, error: updateError.message }
  }

  revalidatePath('/employees')
  return { success: true, url: urlData.publicUrl }
}
