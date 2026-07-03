'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PhotoCapture } from '@/components/photo-capture';
import { compressImage } from '@/lib/compress-image';
import { uploadPhoto } from '@/lib/upload-photo';
import { submitTechRequest } from '../actions';
import { ScreenHeader } from '../screen-header';
import { SuccessScreen } from '../success-screen';

const MIN_DESCRIPTION = 10;
const MAX_DESCRIPTION = 500;

type Step = 'idle' | 'compress' | 'upload' | 'send';

const STEP_LABELS: Record<Exclude<Step, 'idle'>, string> = {
  compress: 'Сжатие фото…',
  upload: 'Загрузка фото…',
  send: 'Отправка…',
};

export function TechRequestClient({ userId }: { userId: string }) {
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [step, setStep] = useState<Step>('idle');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = description.trim();

  const handleSubmit = async () => {
    if (step !== 'idle') return;
    setError(null);

    if (trimmed.length < MIN_DESCRIPTION) {
      setError(`Опишите проблему подробнее (минимум ${MIN_DESCRIPTION} символов)`);
      return;
    }

    try {
      let photoUrl: string | null = null;
      if (photo) {
        setStep('compress');
        const blob = await compressImage(photo);
        setStep('upload');
        photoUrl = await uploadPhoto(
          'tech-request-photos',
          `tech-requests/${userId}/${Date.now()}.jpg`,
          blob,
        );
      }

      setStep('send');
      const result = await submitTechRequest({ description: trimmed, photoUrl });
      if (result.error) throw new Error(result.error);

      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить заявку');
      setStep('idle');
    }
  };

  if (done) {
    return <SuccessScreen title="Заявка отправлена" text="Технический отдел получил вашу заявку" />;
  }

  return (
    <div className="min-h-screen bg-background pb-10">
      <ScreenHeader title="Техническая заявка" subtitle="Опишите поломку или неисправность" />

      <div className="px-6 pt-6 space-y-5">
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Фото (необязательно)</Label>
          <PhotoCapture
            value={photo}
            onChange={setPhoto}
            label="Добавить фото"
            disabled={step !== 'idle'}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tech-description" className="text-sm font-semibold">
            Описание проблемы *
          </Label>
          <Textarea
            id="tech-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={MAX_DESCRIPTION}
            rows={5}
            placeholder="Опишите, что сломалось или не работает…"
            className="text-base"
          />
          <p className="text-xs text-muted-foreground text-right">
            {description.length} / {MAX_DESCRIPTION}
          </p>
        </div>

        {error && (
          <div role="alert" className="bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}

        <Button
          className="w-full h-12 rounded-2xl text-base"
          disabled={trimmed.length < MIN_DESCRIPTION || step !== 'idle'}
          onClick={handleSubmit}
        >
          {step === 'idle' ? 'Отправить заявку' : STEP_LABELS[step]}
        </Button>
      </div>
    </div>
  );
}
