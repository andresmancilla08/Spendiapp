// Auto-categorización de una transacción por su descripción, vía Gemini Flash
// (tier gratuito). La key vive en el server (Vercel env), nunca en el cliente.
// El cliente ya tiene categorizeLocal (keywords) como fallback instantáneo; esto
// solo entra cuando las keywords no reconocen la descripción.

const MODEL = 'gemini-2.0-flash';
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

  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 10, temperature: 0 },
      }),
      signal: AbortSignal.timeout(9000),
    });
    if (!r.ok) throw new Error(`gemini_${r.status}`);
    const data = await r.json();
    const text = (data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '')
      .trim().toLowerCase().replace(/[^a-z]/g, '');
    if (!VALID.includes(text)) throw new Error('invalid_category');
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800'); // misma desc → misma categoría
    return res.status(200).json({ category: text });
  } catch {
    return res.status(502).json({ error: 'categorize_failed' });
  }
}
