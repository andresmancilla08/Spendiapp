import type { FxCurrency } from '../utils/fxConvert';

/**
 * Un ingreso que el usuario recibe en moneda extranjera.
 *
 * Vive en `users/{uid}.fxIncomes[]`, NO en `transactions`: es una declaración
 * («me pagan 2.400 € al mes»), no un movimiento que haya ocurrido. Por eso no
 * entra en el balance ni en el histórico, y por eso esta fase no puede romper
 * ningún cálculo existente.
 *
 * El importe se guarda en su moneda de origen y sin convertir. La conversión se
 * hace al pintar, con la TRM del día — si se guardara en pesos, el dato
 * quedaría congelado a la tasa del día en que se escribió, que es justo lo que
 * esta feature viene a evitar.
 */
export interface FxIncome {
  /** `fx_<epoch>`; se genera en el cliente porque no hay colección propia. */
  id: string;
  /** Cómo lo llama el usuario: «Salario», «Freelance Alemania». */
  label: string;
  /** Importe en la moneda de origen. 2400, no 10924800. */
  amount: number;
  currency: FxCurrency;
  /** Día del mes en que se cobra (1-31). Opcional: no todo ingreso tiene fecha
   *  fija. Solo se usa para rotular, nunca para calcular. */
  payDay?: number;
  createdAt: number;
}

export const FX_INCOME_MAX = 10;
export const FX_LABEL_MAX = 40;

/** Cota superior generosa pero finita: sin ella, un dedo torpe en el teclado
 *  numérico mete un importe de 15 cifras y la pantalla se descuadra sola. */
export const FX_AMOUNT_MAX = 100_000_000;
