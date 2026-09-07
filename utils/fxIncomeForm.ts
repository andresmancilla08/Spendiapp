import { FX_AMOUNT_MAX, FX_LABEL_MAX, type FxIncome } from '../types/fxIncome';
import { isFxCurrency, type FxCurrency } from './fxConvert';

/**
 * Validación del formulario de ingreso, pura y sin i18n: devuelve QUÉ campo
 * falta, no el texto. La pantalla traduce.
 *
 * Sigue el patrón del resto de la app: el botón dice qué falta en vez de
 * quedarse gris sin explicación, así que necesita el nombre del primer campo
 * incompleto.
 */
export type FxFormField = 'label' | 'amount';

export interface FxFormValues {
  label: string;
  /** Lo que hay escrito en el input, tal cual. */
  amount: string;
  currency: FxCurrency;
  payDay: string;
}

export interface FxFormResult {
  /** Primer campo que falta, en orden de aparición. `null` si está completo. */
  missing: FxFormField | null;
  /** Solo si `missing` es null. */
  value: Omit<FxIncome, 'id' | 'createdAt'> | null;
}

/**
 * Acepta coma y punto como separador decimal, porque la app corre en tres
 * idiomas: en español se escribe «2.400,50» y en inglés «2,400.50».
 *
 * Las reglas, en orden (las escribió un test que las rompió una a una):
 *  1. Si aparecen los dos caracteres, el que esté más a la derecha es el
 *     decimal y el otro es separador de miles.
 *  2. Si solo aparece uno y REPETIDO, es separador de miles: «1.234.567».
 *  3. Si solo aparece uno y una vez, decide cuántos dígitos le siguen: tres
 *     exactos es ambiguo y se lee como miles («2.400» son dos mil cuatrocientos,
 *     no dos con cuatro), cualquier otra cantidad es decimal («2400,5»).
 *
 * El signo menos se descarta con el resto de los caracteres no numéricos: un
 * ingreso negativo no existe, y leer «-100» como 100 es más útil que bloquear
 * el formulario sin decir por qué.
 */
export function parseAmount(raw: string): number | null {
  const cleaned = (raw ?? '').replace(/[^\d.,]/g, '');
  if (!cleaned) return null;

  const dots = (cleaned.match(/\./g) ?? []).length;
  const commas = (cleaned.match(/,/g) ?? []).length;

  let decimalAt = -1;
  if (dots > 0 && commas > 0) {
    decimalAt = Math.max(cleaned.lastIndexOf('.'), cleaned.lastIndexOf(','));
  } else if (dots + commas === 1) {
    const at = dots === 1 ? cleaned.indexOf('.') : cleaned.indexOf(',');
    const decimals = cleaned.length - at - 1;
    if (decimals !== 3) decimalAt = at;
  }
  // dots+commas > 1 con un solo carácter = miles, y decimalAt se queda en -1.

  const normalized = decimalAt === -1
    ? cleaned.replace(/[.,]/g, '')
    : `${cleaned.slice(0, decimalAt).replace(/[.,]/g, '')}.${cleaned.slice(decimalAt + 1).replace(/[.,]/g, '')}`;

  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

/** Día de cobro válido: 1-31 o nada. Cualquier otra cosa se descarta en
 *  silencio porque es un campo opcional y decorativo. */
export function parsePayDay(raw: string): number | undefined {
  const n = Number((raw ?? '').replace(/[^\d]/g, ''));
  return Number.isInteger(n) && n >= 1 && n <= 31 ? n : undefined;
}

export function validateFxForm(values: FxFormValues): FxFormResult {
  const label = (values.label ?? '').trim().slice(0, FX_LABEL_MAX);
  if (!label) return { missing: 'label', value: null };

  const amount = parseAmount(values.amount);
  if (amount === null || amount <= 0 || amount > FX_AMOUNT_MAX) {
    return { missing: 'amount', value: null };
  }

  const currency: FxCurrency = isFxCurrency(values.currency) ? values.currency : 'EUR';
  const payDay = parsePayDay(values.payDay);

  return {
    missing: null,
    value: { label, amount, currency, ...(payDay ? { payDay } : {}) },
  };
}
