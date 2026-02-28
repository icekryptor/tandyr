'use client';

import { useState, useTransition } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Package, Truck, ClipboardList, ChevronDown, ChevronUp } from 'lucide-react';
import { addSupply } from './actions';
import {
  formatDate, RESOURCE_LABELS as SHARED_RESOURCE_LABELS,
  INVENTORY_ACT_STATUS_LABELS, INVENTORY_ACT_STATUS_COLORS,
} from '@tandyr/shared';
import type { InventoryItem, Supply, Store } from '@tandyr/shared';

const UNITS = ['кг', 'л', 'шт', 'г', 'упак'];

const RESOURCE_LABELS = SHARED_RESOURCE_LABELS;

type ActItem = { id: string; resource_type: string; item_name: string; quantity_kg: number };
type InventoryAct = {
  id: string; store_id: string; user_id: string;
  week_number: number; week_year: number;
  scheduled_date: string; conducted_at: string | null;
  status: 'pending' | 'completed' | 'overdue';
  created_at: string;
  store: { name: string } | null;
  user: { full_name: string } | null;
  items: ActItem[];
};

const ACT_STATUS_LABELS = INVENTORY_ACT_STATUS_LABELS;
const ACT_STATUS_COLORS = INVENTORY_ACT_STATUS_COLORS;

