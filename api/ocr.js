// OCR de recibo: recibe una foto (base64) y devuelve los campos de la transacción
// prellenados, vía Gemini (visión, tier gratuito). Key server-side.
// La imagen NO se persiste: se procesa y se descarta.

import { generate, jsonFrom } from './_gemini.js';

const VALID = ['food', 'transport', 'health', 'entertainment', 'shopping', 'home', 'salary', 'other'];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'not_configured' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'invalid_body' }); } }
  const image = typeof body?.image === 'string' ? body.image : '';
  const mimeType = typeof body?.mimeType === 'string' ? body.mimeType : 'image/jpeg';
  if (!image || image.length < 100) return res.status(400).json({ error: 'no_image' });
  if (image.length > 8_000_000) return res.status(413).json({ error: 'image_too_large' }); // ~6MB base64

  const prompt = `Extrae los datos de este recibo/factura. Devuelve EXCLUSIVAMENTE un JSON válido:
{"merchant": string, "amount": number, "category": string, "date": string}
- "merchant": nombre del comercio (corto). Si no se lee, "".
- "amount": TOTAL pagado, en la MISMA moneda que aparece en el recibo (no conviertas).
  Entero, sin símbolos ni separadores de miles: "26.500" -> 26500, "$1,234.50" -> 1234.
  Si no se lee, 0.
- "category": UNA de estas exactas: ${VALID.join(', ')}. Elige la más probable por el tipo de comercio.
- "date": fecha del recibo en formato YYYY-MM-DD. Si no se lee, "".
No inventes datos que no estén en la imagen. Nada fuera del JSON.`;

  const out = await generate({
    apiKey,
    label: 'ocr',
    parts: [{ inline_data: { mime_type: mimeType, data: image } }, { text: prompt }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0 },
    timeoutMs: 20000,
    parse,
  });

  if (out.ok) return res.status(200).json(out.data);
  // 429 hacia el cliente cuando la causa es cuota: el mensaje al usuario cambia.
  if (out.status === 429) return res.status(429).json({ error: 'quota_exceeded' });
  return res.status(502).json({ error: 'ocr_failed', reason: out.reason });
}

export function parse(text) {
  const obj = jsonFrom(text);
  if (!obj || typeof obj !== 'object') return null;
  const merchant = String(obj.merchant ?? '').slice(0, 60).trim();
  const amount = Math.max(0, Math.round(Number(obj.amount) || 0));
  const category = VALID.includes(obj.category) ? obj.category : 'other';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(obj.date ?? '') ? obj.date : '';
  // Recibo ilegible: ni comercio ni importe. Devolver null hace que se reintente
  // con el modelo siguiente en vez de prellenar el formulario con nada.
  if (!merchant && !amount) return null;
  return { merchant, amount, category, date };
}
