/**
 * Looks: combinaciones completas de tema (paleta + fondo + gráfico) que se aplican
 * de un toque. Existen porque personalizar son 12 decisiones y la mayoría de la
 * gente solo quiere que su app se vea bien sin tomar ninguna.
 *
 * No son un modo aparte: un look ESCRIBE las mismas preferencias que los controles
 * finos. En cuanto se toca cualquier ajuste suelto, ya no coincide con ningún look y
 * la interfaz lo llama "A medida" — no hay estado oculto que se pueda desincronizar.
 */
import type { PaletteId, BackgroundStyle, ChartType, ChartAccent } from '../context/ThemeContext';

export interface Look {
  id: string;
  paletteId: PaletteId;
  /** Fondo por modo: un look se ve bien en claro y en oscuro, no solo en uno. */
  backgroundLight: BackgroundStyle;
  backgroundDark: BackgroundStyle;
  chartType: ChartType;
  chartAccent: ChartAccent;
}

export const LOOKS: Look[] = [
  {
    id: 'deepWater',
    paletteId: 'deepWater',
    backgroundLight: 'aurora', backgroundDark: 'aurora',
    chartType: 'area', chartAccent: 'theme',
  },
  {
    id: 'sunset',
    paletteId: 'sunset',
    backgroundLight: 'bokeh', backgroundDark: 'bokeh',
    chartType: 'line', chartAccent: 'gold',
  },
  {
    id: 'midnight',
    paletteId: 'midnight',
    backgroundLight: 'constellation', backgroundDark: 'starfield',
    chartType: 'dots', chartAccent: 'duoTertiary',
  },
  {
    id: 'jade',
    paletteId: 'jade',
    backgroundLight: 'topography', backgroundDark: 'topography',
    chartType: 'line', chartAccent: 'success',
  },
  {
    id: 'graphite',
    paletteId: 'graphite',
    backgroundLight: 'none', backgroundDark: 'none',
    chartType: 'area', chartAccent: 'signed',
  },
  {
    id: 'neon',
    paletteId: 'neon',
    backgroundLight: 'particles', backgroundDark: 'particles',
    chartType: 'dots', chartAccent: 'duoSuccess',
  },
];

/** El look activo, o `null` si la combinación actual no es ninguno ("A medida"). */
export function matchLook(current: {
  /** Puede ser una paleta propia; en ese caso no casa con ningún look. */
  paletteId: string;
  backgroundLight: BackgroundStyle;
  backgroundDark: BackgroundStyle;
  chartType: ChartType;
  chartAccent: ChartAccent;
}): Look | null {
  return LOOKS.find((l) => l.paletteId === current.paletteId
    && l.backgroundLight === current.backgroundLight
    && l.backgroundDark === current.backgroundDark
    && l.chartType === current.chartType
    && l.chartAccent === current.chartAccent) ?? null;
}
