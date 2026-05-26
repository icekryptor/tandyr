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
import { UserPlus, Search, ShieldBan, ShieldCheck, Link2 } from 'lucide-react';
import Link from 'next/link';
import { createEmployee, createInvite, toggleEmployeeStatus } from './actions';
import { COMPANY_ROLE_LABELS, COMPANY_ROLE_COLORS, pluralize } from '@tandyr/shared';
import type { User, Store } from '@tandyr/shared';

const COMPANY_ROLES = [
  { value: 'baker', label: 'Пекарь' },
  { value: 'manager', label: 'Управляющий' },
  { value: 'tech_specialist', label: 'Тех. специалист' },
  { value: 'admin', label: 'Администратор' },
  { value: 'owner', label: 'Владелец' },
];

interface Props {
  employees: (User & { store: { name: string } | null })[];
  stores: Pick<Store, 'id' | 'name'>[];
}

export function EmployeesClient({ employees, stores }: Props) {
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [isCreating, startCreateTransition] = useTransition();
  const [isToggling, startToggleTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  // Invite modal state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState<{ email: string; store_id: string; company_role: string }>({
    email: '',
    store_id: '',
    company_role: '',
  });
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [invitePending, setInvitePending] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);

  const filtered = employees.filter((e) =>
    e.full_name.toLowerCase().includes(search.toLowerCase()) ||
    e.email.toLowerCase().includes(search.toLowerCase()),
  );

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startCreateTransition(async () => {
      const result = await createEmployee(fd);
      if (result?.error) setError(result.error);
      else setCreateOpen(false);
    });
  };

  const handleToggle = (id: string, isActive: boolean, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setToggleError(null);
    startToggleTransition(async () => {
      const result = await toggleEmployeeStatus(id, isActive);
      if (result?.error) setToggleError(result.error);
    });
  };

  const handleDialogChange = (open: boolean) => {
    setCreateOpen(open);
    if (open) setError(null);
  };

  const handleInviteDialogChange = (open: boolean) => {
    setInviteOpen(open);
    if (!open) {
      setInviteForm({ email: '', store_id: '', company_role: '' });
      setInviteLink(null);
      setInviteError(null);
      setInvitePending(false);
      setInviteCopied(false);
    }
  };

  const handleCreateInvite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setInviteError(null);
    setInvitePending(true);
    const result = await createInvite({
      email: inviteForm.email || undefined,
      store_id: inviteForm.store_id && inviteForm.store_id !== '__none__' ? inviteForm.store_id : undefined,
      company_role: inviteForm.company_role && inviteForm.company_role !== '__none__' ? inviteForm.company_role : undefined,
    });
    setInvitePending(false);
    if ('error' in result) {
      setInviteError(result.error);
    } else {
      setInviteLink(`${window.location.origin}/invite/${result.token}`);
    }
  };

  const handleCopyInvite = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 1500);
    } catch {
      // ignore — user can copy manually
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Сотрудники</h1>
          <p className="text-muted-foreground text-sm mt-1">{employees.length} {pluralize(employees.length, 'сотрудник', 'сотрудника', 'сотрудников')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={inviteOpen} onOpenChange={handleInviteDialogChange}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Link2 className="h-4 w-4 mr-2" />
                Пригласить
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Пригласить сотрудника</DialogTitle>
              </DialogHeader>
              {!inviteLink ? (
                <form onSubmit={handleCreateInvite} className="space-y-4 mt-2">
                  <p className="text-sm text-muted-foreground">
                    Все поля опциональны. Если оставить пустыми — сотрудник заполнит их при регистрации.
                  </p>
                  <div className="space-y-1.5">
                    <Label htmlFor="invite_email">Email</Label>
                    <Input
                      id="invite_email"
                      name="invite_email"
                      type="email"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm((s) => ({ ...s, email: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="invite_store_id">Магазин</Label>
                    <Select
                      value={inviteForm.store_id}
                      onValueChange={(value) => setInviteForm((s) => ({ ...s, store_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите магазин" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Не указано —</SelectItem>
                        {stores.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="invite_role">Роль в компании</Label>
                    <Select
                      value={inviteForm.company_role}
                      onValueChange={(value) => setInviteForm((s) => ({ ...s, company_role: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите роль" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Не указано —</SelectItem>
                        {COMPANY_ROLES.map((r) => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {inviteError && (
                    <p className="text-destructive text-sm">{inviteError}</p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleInviteDialogChange(false)}
                      disabled={invitePending}
                    >
                      Отмена
                    </Button>
                    <Button type="submit" className="flex-1" disabled={invitePending}>
                      {invitePending ? 'Создание...' : 'Создать ссылку'}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3 mt-2">
                  <p className="text-sm">Ссылка для отправки сотруднику:</p>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={inviteLink}
                      onFocus={(e) => e.currentTarget.select()}
                      className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-xs font-mono"
                    />
                    <Button onClick={handleCopyInvite}>
                      {inviteCopied ? 'Скопировано' : 'Скопировать'}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Ссылка действительна 7 дней.</p>
                  <div className="flex justify-end">
                    <Button variant="outline" onClick={() => handleInviteDialogChange(false)}>
                      Готово
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
          <Dialog open={createOpen} onOpenChange={handleDialogChange}>
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
                <CompanyRoleSelect />
                <StoreSelect stores={stores} />
                {error && <p className="text-destructive text-sm">{error}</p>}
                <Button type="submit" className="w-full" disabled={isCreating}>
                  {isCreating ? 'Создание...' : 'Создать'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {toggleError && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          Ошибка: {toggleError}
        </div>
      )}

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
              <TableHead>Роль в компании</TableHead>
              <TableHead>Телефон</TableHead>
              <TableHead>Магазин</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                  Сотрудники не найдены
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((emp) => (
                <TableRow key={emp.id} className={`cursor-pointer hover:bg-muted/30 ${!emp.is_active ? 'opacity-50' : ''}`}>
                  <TableCell>
                    <Link href={`/employees/${emp.id}`} className="block">
                      <p className="font-medium text-foreground">{emp.full_name}</p>
                      <p className="text-xs text-muted-foreground">{emp.email}</p>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/employees/${emp.id}`} className="block">
                      {emp.company_role ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${COMPANY_ROLE_COLORS[emp.company_role] ?? 'bg-muted text-muted-foreground'}`}>
                          {COMPANY_ROLE_LABELS[emp.company_role] ?? emp.company_role}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    <Link href={`/employees/${emp.id}`} className="block">
                      {emp.phone ?? '—'}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">
                    <Link href={`/employees/${emp.id}`} className="block">
                      {emp.store?.name ?? <span className="text-muted-foreground">Не назначен</span>}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/employees/${emp.id}`} className="block">
                      <Badge variant={emp.is_active ? 'default' : 'destructive'}>
                        {emp.is_active ? 'Активен' : 'Заблокирован'}
                      </Badge>
                    </Link>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 ${emp.is_active ? 'hover:text-destructive' : 'hover:text-green-600'}`}
                      title={emp.is_active ? 'Заблокировать' : 'Разблокировать'}
                      onClick={(e) => handleToggle(emp.id, emp.is_active, e)}
                      disabled={isToggling}
                    >
                      {emp.is_active ? (
                        <ShieldBan className="h-3.5 w-3.5" />
                      ) : (
                        <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

    </div>
  );
}

function FormField({
  label, name, type = 'text', defaultValue = '', required = false,
}: {
  label: string; name: string; type?: string; defaultValue?: string; required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue} required={required} />
    </div>
  );
}

function CompanyRoleSelect({ defaultValue = '' }: { defaultValue?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="company_role">Роль в компании</Label>
      <Select name="company_role" defaultValue={defaultValue}>
        <SelectTrigger>
          <SelectValue placeholder="Выберите роль" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">— Не указано —</SelectItem>
          {COMPANY_ROLES.map((r) => (
            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function StoreSelect({
  stores, defaultValue = '',
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
          <SelectItem value="__none__">Не назначен</SelectItem>
          {stores.map((s) => (
            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
