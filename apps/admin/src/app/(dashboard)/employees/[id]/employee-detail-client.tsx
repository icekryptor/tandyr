'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  ArrowLeft, Pencil, UserX, UserCheck, Hash,
  Phone, Mail, MapPin, CreditCard, FileText,
  Calendar, Globe, BadgeAlert, Upload, ExternalLink,
  Building2, Banknote, ShieldAlert,
} from 'lucide-react';
import { updateEmployee, updateEmployeePassword, deleteEmployee, uploadEmployeeFile, updateEmployeeCities } from '../actions';
import {
  COMPANY_ROLE_LABELS, COMPANY_ROLE_COLORS, BANK_LABELS, RUSSIAN_CITIES,
} from '@tandyr/shared';
import type { User, Store } from '@tandyr/shared';

const COMPANY_ROLES = [
  { value: 'baker', label: 'Пекарь' },
  { value: 'manager', label: 'Управляющий' },
  { value: 'tech_specialist', label: 'Тех. специалист' },
  { value: 'admin', label: 'Администратор' },
  { value: 'owner', label: 'Владелец' },
];

const BANKS = [
  { value: 'sber', label: 'Сбербанк' },
  { value: 'tbank', label: 'Т-Банк' },
  { value: 'alfa', label: 'Альфа-Банк' },
  { value: 'vtb', label: 'ВТБ' },
  { value: 'raiffeisen', label: 'Райффайзен' },
  { value: 'gazprom', label: 'Газпромбанк' },
  { value: 'rosbank', label: 'Росбанк' },
  { value: 'otkrytie', label: 'Открытие' },
  { value: 'other', label: 'Другой' },
];

type EmployeeWithStore = User & { store: Pick<Store, 'id' | 'name'> | null };

interface Props {
  employee: EmployeeWithStore;
  stores: Pick<Store, 'id' | 'name'>[];
  cities: { id: string; name: string }[];
  assignedCityIds: string[];
}

const sel = 'w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-medium">{value || '—'}</p>
    </div>
  );
}

function SectionCard({ icon: Icon, title, children }: {
  icon: React.ElementType; title: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-semibold text-sm">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function FileUploadRow({
  label, url, fieldName, employeeId,
}: {
  label: string; url: string | null; fieldName: 'contract' | 'passport'; employeeId: string;
}) {
  const [isUploading, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('field', fieldName);
    startTransition(async () => {
      await uploadEmployeeFile(employeeId, fd);
    });
  };

  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <div className="flex items-center gap-2.5">
        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Открыть
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">Не загружен</span>
        )}
        <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFile} />
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
        >
          <Upload className="h-3 w-3 mr-1" />
          {isUploading ? 'Загрузка...' : url ? 'Заменить' : 'Загрузить'}
        </Button>
      </div>
    </div>
  );
}

