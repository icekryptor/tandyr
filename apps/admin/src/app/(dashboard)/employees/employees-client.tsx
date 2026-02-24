'use client';

import { useState, useTransition } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { UserPlus, Pencil, UserX, UserCheck, Search } from 'lucide-react';
import { createEmployee, updateEmployee, toggleEmployeeStatus } from './actions';
import type { User, Store } from '@tandyr/shared';

interface Props {
  employees: (User & { store: { name: string } | null })[];
  stores: Pick<Store, 'id' | 'name'>[];
}

export function EmployeesClient({ employees, stores }: Props) {
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Props['employees'][0] | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filtered = employees.filter((e) =>
    e.full_name.toLowerCase().includes(search.toLowerCase()) ||
    e.email.toLowerCase().includes(search.toLowerCase()),
  );

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createEmployee(fd);
      if (result?.error) {
        setError(result.error);
      } else {
        setCreateOpen(false);
      }
    });
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editEmployee) return;
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateEmployee(editEmployee.id, fd);
      if (result?.error) {
        setError(result.error);
      } else {
        setEditEmployee(null);
      }
    });
  };

  const handleToggle = (id: string, isActive: boolean) => {
    startTransition(async () => { await toggleEmployeeStatus(id, isActive); });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Сотрудники</h1>
          <p className="text-muted-foreground text-sm mt-1">{employees.length} сотрудников</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Добавить
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Новый сотрудник</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-2">
              <FormField label="ФИО" name="full_name" required />
              <FormField label="Email" name="email" type="email" required />
              <FormField label="Пароль" name="password" type="password" required />
              <FormField label="Телефон" name="phone" />
              <StoreSelect stores={stores} />
              {error && <p className="text-destructive text-sm">{error}</p>}
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? 'Создание...' : 'Создать'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск по имени или email..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Сотрудник</TableHead>
              <TableHead>Телефон</TableHead>
              <TableHead>Магазин</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                  Сотрудники не найдены
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground">{emp.full_name}</p>
                      <p className="text-xs text-muted-foreground">{emp.email}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {emp.phone ?? '—'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {emp.store?.name ?? <span className="text-muted-foreground">Не назначен</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={emp.is_active ? 'default' : 'secondary'}>
                      {emp.is_active ? 'Активен' : 'Деактивирован'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => { setEditEmployee(emp); setError(null); }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:text-destructive"
                        onClick={() => handleToggle(emp.id, emp.is_active)}
                        disabled={isPending}
                      >
                        {emp.is_active ? (
                          <UserX className="h-3.5 w-3.5" />
                        ) : (
                          <UserCheck className="h-3.5 w-3.5 text-green-600" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editEmployee} onOpenChange={(open) => { if (!open) setEditEmployee(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать сотрудника</DialogTitle>
          </DialogHeader>
          {editEmployee && (
            <form onSubmit={handleUpdate} className="space-y-4 mt-2">
              <FormField label="ФИО" name="full_name" defaultValue={editEmployee.full_name} required />
              <FormField label="Телефон" name="phone" defaultValue={editEmployee.phone ?? ''} />
              <StoreSelect stores={stores} defaultValue={editEmployee.store_id ?? ''} />
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

function FormField({
  label,
  name,
  type = 'text',
  defaultValue = '',
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
      />
    </div>
  );
}

function StoreSelect({
  stores,
  defaultValue = '',
}: {
  stores: Pick<Store, 'id' | 'name'>[];
  defaultValue?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="store_id">Магазин</Label>
      <Select name="store_id" defaultValue={defaultValue}>
        <SelectTrigger>
          <SelectValue placeholder="Выберите магазин" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Не назначен</SelectItem>
          {stores.map((s) => (
            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
