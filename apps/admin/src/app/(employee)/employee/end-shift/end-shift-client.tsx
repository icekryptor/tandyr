'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhotoCapture } from '@/components/photo-capture';
import { compressImage } from '@/lib/compress-image';
import { getPosition } from '@/lib/geolocation';
import { uploadPhoto } from '@/lib/upload-photo';
import { endShift } from '../actions';
import { ScreenHeader } from '../screen-header';

type Step = 'idle' | 'compress' | 'geo' | 'upload' | 'close' | 'done';

const STEP_LABELS: Record<Exclude<Step, 'idle'>, string> = {
  compress: 'Сжатие фото…',
  geo: 'Определение местоположения…',
  upload: 'Загрузка фото…',
  close: 'Завершение смены…',
  done: 'Завершение смены…',
};

export function EndShiftClient({ userId, shiftId }: { userId: string; shiftId: string }) {
  const router = useRouter();
  const [photo, setPhoto] = useState<File | null>(null);
  const [productionKg, setProductionKg] = useState('');
  const [step, setStep] = useState<Step>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!photo || step !== 'idle') return;
    setError(null);

    const kg = parseFloat(productionKg.replace(',', '.'));
    if (!Number.isFinite(kg) || kg <= 0) {
      setError('Укажите выработку в кг (больше нуля)');
      return;
    }

    try {
      setStep('compress');
      const blob = await compressImage(photo);

      setStep('geo');
      const pos = await getPosition();

      setStep('upload');
      const photoUrl = await uploadPhoto(
        'shift-photos',
        `shifts/${userId}/${Date.now()}_end.jpg`,
        blob,
      );

      setStep('close');
      const result = await endShift({
        shiftId,
        photoUrl,
        lat: pos.lat,
        lng: pos.lng,
        productionKg: kg,
      });
      if (result.error) throw new Error(result.error);

      setStep('done'); // keep the button disabled while navigating
      router.replace('/employee?ended=1');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Не удалось завершить смену');
      setStep('idle');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-10">
      <ScreenHeader
        title="Завершение смены"
        subtitle="Сфотографируйте продукцию и укажите выработку"
      />

      <div className="px-6 pt-6 space-y-5">
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Фото продукции / рабочего места</Label>
          <PhotoCapture value={photo} onChange={setPhoto} disabled={step !== 'idle'} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="production-kg" className="text-sm font-semibold">
            Выработка за смену (кг)
          </Label>
          <Input
            id="production-kg"
            type="text"
            inputMode="decimal"
            placeholder="Например: 48,5"
            value={productionKg}
            onChange={(e) => setProductionKg(e.target.value)}
            className="h-12 text-base"
          />
          <p className="text-xs text-muted-foreground">
            На основе этих данных будет рассчитана зарплата
          </p>
        </div>

        {error && (
          <div role="alert" className="bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}

        <Button
          className="w-full h-12 rounded-2xl text-base"
          disabled={!photo || !productionKg || step !== 'idle'}
          onClick={handleSubmit}
        >
          {step === 'idle' ? 'Завершить смену' : STEP_LABELS[step]}
        </Button>
      </div>
    </div>
  );
}
