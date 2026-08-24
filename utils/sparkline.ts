/**
 * Puntos normalizados de un sparkline dentro de su viewBox.
 *
 * Vive aquí, fuera del componente, porque tenía un caso que se colaba sin que
 * nada lo comprobara: una serie CONSTANTE (un mes sin datos, todo a cero) caía
 * al borde INFERIOR del gráfico, así que "no hay datos" y "tu saldo está en el
 * suelo" se dibujaban exactamente igual. Una recta sin variación va al centro.
 */
export interface SparkPoint { x: number; y: number }

export function sparklinePoints(
  values: number[] | undefined | null,
  W: number,
  H: number,
  P: number,
): SparkPoint[] {
  if (!values || values.length < 2) return [];
  const xOf = (i: number) => (i / (values.length - 1)) * W;
  const min = Math.min(...values);
  const max = Math.max(...values);
  // Sin variación no hay arriba ni abajo: el centro es la única lectura honesta.
  if (max === min) return values.map((_, i) => ({ x: xOf(i), y: H / 2 }));
  const span = max - min;
  return values.map((v, i) => ({
    x: xOf(i),
    y: P + (1 - (v - min) / span) * (H - 2 * P),
  }));
}
