import i18n from '../config/i18n';

// Mapa idioma → locale BCP-47 para Intl. El idioma de la app (es/en/it) manda,
// NO el locale del dispositivo, para que fechas y meses sigan al idioma elegido.
const LOCALE_MAP: Record<string, string> = { es: 'es-CO', en: 'en-US', it: 'it-IT' };

/** Locale para Intl según el idioma activo de la app (o el `lang` pasado). */
export function localeFor(lang?: string): string {
  const code = (lang ?? i18n.language ?? 'es').slice(0, 2);
  return LOCALE_MAP[code] ?? 'es-CO';
}

/** Los 12 nombres de mes (capitalizados) en el idioma activo. */
export function getMonthNames(lang?: string): string[] {
  const fmt = new Intl.DateTimeFormat(localeFor(lang), { month: 'long' });
  return Array.from({ length: 12 }, (_, i) => {
    const name = fmt.format(new Date(2021, i, 15));
    return name.charAt(0).toUpperCase() + name.slice(1);
  });
}

/** `date.toLocaleDateString` con el locale del idioma activo. */
export function formatDate(date: Date, opts: Intl.DateTimeFormatOptions, lang?: string): string {
  return date.toLocaleDateString(localeFor(lang), opts);
}

/** `date.toLocaleTimeString` con el locale del idioma activo. */
export function formatTime(date: Date, opts: Intl.DateTimeFormatOptions, lang?: string): string {
  return date.toLocaleTimeString(localeFor(lang), opts);
}