// ─── Act row with expandable items ────────────────────────────────────────────
function ActRow({ act }: { act: InventoryAct }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <TableRow className="cursor-pointer hover:bg-muted/30" onClick={() => setExpanded((x) => !x)}>
        <TableCell className="font-medium text-sm">{act.store?.name ?? '—'}</TableCell>
        <TableCell className="text-sm">{act.user?.full_name ?? '—'}</TableCell>
        <TableCell className="text-sm text-muted-foreground">Нед. {act.week_number}, {act.week_year}</TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {act.scheduled_date ? new Date(act.scheduled_date).toLocaleDateString('ru-RU') : '—'}
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {act.conducted_at ? new Date(act.conducted_at).toLocaleString('ru-RU') : '—'}
        </TableCell>
        <TableCell>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ACT_STATUS_COLORS[act.status]}`}>
            {ACT_STATUS_LABELS[act.status]}
          </span>
        </TableCell>
        <TableCell>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={7} className="bg-muted/20 p-0">
            {act.items.length > 0 ? (
              <div className="px-6 py-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2">
                  Позиции ({act.items.length})
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {act.items.map((item) => (
                    <div key={item.id} className="bg-card border border-border rounded-lg p-2 text-center">
                      <p className="text-[10px] text-muted-foreground mb-0.5">
                        {RESOURCE_LABELS[item.resource_type] ?? item.item_name}
                      </p>
                      <p className="text-sm font-bold">{item.quantity_kg} кг</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-center text-xs text-muted-foreground py-3">Нет позиций</p>
            )}
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export function InventoryClient({
  inventory, supplies, stores, inventoryActs,
}: {
  inventory: (InventoryItem & { store: { name: string } | null })[];
  supplies: (Supply & { store: { name: string } | null })[];
  stores: Pick<Store, 'id' | 'name'>[];
  inventoryActs: InventoryAct[];
}) {
  const [tab, setTab] = useState<'inventory' | 'supplies' | 'acts'>('inventory');
  const [supplyOpen, setSupplyOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleAddSupply = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await addSupply(fd);
      if (result?.error) setError(result.error);
      else setSupplyOpen(false);
    });
  };

  const handleSupplyDialogChange = (open: boolean) => {
    setSupplyOpen(open);
    if (open) setError(null);
  };

  const overdueActs = inventoryActs.filter((a) => a.status === 'overdue').length;
  const pendingActs = inventoryActs.filter((a) => a.status === 'pending').length;

  const TABS = [
    { key: 'inventory' as const, label: 'Остатки', icon: Package },
    { key: 'supplies' as const, label: 'Поставки', icon: Truck },
    {
      key: 'acts' as const, label: 'Акты', icon: ClipboardList,
      badge: overdueActs > 0 ? String(overdueActs) : undefined,
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Инвентарь и поставки</h1>
          <p className="text-muted-foreground text-sm mt-1">Управление запасами по магазинам</p>
        </div>
        {tab === 'supplies' && (
          <Dialog open={supplyOpen} onOpenChange={handleSupplyDialogChange}>
            <DialogTrigger asChild>
              <Button><Truck className="h-4 w-4 mr-2" />Добавить поставку</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Новая поставка</DialogTitle></DialogHeader>
              <form onSubmit={handleAddSupply} className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label>Магазин</Label>
                  <Select name="store_id" required>
                    <SelectTrigger><SelectValue placeholder="Выберите магазин" /></SelectTrigger>
                    <SelectContent>
                      {stores.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Наименование</Label>
                  <Input name="item_name" placeholder="Мука пшеничная" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Количество</Label>
                    <Input name="quantity" type="number" step="any" min="0" required placeholder="50" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Единица</Label>
                    <Select name="unit" defaultValue="кг">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Поставщик</Label>
                  <Input name="supplier" placeholder="ТОО Мелькомбинат" />
                </div>
                <div className="space-y-1.5">
                  <Label>Дата поставки</Label>
                  <Input name="supplied_at" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
                </div>
                {error && <p className="text-destructive text-sm">{error}</p>}
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? 'Добавление...' : 'Добавить поставку'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-muted rounded-xl p-1 w-fit">
        {TABS.map(({ key, label, icon: Icon, badge }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === key ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Icon className="h-3.5 w-3.5" />
              {label}
              {badge && (
                <span className="bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {badge}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>

      {/* ── Inventory tab ── */}
      {tab === 'inventory' && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Наименование</TableHead>
                <TableHead>Магазин</TableHead>
                <TableHead>Остаток</TableHead>
                <TableHead>Ед.</TableHead>
                <TableHead>Обновлено</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                    Нет данных. Добавьте поставку для обновления остатков.
                  </TableCell>
                </TableRow>
              ) : (
                inventory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.item_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.store?.name ?? '—'}</TableCell>
                    <TableCell>
                      <span className={`font-semibold ${item.quantity <= 10 ? 'text-destructive' : 'text-foreground'}`}>
                        {item.quantity}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{item.unit}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(item.updated_at)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Supplies tab ── */}
      {tab === 'supplies' && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Наименование</TableHead>
                <TableHead>Магазин</TableHead>
                <TableHead>Количество</TableHead>
                <TableHead>Ед.</TableHead>
                <TableHead>Поставщик</TableHead>
                <TableHead>Дата</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {supplies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10">Нет поставок</TableCell>
                </TableRow>
              ) : (
                supplies.map((supply) => (
                  <TableRow key={supply.id}>
                    <TableCell className="font-medium">{supply.item_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{supply.store?.name ?? '—'}</TableCell>
                    <TableCell className="font-semibold">{supply.quantity}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{supply.unit}</TableCell>
                    <TableCell className="text-sm">{supply.supplier ?? '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(supply.supplied_at)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Acts tab ── */}
      {tab === 'acts' && (
        <div>
          {inventoryActs.length > 0 && (
            <div className="flex gap-3 mb-4 flex-wrap">
              {[
                { label: 'Всего', count: inventoryActs.length, color: 'bg-muted text-muted-foreground' },
                { label: 'Выполнено', count: inventoryActs.filter(a => a.status === 'completed').length, color: 'bg-green-50 text-green-700' },
                { label: 'Ожидает', count: pendingActs, color: 'bg-yellow-50 text-yellow-700' },
                { label: 'Просрочено', count: overdueActs, color: 'bg-red-50 text-red-700' },
              ].filter(({ count, label }) => count > 0 || label === 'Всего').map(({ label, count, color }) => (
                <div key={label} className={`rounded-xl border border-transparent px-3 py-2 text-center min-w-[80px] ${color}`}>
                  <p className="text-xs opacity-70 mb-0.5">{label}</p>
                  <p className="text-xl font-bold">{count}</p>
                </div>
              ))}
            </div>
          )}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Магазин</TableHead>
                  <TableHead>Сотрудник</TableHead>
                  <TableHead>Неделя</TableHead>
                  <TableHead>Дата (воскр.)</TableHead>
                  <TableHead>Проведена</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventoryActs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                      <ClipboardList className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p>Нет актов инвентаризации</p>
                      <p className="text-xs mt-1">Они создаются автоматически каждое воскресенье</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  inventoryActs.map((act) => <ActRow key={act.id} act={act} />)
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
