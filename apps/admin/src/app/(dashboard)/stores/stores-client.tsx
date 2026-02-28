'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, MapPin, Mail, Phone, ChevronRight } from 'lucide-react';
import { createStore, deleteStore } from './actions';
import { YandexMapPicker } from '@/components/yandex-map-picker';
import { CHAIN_LABELS } from '@tandyr/shared';
import type { Store } from '@tandyr/shared';

const CHAINS = [
  { value: 'lenta', label: 'Лента' },
  { value: 'magnit', label: 'Магнит' },
  { value: 'okey', label: 'ОКЕЙ' },
];

type StaffUser = { id: string; full_name: string; company_role: string | null };

export function StoresClient({ stores, users }: { stores: Store[]; users: StaffUser[] }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [isCreating, startCreateTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startCreateTransition(async () => {
      const result = await createStore(fd);
      if (result?.error) setError(result.error);
      else setCreateOpen(false);
    });
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    if (!confirm('Удалить магазин?')) return;
    setDeleteError(null);
    startDeleteTransition(async () => {
      const result = await deleteStore(id);
      if (result?.error) setDeleteError(result.error);
    });
  };

  const handleDialogChange = (open: boolean) => {
    setCreateOpen(open);
    if (open) setError(null); // Clear error when dialog reopens
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Магазины</h1>
          <p className="text-muted-foreground text-sm mt-1">{stores.length} точек</p>
        </div>
        <Dialog open={createOpen} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Добавить магазин
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Новый магазин</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-2 min-w-0">
              <StoreFormFields users={users} />
              {error && <p className="text-destructive text-sm">{error}</p>}
              <Button type="submit" className="w-full" disabled={isCreating}>
                {isCreating ? 'Создание...' : 'Создать'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {deleteError && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          Ошибка удаления: {deleteError}
        </div>
      )}

      <div className="space-y-3">
        {stores.map((store) => (
          <Link
            key={store.id}
            href={`/stores/${store.id}`}
            className="group flex items-center gap-4 bg-card border border-border rounded-2xl p-5 hover:border-primary/40 hover:shadow-sm transition-all duration-150"
          >
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
              <MapPin className="h-5 w-5 text-primary" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                {store.store_number != null && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-mono font-medium shrink-0">
                    #{String(store.store_number).padStart(3, '0')}
                  </span>
                )}
                <h3 className="font-semibold text-foreground">{store.name}</h3>
                {store.chain && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
                    {CHAIN_LABELS[store.chain] ?? store.chain}
                  </span>
                )}
              </div>
              <p className="text-muted-foreground text-sm mt-0.5 truncate">{store.address}</p>
              <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                {store.contact_email && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    {store.contact_email}
                  </span>
                )}
                {store.contact_phone && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    {store.contact_phone}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => handleDelete(e, store.id)}
                disabled={isDeleting}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
          </Link>
        ))}
        {stores.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            Нет добавленных магазинов
          </div>
        )}
      </div>
    </div>
  );
}

function StoreFormFields({ store, users }: { store?: Store; users: StaffUser[] }) {
  const managers = users.filter((u) => u.company_role === 'manager');
  const techSpecs = users.filter((u) => u.company_role === 'tech_specialist');

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Название</Label>
          <Input name="name" defaultValue={store?.name} required />
        </div>
        <div className="space-y-1.5">
          <Label>Город</Label>
          <Input name="city" defaultValue={store?.city ?? ''} placeholder="Москва" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Сеть</Label>
          <select
            name="chain"
            defaultValue={store?.chain ?? ''}
            className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">— Не выбрано —</option>
            {CHAINS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Email руководства</Label>
          <Input name="contact_email" type="email" defaultValue={store?.contact_email ?? ''} placeholder="email@example.com" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Телефон руководства</Label>
          <Input name="contact_phone" type="tel" defaultValue={store?.contact_phone ?? ''} placeholder="+7 (___) ___-__-__" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Управляющий</Label>
          <select
            name="manager_id"
            defaultValue={store?.manager_id ?? ''}
            className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">— Не назначен —</option>
            {managers.map((u) => (
              <option key={u.id} value={u.id}>{u.full_name}</option>
            ))}
            {managers.length === 0 && (
              <option disabled value="">Нет пользователей с ролью «Управляющий»</option>
            )}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Тех. специалист</Label>
          <select
            name="tech_specialist_id"
            defaultValue={store?.tech_specialist_id ?? ''}
            className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">— Не назначен —</option>
            {techSpecs.map((u) => (
              <option key={u.id} value={u.id}>{u.full_name}</option>
            ))}
            {techSpecs.length === 0 && (
              <option disabled value="">Нет пользователей с ролью «Тех. специалист»</option>
            )}
          </select>
        </div>
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
