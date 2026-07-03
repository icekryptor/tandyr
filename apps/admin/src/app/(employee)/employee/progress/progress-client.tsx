'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { submitProgress } from '../actions';
import { ScreenHeader } from '../screen-header';
import { SuccessScreen } from '../success-screen';

export function ProgressClient({ shiftId }: { shiftId: string }) {
  const [kg, setKg] = useState('');
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (pending) return;
    setError(null);

    const value = parseFloat(kg.replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) {
      setError('Введите количество кг (больше нуля)');
      return;
    }

    setPending(true);
    const result = await submitProgress(shiftId, value);
    setPending(false);

    if (result.error) setError(result.error);
    else setDone(true);
  };

  if (done) {
    return <SuccessScreen title="Прогресс сохранён" text="Промежуточная выработка отправлена" />;
  }

  return (
    <div className="min-h-screen bg-background pb-10">
      <ScreenHeader
        title="Промежуточный прогресс"
        subtitle="Сколько кг продукции готово на сейчас?"
      />

      <div className="px-6 pt-8 space-y-5">
        <div className="bg-card border border-border rounded-2xl p-5 space-y-2">
          <Label htmlFor="progress-kg" className="text-sm font-semibold">
            Произведено продукции (кг)
          </Label>
          <Input
            id="progress-kg"
            type="text"
            inputMode="decimal"
            placeholder="0,0"
            value={kg}
            onChange={(e) => setKg(e.target.value)}
            className="h-14 text-2xl font-bold text-center"
          />
        </div>

        {error && (
          <div role="alert" className="bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}

        <Button
          className="w-full h-12 rounded-2xl text-base"
          disabled={!kg || pending}
          onClick={handleSubmit}
        >
          {pending ? 'Отправка…' : 'Отправить прогресс'}
        </Button>
      </div>
    </div>
  );
}
