// Sugerencia del icono de una categoría por su nombre, vía Gemini. Key server-side.
// Antes esto se llamaba desde el cliente con EXPO_PUBLIC_GEMINI_API_KEY: esa env no
// existe en Vercel (la sugerencia IA nunca corrió en producción) y definirla habría
// metido la key en el bundle web.
//
// El catálogo de iconos válidos lo manda el cliente (constants/categoryIconData.ts,
// única fuente de verdad) y aquí solo se usa para restringir y validar la respuesta:
// así el server no guarda una copia que se desincronice. El cliente revalida con
// isCategoryIcon, que es lo que de verdad manda.

import { generate } from './_gemini.js';

const MAX_CATALOG = 400; // el catálogo real ronda los 180 nombres

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
  const name = String(body?.name ?? '').slice(0, 60).trim();
  if (name.length < 2) return res.status(400).json({ error: 'too_short' });

  // Solo claves con la forma de un id de icono: corta cualquier inyección por el catálogo.
  const catalog = (Array.isArray(body?.catalog) ? body.catalog : [])
    .filter((k) => typeof k === 'string' && /^[a-z0-9-]{2,40}$/.test(k))
    .slice(0, MAX_CATALOG);
  if (catalog.length < 2) return res.status(400).json({ error: 'no_catalog' });

  // El cliente manda su icono de "Otro" para que el modelo tenga salida cuando nada encaja.
  const fallback = catalog.includes(body?.fallback) ? body.fallback : catalog[catalog.length - 1];
  const prompt =
    `Elige el icono que mejor representa esta categoría de gastos: "${name}".\n` +
    `Responde ÚNICAMENTE con una de estas claves, sin comillas ni explicación:\n${catalog.join(', ')}\n` +
    `Si ninguna encaja razonablemente, responde exactamente: ${fallback}`;

  const out = await generate({
    apiKey,
    label: 'suggest-icon',
    parts: [{ text: prompt }],
    generationConfig: { temperature: 0.1 },
    timeoutMs: 9000,
    parse: (text) => {
      const key = text.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
      return catalog.includes(key) ? { icon: key } : null;
    },
  });

  if (!out.ok) return res.status(out.status === 429 ? 429 : 502).json({ error: 'suggest_failed', reason: out.reason });
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800'); // mismo nombre → mismo icono
  return res.status(200).json(out.data);
}
