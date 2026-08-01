/**
 * Autoselección del icono de una categoría a partir de lo que escribe el usuario.
 *
 * Orden: tabla de palabras (instantánea, sin red, cubre español latinoamericano y
 * marcas locales) → Gemini restringido al catálogo → `FALLBACK_ICON` ("Otro").
 * La IA NUNCA inventa: su respuesta se valida contra `CATEGORY_ICONS` y, si no
 * está, se descarta.
 */
import { CATEGORY_ICON_NAMES, KEYWORD_ICONS, FALLBACK_ICON, isCategoryIcon } from '../constants/categoryIconData';

const normalize = (s: string): string =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/**
 * Las palabras de 3 letras o menos ('d1', 'ara', 'gym') tienen que aparecer
 * enteras: como subcadena, "ara" convertía "ahorro pARA el viaje" en supermercado.
 */
function matches(text: string, keyword: string): boolean {
  const kw = normalize(keyword);
  if (kw.length > 3) return text.includes(kw);
  return new RegExp(`(^|[^a-z0-9])${kw}([^a-z0-9]|$)`).test(text);
}

export function suggestIconLocal(name: string): string | null {
  const n = normalize(name);
  if (n.trim().length < 2) return null;
  for (const [keywords, icon] of KEYWORD_ICONS) {
    if (keywords.some((kw) => matches(n, kw))) return icon;
  }
  return null;
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

export async function suggestIconWithGemini(name: string, apiKey: string): Promise<string | null> {
  if (!apiKey) return null;
  const catalog = CATEGORY_ICON_NAMES.join(', ');
  const prompt =
    `Elige el icono que mejor representa esta categoría de gastos: "${name}".\n` +
    `Responde ÚNICAMENTE con una de estas claves, sin comillas ni explicación:\n${catalog}\n` +
    `Si ninguna encaja razonablemente, responde exactamente: ${FALLBACK_ICON}`;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 12, temperature: 0.1 },
        }),
      },
    );
    const data = (await res.json()) as GeminiResponse;
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toLowerCase() ?? '';
    const key = raw.replace(/[^a-z0-9-]/g, '');
    return isCategoryIcon(key) ? key : null;
  } catch {
    return null;
  }
}

/** Palabras primero, IA después, "Otro" si nada encaja. Nunca devuelve vacío. */
export async function suggestIcon(name: string, apiKey?: string): Promise<string> {
  const local = suggestIconLocal(name);
  if (local) return local;
  if (apiKey) {
    const ai = await suggestIconWithGemini(name, apiKey);
    if (ai) return ai;
  }
  return FALLBACK_ICON;
}
