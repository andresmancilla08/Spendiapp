/**
 * Formato de dinero de la app.
 *
 * La moneda es COP (el producto es colombiano) pero la agrupación sigue al idioma
 * ACTIVO, igual que las fechas: con el locale fijado a 'es-CO' los importes salían
 * con separadores españoles en inglés e italiano.
 *
 * `formatMoney` RESPETA EL SIGNO. Hubo una versión que aplicaba `Math.abs` siempre
 * y, al adoptarla en las pantallas de balance, −$500.000 se mostraba como
 * "$ 500.000": quien estaba en rojo veía la misma cifra que quien estaba en verde,
 * y solo el color los distinguía. Para los sitios donde el signo lo aporta el
 * contexto —una fila con flecha, un lado de la balanza— está `formatMoneyAbs`.
 *
 * El idioma se resuelve con `require` diferido a propósito: importar `dateLocale`
 * arriba arrastra `config/i18n` y con él react-native, lo que impide ejecutar este
 * módulo (y su gate) en Node.
 */
const LOCALE_MAP: Record<string, string> = { es: 'es-CO', en: 'en-US', it: 'it-IT' };

function resolveLocale(lang?: string): string {
  if (lang) return LOCALE_MAP[lang.slice(0, 2)] ?? 'es-CO';
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return (require('./dateLocale') as typeof import('./dateLocale')).localeFor();
  } catch {
    return 'es-CO';
  }
}

const formatter = (lang?: string) =>
  new Intl.NumberFormat(resolveLocale(lang), {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    // El símbolo, no el código: fuera de español, `symbol` devuelve "COP 1,234,567"
    // y ese prefijo de tres letras pesa más que la propia cifra en cada fila de la
    // app. `narrowSymbol` da "$" en los tres idiomas.
    currencyDisplay: 'narrowSymbol',
  });

/** Importe con su signo: un saldo negativo se lee negativo. */
export function formatMoney(amount: number, lang?: string): string {
  return formatter(lang).format(amount);
}

/** Importe sin signo, para cuando ya lo dice el contexto (flecha, color, lado). */
export function formatMoneyAbs(amount: number, lang?: string): string {
  return formatter(lang).format(Math.abs(amount));
}