export function EmployeeDetailClient({ employee, stores, cities, assignedCityIds }: Props) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedCities, setSelectedCities] = useState<string[]>(assignedCityIds);

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const [profileRes] = await Promise.all([
        updateEmployee(employee.id, fd),
        updateEmployeeCities(employee.id, selectedCities),
      ]);
      if (profileRes?.error) setError(profileRes.error);
      else setEditOpen(false);
    });
  };

  const handlePasswordChange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateEmployeePassword(employee.id, fd);
      if (result?.error) setError(result.error);
      else setPasswordOpen(false);
    });
  };

  const handleToggle = () => {
    startTransition(async () => {
      const { toggleEmployeeStatus } = await import('../actions');
      await toggleEmployeeStatus(employee.id, employee.is_active);
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (!confirm(`Удалить сотрудника "${employee.full_name}"? Это действие необратимо.`)) return;
    startTransition(async () => {
      await deleteEmployee(employee.id);
      router.push('/employees');
    });
  };

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('ru-RU') : null;

  const isExpiringSoon = (d: string | null) => {
    if (!d) return false;
    const diff = new Date(d).getTime() - Date.now();
    return diff > 0 && diff < 1000 * 60 * 60 * 24 * 30;
  };
  const isExpired = (d: string | null) => {
    if (!d) return false;
    return new Date(d).getTime() < Date.now();
  };

  const docStatus = (d: string | null) => {
    if (!d) return null;
    if (isExpired(d)) return <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Просрочен</span>;
    if (isExpiringSoon(d)) return <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Скоро истекает</span>;
    return null;
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <Link
          href="/employees"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Все сотрудники
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPasswordOpen(true)}>
            Сменить пароль
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setEditOpen(true); setError(null); }}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Редактировать
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={employee.is_active ? 'text-destructive hover:bg-destructive hover:text-white' : 'text-green-600 hover:bg-green-600 hover:text-white'}
            onClick={handleToggle}
            disabled={isPending}
          >
            {employee.is_active ? (
              <><UserX className="h-3.5 w-3.5 mr-1.5" />Деактивировать</>
            ) : (
              <><UserCheck className="h-3.5 w-3.5 mr-1.5" />Активировать</>
            )}
          </Button>
        </div>
      </div>

      {/* Header */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 text-2xl font-bold text-primary select-none">
            {employee.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">{employee.full_name}</h1>
              <Badge variant={employee.is_active ? 'default' : 'secondary'}>
                {employee.is_active ? 'Активен' : 'Деактивирован'}
              </Badge>
              {employee.company_role && (
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${COMPANY_ROLE_COLORS[employee.company_role] ?? 'bg-muted text-muted-foreground'}`}>
                  {COMPANY_ROLE_LABELS[employee.company_role] ?? employee.company_role}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                {employee.email}
              </div>
              {employee.phone && (
                <a href={`tel:${employee.phone}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <Phone className="h-3.5 w-3.5" />
                  {employee.phone}
                </a>
              )}
              {employee.city && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {employee.city}
                </div>
              )}
              {employee.birth_date && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(employee.birth_date)}
                </div>
              )}
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Hash className="h-3.5 w-3.5" />
                <span className="font-mono text-xs">{employee.id.slice(0, 8)}…</span>
              </div>
            </div>

            {(employee as any).store && (
              <div className="mt-3 flex items-center gap-1.5 text-sm">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                <Link href={`/stores/${(employee as any).store.id}`} className="text-primary hover:underline">
                  {(employee as any).store.name}
                </Link>
              </div>
            )}
            {assignedCityIds.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {cities.filter(c => assignedCityIds.includes(c.id)).map(c => (
                  <span key={c.id} className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
                    {c.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Payment */}
        <SectionCard icon={CreditCard} title="Платёжные данные">
          <div className="grid grid-cols-2 gap-y-4 gap-x-6">
            <InfoRow label="Банк" value={employee.bank_name ? (BANK_LABELS[employee.bank_name] ?? employee.bank_name) : null} />
            <InfoRow label="Долг" value={employee.debt ? `${employee.debt.toLocaleString('ru-RU')} ₽` : '0 ₽'} />
            <InfoRow label="Номер карты" value={employee.card_number ? employee.card_number.replace(/(\d{4})/g, '$1 ').trim() : null} />
            <InfoRow label="PIN-код" value={employee.card_pin ? '••••' : null} />
          </div>
        </SectionCard>

        {/* Documents */}
        <SectionCard icon={BadgeAlert} title="Документы">
          <div className="space-y-3">
            <div>
              <p className="text-[11px] text-muted-foreground mb-0.5">Дата окончания патента</p>
              <p className="text-sm font-medium flex items-center">
                {formatDate(employee.patent_expires_at) || '—'}
                {docStatus(employee.patent_expires_at)}
              </p>
            </div>
            <InfoRow label="Регион патента" value={employee.patent_region} />
            <InfoRow label="Национальность" value={employee.nationality} />
            <InfoRow label="Серия и номер паспорта" value={employee.passport_number} />
            <div>
              <p className="text-[11px] text-muted-foreground mb-0.5">Дата окончания медкнижки</p>
              <p className="text-sm font-medium flex items-center">
                {formatDate(employee.med_book_expires_at) || '—'}
                {docStatus(employee.med_book_expires_at)}
              </p>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Files */}
      <SectionCard icon={FileText} title="Файлы">
        <FileUploadRow
          label="Трудовой договор"
          url={employee.contract_url}
          fieldName="contract"
          employeeId={employee.id}
        />
        <FileUploadRow
          label="Скан паспорта"
          url={employee.passport_url}
          fieldName="passport"
          employeeId={employee.id}
        />
      </SectionCard>

      {/* Danger zone */}
      <div className="bg-card border border-destructive/30 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <ShieldAlert className="h-4 w-4 text-destructive" />
          <h2 className="font-semibold text-sm text-destructive">Опасная зона</h2>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Удалить сотрудника</p>
            <p className="text-xs text-muted-foreground mt-0.5">Безвозвратное удаление аккаунта и всех данных</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive hover:text-white border-destructive/30"
            onClick={handleDelete}
            disabled={isPending}
          >
            Удалить
          </Button>
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Редактировать сотрудника</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-6 mt-2">
            {/* Basic */}
            <fieldset className="space-y-4">
              <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pb-1 border-b border-border w-full">Основные данные</legend>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>ФИО</Label>
                  <Input name="full_name" defaultValue={employee.full_name} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Телефон</Label>
                  <Input name="phone" type="tel" defaultValue={employee.phone ?? ''} placeholder="+7 (___) ___-__-__" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Город</Label>
                  <select name="city" defaultValue={employee.city ?? ''} className={sel}>
                    <option value="">— Не указан —</option>
                    {RUSSIAN_CITIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Дата рождения</Label>
                  <Input name="birth_date" type="date" defaultValue={employee.birth_date ?? ''} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Роль в компании</Label>
                  <select name="company_role" defaultValue={employee.company_role ?? ''} className={sel}>
                    <option value="">— Не указана —</option>
                    {COMPANY_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Магазин</Label>
                  <select name="store_id" defaultValue={(employee as any).store?.id ?? ''} className={sel}>
                    <option value="">— Не назначен —</option>
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </fieldset>

            {/* Payment */}
            <fieldset className="space-y-4">
              <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pb-1 border-b border-border w-full">Платёжные данные</legend>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Банк</Label>
                  <select name="bank_name" defaultValue={employee.bank_name ?? ''} className={sel}>
                    <option value="">— Не указан —</option>
                    {BANKS.map((b) => (
                      <option key={b.value} value={b.value}>{b.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Номер карты (16 цифр)</Label>
                  <Input name="card_number" defaultValue={employee.card_number ?? ''} maxLength={16} placeholder="1234567890123456" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>PIN-код</Label>
                  <Input name="card_pin" type="password" defaultValue={employee.card_pin ?? ''} maxLength={6} placeholder="••••" />
                </div>
                <div className="space-y-1.5">
                  <Label>Долг (₽)</Label>
                  <Input name="debt" type="number" step="0.01" defaultValue={employee.debt ?? 0} />
                </div>
              </div>
            </fieldset>

            {/* Documents */}
            <fieldset className="space-y-4">
              <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pb-1 border-b border-border w-full">Документы</legend>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Дата окончания патента</Label>
                  <Input name="patent_expires_at" type="date" defaultValue={employee.patent_expires_at ?? ''} />
                </div>
                <div className="space-y-1.5">
                  <Label>Регион патента</Label>
                  <Input name="patent_region" defaultValue={employee.patent_region ?? ''} placeholder="Московская область" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Национальность</Label>
                  <Input name="nationality" defaultValue={employee.nationality ?? ''} placeholder="Узбекистан" />
                </div>
                <div className="space-y-1.5">
                  <Label>Серия и номер паспорта</Label>
                  <Input name="passport_number" defaultValue={employee.passport_number ?? ''} placeholder="АА 1234567" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Дата окончания медкнижки</Label>
                  <Input name="med_book_expires_at" type="date" defaultValue={employee.med_book_expires_at ?? ''} />
                </div>
              </div>
            </fieldset>

            {/* Cities multiselect (for tech specialists) */}
            {cities.length > 0 && (
              <fieldset className="space-y-3">
                <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pb-1 border-b border-border w-full">
                  Города обслуживания
                </legend>
                <div className="flex flex-wrap gap-2">
                  {cities.map((c) => {
                    const active = selectedCities.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedCities(active
                          ? selectedCities.filter(id => id !== c.id)
                          : [...selectedCities, c.id]
                        )}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          active
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border text-muted-foreground hover:border-primary hover:text-foreground'
                        }`}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>
                {selectedCities.length > 0 && (
                  <p className="text-xs text-muted-foreground">Выбрано: {selectedCities.length}</p>
                )}
              </fieldset>
            )}

            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? 'Сохранение...' : 'Сохранить изменения'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Password dialog */}
      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Сменить пароль</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePasswordChange} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Новый пароль</Label>
              <Input name="password" type="password" required minLength={6} placeholder="Минимум 6 символов" />
            </div>
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
