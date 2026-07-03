'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PhotoCaptureProps {
  value: File | null;
  onChange: (file: File | null) => void;
  label?: string;
  /** Freeze the capture UI (e.g. while the parent flow is submitting). */
  disabled?: boolean;
}

/**
 * Camera-first photo capture: hidden <input type="file" capture="environment">
 * behind a dashed tap card. On Android/iOS mobile browsers this opens the
 * rear camera directly (web equivalent of ImagePicker.launchCameraAsync).
 */
export function PhotoCapture({
  value,
  onChange,
  label = 'Сделать фото',
  disabled = false,
}: PhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Object URL is derived from the file; the effect below revokes it when
  // the photo changes or the component unmounts.
  const previewUrl = useMemo(() => (value ? URL.createObjectURL(value) : null), [value]);
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const openCamera = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const disabledClass = disabled ? 'opacity-60 pointer-events-none' : '';

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          if (file) onChange(file);
          // Reset so re-taking the "same" photo still fires onChange.
          e.target.value = '';
        }}
      />

      <button
        type="button"
        onClick={openCamera}
        disabled={disabled}
        aria-label={label}
        className={`w-full h-60 bg-card border-2 border-dashed border-border rounded-2xl flex items-center justify-center overflow-hidden hover:border-primary/40 transition-colors ${disabledClass}`}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="Снятое фото" className="w-full h-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-3 px-4 text-center">
            <span className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Camera className="h-7 w-7 text-primary" />
            </span>
            <span className="text-base font-semibold text-foreground">{label}</span>
            <span className="text-sm text-muted-foreground">Нажмите, чтобы открыть камеру</span>
          </span>
        )}
      </button>

      {value && (
        <Button
          type="button"
          variant="secondary"
          disabled={disabled}
          className={`w-full h-11 ${disabledClass}`}
          onClick={openCamera}
        >
          Переснять фото
        </Button>
      )}
    </div>
  );
}
