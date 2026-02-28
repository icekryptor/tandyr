'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  ArrowLeft, Pencil, Trash2, MapPin, Mail, Phone, Package,
  Building2, Hash, User, Wrench, MapPinned,
} from 'lucide-react';
import { updateStore, deleteStore, updateResource } from '../actions';
import { YandexMapPicker } from '@/components/yandex-map-picker';
import { CHAIN_LABELS, RESOURCE_LABELS } from '@tandyr/shared';
import type { Store, StoreResource } from '@tandyr/shared';

const CHAINS = [
  { value: 'lenta', label: 'Лента' },
  { value: 'magnit', label: 'Магнит' },
  { value: 'okey', label: 'ОКЕЙ' },
];

type StaffUser = { id: string; full_name: string; company_role: string | null };

// Дефолтные нормы расхода (кг/день) — используются до появления таблицы settings
const DEFAULT_CONSUMPTION: Record<string, number> = {
  flour:    25,
  sugar:    2,
  salt:     1,
  dry_milk: 10,
  yeast:    0.25,
  oil:      5,
};

export function StoreDetailClient({ store, users, settings = {} }: { store: Store; users: StaffUser[]; settings?: Record<string, number> }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateStore(store.id, fd);
      if (result?.error) setError(result.error);
      else setEditOpen(false);
    });
  };

  const handleDelete = () => {
    if (!confirm(`Удалить магазин "${store.name}"?`)) return;
    startTransition(async () => {
      await deleteStore(store.id);
      router.push('/stores');
    });
  };

  const managerName = (store as any).manager?.full_name ?? null;
  const techName = (store as any).tech_specialist?.full_name ?? null;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <Link
          href="/stores"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Все магазины
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Редактировать
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive hover:text-white"
            onClick={handleDelete}
            disabled={isPending}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Удалить
          </Button>
        </div>
      </div>

      {/* Header */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-start gap-5">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <MapPin className="h-7 w-7 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              {store.store_number != null && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-mono font-medium shrink-0">
                  #{String(store.store_number).padStart(3, '0')}
                </span>
              )}
              <h1 className="text-2xl font-bold text-foreground">{store.name}</h1>
              {store.chain && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-accent/10 text-accent font-semibold">
                  {CHAIN_LABELS[store.chain] ?? store.chain}
                </span>
              )}
            </div>
            {store.city && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                <MapPinned className="h-3.5 w-3.5 shrink-0" />
                {store.city}
              </div>
            )}
            <p className="text-muted-foreground mt-1">{store.address}</p>

            <div className="flex flex-wrap gap-5 mt-4">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Hash className="h-3.5 w-3.5" />
                <span className="font-mono text-xs">{store.id.slice(0, 8)}…</span>
              </div>
              {store.contact_email && (
                <a
                  href={`mailto:${store.contact_email}`}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {store.contact_email}
                </a>
              )}
              {store.contact_phone && (
                <a
                  href={`tel:${store.contact_phone}`}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {store.contact_phone}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Staff */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Персонал</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Управляющий</p>
                <p className="text-sm font-medium">{managerName ?? '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                <Wrench className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Тех. специалист</p>
                <p className="text-sm font-medium">{techName ?? '—'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Resources */}
        <div className="bg-card border border-border rounded-2xl p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Package className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold">Ресурсы</h2>
          </div>
          <ResourcesGrid resources={store.resources ?? []} settings={settings} />
        </div>
      </div>

      {/* Coordinates + meta */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold">Сведения</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs mb-0.5">Широта</p>
            <p className="font-mono">{store.latitude.toFixed(6)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs mb-0.5">Долгота</p>
            <p className="font-mono">{store.longitude.toFixed(6)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs mb-0.5">Добавлен</p>
            <p>{new Date(store.created_at).toLocaleDateString('ru-RU')}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs mb-0.5">ID</p>
            <p className="font-mono text-xs">{store.id.slice(0, 8)}…</p>
          </div>
        </div>
      </div>

      {/* Map full width */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="font-semibold">Расположение</h2>
        </div>
        <iframe
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${store.longitude - 0.01},${store.latitude - 0.006},${store.longitude + 0.01},${store.latitude + 0.006}&layer=mapnik&marker=${store.latitude},${store.longitude}`}
          width="100%"
          height="360"
          style={{ border: 0, display: 'block' }}
        />
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Редактировать магазин</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4 mt-2 min-w-0">
            <StoreFormFields store={store} users={users} />
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getResourceDays(resource: string, quantityKg: number, settings: Record<string, number>): number | null {
  const key = `${resource}_daily_consumption`;
  const consumption = settings[key] ?? DEFAULT_CONSUMPTION[resource];
  if (!consumption) return null;
  return quantityKg / consumption;
}

function resourceColorClass(days: number | null): string {
  if (days === null) return 'border-border';
  if (days < 7) return 'border-red-400 bg-red-50 dark:bg-red-950/20';
  if (days < 14) return 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20';
  return 'border-green-400 bg-green-50 dark:bg-green-950/20';
}

function resourceDotColor(days: number | null): string {
  if (days === null) return 'bg-muted-foreground';
  if (days < 7) return 'bg-red-500';
  if (days < 14) return 'bg-yellow-500';
  return 'bg-green-500';
}

function ResourcesGrid({ resources, settings }: { resources: StoreResource[]; settings: Record<string, number> }) {
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleSave = (resourceId: string) => {
    const kg = parseFloat(editValue);
    if (isNaN(kg) || kg < 0) return;
    startTransition(async () => {
      await updateResource(resourceId, kg);
      setEditingId(null);
    });
  };

  if (resources.length === 0) {
    return <p className="text-sm text-muted-foreground">Ресурсы не найдены</p>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {resources.map((r) => {
        const days = getResourceDays(r.resource, r.quantity_kg, settings);
        return (
          <div key={r.id} className={`rounded-xl border p-3 text-center transition-colors ${resourceColorClass(days)}`}>
            <div className="flex items-center justify-center gap-1.5 mb-1.5">
              <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${resourceDotColor(days)}`} />
              <p className="text-[11px] text-muted-foreground">
                {RESOURCE_LABELS[r.resource] ?? r.resource}
              </p>
            </div>
            {editingId === r.id ? (
              <Input
                type="number"
                step="0.1"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="h-7 text-xs text-center p-1"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave(r.id);
                  if (e.key === 'Escape') setEditingId(null);
                }}
              />
            ) : (
              <button
                onClick={() => { setEditingId(r.id); setEditValue(String(r.quantity_kg)); }}
                className="text-base font-bold text-foreground hover:text-primary transition-colors w-full"
                disabled={isPending}
                title="Нажмите для редактирования"
              >
                {r.quantity_kg} <span className="text-xs font-normal text-muted-foreground">кг</span>
              </button>
            )}
            {days !== null && (
              <p className="text-[10px] text-muted-foreground mt-1">~{Math.floor(days)} дн.</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StoreFormFields({ store, users }: { store?: Store; users: StaffUser[] }) {
  const managers = users.filter((u) => u.company_role === 'manager');
  const techSpecs = users.filter((u) => u.company_role === 'tech_specialist');

  const selectClass = 'w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

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
          <select name="chain" defaultValue={store?.chain ?? ''} className={selectClass}>
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
          <select name="manager_id" defaultValue={store?.manager_id ?? ''} className={selectClass}>
            <option value="">— Не назначен —</option>
            {managers.map((u) => (
              <option key={u.id} value={u.id}>{u.full_name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Тех. специалист</Label>
          <select name="tech_specialist_id" defaultValue={store?.tech_specialist_id ?? ''} className={selectClass}>
            <option value="">— Не назначен —</option>
            {techSpecs.map((u) => (
              <option key={u.id} value={u.id}>{u.full_name}</option>
            ))}
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
