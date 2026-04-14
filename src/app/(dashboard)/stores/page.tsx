'use client'

import { useEffect, useState } from 'react'
import { getStores, createStore, updateStore, deleteStore } from '@/app/actions/stores'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Store } from '@/types/schedule'
import { Plus, Pencil, Trash2, Store as StoreIcon } from 'lucide-react'
import { toast } from 'sonner'

const COLORES_DISPONIBLES = [
  { value: 'blue', label: 'Azul', class: 'bg-blue-500' },
  { value: 'green', label: 'Verde', class: 'bg-green-500' },
  { value: 'purple', label: 'Morado', class: 'bg-purple-500' },
  { value: 'orange', label: 'Naranja', class: 'bg-orange-500' },
  { value: 'red', label: 'Rojo', class: 'bg-red-500' },
  { value: 'teal', label: 'Turquesa', class: 'bg-teal-500' },
]

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingStore, setEditingStore] = useState<Store | null>(null)

  useEffect(() => {
    loadStores()
  }, [])

  async function loadStores() {
    setIsLoading(true)
    const data = await getStores()
    setStores(data)
    setIsLoading(false)
  }

  async function handleAdd(formData: FormData) {
    const result = await createStore({
      name: formData.get('name') as string,
      display_name: formData.get('display_name') as string,
      address: formData.get('address') as string,
      schedule_weekday: formData.get('schedule_weekday') as string,
      schedule_weekend: formData.get('schedule_weekend') as string,
      lunch_minutes: parseInt(formData.get('lunch_minutes') as string),
      color_theme: formData.get('color_theme') as string,
      slots_required: parseInt(formData.get('slots_required') as string),
    })

    if (result.success) {
      toast.success('Tienda creada exitosamente')
      setIsAddOpen(false)
      loadStores()
    } else {
      toast.error(result.error || 'Error al crear la tienda')
    }
  }

  async function handleUpdate(formData: FormData) {
    if (!editingStore) return

    const result = await updateStore({
      id: editingStore.id,
      name: formData.get('name') as string,
      display_name: formData.get('display_name') as string,
      address: formData.get('address') as string,
      schedule_weekday: formData.get('schedule_weekday') as string,
      schedule_weekend: formData.get('schedule_weekend') as string,
      lunch_minutes: parseInt(formData.get('lunch_minutes') as string),
      color_theme: formData.get('color_theme') as string,
      slots_required: parseInt(formData.get('slots_required') as string),
    })

    if (result.success) {
      toast.success('Tienda actualizada exitosamente')
      setEditingStore(null)
      loadStores()
    } else {
      toast.error(result.error || 'Error al actualizar la tienda')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Estás seguro de eliminar esta tienda? Esta acción no se puede deshacer.')) return

    const result = await deleteStore(id)
    if (result.success) {
      toast.success('Tienda eliminada exitosamente')
      loadStores()
    } else {
      toast.error(result.error || 'Error al eliminar la tienda')
    }
  }

  function getStoreInitials(name: string) {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Tiendas</h1>
          <p className="text-slate-500 mt-1">Gestiona las ubicaciones de la empresa</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger>
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Tienda
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nueva Tienda</DialogTitle>
            </DialogHeader>
            <StoreForm onSubmit={handleAdd} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <p className="text-slate-500">Cargando tiendas...</p>
        </div>
      ) : stores.length === 0 ? (
        <div className="text-center py-12">
          <StoreIcon className="h-12 w-12 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">No hay tiendas registradas</p>
          <p className="text-sm text-slate-400 mt-1">Agrega una tienda para comenzar</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stores.map((store) => (
            <Card key={store.id} className="overflow-hidden">
              <CardHeader className={`pb-3 ${store.color_theme === 'blue' ? 'bg-blue-50' : store.color_theme === 'green' ? 'bg-green-50' : store.color_theme === 'purple' ? 'bg-purple-50' : store.color_theme === 'orange' ? 'bg-orange-50' : 'bg-slate-50'}`}>
                <div className="flex items-start justify-between">
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={store.logo_url || undefined} />
                    <AvatarFallback className={`text-white ${store.color_theme === 'blue' ? 'bg-blue-500' : store.color_theme === 'green' ? 'bg-green-500' : store.color_theme === 'purple' ? 'bg-purple-500' : store.color_theme === 'orange' ? 'bg-orange-500' : 'bg-slate-500'}`}>
                      {getStoreInitials(store.display_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setEditingStore(store)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      onClick={() => handleDelete(store.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="mt-3 text-lg">{store.display_name}</CardTitle>
                <CardDescription className="line-clamp-1">{store.address}</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Horario Lunes-Vie:</span>
                  <span className="font-medium">{store.schedule_weekday}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Horario Fin de Semana:</span>
                  <span className="font-medium">{store.schedule_weekend}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Almuerzo:</span>
                  <span className="font-medium">{store.lunch_minutes} min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Turnos requeridos:</span>
                  <span className="font-medium">{store.slots_required}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editingStore && (
        <Dialog open onOpenChange={() => setEditingStore(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Tienda</DialogTitle>
            </DialogHeader>
            <StoreForm
              store={editingStore}
              onSubmit={handleUpdate}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function StoreForm({
  store,
  onSubmit,
}: {
  store?: Store
  onSubmit: (formData: FormData) => void
}) {
  return (
    <form action={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre Interno</Label>
        <Input
          id="name"
          name="name"
          defaultValue={store?.name}
          placeholder="ej: koaj_centro"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="display_name">Nombre para Mostrar</Label>
        <Input
          id="display_name"
          name="display_name"
          defaultValue={store?.display_name}
          placeholder="ej: KOAJ Centro B24"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Dirección</Label>
        <Input
          id="address"
          name="address"
          defaultValue={store?.address ?? ''}
          placeholder="ej: Calle 24 #123, Fusagasugá"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="schedule_weekday">Horario Lunes-Vie</Label>
          <Input
            id="schedule_weekday"
            name="schedule_weekday"
            defaultValue={store?.schedule_weekday || '9:00-19:00'}
            placeholder="ej: 9:00-19:00"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="schedule_weekend">Horario Fin de Semana</Label>
          <Input
            id="schedule_weekend"
            name="schedule_weekend"
            defaultValue={store?.schedule_weekend || '10:00-19:00'}
            placeholder="ej: 10:00-19:00"
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="lunch_minutes">Minutos Almuerzo</Label>
          <Input
            id="lunch_minutes"
            name="lunch_minutes"
            type="number"
            defaultValue={store?.lunch_minutes || 30}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slots_required">Turnos por Día</Label>
          <Input
            id="slots_required"
            name="slots_required"
            type="number"
            defaultValue={store?.slots_required || 2}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="color_theme">Color de la Tienda</Label>
        <Select name="color_theme" defaultValue={store?.color_theme ?? 'blue'}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona un color" />
          </SelectTrigger>
          <SelectContent>
            {COLORES_DISPONIBLES.map((color) => (
              <SelectItem key={color.value} value={color.value}>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded ${color.class}`} />
                  {color.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full">
        {store ? 'Actualizar' : 'Crear'}
      </Button>
    </form>
  )
}
