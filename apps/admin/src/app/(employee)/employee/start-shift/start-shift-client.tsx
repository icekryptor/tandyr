'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, MapPin, MapPinOff } from 'lucide-react';
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

export function StartShiftClient({
  userId,
  stores,
  myStoreIds,
}: {
  userId: string;
  stores: StoreOption[];
  myStoreIds: string[];
}) {
  const router = useRouter();
  const [photo, setPhoto] = useState<File | null>(null);
  const [step, setStep] = useState<Step>('idle');
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  // Set when the device can't give a position: the store is then picked by hand.
  const [geoError, setGeoError] = useState<string | null>(null);
  const [manualStoreId, setManualStoreId] = useState<string | null>(null);
  const [locating, setLocating] = useState(true);

  const locate = () => {
    setLocating(true);
    return getPosition().then(
      (pos) => {
        setPosition(pos);
        setGeoError(null);
        setManualStoreId(null);
        return pos;
      },
      (err: unknown) => {
        setPosition(null);
        setGeoError(err instanceof Error ? err.message : 'Не удалось определить местоположение.');
        return null;
      },
    ).finally(() => setLocating(false));
  };

  // Ask for the position on mount, so a failure shows the store picker
  // before the employee takes the photo.
  useEffect(() => {
    void locate();
  }, []);

  const detected = position ? findNearestStore(stores, position.lat, position.lng) : null;

  const handleSubmit = async () => {
    if (!photo || step !== 'idle') return;
    setError(null);
    try {
      setStep('compress');
      const blob = await compressImage(photo);

      let storeId: string;
      let coords: { lat: number; lng: number } | null = null;
      if (geoError && manualStoreId) {
        storeId = manualStoreId;
      } else {
        setStep('geo');
        coords = await locate();
        if (!coords) {
          throw new Error('Не удалось определить местоположение. Выберите магазин вручную.');
        }
        const store = findNearestStore(stores, coords.lat, coords.lng);
        if (!store) throw new Error('Не удалось найти ближайший магазин');
        storeId = store.id;
      }

      setStep('upload');
      const photoUrl = await uploadPhoto(
        'shift-photos',
        `shifts/${userId}/${Date.now()}_start.jpg`,
        blob,
      );

      setStep('create');
      const result = await startShift({
        storeId,
        photoUrl,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
      });
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

        {/* No position: pick the store by hand */}
        {geoError && (
          <ManualStorePicker
            reason={geoError}
            stores={stores}
            myStoreIds={myStoreIds}
            value={manualStoreId}
            onChange={setManualStoreId}
            onRetry={() => void locate()}
            disabled={step !== 'idle' || locating}
          />
        )}

        {/* Info block — mirrors mobile */}
        <div className="bg-accent/5 border border-accent/20 rounded-2xl p-4">
          <p className="text-sm font-semibold text-accent">Что произойдёт после отправки?</p>
          <ul className="mt-3 space-y-2 text-sm text-foreground/80">
            <li>
              <span aria-hidden>📍</span> Определение вашего магазина по геолокации
              {' '}(или по вашему выбору, если она недоступна)
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
          disabled={!photo || step !== 'idle' || (!!geoError && !manualStoreId)}
          onClick={handleSubmit}
        >
          {step === 'idle' ? 'Начать смену' : STEP_LABELS[step]}
        </Button>
      </div>
    </div>
  );
}

function ManualStorePicker({
  reason,
  stores,
  myStoreIds,
  value,
  onChange,
  onRetry,
  disabled,
}: {
  reason: string;
  stores: StoreOption[];
  myStoreIds: string[];
  value: string | null;
  onChange: (id: string) => void;
  onRetry: () => void;
  disabled: boolean;
}) {
  const mine = stores.filter((s) => myStoreIds.includes(s.id));
  const others = stores.filter((s) => !myStoreIds.includes(s.id));
  // Without own stores (or with the chosen one among the others) show everything.
  const [showOthers, setShowOthers] = useState(
    mine.length === 0 || others.some((s) => s.id === value),
  );

  const option = (store: StoreOption) => {
    const selected = store.id === value;
    return (
      <li key={store.id}>
        <button
          type="button"
          role="radio"
          aria-checked={selected}
          disabled={disabled}
          onClick={() => onChange(store.id)}
          className={`w-full flex items-start gap-3 text-left rounded-xl border p-3 transition-colors disabled:opacity-60 ${
            selected ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40'
          }`}
        >
          <span
            className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
              selected ? 'border-primary bg-primary text-white' : 'border-border'
            }`}
          >
            {selected && <Check className="h-3 w-3" />}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-foreground">{store.name}</span>
            <span className="block text-xs text-muted-foreground mt-0.5">{store.address}</span>
          </span>
        </button>
      </li>
    );
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
          <MapPinOff className="h-5 w-5 text-amber-600" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Геолокация недоступна</p>
          <p className="text-xs text-muted-foreground mt-0.5">{reason}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Выберите магазин, в котором начинаете смену.
          </p>
        </div>
      </div>

      {stores.length === 0 ? (
        <p className="text-sm text-muted-foreground">Нет доступных магазинов. Обратитесь к менеджеру.</p>
      ) : (
        <ul role="radiogroup" aria-label="Магазин" className="space-y-2">
          {mine.map(option)}
          {showOthers && mine.length > 0 && others.length > 0 && (
            <li className="pt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
              Другие магазины
            </li>
          )}
          {showOthers && others.map(option)}
        </ul>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {!showOthers && others.length > 0 && (
          <button
            type="button"
            onClick={() => setShowOthers(true)}
            className="text-sm font-medium text-primary"
          >
            Другие магазины ({others.length})
          </button>
        )}
        <button
          type="button"
          onClick={onRetry}
          disabled={disabled}
          className="text-sm font-medium text-primary disabled:opacity-60"
        >
          Определить заново
        </button>
      </div>
    </div>
  );
}
