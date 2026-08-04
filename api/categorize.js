// Auto-categorización de una transacción por su descripción, vía Gemini Flash
// (tier gratuito). La key vive en el server (Vercel env), nunca en el cliente.
// El cliente ya tiene categorizeLocal (keywords) como fallback instantáneo; esto
// solo entra cuando las keywords no reconocen la descripción.

import { generate } from './_gemini.js';

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
  const description = String(body?.description ?? '').slice(0, 200).trim();
  if (description.length < 3) return res.status(400).json({ error: 'too_short' });

  const prompt = `Clasifica este gasto o ingreso en UNA de estas categorías exactas: ${VALID.join(', ')}. Responde ÚNICAMENTE con la palabra de la categoría en inglés, sin explicación ni puntuación. Gasto/ingreso: "${description}"`;

  const out = await generate({
    apiKey,
    label: 'categorize',
    parts: [{ text: prompt }],
    generationConfig: { temperature: 0 },
    timeoutMs: 9000,
    parse: (text) => {
      const word = text.trim().toLowerCase().replace(/[^a-z]/g, '');
      return VALID.includes(word) ? { category: word } : null;
    },
  });

  if (!out.ok) return res.status(out.status === 429 ? 429 : 502).json({ error: 'categorize_failed', reason: out.reason });
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800'); // misma desc → misma categoría
  return res.status(200).json(out.data);
}
