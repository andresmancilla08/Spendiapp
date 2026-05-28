// Quick test of the logic
function capitalize(word: string): string {
  if (!word) return '';
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

export function generateUserName(displayName: string): string {
  const normalized = displayName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z\s]/g, '')
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
    names = [words[0]];
    lastNames = [words[1], words[2]];
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

// Test cases
console.log('Test 1 - 2 words (María López):');
console.log('Result:', generateUserName('María López'));
console.log('Expected: MLopez');
console.log('');

console.log('Test 2 - 2 words (Andrés Mancilla):');
console.log('Result:', generateUserName('Andrés Mancilla'));
console.log('Expected: AMancilla');
console.log('');

console.log('Test 3 - 3 words (Andres Mancilla Oliver) — conv. colombiana 1N+2A:');
console.log('Result:', generateUserName('Andres Mancilla Oliver'));
console.log('Expected: AMancillaO');
console.log('');

console.log('Test 4 - 4 words (Andrés David Mancilla Oliver):');
console.log('Result:', generateUserName('Andrés David Mancilla Oliver'));
console.log('Expected: ADMancillaO');
