/**
 * Looks: combinaciones completas de tema (paleta + fondo + gráfico) que se aplican
 * de un toque. Existen porque personalizar son 12 decisiones y la mayoría de la
 * gente solo quiere que su app se vea bien sin tomar ninguna.
 *
 * No son un modo aparte: un look ESCRIBE las mismas preferencias que los controles
 * finos. En cuanto se toca cualquier ajuste suelto, ya no coincide con ningún look y
 * la interfaz lo llama "A medida" — no hay estado oculto que se pueda desincronizar.
 */
import type { PaletteId, BackgroundStyle, ChartType, ChartAccent, GradientStyle } from '../context/ThemeContext';

export interface Look {
  id: string;
  paletteId: PaletteId;
  /** Fondo por modo: un look se ve bien en claro y en oscuro, no solo en uno. */
  backgroundLight: BackgroundStyle;
  backgroundDark: BackgroundStyle;
  gradientStyle: GradientStyle;
  chartType: ChartType;
  chartAccent: ChartAccent;
}

export const LOOKS: Look[] = [
  {
    id: 'deepWater',
    paletteId: 'deepWater',
    backgroundLight: 'aurora', backgroundDark: 'aurora',
    gradientStyle: 'diagonal', chartType: 'area', chartAccent: 'theme',
  },
  {
    id: 'sunset',
    paletteId: 'sunset',
    backgroundLight: 'waves', backgroundDark: 'waves',
    gradientStyle: 'diagonal', chartType: 'line', chartAccent: 'gold',
  },
  {
    id: 'midnight',
    paletteId: 'midnight',
    backgroundLight: 'mesh', backgroundDark: 'starfield',
    gradientStyle: 'radial', chartType: 'dots', chartAccent: 'duoTertiary',
  },
  {
    id: 'jade',
    paletteId: 'jade',
    backgroundLight: 'topography', backgroundDark: 'topography',
    gradientStyle: 'linear', chartType: 'stepped', chartAccent: 'success',
  },
  {
    id: 'graphite',
    paletteId: 'graphite',
    backgroundLight: 'none', backgroundDark: 'spotlight',
    gradientStyle: 'flat', chartType: 'bars', chartAccent: 'signed',
  },
  {
    id: 'neon',
    paletteId: 'neon',
    backgroundLight: 'bokeh', backgroundDark: 'orbs',
    gradientStyle: 'diagonal', chartType: 'lollipop', chartAccent: 'duoSuccess',
  },
];

/** El look activo, o `null` si la combinación actual no es ninguno ("A medida"). */
export function matchLook(current: {
  /** Puede ser una paleta propia; en ese caso no casa con ningún look. */
  paletteId: string;
  backgroundLight: BackgroundStyle;
  backgroundDark: BackgroundStyle;
  gradientStyle: GradientStyle;
  chartType: ChartType;
  chartAccent: ChartAccent;
}): Look | null {
  return LOOKS.find((l) => l.paletteId === current.paletteId
    && l.backgroundLight === current.backgroundLight
    && l.backgroundDark === current.backgroundDark
    && l.gradientStyle === current.gradientStyle
    && l.chartType === current.chartType
    && l.chartAccent === current.chartAccent) ?? null;
}
