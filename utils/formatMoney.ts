/**
 * Formato de dinero para el reporte entre amigos.
 *
 * La moneda es COP (el producto es colombiano) pero la agrupación sigue al idioma
 * ACTIVO de la app, igual que las fechas: en inglés o italiano los importes salían
 * con separadores españoles porque el locale estaba fijado a 'es-CO'.
 *
 * Existía tres veces copiado —pantalla, componente y generador de imagen—, que es
 * justo cómo se separaron antes lo que se veía y lo que se compartía.
 */
import { localeFor } from './dateLocale';

export function formatMoney(amount: number, lang?: string): string {
  return new Intl.NumberFormat(localeFor(lang), {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(Math.abs(amount));
}
