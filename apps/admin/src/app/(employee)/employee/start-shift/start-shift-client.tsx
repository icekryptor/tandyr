'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin } from 'lucide-react';
import { findNearestStore } from '@tandyr/shared';
import { Button } from '@/components/ui/button';
import { PhotoCapture } from '@/components/photo-capture';
import { compressImage } from '@/lib/compress-image';
import { getPosition } from '@/lib/geolocation';
import { uploadPhoto } from '@/lib/upload-photo';
import { startShift } from '../actions';
import { ScreenHeader } from '../screen-header';

type StoreOption = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
};

type Step = 'idle' | 'compress' | 'geo' | 'upload' | 'create' | 'done';

const STEP_LABELS: Record<Exclude<Step, 'idle'>, string> = {
  compress: 'Сжатие фото…',
  geo: 'Определение магазина…',
  upload: 'Загрузка фото…',
  create: 'Открытие смены…',
  done: 'Открытие смены…',
};

function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} м` : `${km.toFixed(1).replace('.', ',')} км`;
}

export function StartShiftClient({ userId, stores }: { userId: string; stores: StoreOption[] }) {
  const router = useRouter();
  const [photo, setPhoto] = useState<File | null>(null);
  const [step, setStep] = useState<Step>('idle');
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);

  // Warm up the geolocation permission on mount (non-blocking). Errors are
  // ignored here — the submit flow re-requests and surfaces them visibly.
  useEffect(() => {
    let cancelled = false;
    getPosition().then(
      (pos) => {
        if (!cancelled) setPosition(pos);
      },
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const detected = position ? findNearestStore(stores, position.lat, position.lng) : null;

  const handleSubmit = async () => {
    if (!photo || step !== 'idle') return;
    setError(null);
    try {
      setStep('compress');
      const blob = await compressImage(photo);

      setStep('geo');
      const pos = await getPosition();
      const store = findNearestStore(stores, pos.lat, pos.lng);
      if (!store) throw new Error('Не удалось найти ближайший магазин');

      setStep('upload');
      const photoUrl = await uploadPhoto(
        'shift-photos',
        `shifts/${userId}/${Date.now()}_start.jpg`,
        blob,
      );

      setStep('create');
      const result = await startShift({ storeId: store.id, photoUrl, lat: pos.lat, lng: pos.lng });
      if (result.error) throw new Error(result.error);

      setStep('done'); // keep the button disabled while navigating
      router.replace('/employee?started=1');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Не удалось открыть смену');
      setStep('idle');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-10">
      <ScreenHeader title="Начало смены" subtitle="Сфотографируйте рабочее место" />

      <div className="px-6 pt-6 space-y-5">
        <PhotoCapture value={photo} onChange={setPhoto} disabled={step !== 'idle'} />

        {/* Detected store (eager geo) */}
        {detected && (
          <div className="flex items-start gap-3 bg-card border border-border rounded-2xl p-4">
            <span className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <MapPin className="h-5 w-5 text-primary" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{detected.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{detected.address}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                ~{formatDistance(detected.distance)} от вас
              </p>
            </div>
          </div>
        )}

        {/* Info block — mirrors mobile */}
        <div className="bg-accent/5 border border-accent/20 rounded-2xl p-4">
          <p className="text-sm font-semibold text-accent">Что произойдёт после отправки?</p>
          <ul className="mt-3 space-y-2 text-sm text-foreground/80">
            <li>
              <span aria-hidden>📍</span> Определение вашего магазина по геолокации
            </li>
            <li>
              <span aria-hidden>🕐</span> Фиксация времени начала смены
            </li>
            <li>
              <span aria-hidden>📂</span> Сохранение фото рабочего места
            </li>
            <li>
              <span aria-hidden>🆔</span> Открытие смены с уникальным ID
            </li>
          </ul>
        </div>

        {error && (
          <div role="alert" className="bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}

        <Button
          className="w-full h-12 rounded-2xl text-base"
          disabled={!photo || step !== 'idle'}
          onClick={handleSubmit}
        >
          {step === 'idle' ? 'Начать смену' : STEP_LABELS[step]}
        </Button>
      </div>
    </div>
  );
}
