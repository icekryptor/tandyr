import { createClient } from '@/lib/supabase/client';

/** Backoff delays for the 2 retries after the initial attempt. */
const RETRY_DELAYS_MS = [1000, 3000];

/**
 * Upload a photo blob directly from the browser to Supabase Storage
 * (RLS: authenticated users may write to their own folder) and return
 * the public URL. Retries transient/network failures with backoff;
 * client errors (4xx — RLS denied, duplicate path, too large) fail fast.
 */
export async function uploadShiftPhoto(bucket: string, path: string, blob: Blob): Promise<string> {
  const supabase = createClient();

  for (let attempt = 0; ; attempt++) {
    let message: string;
    let retriable: boolean;

    try {
      const { error } = await supabase.storage
        .from(bucket)
        .upload(path, blob, { contentType: 'image/jpeg', upsert: false });

      if (!error) {
        return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
      }
      message = error.message || 'Не удалось загрузить фото';
      retriable = !isClientError(error);
    } catch (err: unknown) {
      // Thrown errors (fetch TypeError etc.) are network-level — retriable.
      message = err instanceof Error ? err.message : 'Не удалось загрузить фото';
      retriable = true;
    }

    if (!retriable || attempt >= RETRY_DELAYS_MS.length) {
      throw new Error(message);
    }
    await sleep(RETRY_DELAYS_MS[attempt]);
  }
}

/** StorageApiError carries `status: number` and/or `statusCode: string`. */
function isClientError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const { status, statusCode } = err as { status?: unknown; statusCode?: unknown };
  const numeric =
    typeof status === 'number'
      ? status
      : typeof statusCode === 'string'
        ? parseInt(statusCode, 10)
        : typeof statusCode === 'number'
          ? statusCode
          : NaN;
  return numeric >= 400 && numeric < 500;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
