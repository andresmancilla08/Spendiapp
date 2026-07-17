// Captura una foto de recibo (web PWA), la comprime en canvas (sin dependencias)
// y la envía a api/ocr.js para extraer los campos. Solo web — en nativo -> cancelled.
// La imagen se procesa en memoria y no se guarda en ningún lado.

export interface ScannedReceipt {
  merchant: string;
  amount: number;
  category: string;
  date: string; // YYYY-MM-DD o ''
}

export type ScanResult =
  | { status: 'ok'; data: ScannedReceipt }
  | { status: 'cancelled' } // el usuario cerró el selector: volver a estado inicial, sin error
  | { status: 'failed' };   // OCR/red falló: mostrar error

const OCR_URL = 'https://spendia.co/api/ocr';
const MAX_DIM = 1280; // lado máximo tras compresión: legible para OCR, payload pequeño

// Abre el selector de imagen. Resuelve con el File, o null si el usuario cancela.
// Cancelación robusta: evento 'cancel' (navegadores modernos) + fallback por 'focus'
// (al cerrarse el diálogo la ventana recupera el foco; si no hubo 'change', fue cancelado).
function pickImage(): Promise<File | null> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') return resolve(null);
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.setAttribute('capture', 'environment'); // en móvil abre la cámara trasera

    let settled = false;
    const finish = (f: File | null) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('focus', onFocus);
      resolve(f);
    };
    const onFocus = () => {
      // El diálogo se cerró. Damos un instante por si 'change' llega justo después;
      // si no hay archivo, fue cancelado.
      setTimeout(() => finish(input.files?.[0] ?? null), 500);
    };

    input.onchange = () => finish(input.files?.[0] ?? null);
    (input as any).oncancel = () => finish(null);
    window.addEventListener('focus', onFocus, { once: true });
    input.click();
  });
}

function compressToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('no_ctx'));
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      resolve({ base64: dataUrl.split(',')[1] ?? '', mimeType: 'image/jpeg' });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('img_load')); };
    img.src = url;
  });
}

/** Abre la cámara/galería, comprime y devuelve los campos del recibo.
 *  status 'cancelled' si el usuario no eligió imagen (resetear sin error);
 *  'failed' si el OCR/red falló. */
export async function scanReceipt(): Promise<ScanResult> {
  const file = await pickImage();
  if (!file) return { status: 'cancelled' };
  try {
    const { base64, mimeType } = await compressToBase64(file);
    if (!base64) return { status: 'failed' };
    const r = await fetch(OCR_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ image: base64, mimeType }),
    });
    if (!r.ok) return { status: 'failed' };
    const data = await r.json();
    if (typeof data?.amount !== 'number') return { status: 'failed' };
    return { status: 'ok', data: data as ScannedReceipt };
  } catch {
    return { status: 'failed' };
  }
}
