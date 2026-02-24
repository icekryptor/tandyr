'use client';

import { useState, useTransition } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Package, Truck } from 'lucide-react';
import { addSupply } from './actions';
import { formatDate } from '@tandyr/shared';
import type { InventoryItem, Supply, Store } from '@tandyr/shared';

const UNITS = ['кг', 'л', 'шт', 'г', 'упак'];

export function InventoryClient({
  inventory,
  supplies,
  stores,
}: {
  inventory: (InventoryItem & { store: { name: string } | null })[];
  supplies: (Supply & { store: { name: string } | null })[];
  stores: Pick<Store, 'id' | 'name'>[];
}) {
  const [tab, setTab] = useState<'inventory' | 'supplies'>('inventory');
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

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Инвентарь и поставки</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Управление запасами по магазинам
          </p>
        </div>
        <Dialog open={supplyOpen} onOpenChange={setSupplyOpen}>
          <DialogTrigger asChild>
            <Button>
              <Truck className="h-4 w-4 mr-2" />
              Добавить поставку
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Новая поставка</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddSupply} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Магазин</Label>
                <Select name="store_id" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите магазин" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
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
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Поставщик</Label>
                <Input name="supplier" placeholder="ТОО Мелькомбинат" />
              </div>
              <div className="space-y-1.5">
                <Label>Дата поставки</Label>
                <Input
                  name="supplied_at"
                  type="date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                />
              </div>
              {error && <p className="text-destructive text-sm">{error}</p>}
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? 'Добавление...' : 'Добавить поставку'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-muted rounded-xl p-1 w-fit">
        {(['inventory', 'supplies'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'inventory' ? (
              <span className="flex items-center gap-1.5"><Package className="h-3.5 w-3.5" />Остатки</span>
            ) : (
              <span className="flex items-center gap-1.5"><Truck className="h-3.5 w-3.5" />Поставки</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'inventory' ? (
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
      ) : (
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
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                    Нет поставок
                  </TableCell>
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
    </div>
  );
}
