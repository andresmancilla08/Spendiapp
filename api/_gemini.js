// Punto único para hablar con Gemini desde las funciones de /api.
// El prefijo "_" evita que Vercel lo exponga como ruta.
//
// Por qué existe: los tres endpoints (ocr, categorize, insight) usaban
// `gemini-2.0-flash`, un ID versionado que se quedó SIN cuota en el tier gratuito
// (429 RESOURCE_EXHAUSTED, quotaId GenerateRequestsPerDayPerProjectPerModel-FreeTier)
// → los tres devolvían 502 siempre. Los alias "-latest" no caducan.
//
// Segundo fallo que cubre: los modelos flash actuales *piensan* antes de responder
// y los thinking tokens salen del mismo maxOutputTokens. Con presupuestos cortos
// (300 en ocr, 10 en categorize) la respuesta salía truncada -> finishReason
// MAX_TOKENS -> JSON inválido -> 502. Por eso el primer eslabón es -lite (no piensa)
// y el segundo lleva presupuesto amplio.

const CHAIN = [
  { model: 'gemini-flash-lite-latest', maxOutputTokens: 512 },  // sin thinking: JSON directo y barato
  { model: 'gemini-flash-latest', maxOutputTokens: 2048 },      // piensa: necesita margen o trunca
];

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

/** Llama a Gemini recorriendo la cadena de modelos hasta que uno responda algo
 *  que `parse` acepte.
 *  @returns {Promise<{ok:true, data:any} | {ok:false, status:number, reason:string}>}
 *  status es el HTTP de Gemini (429 = cuota) o 0 si no hubo respuesta.
 */
export async function generate({ apiKey, parts, system, generationConfig = {}, timeoutMs = 20000, parse, label = 'gemini' }) {
  let status = 0;
  let reason = 'no_candidates';

  for (const step of CHAIN) {
    const body = {
      contents: [{ role: 'user', parts }],
      generationConfig: { ...generationConfig, maxOutputTokens: step.maxOutputTokens },
    };
    if (system) body.system_instruction = { parts: [{ text: system }] };

    let r;
    try {
      r = await fetch(`${ENDPOINT}/${step.model}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (e) {
      status = 0;
      reason = e?.name === 'TimeoutError' ? 'timeout' : 'network';
      console.error(`[${label}] ${step.model} ${reason}`);
      continue;
    }

    if (!r.ok) {
      status = r.status;
      reason = `http_${r.status}`;
      // El cuerpo del error de Gemini dice la causa exacta (cuota, modelo retirado, key mala).
      console.error(`[${label}] ${step.model} HTTP ${r.status}: ${(await r.text()).slice(0, 300)}`);
      continue;
    }

    const data = await r.json();
    const cand = data?.candidates?.[0];
    const text = cand?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    const parsed = parse(text);
    if (parsed) return { ok: true, data: parsed };

    reason = cand?.finishReason === 'MAX_TOKENS' ? 'truncated' : 'unparseable';
    console.error(`[${label}] ${step.model} ${reason} (finish=${cand?.finishReason}, out=${data?.usageMetadata?.candidatesTokenCount}, think=${data?.usageMetadata?.thoughtsTokenCount ?? 0})`);
  }

  return { ok: false, status, reason };
}

/** JSON tolerante: acepta el objeto pelado o envuelto en prosa/```json. */
export function jsonFrom(text) {
  try { return JSON.parse(text); } catch { /* sigue */ }
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}
