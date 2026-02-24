'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, MapPin } from 'lucide-react';
import { createStore, updateStore, deleteStore } from './actions';
import { YandexMapPicker } from '@/components/yandex-map-picker';
import type { Store } from '@tandyr/shared';

export function StoresClient({ stores }: { stores: Store[] }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editStore, setEditStore] = useState<Store | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createStore(fd);
      if (result?.error) setError(result.error);
      else setCreateOpen(false);
    });
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editStore) return;
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateStore(editStore.id, fd);
      if (result?.error) setError(result.error);
      else setEditStore(null);
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Удалить магазин?')) return;
    startTransition(async () => { await deleteStore(id); });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Магазины</h1>
          <p className="text-muted-foreground text-sm mt-1">{stores.length} точек</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Добавить магазин
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Новый магазин</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-2 min-w-0">
              <StoreFormFields />
              {error && <p className="text-destructive text-sm">{error}</p>}
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? 'Создание...' : 'Создать'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {stores.map((store) => (
          <div key={store.id} className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => { setEditStore(store); setError(null); }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:text-destructive"
                  onClick={() => handleDelete(store.id)}
                  disabled={isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <h3 className="font-semibold text-foreground">{store.name}</h3>
            <p className="text-muted-foreground text-sm mt-1">{store.address}</p>
            <p className="text-xs text-muted-foreground mt-2 font-mono">
              {store.latitude.toFixed(6)}, {store.longitude.toFixed(6)}
            </p>
          </div>
        ))}
        {stores.length === 0 && (
          <div className="col-span-full text-center py-16 text-muted-foreground">
            Нет добавленных магазинов
          </div>
        )}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editStore} onOpenChange={(open) => { if (!open) setEditStore(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Редактировать магазин</DialogTitle>
          </DialogHeader>
          {editStore && (
            <form onSubmit={handleUpdate} className="space-y-4 mt-2 min-w-0">
              <StoreFormFields store={editStore} key={editStore.id} />
              {error && <p className="text-destructive text-sm">{error}</p>}
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StoreFormFields({ store }: { store?: Store }) {
  return (
    <>
      <div className="space-y-1.5">
        <Label>Название</Label>
        <Input name="name" defaultValue={store?.name} required />
      </div>
      <YandexMapPicker
        defaultValue={
          store
            ? { address: store.address, latitude: store.latitude, longitude: store.longitude }
            : undefined
        }
      />
    </>
  );
}
