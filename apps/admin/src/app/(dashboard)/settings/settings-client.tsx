'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, DollarSign, Package, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { saveSettings } from './actions';

const ECON_FIELDS = [
  { key: 'shift_base_rate', label: 'Выплата за смену', unit: '₽/смена', step: '1' },
  { key: 'shift_kg_rate', label: 'Выплата за 10 кг выработки', unit: '₽', step: '1' },
  { key: 'price_per_kg', label: 'Цена продукции', unit: '₽/кг', step: '0.01' },
];

const RESOURCE_FIELDS = [
  { key: 'flour_daily_consumption', label: 'Мука', unit: 'кг/день', step: '0.1' },
  { key: 'sugar_daily_consumption', label: 'Сахар', unit: 'кг/день', step: '0.01' },
  { key: 'salt_daily_consumption', label: 'Соль', unit: 'кг/день', step: '0.01' },
  { key: 'dry_milk_daily_consumption', label: 'Сухое молоко', unit: 'кг/день', step: '0.1' },
  { key: 'yeast_daily_consumption', label: 'Дрожжи', unit: 'кг/день', step: '0.001' },
  { key: 'oil_daily_consumption', label: 'Масло (сливочное)', unit: 'кг/день', step: '0.1' },
];

function SettingField({
  field,
  value,
  onChange,
}: {
  field: { key: string; label: string; unit: string; step: string };
  value: string;
  onChange: (key: string, val: string) => void;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-3 items-center">
      <div className="space-y-1">
        <Label htmlFor={field.key} className="text-sm font-medium text-foreground">
          {field.label}
        </Label>
      </div>
      <div className="flex items-center gap-2">
        <Input
          id={field.key}
          type="number"
          step={field.step}
          min="0"
          value={value}
          onChange={(e) => onChange(field.key, e.target.value)}
          className="w-32 text-right tabular-nums"
        />
        <span className="text-xs text-muted-foreground w-16 shrink-0">{field.unit}</span>
      </div>
    </div>
  );
}

export function SettingsClient({ settings: initial }: { settings: Record<string, string> }) {
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleChange = (key: string, val: string) => {
    setValues((prev) => ({ ...prev, [key]: val }));
    setStatus(null);
  };

  const handleSave = () => {
    setStatus(null);
    startTransition(async () => {
      const result = await saveSettings(values);
      if (result.error) {
        setStatus({ type: 'error', message: result.error });
      } else {
        setStatus({ type: 'success', message: 'Настройки сохранены' });
      }
    });
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Settings className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Настройки</h1>
          <p className="text-sm text-muted-foreground">Экономические параметры и нормы расхода</p>
        </div>
      </div>

      {/* Section I1 — Экономика */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 pb-1 border-b border-border">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Экономика</h2>
        </div>
        <div className="space-y-4">
          {ECON_FIELDS.map((f) => (
            <SettingField
              key={f.key}
              field={f}
              value={values[f.key] ?? ''}
              onChange={handleChange}
            />
          ))}
        </div>
      </div>

      {/* Section I2 — Нормы расхода */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 pb-1 border-b border-border">
          <Package className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Нормы расхода ресурсов</h2>
          <span className="text-xs text-muted-foreground ml-auto">суточные нормы</span>
        </div>
        <div className="space-y-4">
          {RESOURCE_FIELDS.map((f) => (
            <SettingField
              key={f.key}
              field={f}
              value={values[f.key] ?? ''}
              onChange={handleChange}
            />
          ))}
        </div>
      </div>

      {/* Save + status */}
      <div className="flex items-center justify-between">
        {status ? (
          <div className={`flex items-center gap-2 text-sm ${status.type === 'success' ? 'text-green-600' : 'text-destructive'}`}>
            {status.type === 'success' ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            {status.message}
          </div>
        ) : (
          <span />
        )}
        <Button onClick={handleSave} disabled={isPending} className="min-w-[120px]">
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Сохранение…
            </>
          ) : (
            'Сохранить'
          )}
        </Button>
      </div>
    </div>
  );
}
