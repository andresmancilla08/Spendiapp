function capitalize(word: string): string {
  if (!word) return '';
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * Genera un userName a partir de displayName.
 * Reglas:
 *   1 palabra  → "Nombre"
 *   2 palabras → inicialNombre + Apellido1          e.g. "MLopez"
 *   3 palabras → inicialN1 + inicialN2 + Apellido1  e.g. "MJLopez"
 *   4+ palabras→ inicialN1 + inicialN2 + Apellido1 + inicialApellido2  e.g. "ADMancillaO"
 *
 * Normaliza tildes/caracteres especiales antes de generar.
 */
export function generateUserName(displayName: string): string {
  const normalized = displayName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  const words = normalized.split(/\s+/).filter(Boolean);

  if (words.length === 0) return 'Usuario';

  if (words.length === 1) {
    return capitalize(words[0]);
  }

  let names: string[];
  let lastNames: string[];

  if (words.length === 2) {
    names = [words[0]];
    lastNames = [words[1]];
  } else if (words.length === 3) {
    names = [words[0], words[1]];
    lastNames = [words[2]];
  } else {
    // 4+ palabras: primeros 2 son nombres, últimos 2 son apellidos
    names = [words[0], words[1]];
    lastNames = [words[words.length - 2], words[words.length - 1]];
  }

  const initials = names.map((n) => n.charAt(0).toUpperCase()).join('');
  const apellido1 = capitalize(lastNames[0]);
  const apellido2Initial = lastNames.length > 1 ? lastNames[1].charAt(0).toUpperCase() : '';

  return `${initials}${apellido1}${apellido2Initial}`;
}
