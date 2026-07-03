/**
 * Client-side image compression for the employee PWA.
 *
 * Camera photos on budget Android devices are 3–8 MB; compressing to
 * max 1600px JPEG q0.7 (~150–350 KB) is the single biggest flow-speed win
 * on weak store Wi-Fi / LTE.
 */

const SKIP_SIZE_BYTES = 300_000;

interface CompressOptions {
  maxDim?: number;
  quality?: number;
}

export async function compressImage(file: File, opts?: CompressOptions): Promise<Blob> {
  const maxDim = opts?.maxDim ?? 1600;
  const quality = opts?.quality ?? 0.7;

  if (typeof createImageBitmap === 'function') {
    try {
      // `from-image` applies EXIF orientation so the canvas draw is upright.
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      try {
        if (file.size < SKIP_SIZE_BYTES && bitmap.width <= maxDim && bitmap.height <= maxDim) {
          return file;
        }
        return await drawToJpeg(bitmap, bitmap.width, bitmap.height, maxDim, quality);
      } finally {
        bitmap.close();
      }
    } catch {
      // Some WebViews lack createImageBitmap(file) or the options bag —
      // fall through to the <img> path and just compress.
    }
  }

  return compressViaImgElement(file, maxDim, quality);
}

/** Fallback for browsers without a usable createImageBitmap. */
function compressViaImgElement(file: File, maxDim: number, quality: number): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      drawToJpeg(img, img.naturalWidth, img.naturalHeight, maxDim, quality).then(resolve, reject);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Не удалось прочитать изображение'));
    };
    img.src = url;
  });
}

async function drawToJpeg(
  source: CanvasImageSource,
  srcWidth: number,
  srcHeight: number,
  maxDim: number,
  quality: number,
): Promise<Blob> {
  const scale = Math.min(1, maxDim / Math.max(srcWidth, srcHeight));
  const width = Math.max(1, Math.round(srcWidth * scale));
  const height = Math.max(1, Math.round(srcHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Не удалось обработать изображение');
  ctx.drawImage(source, 0, 0, width, height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Не удалось сжать изображение'));
      },
      'image/jpeg',
      quality,
    );
  });
}
