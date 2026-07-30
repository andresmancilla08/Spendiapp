/**
 * Lógica pura del card de transacción: iniciales del amigo para el notch y elección de un color
 * de texto legible sobre un fondo tintado. Vive fuera del componente para poder comprobarse
 * sin React Native (ver `utils/txRelation.test.ts`).
 */

/** 1-2 iniciales en mayúscula. Itera por code point: un nombre con emoji partido por índice
 *  dejaría un surrogate suelto y el glifo se rompe. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '·';
  const firstCharOf = (s: string) => Array.from(s)[0] ?? '';
  const first = firstCharOf(parts[0]);
  const second = parts.length > 1 ? firstCharOf(parts[1]) : '';
  return (first + second).toUpperCase();
}

/**
 * Parte `label` para poder resaltar `person` dentro de la frase.
 * Busca el nombre exacto en vez de asumir que va al final: en "Compartido con X y 2 más" va
 * en medio. Si no aparece (traducción sin interpolar, nombre vacío), devuelve la frase intacta
 * y `name` vacío — nunca duplica el nombre.
 */
export function splitByPerson(label: string, person: string): { before: string; name: string; after: string } {
  const at = person ? label.indexOf(person) : -1;
  if (at < 0) return { before: label, name: '', after: '' };
  return { before: label.slice(0, at), name: person, after: label.slice(at + person.length) };
}

// El color legible del pie de relación se mide con el helper compartido.
export { readableOn, contrastRatio } from './contrast';
