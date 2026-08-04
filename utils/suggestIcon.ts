/**
 * Autoselección del icono de una categoría a partir de lo que escribe el usuario.
 *
 * Orden: tabla de palabras (instantánea, sin red, cubre español latinoamericano y
 * marcas locales) → Gemini restringido al catálogo, vía `api/suggest-icon.js` →
 * `FALLBACK_ICON` ("Otro").
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

/** Sugerencia IA vía server (api/suggest-icon.js). La key vive en el servidor,
 *  nunca en el cliente. Devuelve null si falla/offline → el caller usa FALLBACK_ICON. */
export async function suggestIconRemote(name: string): Promise<string | null> {
  try {
    const r = await fetch('https://spendia.co/api/suggest-icon', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, catalog: CATEGORY_ICON_NAMES, fallback: FALLBACK_ICON }),
    });
    if (!r.ok) return null;
    const data = await r.json();
    // La respuesta se valida contra el catálogo real: la IA nunca inventa un icono.
    return typeof data?.icon === 'string' && isCategoryIcon(data.icon) ? data.icon : null;
  } catch {
    return null;
  }
}

/** Palabras primero, IA después, "Otro" si nada encaja. Nunca devuelve vacío. */
export async function suggestIcon(name: string): Promise<string> {
  const local = suggestIconLocal(name);
  if (local) return local;
  return (await suggestIconRemote(name)) ?? FALLBACK_ICON;
}
