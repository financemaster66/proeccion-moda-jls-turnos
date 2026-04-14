'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface CreateStoreData {
  name: string
  display_name: string
  address: string
  schedule_weekday: string
  schedule_weekend: string
  lunch_minutes: number
  color_theme: string
  slots_required: number
}

export interface UpdateStoreData extends CreateStoreData {
  id: string
  logo_url?: string
}

export async function getStores() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .order('display_name', { ascending: true })

  if (error) {
    console.error('Error fetching stores:', error)
    return []
  }

  return data
}

export async function getStore(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching store:', error)
    return null
  }

  return data
}

export async function createStore(data: CreateStoreData) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('stores')
    .insert(data)

  if (error) {
    console.error('Error creating store:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/stores')
  return { success: true }
}

export async function updateStore(data: UpdateStoreData) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('stores')
    .update({
      name: data.name,
      display_name: data.display_name,
      address: data.address,
      schedule_weekday: data.schedule_weekday,
      schedule_weekend: data.schedule_weekend,
      lunch_minutes: data.lunch_minutes,
      color_theme: data.color_theme,
      slots_required: data.slots_required,
      logo_url: data.logo_url,
    })
    .eq('id', data.id)

  if (error) {
    console.error('Error updating store:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/stores')
  return { success: true }
}

export async function deleteStore(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('stores')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting store:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/stores')
  return { success: true }
}

export async function uploadStoreLogo(formData: FormData) {
  const supabase = await createClient()
  const file = formData.get('logo') as File
  const storeId = formData.get('storeId') as string

  if (!file || !storeId) {
    return { success: false, error: 'Archivo o ID inválido' }
  }

  // Upload to Supabase Storage
  const fileExt = file.name.split('.').pop()
  const fileName = `${storeId}-${Date.now()}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from('store-logos')
    .upload(fileName, file)

  if (uploadError) {
    console.error('Error uploading logo:', uploadError)
    return { success: false, error: uploadError.message }
  }

  const { data: urlData } = supabase.storage
    .from('store-logos')
    .getPublicUrl(fileName)

  // Update store with logo URL
  const { error: updateError } = await supabase
    .from('stores')
    .update({ logo_url: urlData.publicUrl })
    .eq('id', storeId)

  if (updateError) {
    console.error('Error updating store logo:', updateError)
    return { success: false, error: updateError.message }
  }

  revalidatePath('/stores')
  return { success: true, url: urlData.publicUrl }
}
