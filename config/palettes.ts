import { AppColors } from './colors';

export type PaletteId = 'deepWater' | 'sunset' | 'forest' | 'midnight' | 'rose' | 'ocean' | 'ember' | 'lavender' | 'slate'
  | 'sakura' | 'nordic' | 'cottonCandy' | 'peach' | 'mint' | 'aurora' | 'mocha'
  // Familias añadidas en v2.50: ninguna repite el tono dominante de las anteriores.
  | 'citrus' | 'graphite' | 'arctic' | 'jade' | 'sandstone' | 'neon' | 'moss'
  // Familia neón (v2.53): 16 de las 40 paletas anteriores eran cian o verde y no
  // había ninguna amarilla ni un azul saturado. Estas ocho cubren esos huecos con
  // saturación alta — su tono se generó por matiz y se ajustó por contraste medido.
  | 'cyberpunk' | 'electricViolet' | 'acidLime' | 'hotMagenta' | 'electricBlue' | 'tangerine' | 'infrared';

export interface PaletteDefinition {
  id: PaletteId;
  previewColors: [string, string, string];
  gradientDark: [string, string, string];
  gradientLight: [string, string, string];
  auroraBlobs: {
    dark: [string, string][];
    light: [string, string][];
  };
  colors: {
    light: AppColors;
    dark: AppColors & { surfaceOverlay: string };
  };
}

const FIXED_LIGHT = {
  error: '#EF4444', errorLight: '#FEE2E2',
  warning: '#F59E0B', warningLight: '#FEF3C7', warningDark: '#B45309',
  expense: '#FF6B6B', expenseLight: '#FFF0F0',
  achievement: '#F59E0B',
  overlay: 'rgba(0,0,0,0.45)', overlayLight: 'rgba(0,0,0,0.3)',
  textSecondary: '#6B7280', textTertiary: '#6E737C', textInverse: '#FFFFFF',
};

const FIXED_DARK = {
  error: '#F87171', errorLight: '#3D1515',
  warning: '#FBBF24', warningLight: '#2D1F00', warningDark: '#F59E0B',
  expense: '#FF8E8E', expenseLight: '#3D1515',
  achievement: '#FBBF24',
  overlay: 'rgba(0,0,0,0.65)', overlayLight: 'rgba(0,0,0,0.5)',
};

export const PALETTES: PaletteDefinition[] = [
  // ── Deep Water (default) ────────────────────────────────────────────────────
  {
    id: 'deepWater',
    previewColors: ['#00ACC1', '#00897B', '#C0CA33'],
    gradientDark: ['#0D1A1C', '#062830', '#003840'],
    gradientLight: ['#FFFFFF', '#F5F9FA', '#E0F7FA'],
    auroraBlobs: {
      dark:  [['#00BCD4','#006978'],['#0097A7','#004D5A'],['#00897B','#004D40'],['#26C6DA','#0097A7'],['#4DD0E1','#00838F'],['#009688','#00695C']],
      light: [['#B2EBF2','#80DEEA'],['#80DEEA','#4DD0E1'],['#B2DFDB','#80CBC4'],['#E0F7FA','#B2EBF2'],['#E0F2F1','#B2DFDB'],['#B2DFDB','#80CBC4']],
    },
    colors: {
      light: {
        primary: '#00ACC1', primaryLight: '#E0F7FA', primaryDark: '#00838F', onPrimary: '#FFFFFF',
        secondary: '#00897B', secondaryLight: '#E0F2F1', secondaryDark: '#005F56', onSecondary: '#FFFFFF',
        tertiary: '#C0CA33', tertiaryLight: '#F9FBE7', tertiaryDark: '#909A00', onTertiary: '#1A2428',
        success: '#00897B', successLight: '#E0F2F1',
        info: '#00ACC1', infoLight: '#E0F7FA',
        background: '#FFFFFF', backgroundSecondary: '#F0F7F8',
        surface: '#FFFFFF', surfaceSecondary: '#EEF4F5', surfaceElevated: '#F5F9FA',
        textPrimary: '#1A2428',
        border: '#DDE8EA', borderFocus: '#00ACC1',
        inputBackground: '#F5F9FA', inputBorder: '#D0DDE0',
        ...FIXED_LIGHT,
      },
      dark: {
        primary: '#00BCD4', primaryLight: '#003840', primaryDark: '#00ACC1', onPrimary: '#FFFFFF',
        secondary: '#00A896', secondaryLight: '#003330', secondaryDark: '#00897B', onSecondary: '#FFFFFF',
        tertiary: '#D4E157', tertiaryLight: '#2D3300', tertiaryDark: '#C0CA33', onTertiary: '#1A2428',
        success: '#00A896', successLight: '#003330',
        info: '#00BCD4', infoLight: '#003840',
        background: '#0D1A1C', backgroundSecondary: '#111F22',
        surface: '#162428', surfaceSecondary: '#1E2E32', surfaceElevated: '#1E3035', surfaceOverlay: '#253B42',
        textPrimary: '#EEF6F8', textSecondary: '#9EABAF', textTertiary: '#93A6AB', textInverse: '#1A2428',
        border: '#243438', borderFocus: '#00BCD4',
        inputBackground: '#1A2C30', inputBorder: '#2A3C40',
        ...FIXED_DARK,
      },
    },
  },
  // ── Sunset ──────────────────────────────────────────────────────────────────
  {
    id: 'sunset',
    previewColors: ['#F59E0B', '#EF4444', '#8B5CF6'],
    gradientDark: ['#1C0D00', '#2D1505', '#180C1A'],
    gradientLight: ['#FFFFFF', '#FFFBF0', '#FEF3C7'],
    auroraBlobs: {
      dark:  [['#F59E0B','#92400E'],['#EF4444','#7F1D1D'],['#D97706','#78350F'],['#FBBF24','#B45309'],['#F87171','#991B1B'],['#FCD34D','#92400E']],
      light: [['#FEF3C7','#FDE68A'],['#FEE2E2','#FECACA'],['#FEF9C3','#FEF08A'],['#FFF7ED','#FED7AA'],['#FCE7F3','#FBCFE8'],['#FEF3C7','#FDE68A']],
    },
    colors: {
      light: {
        primary: '#F59E0B', primaryLight: '#FEF3C7', primaryDark: '#D97706', onPrimary: '#FFFFFF',
        secondary: '#EF4444', secondaryLight: '#FEE2E2', secondaryDark: '#DC2626', onSecondary: '#FFFFFF',
        tertiary: '#8B5CF6', tertiaryLight: '#EDE9FE', tertiaryDark: '#7C3AED', onTertiary: '#FFFFFF',
        success: '#16A34A', successLight: '#DCFCE7',
        info: '#F59E0B', infoLight: '#FEF3C7',
        background: '#FFFFFF', backgroundSecondary: '#FFFBF0',
        surface: '#FFFFFF', surfaceSecondary: '#FEF9EC', surfaceElevated: '#FFFDF5',
        textPrimary: '#27180A',
        border: '#F0E0C4', borderFocus: '#F59E0B',
        inputBackground: '#FFFBF0', inputBorder: '#E8D5B0',
        ...FIXED_LIGHT,
        textSecondary: '#6B7280', textTertiary: '#6E737C', textInverse: '#FFFFFF',
      },
      dark: {
        primary: '#FBBF24', primaryLight: '#2D1F00', primaryDark: '#F59E0B', onPrimary: '#1A0F00',
        secondary: '#F87171', secondaryLight: '#3D1515', secondaryDark: '#EF4444', onSecondary: '#FFFFFF',
        tertiary: '#A78BFA', tertiaryLight: '#2E1065', tertiaryDark: '#8B5CF6', onTertiary: '#FFFFFF',
        success: '#22C55E', successLight: '#052E16',
        info: '#FBBF24', infoLight: '#2D1F00',
        background: '#1C0D00', backgroundSecondary: '#241200',
        surface: '#2D1800', surfaceSecondary: '#361D00', surfaceElevated: '#3D2100', surfaceOverlay: '#452500',
        textPrimary: '#FFF8F0', textSecondary: '#B09880', textTertiary: '#97816D', textInverse: '#1A0F00',
        border: '#4A3018', borderFocus: '#FBBF24',
        inputBackground: '#2D1800', inputBorder: '#4A3018',
        ...FIXED_DARK,
      },
    },
  },
  // ── Forest ──────────────────────────────────────────────────────────────────
  {
    id: 'forest',
    previewColors: ['#16A34A', '#0D9488', '#84CC16'],
    gradientDark: ['#0A1A0D', '#052E16', '#042F2E'],
    gradientLight: ['#FFFFFF', '#F0FDF4', '#DCFCE7'],
    auroraBlobs: {
      dark:  [['#22C55E','#14532D'],['#14B8A6','#134E4A'],['#16A34A','#052E16'],['#4ADE80','#15803D'],['#2DD4BF','#0F766E'],['#86EFAC','#166534']],
      light: [['#DCFCE7','#BBF7D0'],['#CCFBF1','#99F6E4'],['#D1FAE5','#A7F3D0'],['#F0FDF4','#DCFCE7'],['#CCFBF1','#99F6E4'],['#D1FAE5','#A7F3D0']],
    },
    colors: {
      light: {
        primary: '#16A34A', primaryLight: '#DCFCE7', primaryDark: '#15803D', onPrimary: '#FFFFFF',
        secondary: '#0D9488', secondaryLight: '#CCFBF1', secondaryDark: '#0F766E', onSecondary: '#FFFFFF',
        tertiary: '#84CC16', tertiaryLight: '#F7FEE7', tertiaryDark: '#65A30D', onTertiary: '#1A2E05',
        success: '#16A34A', successLight: '#DCFCE7',
        info: '#16A34A', infoLight: '#DCFCE7',
        background: '#FFFFFF', backgroundSecondary: '#F0FDF4',
        surface: '#FFFFFF', surfaceSecondary: '#ECFDF5', surfaceElevated: '#F0FDF4',
        textPrimary: '#0A2A15',
        border: '#BBF7D0', borderFocus: '#16A34A',
        inputBackground: '#F0FDF4', inputBorder: '#A7F3D0',
        ...FIXED_LIGHT,
      },
      dark: {
        primary: '#22C55E', primaryLight: '#052E16', primaryDark: '#16A34A', onPrimary: '#FFFFFF',
        secondary: '#14B8A6', secondaryLight: '#042F2E', secondaryDark: '#0D9488', onSecondary: '#FFFFFF',
        tertiary: '#A3E635', tertiaryLight: '#1A2E05', tertiaryDark: '#84CC16', onTertiary: '#0A1A05',
        success: '#22C55E', successLight: '#052E16',
        info: '#22C55E', infoLight: '#052E16',
        background: '#0A1A0D', backgroundSecondary: '#0E2214',
        surface: '#122A18', surfaceSecondary: '#18341F', surfaceElevated: '#1A3A22', surfaceOverlay: '#204828',
        textPrimary: '#EEF8F0', textSecondary: '#8FA898', textTertiary: '#769383', textInverse: '#0A1A0D',
        border: '#1A4025', borderFocus: '#22C55E',
        inputBackground: '#122A18', inputBorder: '#1E4A2A',
        ...FIXED_DARK,
      },
    },
  },
  // ── Midnight ────────────────────────────────────────────────────────────────
  {
    id: 'midnight',
    previewColors: ['#7C3AED', '#4F46E5', '#EC4899'],
    gradientDark: ['#0D0B1A', '#130D2C', '#1A0D26'],
    gradientLight: ['#FFFFFF', '#F5F3FF', '#EDE9FE'],
    auroraBlobs: {
      dark:  [['#A78BFA','#4C1D95'],['#818CF8','#312E81'],['#7C3AED','#2E1065'],['#C4B5FD','#6D28D9'],['#A5B4FC','#3730A3'],['#F472B6','#831843']],
      light: [['#EDE9FE','#DDD6FE'],['#E0E7FF','#C7D2FE'],['#F5F3FF','#EDE9FE'],['#FCE7F3','#FBCFE8'],['#EDE9FE','#DDD6FE'],['#E0E7FF','#C7D2FE']],
    },
    colors: {
      light: {
        primary: '#7C3AED', primaryLight: '#EDE9FE', primaryDark: '#6D28D9', onPrimary: '#FFFFFF',
        secondary: '#4F46E5', secondaryLight: '#E0E7FF', secondaryDark: '#4338CA', onSecondary: '#FFFFFF',
        tertiary: '#EC4899', tertiaryLight: '#FCE7F3', tertiaryDark: '#DB2777', onTertiary: '#FFFFFF',
        success: '#16A34A', successLight: '#DCFCE7',
        info: '#7C3AED', infoLight: '#EDE9FE',
        background: '#FFFFFF', backgroundSecondary: '#F5F3FF',
        surface: '#FFFFFF', surfaceSecondary: '#F0EDFF', surfaceElevated: '#F5F3FF',
        textPrimary: '#1A0A2E',
        border: '#DDD6FE', borderFocus: '#7C3AED',
        inputBackground: '#F5F3FF', inputBorder: '#C4B5FD',
        ...FIXED_LIGHT,
      },
      dark: {
        primary: '#A78BFA', primaryLight: '#2E1065', primaryDark: '#7C3AED', onPrimary: '#FFFFFF',
        secondary: '#818CF8', secondaryLight: '#1E1B4B', secondaryDark: '#4F46E5', onSecondary: '#FFFFFF',
        tertiary: '#F472B6', tertiaryLight: '#500724', tertiaryDark: '#EC4899', onTertiary: '#FFFFFF',
        success: '#4ADE80', successLight: '#052E16',
        info: '#A78BFA', infoLight: '#2E1065',
        background: '#0D0B1A', backgroundSecondary: '#120F22',
        surface: '#18142E', surfaceSecondary: '#1E1940', surfaceElevated: '#221E4A', surfaceOverlay: '#2A2458',
        textPrimary: '#F0EFF8', textSecondary: '#9B96AF', textTertiary: '#847D9E', textInverse: '#0D0B1A',
        border: '#2E2A52', borderFocus: '#A78BFA',
        inputBackground: '#18142E', inputBorder: '#2E2A52',
        ...FIXED_DARK,
      },
    },
  },
  // ── Rose ────────────────────────────────────────────────────────────────────
  {
    id: 'rose',
    previewColors: ['#E11D48', '#DB2777', '#F59E0B'],
    gradientDark: ['#1C0510', '#2D0A18', '#1C0D1C'],
    gradientLight: ['#FFFFFF', '#FFF1F2', '#FFE4E6'],
    auroraBlobs: {
      dark:  [['#FB7185','#881337'],['#F472B6','#831843'],['#E11D48','#4C0519'],['#FDA4AF','#BE123C'],['#FBCFE8','#9D174D'],['#FCD34D','#92400E']],
      light: [['#FFE4E6','#FECDD3'],['#FCE7F3','#FBCFE8'],['#FFF1F2','#FFE4E6'],['#FECDD3','#FDA4AF'],['#FCE7F3','#FBCFE8'],['#FFE4E6','#FECDD3']],
    },
    colors: {
      light: {
        primary: '#E11D48', primaryLight: '#FFE4E6', primaryDark: '#BE123C', onPrimary: '#FFFFFF',
        secondary: '#DB2777', secondaryLight: '#FCE7F3', secondaryDark: '#BE185D', onSecondary: '#FFFFFF',
        tertiary: '#F59E0B', tertiaryLight: '#FEF3C7', tertiaryDark: '#D97706', onTertiary: '#FFFFFF',
        success: '#16A34A', successLight: '#DCFCE7',
        info: '#E11D48', infoLight: '#FFE4E6',
        background: '#FFFFFF', backgroundSecondary: '#FFF1F2',
        surface: '#FFFFFF', surfaceSecondary: '#FFE4E6', surfaceElevated: '#FFF1F2',
        textPrimary: '#2D0A14',
        border: '#FECDD3', borderFocus: '#E11D48',
        inputBackground: '#FFF1F2', inputBorder: '#FDA4AF',
        ...FIXED_LIGHT,
      },
      dark: {
        primary: '#FB7185', primaryLight: '#4C0519', primaryDark: '#E11D48', onPrimary: '#FFFFFF',
        secondary: '#F472B6', secondaryLight: '#500724', secondaryDark: '#DB2777', onSecondary: '#FFFFFF',
        tertiary: '#FCD34D', tertiaryLight: '#2D1F00', tertiaryDark: '#F59E0B', onTertiary: '#1A0F00',
        success: '#4ADE80', successLight: '#052E16',
        info: '#FB7185', infoLight: '#4C0519',
        background: '#1C0510', backgroundSecondary: '#220818',
        surface: '#2D0A1E', surfaceSecondary: '#380D26', surfaceElevated: '#40102A', surfaceOverlay: '#4A1432',
        textPrimary: '#F8EEF0', textSecondary: '#B09498', textTertiary: '#99787F', textInverse: '#1C0510',
        border: '#4A1432', borderFocus: '#FB7185',
        inputBackground: '#2D0A1E', inputBorder: '#4A1432',
        ...FIXED_DARK,
      },
    },
  },
  // ── Ocean ───────────────────────────────────────────────────────────────────
  {
    id: 'ocean',
    previewColors: ['#0284C7', '#0369A1', '#06B6D4'],
    gradientDark: ['#0A0F1E', '#0D1830', '#091428'],
    gradientLight: ['#FFFFFF', '#F0F9FF', '#E0F2FE'],
    auroraBlobs: {
      dark:  [['#38BDF8','#0C2D48'],['#60A5FA','#1E3A5F'],['#22D3EE','#083344'],['#7DD3FC','#0369A1'],['#93C5FD','#1D4ED8'],['#34D399','#065F46']],
      light: [['#BAE6FD','#7DD3FC'],['#BFDBFE','#93C5FD'],['#CFFAFE','#A5F3FC'],['#E0F2FE','#BAE6FD'],['#DBEAFE','#BFDBFE'],['#BAE6FD','#7DD3FC']],
    },
    colors: {
      light: {
        primary: '#0284C7', primaryLight: '#E0F2FE', primaryDark: '#0369A1', onPrimary: '#FFFFFF',
        secondary: '#0369A1', secondaryLight: '#DBEAFE', secondaryDark: '#1E40AF', onSecondary: '#FFFFFF',
        tertiary: '#06B6D4', tertiaryLight: '#CFFAFE', tertiaryDark: '#0E7490', onTertiary: '#FFFFFF',
        success: '#16A34A', successLight: '#DCFCE7',
        info: '#0284C7', infoLight: '#E0F2FE',
        background: '#FFFFFF', backgroundSecondary: '#F0F9FF',
        surface: '#FFFFFF', surfaceSecondary: '#E0F2FE', surfaceElevated: '#F0F9FF',
        textPrimary: '#0A1628',
        border: '#BAE6FD', borderFocus: '#0284C7',
        inputBackground: '#F0F9FF', inputBorder: '#BAE6FD',
        ...FIXED_LIGHT,
      },
      dark: {
        primary: '#38BDF8', primaryLight: '#0C2D48', primaryDark: '#0284C7', onPrimary: '#FFFFFF',
        secondary: '#60A5FA', secondaryLight: '#1E3A5F', secondaryDark: '#3B82F6', onSecondary: '#FFFFFF',
        tertiary: '#22D3EE', tertiaryLight: '#083344', tertiaryDark: '#06B6D4', onTertiary: '#FFFFFF',
        success: '#22C55E', successLight: '#052E16',
        info: '#38BDF8', infoLight: '#0C2D48',
        background: '#0A0F1E', backgroundSecondary: '#0D1528',
        surface: '#101E34', surfaceSecondary: '#162540', surfaceElevated: '#1A2E4A', surfaceOverlay: '#1E3558',
        textPrimary: '#EDF4FF', textSecondary: '#8BAABF', textTertiary: '#6889AA', textInverse: '#0A0F1E',
        border: '#1A3050', borderFocus: '#38BDF8',
        inputBackground: '#101E34', inputBorder: '#1A3050',
        ...FIXED_DARK,
      },
    },
  },
  // ── Ember ───────────────────────────────────────────────────────────────────
  {
    id: 'ember',
    previewColors: ['#DC2626', '#EA580C', '#FBBF24'],
    gradientDark: ['#1A0808', '#2D0D0D', '#2A1005'],
    gradientLight: ['#FFFFFF', '#FEF2F2', '#FFEDD5'],
    auroraBlobs: {
      dark:  [['#F87171','#450A0A'],['#FB923C','#431407'],['#DC2626','#7F1D1D'],['#FCA5A5','#B91C1C'],['#FCD34D','#92400E'],['#FDBA74','#C2410C']],
      light: [['#FEE2E2','#FECACA'],['#FFEDD5','#FED7AA'],['#FEF9C3','#FEF08A'],['#FEF2F2','#FEE2E2'],['#FFF7ED','#FFEDD5'],['#FEE2E2','#FECACA']],
    },
    colors: {
      light: {
        primary: '#DC2626', primaryLight: '#FEE2E2', primaryDark: '#B91C1C', onPrimary: '#FFFFFF',
        secondary: '#EA580C', secondaryLight: '#FFEDD5', secondaryDark: '#C2410C', onSecondary: '#FFFFFF',
        tertiary: '#FBBF24', tertiaryLight: '#FEF3C7', tertiaryDark: '#D97706', onTertiary: '#FFFFFF',
        success: '#16A34A', successLight: '#DCFCE7',
        info: '#DC2626', infoLight: '#FEE2E2',
        background: '#FFFFFF', backgroundSecondary: '#FEF2F2',
        surface: '#FFFFFF', surfaceSecondary: '#FEE2E2', surfaceElevated: '#FEF2F2',
        textPrimary: '#2A0808',
        border: '#FECACA', borderFocus: '#DC2626',
        inputBackground: '#FEF2F2', inputBorder: '#FECACA',
        ...FIXED_LIGHT,
      },
      dark: {
        primary: '#F87171', primaryLight: '#450A0A', primaryDark: '#DC2626', onPrimary: '#FFFFFF',
        secondary: '#FB923C', secondaryLight: '#431407', secondaryDark: '#EA580C', onSecondary: '#FFFFFF',
        tertiary: '#FCD34D', tertiaryLight: '#2D1F00', tertiaryDark: '#FBBF24', onTertiary: '#1A0F00',
        success: '#4ADE80', successLight: '#052E16',
        info: '#F87171', infoLight: '#450A0A',
        background: '#1A0808', backgroundSecondary: '#220D0D',
        surface: '#2D1010', surfaceSecondary: '#381515', surfaceElevated: '#401818', surfaceOverlay: '#4A1C1C',
        textPrimary: '#F8EEEE', textSecondary: '#B09090', textTertiary: '#A27777', textInverse: '#1A0808',
        border: '#4A1818', borderFocus: '#F87171',
        inputBackground: '#2D1010', inputBorder: '#4A1818',
        ...FIXED_DARK,
      },
    },
  },
  // ── Lavender ────────────────────────────────────────────────────────────────
  {
    id: 'lavender',
    previewColors: ['#9333EA', '#C084FC', '#818CF8'],
    gradientDark: ['#0F0B1E', '#1A0F2E', '#140B28'],
    gradientLight: ['#FFFFFF', '#FAF5FF', '#F3E8FF'],
    auroraBlobs: {
      dark:  [['#C084FC','#3B0764'],['#A78BFA','#2E1065'],['#9333EA','#4C1D95'],['#DDD6FE','#7E22CE'],['#E879F9','#701A75'],['#F0ABFC','#86198F']],
      light: [['#F3E8FF','#E9D5FF'],['#EDE9FE','#DDD6FE'],['#FAF5FF','#F3E8FF'],['#FCE7F3','#FBCFE8'],['#F3E8FF','#E9D5FF'],['#EDE9FE','#DDD6FE']],
    },
    colors: {
      light: {
        primary: '#9333EA', primaryLight: '#F3E8FF', primaryDark: '#7E22CE', onPrimary: '#FFFFFF',
        secondary: '#7C3AED', secondaryLight: '#EDE9FE', secondaryDark: '#6D28D9', onSecondary: '#FFFFFF',
        tertiary: '#C084FC', tertiaryLight: '#F5F3FF', tertiaryDark: '#A855F7', onTertiary: '#FFFFFF',
        success: '#16A34A', successLight: '#DCFCE7',
        info: '#9333EA', infoLight: '#F3E8FF',
        background: '#FFFFFF', backgroundSecondary: '#FAF5FF',
        surface: '#FFFFFF', surfaceSecondary: '#F3E8FF', surfaceElevated: '#FAF5FF',
        textPrimary: '#1E0A2E',
        border: '#E9D5FF', borderFocus: '#9333EA',
        inputBackground: '#FAF5FF', inputBorder: '#D8B4FE',
        ...FIXED_LIGHT,
      },
      dark: {
        primary: '#C084FC', primaryLight: '#3B0764', primaryDark: '#9333EA', onPrimary: '#FFFFFF',
        secondary: '#A78BFA', secondaryLight: '#2E1065', secondaryDark: '#7C3AED', onSecondary: '#FFFFFF',
        tertiary: '#E879F9', tertiaryLight: '#4A044E', tertiaryDark: '#D946EF', onTertiary: '#FFFFFF',
        success: '#4ADE80', successLight: '#052E16',
        info: '#C084FC', infoLight: '#3B0764',
        background: '#0F0B1E', backgroundSecondary: '#160F28',
        surface: '#1E1430', surfaceSecondary: '#261A3C', surfaceElevated: '#2C1E44', surfaceOverlay: '#34244E',
        textPrimary: '#F3EEFF', textSecondary: '#A890C8', textTertiary: '#9175BA', textInverse: '#0F0B1E',
        border: '#3A2460', borderFocus: '#C084FC',
        inputBackground: '#1E1430', inputBorder: '#3A2460',
        ...FIXED_DARK,
      },
    },
  },
  // ── Slate ───────────────────────────────────────────────────────────────────
  {
    id: 'slate',
    previewColors: ['#3B82F6', '#64748B', '#06B6D4'],
    gradientDark: ['#0B1015', '#131C24', '#0F1A22'],
    gradientLight: ['#FFFFFF', '#F1F5F9', '#E2E8F0'],
    auroraBlobs: {
      dark:  [['#60A5FA','#1E3A5F'],['#94A3B8','#1E293B'],['#22D3EE','#083344'],['#93C5FD','#1D4ED8'],['#BAE6FD','#0369A1'],['#7DD3FC','#0C4A6E']],
      light: [['#DBEAFE','#BFDBFE'],['#E2E8F0','#CBD5E1'],['#CFFAFE','#A5F3FC'],['#EFF6FF','#DBEAFE'],['#F1F5F9','#E2E8F0'],['#DBEAFE','#BFDBFE']],
    },
    colors: {
      light: {
        primary: '#3B82F6', primaryLight: '#DBEAFE', primaryDark: '#2563EB', onPrimary: '#FFFFFF',
        secondary: '#64748B', secondaryLight: '#F1F5F9', secondaryDark: '#475569', onSecondary: '#FFFFFF',
        tertiary: '#06B6D4', tertiaryLight: '#CFFAFE', tertiaryDark: '#0E7490', onTertiary: '#FFFFFF',
        success: '#16A34A', successLight: '#DCFCE7',
        info: '#3B82F6', infoLight: '#DBEAFE',
        background: '#FFFFFF', backgroundSecondary: '#F1F5F9',
        surface: '#FFFFFF', surfaceSecondary: '#E2E8F0', surfaceElevated: '#F1F5F9',
        textPrimary: '#0F172A',
        border: '#CBD5E1', borderFocus: '#3B82F6',
        inputBackground: '#F1F5F9', inputBorder: '#CBD5E1',
        ...FIXED_LIGHT,
      },
      dark: {
        primary: '#60A5FA', primaryLight: '#1E3A5F', primaryDark: '#3B82F6', onPrimary: '#FFFFFF',
        secondary: '#94A3B8', secondaryLight: '#1E293B', secondaryDark: '#64748B', onSecondary: '#FFFFFF',
        tertiary: '#22D3EE', tertiaryLight: '#083344', tertiaryDark: '#06B6D4', onTertiary: '#FFFFFF',
        success: '#22C55E', successLight: '#052E16',
        info: '#60A5FA', infoLight: '#1E3A5F',
        background: '#0B1015', backgroundSecondary: '#101820',
        surface: '#162030', surfaceSecondary: '#1C2A3C', surfaceElevated: '#203040', surfaceOverlay: '#253848',
        textPrimary: '#EFF3F8', textSecondary: '#8899B0', textTertiary: '#738AA2', textInverse: '#0B1015',
        border: '#1C2E42', borderFocus: '#60A5FA',
        inputBackground: '#162030', inputBorder: '#1C2E42',
        ...FIXED_DARK,
      },
    },
  },
  // ── Deep Water Pastel ───────────────────────────────────────────────────────
  // ── Sunset Pastel ───────────────────────────────────────────────────────────
  // ── Forest Pastel ────────────────────────────────────────────────────────────
  // ── Midnight Pastel ─────────────────────────────────────────────────────────
  // ── Rose Pastel ──────────────────────────────────────────────────────────────
  // ── Ocean Pastel ─────────────────────────────────────────────────────────────
  // ── Ember Pastel ─────────────────────────────────────────────────────────────
  // ── Lavender Pastel ──────────────────────────────────────────────────────────
  // ── Slate Pastel ─────────────────────────────────────────────────────────────
  // ── Sakura ───────────────────────────────────────────────────────────────────
  {
    id: 'sakura',
    previewColors: ['#F472B6', '#EC4899', '#FDE68A'],
    gradientDark: ['#1C050F', '#2D0A1E', '#1C0D10'],
    gradientLight: ['#FFFFFF', '#FFF5FB', '#FFF0F8'],
    auroraBlobs: {
      dark:  [['#F472B6','#831843'],['#EC4899','#831843'],['#F9A8D4','#9D174D'],['#FBCFE8','#BE185D'],['#FDA4AF','#881337'],['#FCD34D','#92400E']],
      light: [['#FECDD3','#FCA5A5'],['#FCE7F3','#FBCFE8'],['#FFF1F2','#FFE4E6'],['#FDE8F5','#FBD0EE'],['#FCE7F3','#FBCFE8'],['#FFE4E6','#FECDD3']],
    },
    colors: {
      light: {
        primary: '#F472B6', primaryLight: '#FCE7F3', primaryDark: '#EC4899', onPrimary: '#FFFFFF',
        secondary: '#EC4899', secondaryLight: '#FCE7F3', secondaryDark: '#DB2777', onSecondary: '#FFFFFF',
        tertiary: '#FDE68A', tertiaryLight: '#FEF9C3', tertiaryDark: '#FCD34D', onTertiary: '#FFFFFF',
        success: '#16A34A', successLight: '#DCFCE7',
        info: '#F472B6', infoLight: '#FCE7F3',
        background: '#FFFFFF', backgroundSecondary: '#FFF5FB',
        surface: '#FFFFFF', surfaceSecondary: '#FFF0F8', surfaceElevated: '#FFF5FB',
        textPrimary: '#2D0A18',
        border: '#FBCFE8', borderFocus: '#F472B6',
        inputBackground: '#FFF5FB', inputBorder: '#FBCFE8',
        ...FIXED_LIGHT,
      },
      dark: {
        primary: '#F9A8D4', primaryLight: '#500724', primaryDark: '#F472B6', onPrimary: '#FFFFFF',
        secondary: '#F472B6', secondaryLight: '#500724', secondaryDark: '#EC4899', onSecondary: '#FFFFFF',
        tertiary: '#FCD34D', tertiaryLight: '#2D1F00', tertiaryDark: '#FBBF24', onTertiary: '#1A0F00',
        success: '#4ADE80', successLight: '#052E16',
        info: '#F9A8D4', infoLight: '#500724',
        background: '#1C050F', backgroundSecondary: '#220818',
        surface: '#2D0A1E', surfaceSecondary: '#38102A', surfaceElevated: '#401330', surfaceOverlay: '#4A1838',
        textPrimary: '#F8EEF4', textSecondary: '#B09098', textTertiary: '#99787F', textInverse: '#1C050F',
        border: '#4A1432', borderFocus: '#F9A8D4',
        inputBackground: '#2D0A1E', inputBorder: '#4A1432',
        ...FIXED_DARK,
      },
    },
  },
  // ── Nordic ───────────────────────────────────────────────────────────────────
  {
    id: 'nordic',
    previewColors: ['#64A8C8', '#8DA8C0', '#94BFDE'],
    gradientDark: ['#080E14', '#0C1520', '#0A1018'],
    gradientLight: ['#FFFFFF', '#F0F6FA', '#E8F2F8'],
    auroraBlobs: {
      dark:  [['#64A8C8','#0C2D48'],['#8DA8C0','#1E293B'],['#5B8DB0','#1E3A5F'],['#7DD3FC','#0369A1'],['#93C5FD','#1D4ED8'],['#22D3EE','#083344']],
      light: [['#BAE6FD','#7DD3FC'],['#CBD5E1','#94A3B8'],['#BFDBFE','#93C5FD'],['#E0F2FE','#BAE6FD'],['#DBEAFE','#BFDBFE'],['#BAE6FD','#7DD3FC']],
    },
    colors: {
      light: {
        primary: '#4A90B8', primaryLight: '#E0F2FE', primaryDark: '#2E6F94', onPrimary: '#FFFFFF',
        secondary: '#6B8FA8', secondaryLight: '#E2ECF2', secondaryDark: '#4A6E84', onSecondary: '#FFFFFF',
        tertiary: '#5BAACC', tertiaryLight: '#CFFAFE', tertiaryDark: '#3D8AA8', onTertiary: '#FFFFFF',
        success: '#16A34A', successLight: '#DCFCE7',
        info: '#4A90B8', infoLight: '#E0F2FE',
        background: '#FFFFFF', backgroundSecondary: '#F0F6FA',
        surface: '#FFFFFF', surfaceSecondary: '#E8F2F8', surfaceElevated: '#F0F6FA',
        textPrimary: '#0A1828',
        border: '#BDD6E8', borderFocus: '#4A90B8',
        inputBackground: '#F0F6FA', inputBorder: '#BDD6E8',
        ...FIXED_LIGHT,
      },
      dark: {
        primary: '#64A8C8', primaryLight: '#0C2540', primaryDark: '#4A90B8', onPrimary: '#FFFFFF',
        secondary: '#8DA8C0', secondaryLight: '#0C1C2A', secondaryDark: '#6B8FA8', onSecondary: '#FFFFFF',
        tertiary: '#7AC5DF', tertiaryLight: '#082840', tertiaryDark: '#5BAACC', onTertiary: '#FFFFFF',
        success: '#22C55E', successLight: '#052E16',
        info: '#64A8C8', infoLight: '#0C2540',
        background: '#080E14', backgroundSecondary: '#0C1520',
        surface: '#10202E', surfaceSecondary: '#162838', surfaceElevated: '#1C3040', surfaceOverlay: '#223848',
        textPrimary: '#EDF4F8', textSecondary: '#8AABBD', textTertiary: '#688AAA', textInverse: '#080E14',
        border: '#1A3040', borderFocus: '#64A8C8',
        inputBackground: '#10202E', inputBorder: '#1A3040',
        ...FIXED_DARK,
      },
    },
  },
  // ── Cotton Candy ─────────────────────────────────────────────────────────────
  {
    id: 'cottonCandy',
    previewColors: ['#F9A8D4', '#93C5FD', '#A5F3FC'],
    gradientDark: ['#140A18', '#1A0F20', '#100C18'],
    gradientLight: ['#FFFFFF', '#FFF8FD', '#FFF0FB'],
    auroraBlobs: {
      dark:  [['#F9A8D4','#831843'],['#93C5FD','#1D4ED8'],['#A5F3FC','#0E7490'],['#FBCFE8','#9D174D'],['#BFDBFE','#2563EB'],['#67E8F9','#0891B2']],
      light: [['#FBCFE8','#F9A8D4'],['#BFDBFE','#93C5FD'],['#CFFAFE','#A5F3FC'],['#FCE7F3','#FBCFE8'],['#DBEAFE','#BFDBFE'],['#A5F3FC','#67E8F9']],
    },
    colors: {
      light: {
        primary: '#F9A8D4', primaryLight: '#FCE7F3', primaryDark: '#F472B6', onPrimary: '#FFFFFF',
        secondary: '#93C5FD', secondaryLight: '#DBEAFE', secondaryDark: '#60A5FA', onSecondary: '#FFFFFF',
        tertiary: '#A5F3FC', tertiaryLight: '#CFFAFE', tertiaryDark: '#67E8F9', onTertiary: '#FFFFFF',
        success: '#16A34A', successLight: '#DCFCE7',
        info: '#93C5FD', infoLight: '#DBEAFE',
        background: '#FFFAFF', backgroundSecondary: '#FFF5FD',
        surface: '#FFFFFF', surfaceSecondary: '#FFEFFE', surfaceElevated: '#FFF8FF',
        textPrimary: '#1E1028',
        border: '#FBCFE8', borderFocus: '#F9A8D4',
        inputBackground: '#FFF8FF', inputBorder: '#FBCFE8',
        ...FIXED_LIGHT,
      },
      dark: {
        primary: '#F9A8D4', primaryLight: '#4A1035', primaryDark: '#F472B6', onPrimary: '#FFFFFF',
        secondary: '#93C5FD', secondaryLight: '#1E3A5F', secondaryDark: '#60A5FA', onSecondary: '#FFFFFF',
        tertiary: '#A5F3FC', tertiaryLight: '#0C3040', tertiaryDark: '#67E8F9', onTertiary: '#FFFFFF',
        success: '#4ADE80', successLight: '#052E16',
        info: '#93C5FD', infoLight: '#1E3A5F',
        background: '#140A18', backgroundSecondary: '#1A1020',
        surface: '#221530', surfaceSecondary: '#2A1C3A', surfaceElevated: '#302040', surfaceOverlay: '#38264A',
        textPrimary: '#F5EEF8', textSecondary: '#A890B8', textTertiary: '#8F7BAA', textInverse: '#140A18',
        border: '#38205A', borderFocus: '#F9A8D4',
        inputBackground: '#221530', inputBorder: '#38205A',
        ...FIXED_DARK,
      },
    },
  },
  // ── Peach ────────────────────────────────────────────────────────────────────
  {
    id: 'peach',
    previewColors: ['#FDBA74', '#FDE68A', '#FCA5A5'],
    gradientDark: ['#1A0E05', '#251508', '#1C1005'],
    gradientLight: ['#FFFFFF', '#FFFAF5', '#FFF5EE'],
    auroraBlobs: {
      dark:  [['#FDBA74','#92400E'],['#FCD34D','#78350F'],['#FCA5A5','#7F1D1D'],['#FED7AA','#C2410C'],['#FDE68A','#B45309'],['#FDBA74','#92400E']],
      light: [['#FED7AA','#FDBA74'],['#FDE68A','#FCD34D'],['#FECACA','#FCA5A5'],['#FFF7ED','#FED7AA'],['#FEF9C3','#FDE68A'],['#FFEDD5','#FED7AA']],
    },
    colors: {
      light: {
        primary: '#FB923C', primaryLight: '#FFEDD5', primaryDark: '#EA580C', onPrimary: '#FFFFFF',
        secondary: '#FBBF24', secondaryLight: '#FEF3C7', secondaryDark: '#F59E0B', onSecondary: '#FFFFFF',
        tertiary: '#F87171', tertiaryLight: '#FEE2E2', tertiaryDark: '#EF4444', onTertiary: '#FFFFFF',
        success: '#16A34A', successLight: '#DCFCE7',
        info: '#FB923C', infoLight: '#FFEDD5',
        background: '#FFFBF7', backgroundSecondary: '#FFF7EE',
        surface: '#FFFFFF', surfaceSecondary: '#FFF3E8', surfaceElevated: '#FFFAF5',
        textPrimary: '#2A1205',
        border: '#FED7AA', borderFocus: '#FB923C',
        inputBackground: '#FFFAF5', inputBorder: '#FED7AA',
        ...FIXED_LIGHT,
      },
      dark: {
        primary: '#FDBA74', primaryLight: '#431407', primaryDark: '#FB923C', onPrimary: '#1A0800',
        secondary: '#FCD34D', secondaryLight: '#2D1F00', secondaryDark: '#FBBF24', onSecondary: '#1A0800',
        tertiary: '#FCA5A5', tertiaryLight: '#3D1515', tertiaryDark: '#F87171', onTertiary: '#FFFFFF',
        success: '#4ADE80', successLight: '#052E16',
        info: '#FDBA74', infoLight: '#431407',
        background: '#1A0E05', backgroundSecondary: '#221408',
        surface: '#2D1A08', surfaceSecondary: '#382010', surfaceElevated: '#402515', surfaceOverlay: '#4A2C1A',
        textPrimary: '#F8F0E8', textSecondary: '#B0988A', textTertiary: '#A17F74', textInverse: '#1A0E05',
        border: '#4A2810', borderFocus: '#FDBA74',
        inputBackground: '#2D1A08', inputBorder: '#4A2810',
        ...FIXED_DARK,
      },
    },
  },
  // ── Sakura Pastel ────────────────────────────────────────────────────────────
  // ── Nordic Pastel ─────────────────────────────────────────────────────────────
  // ── Cotton Candy Pastel ───────────────────────────────────────────────────────
  // ── Peach Pastel ─────────────────────────────────────────────────────────────
  // ── Mint ─────────────────────────────────────────────────────────────────────
  {
    id: 'mint',
    previewColors: ['#10B981', '#059669', '#34D399'],
    gradientDark: ['#051A10', '#082E1C', '#0A3820'],
    gradientLight: ['#FFFFFF', '#F0FDF9', '#DCFFF0'],
    auroraBlobs: {
      dark:  [['#10B981','#064E3B'],['#059669','#022C22'],['#34D399','#065F46'],['#6EE7B7','#047857'],['#A7F3D0','#059669'],['#4ADE80','#14532D']],
      light: [['#A7F3D0','#6EE7B7'],['#DCFCE7','#BBF7D0'],['#D1FAE5','#A7F3D0'],['#ECFDF5','#D1FAE5'],['#DCFFF0','#A7F3D0'],['#BBF7D0','#86EFAC']],
    },
    colors: {
      light: {
        primary: '#10B981', primaryLight: '#D1FAE5', primaryDark: '#059669', onPrimary: '#FFFFFF',
        secondary: '#059669', secondaryLight: '#DCFCE7', secondaryDark: '#047857', onSecondary: '#FFFFFF',
        tertiary: '#34D399', tertiaryLight: '#ECFDF5', tertiaryDark: '#10B981', onTertiary: '#FFFFFF',
        success: '#10B981', successLight: '#D1FAE5',
        info: '#10B981', infoLight: '#D1FAE5',
        background: '#FFFFFF', backgroundSecondary: '#F0FDF9',
        surface: '#FFFFFF', surfaceSecondary: '#ECFDF5', surfaceElevated: '#F0FDF9',
        textPrimary: '#052E1C',
        border: '#A7F3D0', borderFocus: '#10B981',
        inputBackground: '#F0FDF9', inputBorder: '#6EE7B7',
        ...FIXED_LIGHT,
      },
      dark: {
        primary: '#34D399', primaryLight: '#022C22', primaryDark: '#10B981', onPrimary: '#FFFFFF',
        secondary: '#10B981', secondaryLight: '#052E1C', secondaryDark: '#059669', onSecondary: '#FFFFFF',
        tertiary: '#6EE7B7', tertiaryLight: '#022C22', tertiaryDark: '#34D399', onTertiary: '#052E1C',
        success: '#34D399', successLight: '#022C22',
        info: '#34D399', infoLight: '#022C22',
        background: '#051A10', backgroundSecondary: '#082018',
        surface: '#0A2E1C', surfaceSecondary: '#0E3A24', surfaceElevated: '#12402A', surfaceOverlay: '#164E32',
        textPrimary: '#EDFFF6', textSecondary: '#7EC8A4', textTertiary: '#4F9E77', textInverse: '#051A10',
        border: '#123A24', borderFocus: '#34D399',
        inputBackground: '#0A2E1C', inputBorder: '#123A24',
        ...FIXED_DARK,
      },
    },
  },
  // ── Mint Pastel ───────────────────────────────────────────────────────────────
  // ── Aurora ────────────────────────────────────────────────────────────────────
  {
    id: 'aurora',
    previewColors: ['#06B6D4', '#7C3AED', '#22C55E'],
    gradientDark: ['#060A14', '#080C1A', '#050C10'],
    gradientLight: ['#FFFFFF', '#F0FDFF', '#F5F3FF'],
    auroraBlobs: {
      dark:  [['#06B6D4','#0C2D48'],['#7C3AED','#2E1065'],['#22C55E','#052E16'],['#22D3EE','#083344'],['#A78BFA','#4C1D95'],['#4ADE80','#14532D']],
      light: [['#CFFAFE','#A5F3FC'],['#EDE9FE','#DDD6FE'],['#DCFCE7','#BBF7D0'],['#E0F7FF','#CFFAFE'],['#F0EDFF','#DDD6FE'],['#D1FAE5','#A7F3D0']],
    },
    colors: {
      light: {
        primary: '#06B6D4', primaryLight: '#CFFAFE', primaryDark: '#0891B2', onPrimary: '#FFFFFF',
        secondary: '#7C3AED', secondaryLight: '#EDE9FE', secondaryDark: '#6D28D9', onSecondary: '#FFFFFF',
        tertiary: '#22C55E', tertiaryLight: '#DCFCE7', tertiaryDark: '#16A34A', onTertiary: '#FFFFFF',
        success: '#22C55E', successLight: '#DCFCE7',
        info: '#06B6D4', infoLight: '#CFFAFE',
        background: '#FFFFFF', backgroundSecondary: '#F0FDFF',
        surface: '#FFFFFF', surfaceSecondary: '#E8FAFF', surfaceElevated: '#F0FDFF',
        textPrimary: '#050A14',
        border: '#A5F3FC', borderFocus: '#06B6D4',
        inputBackground: '#F0FDFF', inputBorder: '#67E8F9',
        ...FIXED_LIGHT,
      },
      dark: {
        primary: '#22D3EE', primaryLight: '#083344', primaryDark: '#06B6D4', onPrimary: '#FFFFFF',
        secondary: '#A78BFA', secondaryLight: '#2E1065', secondaryDark: '#7C3AED', onSecondary: '#FFFFFF',
        tertiary: '#4ADE80', tertiaryLight: '#052E16', tertiaryDark: '#22C55E', onTertiary: '#052E16',
        success: '#4ADE80', successLight: '#052E16',
        info: '#22D3EE', infoLight: '#083344',
        background: '#060A14', backgroundSecondary: '#0A1020',
        surface: '#0E1A2E', surfaceSecondary: '#14223C', surfaceElevated: '#182A44', surfaceOverlay: '#1C324C',
        textPrimary: '#EDFAFF', textSecondary: '#7AACBF', textTertiary: '#5489A4', textInverse: '#060A14',
        border: '#0E2840', borderFocus: '#22D3EE',
        inputBackground: '#0E1A2E', inputBorder: '#0E2840',
        ...FIXED_DARK,
      },
    },
  },
  // ── Aurora Pastel ─────────────────────────────────────────────────────────────
  // ── Mocha ─────────────────────────────────────────────────────────────────────
  {
    id: 'mocha',
    previewColors: ['#92400E', '#D97706', '#FBBF24'],
    gradientDark: ['#140805', '#1E0E08', '#1A0C05'],
    gradientLight: ['#FFFFFF', '#FEF3E8', '#FDE8D0'],
    auroraBlobs: {
      dark:  [['#B45309','#451A03'],['#92400E','#3B1504'],['#78350F','#2C1104'],['#D97706','#7C2D12'],['#FBBF24','#B45309'],['#F59E0B','#92400E']],
      light: [['#FDE8D0','#FCD9B0'],['#FEF3C7','#FDE68A'],['#FFEDD5','#FED7AA'],['#FEF9F0','#FDE8D0'],['#FFF7ED','#FFEDD5'],['#FDE8D0','#FCD9B0']],
    },
    colors: {
      light: {
        primary: '#92400E', primaryLight: '#FDE8D0', primaryDark: '#78350F', onPrimary: '#FFFFFF',
        secondary: '#D97706', secondaryLight: '#FEF3C7', secondaryDark: '#B45309', onSecondary: '#FFFFFF',
        tertiary: '#FBBF24', tertiaryLight: '#FEF9C3', tertiaryDark: '#F59E0B', onTertiary: '#FFFFFF',
        success: '#16A34A', successLight: '#DCFCE7',
        info: '#92400E', infoLight: '#FDE8D0',
        background: '#FFFCF8', backgroundSecondary: '#FEF5EC',
        surface: '#FFFFFF', surfaceSecondary: '#FEF0E2', surfaceElevated: '#FEF5EC',
        textPrimary: '#2C1206',
        border: '#FCD9B0', borderFocus: '#92400E',
        inputBackground: '#FEF5EC', inputBorder: '#FCD9B0',
        ...FIXED_LIGHT,
      },
      dark: {
        primary: '#D97706', primaryLight: '#451A03', primaryDark: '#B45309', onPrimary: '#FFFFFF',
        secondary: '#B45309', secondaryLight: '#3B1504', secondaryDark: '#92400E', onSecondary: '#FFFFFF',
        tertiary: '#FBBF24', tertiaryLight: '#2D1F00', tertiaryDark: '#F59E0B', onTertiary: '#1A0F00',
        success: '#4ADE80', successLight: '#052E16',
        info: '#D97706', infoLight: '#451A03',
        background: '#140805', backgroundSecondary: '#1C0E08',
        surface: '#28140A', surfaceSecondary: '#341A0E', surfaceElevated: '#3C2010', surfaceOverlay: '#442614',
        textPrimary: '#F8F0E8', textSecondary: '#B09070', textTertiary: '#A67857', textInverse: '#140805',
        border: '#442010', borderFocus: '#D97706',
        inputBackground: '#28140A', inputBorder: '#442010',
        ...FIXED_DARK,
      },
    },
  },
  // ── Mocha Pastel ─────────────────────────────────────────────────────────────
  // ── Citrus ──────────────────────────────────────────────────────────────────
  {
    id: 'citrus',
    previewColors: ['#84CC16', '#EAB308', '#F97316'],
    gradientDark: ['#0F1405', '#1A2408', '#24330A'],
    gradientLight: ['#FFFFFF', '#FBFEF3', '#F2FCE0'],
    auroraBlobs: {
      dark:  [['#84CC16','#3F6212'],['#A3E635','#4D7C0F'],['#EAB308','#854D0E'],['#65A30D','#365314'],['#FACC15','#A16207'],['#F97316','#9A3412']],
      light: [['#ECFCCB','#D9F99D'],['#D9F99D','#BEF264'],['#FEF9C3','#FEF08A'],['#F7FEE7','#ECFCCB'],['#FFEDD5','#FED7AA'],['#FEF08A','#FDE047']],
    },
    colors: {
      light: {
        primary: '#4D7C0F', primaryLight: '#F7FEE7', primaryDark: '#3F6212', onPrimary: '#FFFFFF',
        secondary: '#A16207', secondaryLight: '#FEFCE8', secondaryDark: '#854D0E', onSecondary: '#FFFFFF',
        tertiary: '#EA580C', tertiaryLight: '#FFF7ED', tertiaryDark: '#C2410C', onTertiary: '#FFFFFF',
        success: '#15803D', successLight: '#DCFCE7',
        info: '#4D7C0F', infoLight: '#F7FEE7',
        background: '#FFFFFF', backgroundSecondary: '#FAFDF2',
        surface: '#FFFFFF', surfaceSecondary: '#F4FAE6', surfaceElevated: '#FBFEF3',
        textPrimary: '#1A2408',
        border: '#DFEFC0', borderFocus: '#4D7C0F',
        inputBackground: '#FBFEF3', inputBorder: '#D6E9B0',
        ...FIXED_LIGHT,
      },
      dark: {
        primary: '#A3E635', primaryLight: '#1A2408', primaryDark: '#84CC16', onPrimary: '#14200A',
        secondary: '#FACC15', secondaryLight: '#231A02', secondaryDark: '#EAB308', onSecondary: '#1A1400',
        tertiary: '#FB923C', tertiaryLight: '#2A1408', tertiaryDark: '#F97316', onTertiary: '#200C02',
        success: '#4ADE80', successLight: '#052E16',
        info: '#A3E635', infoLight: '#1A2408',
        background: '#0F1405', backgroundSecondary: '#161D08',
        surface: '#1B2409', surfaceSecondary: '#243010', surfaceElevated: '#2A3813', surfaceOverlay: '#334318',
        textPrimary: '#F2F8E4', textSecondary: '#A8BC86', textTertiary: '#9FB37B', textInverse: '#0F1405',
        border: '#2E3D14', borderFocus: '#A3E635',
        inputBackground: '#1B2409', inputBorder: '#2E3D14',
        ...FIXED_DARK,
      },
    },
  },
  // ── Graphite — para quien no quiere color ────────────────────────────────────
  {
    id: 'graphite',
    previewColors: ['#71717A', '#A1A1AA', '#38BDF8'],
    gradientDark: ['#0B0B0D', '#141417', '#1C1C21'],
    gradientLight: ['#FFFFFF', '#FAFAFA', '#F1F1F3'],
    auroraBlobs: {
      dark:  [['#52525B','#27272A'],['#71717A','#3F3F46'],['#38BDF8','#0C4A6E'],['#A1A1AA','#52525B'],['#3F3F46','#18181B'],['#0EA5E9','#075985']],
      light: [['#F4F4F5','#E4E4E7'],['#E4E4E7','#D4D4D8'],['#E0F2FE','#BAE6FD'],['#FAFAFA','#F4F4F5'],['#D4D4D8','#A1A1AA'],['#F0F9FF','#E0F2FE']],
    },
    colors: {
      light: {
        primary: '#3F3F46', primaryLight: '#F4F4F5', primaryDark: '#27272A', onPrimary: '#FFFFFF',
        secondary: '#0369A1', secondaryLight: '#F0F9FF', secondaryDark: '#075985', onSecondary: '#FFFFFF',
        tertiary: '#0284C7', tertiaryLight: '#F0F9FF', tertiaryDark: '#0369A1', onTertiary: '#FFFFFF',
        success: '#15803D', successLight: '#DCFCE7',
        info: '#0284C7', infoLight: '#F0F9FF',
        background: '#FFFFFF', backgroundSecondary: '#FAFAFA',
        surface: '#FFFFFF', surfaceSecondary: '#F4F4F5', surfaceElevated: '#FAFAFA',
        textPrimary: '#18181B',
        border: '#E4E4E7', borderFocus: '#3F3F46',
        inputBackground: '#FAFAFA', inputBorder: '#D4D4D8',
        ...FIXED_LIGHT,
      },
      dark: {
        primary: '#D4D4D8', primaryLight: '#27272A', primaryDark: '#A1A1AA', onPrimary: '#18181B',
        secondary: '#38BDF8', secondaryLight: '#082F49', secondaryDark: '#0EA5E9', onSecondary: '#082F49',
        tertiary: '#7DD3FC', tertiaryLight: '#0C4A6E', tertiaryDark: '#38BDF8', onTertiary: '#082F49',
        success: '#4ADE80', successLight: '#052E16',
        info: '#38BDF8', infoLight: '#082F49',
        background: '#0B0B0D', backgroundSecondary: '#121215',
        surface: '#18181B', surfaceSecondary: '#212125', surfaceElevated: '#27272A', surfaceOverlay: '#2E2E33',
        textPrimary: '#FAFAFA', textSecondary: '#A1A1AA', textTertiary: '#9A9AA3', textInverse: '#18181B',
        border: '#2A2A2F', borderFocus: '#D4D4D8',
        inputBackground: '#18181B', inputBorder: '#2A2A2F',
        ...FIXED_DARK,
      },
    },
  },
  // ── Wine ────────────────────────────────────────────────────────────────────
  // ── Arctic ──────────────────────────────────────────────────────────────────
  {
    id: 'arctic',
    previewColors: ['#0EA5E9', '#67E8F9', '#E0F2FE'],
    gradientDark: ['#04121C', '#061C2B', '#08283C'],
    gradientLight: ['#FFFFFF', '#F7FCFF', '#E8F6FE'],
    auroraBlobs: {
      dark:  [['#0EA5E9','#075985'],['#38BDF8','#0C4A6E'],['#67E8F9','#155E75'],['#0284C7','#0C4A6E'],['#A5F3FC','#0E7490'],['#22D3EE','#155E75']],
      light: [['#E0F2FE','#BAE6FD'],['#BAE6FD','#7DD3FC'],['#CFFAFE','#A5F3FC'],['#F0F9FF','#E0F2FE'],['#ECFEFF','#CFFAFE'],['#7DD3FC','#38BDF8']],
    },
    colors: {
      light: {
        primary: '#0369A1', primaryLight: '#F0F9FF', primaryDark: '#075985', onPrimary: '#FFFFFF',
        secondary: '#0E7490', secondaryLight: '#ECFEFF', secondaryDark: '#155E75', onSecondary: '#FFFFFF',
        tertiary: '#0891B2', tertiaryLight: '#ECFEFF', tertiaryDark: '#0E7490', onTertiary: '#FFFFFF',
        success: '#0F766E', successLight: '#CCFBF1',
        info: '#0369A1', infoLight: '#F0F9FF',
        background: '#FFFFFF', backgroundSecondary: '#F6FBFE',
        surface: '#FFFFFF', surfaceSecondary: '#EDF7FD', surfaceElevated: '#F7FCFF',
        textPrimary: '#08283C',
        border: '#D5EAF7', borderFocus: '#0369A1',
        inputBackground: '#F7FCFF', inputBorder: '#C6E2F2',
        ...FIXED_LIGHT,
      },
      dark: {
        primary: '#38BDF8', primaryLight: '#082F49', primaryDark: '#0EA5E9', onPrimary: '#04121C',
        secondary: '#22D3EE', secondaryLight: '#083344', secondaryDark: '#06B6D4', onSecondary: '#04121C',
        tertiary: '#A5F3FC', tertiaryLight: '#0C3A44', tertiaryDark: '#67E8F9', onTertiary: '#042F38',
        success: '#2DD4BF', successLight: '#042F2E',
        info: '#38BDF8', infoLight: '#082F49',
        background: '#04121C', backgroundSecondary: '#071A26',
        surface: '#0A2231', surfaceSecondary: '#0F2E40', surfaceElevated: '#123648', surfaceOverlay: '#164054',
        textPrimary: '#EAF6FD', textSecondary: '#8FB2C6', textTertiary: '#85A9BE', textInverse: '#04121C',
        border: '#153244', borderFocus: '#38BDF8',
        inputBackground: '#0A2231', inputBorder: '#153244',
        ...FIXED_DARK,
      },
    },
  },
  // ── Jade ────────────────────────────────────────────────────────────────────
  {
    id: 'jade',
    previewColors: ['#059669', '#34D399', '#D4A017'],
    gradientDark: ['#04140E', '#062117', '#082D20'],
    gradientLight: ['#FFFFFF', '#F6FDFA', '#E8F8F1'],
    auroraBlobs: {
      dark:  [['#059669','#064E3B'],['#10B981','#065F46'],['#34D399','#047857'],['#D4A017','#78350F'],['#0D9488','#134E4A'],['#6EE7B7','#059669']],
      light: [['#D1FAE5','#A7F3D0'],['#A7F3D0','#6EE7B7'],['#ECFDF5','#D1FAE5'],['#FEF3C7','#FDE68A'],['#CCFBF1','#99F6E4'],['#F0FDF4','#DCFCE7']],
    },
    colors: {
      light: {
        primary: '#047857', primaryLight: '#ECFDF5', primaryDark: '#065F46', onPrimary: '#FFFFFF',
        secondary: '#0F766E', secondaryLight: '#F0FDFA', secondaryDark: '#115E59', onSecondary: '#FFFFFF',
        tertiary: '#A16207', tertiaryLight: '#FEFCE8', tertiaryDark: '#854D0E', onTertiary: '#FFFFFF',
        success: '#047857', successLight: '#ECFDF5',
        info: '#0F766E', infoLight: '#F0FDFA',
        background: '#FFFFFF', backgroundSecondary: '#F6FCF9',
        surface: '#FFFFFF', surfaceSecondary: '#EDF8F3', surfaceElevated: '#F6FDFA',
        textPrimary: '#082D20',
        border: '#D3EDE1', borderFocus: '#047857',
        inputBackground: '#F6FDFA', inputBorder: '#C4E5D6',
        ...FIXED_LIGHT,
      },
      dark: {
        primary: '#34D399', primaryLight: '#064E3B', primaryDark: '#10B981', onPrimary: '#04140E',
        secondary: '#2DD4BF', secondaryLight: '#042F2E', secondaryDark: '#14B8A6', onSecondary: '#04140E',
        tertiary: '#FBBF24', tertiaryLight: '#3B2A04', tertiaryDark: '#D4A017', onTertiary: '#2A1D00',
        success: '#4ADE80', successLight: '#052E16',
        info: '#34D399', infoLight: '#064E3B',
        background: '#04140E', backgroundSecondary: '#071C14',
        surface: '#0A241A', surfaceSecondary: '#103024', surfaceElevated: '#12382A', surfaceOverlay: '#164232',
        textPrimary: '#E9F8F1', textSecondary: '#8CBAA6', textTertiary: '#82B09C', textInverse: '#04140E',
        border: '#153426', borderFocus: '#34D399',
        inputBackground: '#0A241A', inputBorder: '#153426',
        ...FIXED_DARK,
      },
    },
  },
  // ── Sandstone ───────────────────────────────────────────────────────────────
  {
    id: 'sandstone',
    previewColors: ['#B45309', '#D6BF9E', '#0E7490'],
    gradientDark: ['#14100A', '#1E1810', '#282016'],
    gradientLight: ['#FFFFFF', '#FDFBF6', '#F7F1E6'],
    auroraBlobs: {
      dark:  [['#B45309','#451A03'],['#D97706','#78350F'],['#D6BF9E','#78624A'],['#0E7490','#164E63'],['#A16207','#422006'],['#E7D3B3','#8A7256']],
      light: [['#FEF3C7','#FDE68A'],['#F5EAD6','#E8D7B8'],['#FFF7ED','#FFEDD5'],['#CFFAFE','#A5F3FC'],['#FAF3E5','#F0E4CC'],['#FFFBEB','#FEF3C7']],
    },
    colors: {
      light: {
        primary: '#92400E', primaryLight: '#FFFBEB', primaryDark: '#78350F', onPrimary: '#FFFFFF',
        secondary: '#0E7490', secondaryLight: '#ECFEFF', secondaryDark: '#155E75', onSecondary: '#FFFFFF',
        tertiary: '#8A7256', tertiaryLight: '#FAF6EE', tertiaryDark: '#6B5741', onTertiary: '#FFFFFF',
        success: '#15803D', successLight: '#DCFCE7',
        info: '#0E7490', infoLight: '#ECFEFF',
        background: '#FFFFFF', backgroundSecondary: '#FDFAF4',
        surface: '#FFFFFF', surfaceSecondary: '#F8F2E7', surfaceElevated: '#FDFBF6',
        textPrimary: '#282016',
        border: '#EDE1CC', borderFocus: '#92400E',
        inputBackground: '#FDFBF6', inputBorder: '#E2D3B8',
        ...FIXED_LIGHT,
      },
      dark: {
        primary: '#E7D3B3', primaryLight: '#3A2E1E', primaryDark: '#D6BF9E', onPrimary: '#241A0E',
        secondary: '#22D3EE', secondaryLight: '#083344', secondaryDark: '#06B6D4', onSecondary: '#04121C',
        tertiary: '#FB923C', tertiaryLight: '#2A1408', tertiaryDark: '#F97316', onTertiary: '#200C02',
        success: '#4ADE80', successLight: '#052E16',
        info: '#E7D3B3', infoLight: '#3A2E1E',
        background: '#14100A', backgroundSecondary: '#1C1710',
        surface: '#241E14', surfaceSecondary: '#30281B', surfaceElevated: '#38301F', surfaceOverlay: '#413826',
        textPrimary: '#F7F1E6', textSecondary: '#B8A488', textTertiary: '#AE997B', textInverse: '#14100A',
        border: '#3A3122', borderFocus: '#E7D3B3',
        inputBackground: '#241E14', inputBorder: '#3A3122',
        ...FIXED_DARK,
      },
    },
  },
  // ── Neon ────────────────────────────────────────────────────────────────────
  {
    id: 'neon',
    previewColors: ['#F472B6', '#22D3EE', '#A3E635'],
    gradientDark: ['#08040F', '#0F0820', '#160C2D'],
    gradientLight: ['#FFFFFF', '#FDF7FF', '#F7EEFE'],
    auroraBlobs: {
      dark:  [['#F472B6','#831843'],['#22D3EE','#155E75'],['#A3E635','#3F6212'],['#E879F9','#701A75'],['#818CF8','#312E81'],['#F0ABFC','#86198F']],
      light: [['#FCE7F3','#FBCFE8'],['#CFFAFE','#A5F3FC'],['#ECFCCB','#D9F99D'],['#FAE8FF','#F5D0FE'],['#E0E7FF','#C7D2FE'],['#FDF4FF','#FAE8FF']],
    },
    colors: {
      light: {
        primary: '#BE185D', primaryLight: '#FDF2F8', primaryDark: '#9D174D', onPrimary: '#FFFFFF',
        secondary: '#0E7490', secondaryLight: '#ECFEFF', secondaryDark: '#155E75', onSecondary: '#FFFFFF',
        tertiary: '#4D7C0F', tertiaryLight: '#F7FEE7', tertiaryDark: '#3F6212', onTertiary: '#FFFFFF',
        success: '#15803D', successLight: '#DCFCE7',
        info: '#0E7490', infoLight: '#ECFEFF',
        background: '#FFFFFF', backgroundSecondary: '#FDF9FF',
        surface: '#FFFFFF', surfaceSecondary: '#F8F0FC', surfaceElevated: '#FDF7FF',
        textPrimary: '#160C2D',
        border: '#EDDCF5', borderFocus: '#BE185D',
        inputBackground: '#FDF7FF', inputBorder: '#E2CBEF',
        ...FIXED_LIGHT,
      },
      dark: {
        primary: '#F472B6', primaryLight: '#500724', primaryDark: '#EC4899', onPrimary: '#2B0413',
        secondary: '#22D3EE', secondaryLight: '#083344', secondaryDark: '#06B6D4', onSecondary: '#04121C',
        tertiary: '#A3E635', tertiaryLight: '#1A2408', tertiaryDark: '#84CC16', onTertiary: '#14200A',
        success: '#4ADE80', successLight: '#052E16',
        info: '#22D3EE', infoLight: '#083344',
        background: '#08040F', backgroundSecondary: '#100819',
        surface: '#180E26', surfaceSecondary: '#221534', surfaceElevated: '#2A1A3E', surfaceOverlay: '#321F49',
        textPrimary: '#F6EDFA', textSecondary: '#AC94C2', textTertiary: '#A288BB', textInverse: '#08040F',
        border: '#2C1B3E', borderFocus: '#F472B6',
        inputBackground: '#180E26', inputBorder: '#2C1B3E',
        ...FIXED_DARK,
      },
    },
  },
  // ── Moss ────────────────────────────────────────────────────────────────────
  {
    id: 'moss',
    previewColors: ['#4D7C0F', '#84A98C', '#E9EDC9'],
    gradientDark: ['#0B1109', '#131B0F', '#1B2615'],
    gradientLight: ['#FFFFFF', '#FAFCF5', '#F1F6E8'],
    auroraBlobs: {
      dark:  [['#4D7C0F','#1A2E05'],['#65A30D','#365314'],['#84A98C','#40564A'],['#A3B18A','#52644B'],['#3F6212','#1A2E05'],['#CAD2A5','#6E7A52']],
      light: [['#ECFCCB','#D9F99D'],['#E4EBD3','#CFDBB6'],['#F1F6E8','#E2EBD2'],['#DDE5C8','#C7D4AB'],['#F7FEE7','#ECFCCB'],['#EEF2DC','#DCE4C0']],
    },
    colors: {
      light: {
        primary: '#4D7C0F', primaryLight: '#F7FEE7', primaryDark: '#3F6212', onPrimary: '#FFFFFF',
        secondary: '#52644B', secondaryLight: '#F2F5EF', secondaryDark: '#3D4C38', onSecondary: '#FFFFFF',
        tertiary: '#6E7A52', tertiaryLight: '#F6F8EE', tertiaryDark: '#55603E', onTertiary: '#FFFFFF',
        success: '#15803D', successLight: '#DCFCE7',
        info: '#4D7C0F', infoLight: '#F7FEE7',
        background: '#FFFFFF', backgroundSecondary: '#FAFCF5',
        surface: '#FFFFFF', surfaceSecondary: '#F2F6E9', surfaceElevated: '#FAFCF5',
        textPrimary: '#1B2615',
        border: '#E2E9D3', borderFocus: '#4D7C0F',
        inputBackground: '#FAFCF5', inputBorder: '#D3DEC0',
        ...FIXED_LIGHT,
      },
      dark: {
        // El acento tiene que separarse del gris del texto: con el salvia apagado
        // que había aquí (#A3B18A) la cifra de una meta se leía como texto secundario.
        primary: '#B7DE7A', primaryLight: '#26301C', primaryDark: '#9CCB5C', onPrimary: '#151C10',
        secondary: '#84A98C', secondaryLight: '#1E2A20', secondaryDark: '#6B8C73', onSecondary: '#101810',
        tertiary: '#E4E9BC', tertiaryLight: '#2E3620', tertiaryDark: '#CAD2A5', onTertiary: '#1B2015',
        success: '#4ADE80', successLight: '#052E16',
        info: '#B7DE7A', infoLight: '#26301C',
        background: '#0B1109', backgroundSecondary: '#12180E',
        surface: '#1A2214', surfaceSecondary: '#232D1B', surfaceElevated: '#293422', surfaceOverlay: '#313D28',
        textPrimary: '#F0F4E6', textSecondary: '#9AA791', textTertiary: '#93A189', textInverse: '#0B1109',
        border: '#2A351F', borderFocus: '#B7DE7A',
        inputBackground: '#1A2214', inputBorder: '#2A351F',
        ...FIXED_DARK,
      },
    },
  },
  // ── Cyberpunk ───────────────────────────────────────────────────────────────
  {
    id: 'cyberpunk',
    previewColors: ['#FB32C9', '#0DDFF2', '#80F20D'],
    gradientDark: ['#12050F', '#190815', '#290A21'],
    gradientLight: ['#FFFFFF', '#FEEEFA', '#FDCEF1'],
    auroraBlobs: {
      dark:  [['#FB32C9','#550741'],['#0DDFF2','#074E55'],['#80F20D','#2E5507'],['#FC55A0','#5E082F'],['#5AF6D5','#085E4C'],['#F4717C','#650B13']],
      light: [['#FDDDF5','#FBBBEB'],['#DDFBFD','#BBF6FB'],['#EDFDDD','#DBFBBB'],['#FDE2EE','#FCC5DE'],['#E2FDF8','#C5FCF0'],['#FEE7E9','#FCCFD2']],
    },
    colors: {
      light: {
        primary: '#D501A0', primaryLight: '#FEE1F7', primaryDark: '#AD0082', onPrimary: '#FFFFFF',
        secondary: '#027D88', secondaryLight: '#E1FCFE', secondaryDark: '#006770', onSecondary: '#FFFFFF',
        tertiary: '#407E02', tertiaryLight: '#F0FEE1', tertiaryDark: '#336600', onTertiary: '#FFFFFF',
        success: '#038142', successLight: '#DCFCE7',
        info: '#027D88', infoLight: '#E1FCFE',
        background: '#FFFFFF', backgroundSecondary: '#FEF3FB',
        surface: '#FFFFFF', surfaceSecondary: '#FDE5F7', surfaceElevated: '#FEF1FB',
        textPrimary: '#290F22',
        border: '#F2CCE9', borderFocus: '#D501A0',
        inputBackground: '#FEF1FB', inputBorder: '#EEC4E3',
        ...FIXED_LIGHT,
      },
      dark: {
        primary: '#FB32C9', primaryLight: '#340929', primaryDark: '#FA05BD', onPrimary: '#1D0216',
        secondary: '#0DDFF2', secondaryLight: '#093034', secondaryDark: '#0DDFF2', onSecondary: '#021B1D',
        tertiary: '#80F20D', tertiaryLight: '#1F3409', tertiaryDark: '#80F20D', onTertiary: '#0F1D02',
        success: '#20DF80', successLight: '#0A291A',
        info: '#0DDFF2', infoLight: '#093034',
        background: '#12050F', backgroundSecondary: '#190815',
        surface: '#220E1D', surfaceSecondary: '#2E1527', surfaceElevated: '#36192F', surfaceOverlay: '#412039',
        textPrimary: '#F8F2F6', textSecondary: '#BDA8B8', textTertiary: '#B7A4B2', textInverse: '#12050F',
        border: '#43233B', borderFocus: '#FB32C9',
        inputBackground: '#220E1D', inputBorder: '#43233B',
        ...FIXED_DARK,
      },
    },
  },
  // ── Electric Violet ─────────────────────────────────────────────────────────
  {
    id: 'electricViolet',
    previewColors: ['#B769FC', '#F542B3', '#0DCCF2'],
    gradientDark: ['#0C0512', '#110819', '#1B0A29'],
    gradientLight: ['#FFFFFF', '#F7EEFE', '#E7CEFD'],
    auroraBlobs: {
      dark:  [['#B769FC','#310755'],['#F542B3','#550738'],['#0DCCF2','#074855'],['#E055FC','#50085E'],['#F65AEC','#5E0859'],['#F471DA','#650B53']],
      light: [['#EEDDFD','#DDBBFB'],['#FDDDF1','#FBBBE4'],['#DDF8FD','#BBF1FB'],['#F9E2FD','#F3C5FC'],['#FDE2FC','#FCC5F8'],['#FEE7F9','#FCCFF3']],
    },
    colors: {
      light: {
        primary: '#9B2AFE', primaryLight: '#F1E1FE', primaryDark: '#7A00E6', onPrimary: '#FFFFFF',
        secondary: '#D8038A', secondaryLight: '#FEE1F4', secondaryDark: '#B20071', onSecondary: '#FFFFFF',
        tertiary: '#027A92', tertiaryLight: '#E1F9FE', tertiaryDark: '#00667A', onTertiary: '#FFFFFF',
        success: '#038142', successLight: '#DCFCE7',
        info: '#D8038A', infoLight: '#FEE1F4',
        background: '#FFFFFF', backgroundSecondary: '#F9F3FE',
        surface: '#FFFFFF', surfaceSecondary: '#F2E5FD', surfaceElevated: '#F8F1FE',
        textPrimary: '#1D0F29',
        border: '#E0CCF2', borderFocus: '#9B2AFE',
        inputBackground: '#F8F1FE', inputBorder: '#DAC4EE',
        ...FIXED_LIGHT,
      },
      dark: {
        primary: '#B769FC', primaryLight: '#200934', primaryDark: '#8805FA', onPrimary: '#10021D',
        secondary: '#F542B3', secondaryLight: '#340924', secondaryDark: '#F20D9E', onSecondary: '#1D0213',
        tertiary: '#0DCCF2', tertiaryLight: '#092D34', tertiaryDark: '#0DCCF2', onTertiary: '#02181D',
        success: '#20DF80', successLight: '#0A291A',
        info: '#F542B3', infoLight: '#340924',
        background: '#0C0512', backgroundSecondary: '#110819',
        surface: '#190E22', surfaceSecondary: '#22152E', surfaceElevated: '#281936', surfaceOverlay: '#322041',
        textPrimary: '#F5F2F8', textSecondary: '#B3A8BD', textTertiary: '#AEA4B7', textInverse: '#0C0512',
        border: '#342343', borderFocus: '#B769FC',
        inputBackground: '#190E22', inputBorder: '#342343',
        ...FIXED_DARK,
      },
    },
  },
  // ── Acid Lime ───────────────────────────────────────────────────────────────
  {
    id: 'acidLime',
    previewColors: ['#B0FA05', '#F547F5', '#0DC4F2'],
    gradientDark: ['#0E1205', '#141908', '#20290A'],
    gradientLight: ['#FFFFFF', '#F4FEEE', '#DFFDCE'],
    auroraBlobs: {
      dark:  [['#B0FA05','#3E5507'],['#F547F5','#550755'],['#0DC4F2','#074555'],['#98FC55','#2A5E08'],['#C85AF6','#44085E'],['#76F471','#0E650B']],
      light: [['#E9FDDD','#D3FBBB'],['#FDDDFD','#FBBBFB'],['#DDF7FD','#BBEFFB'],['#E4FDE2','#C9FCC5'],['#F5E2FD','#EBC5FC'],['#E7FEEE','#CFFCDC']],
    },
    colors: {
      light: {
        primary: '#2F7F01', primaryLight: '#ECFEE1', primaryDark: '#276B00', onPrimary: '#FFFFFF',
        secondary: '#C903C9', secondaryLight: '#FEE1FE', secondaryDark: '#A800A8', onSecondary: '#FFFFFF',
        tertiary: '#027997', tertiaryLight: '#E1F8FE', tertiaryDark: '#00667F', onTertiary: '#FFFFFF',
        success: '#038142', successLight: '#DCFCE7',
        info: '#C903C9', infoLight: '#FEE1FE',
        background: '#FFFFFF', backgroundSecondary: '#F7FEF3',
        surface: '#FFFFFF', surfaceSecondary: '#EEFDE5', surfaceElevated: '#F6FEF1',
        textPrimary: '#19290F',
        border: '#DAF2CC', borderFocus: '#2F7F01',
        inputBackground: '#F6FEF1', inputBorder: '#D3EEC4',
        ...FIXED_LIGHT,
      },
      dark: {
        primary: '#B0FA05', primaryLight: '#273409', primaryDark: '#B0FA05', onPrimary: '#151D02',
        secondary: '#F547F5', secondaryLight: '#340934', secondaryDark: '#F20DF2', onSecondary: '#1D021D',
        tertiary: '#0DC4F2', tertiaryLight: '#092B34', tertiaryDark: '#0DC4F2', onTertiary: '#02181D',
        success: '#20DF80', successLight: '#0A291A',
        info: '#F547F5', infoLight: '#340934',
        background: '#0E1205', backgroundSecondary: '#141908',
        surface: '#1C220E', surfaceSecondary: '#262E15', surfaceElevated: '#2D3619', surfaceOverlay: '#374120',
        textPrimary: '#F6F8F2', textSecondary: '#B7BDA8', textTertiary: '#B1B7A4', textInverse: '#0E1205',
        border: '#3A4323', borderFocus: '#B0FA05',
        inputBackground: '#1C220E', inputBorder: '#3A4323',
        ...FIXED_DARK,
      },
    },
  },
  // ── Solar Flare ─────────────────────────────────────────────────────────────
  // ── Hot Magenta ─────────────────────────────────────────────────────────────
  {
    id: 'hotMagenta',
    previewColors: ['#FB419E', '#AA72F8', '#F2C40D'],
    gradientDark: ['#12050B', '#190811', '#290A1A'],
    gradientLight: ['#FFFFFF', '#FEEEF6', '#FDCEE6'],
    auroraBlobs: {
      dark:  [['#FB419E','#55072E'],['#AA72F8','#270755'],['#F2C40D','#554507'],['#FC5576','#5E0819'],['#6C5AF6','#12085E'],['#F48771','#651A0B']],
      light: [['#FDDDED','#FBBBDB'],['#EADDFD','#D6BBFB'],['#FDF7DD','#FBEFBB'],['#FDE2E7','#FCC5D0'],['#E5E2FD','#CBC5FC'],['#FEEBE7','#FCD6CF']],
    },
    colors: {
      light: {
        primary: '#DA016E', primaryLight: '#FEE1F0', primaryDark: '#B8005C', onPrimary: '#FFFFFF',
        secondary: '#832CFC', secondaryLight: '#EDE1FE', secondaryDark: '#6000E6', onSecondary: '#FFFFFF',
        tertiary: '#886D02', tertiaryLight: '#FEF8E1', tertiaryDark: '#705A00', onTertiary: '#FFFFFF',
        success: '#038142', successLight: '#DCFCE7',
        info: '#832CFC', infoLight: '#EDE1FE',
        background: '#FFFFFF', backgroundSecondary: '#FEF3F9',
        surface: '#FFFFFF', surfaceSecondary: '#FDE5F1', surfaceElevated: '#FEF1F8',
        textPrimary: '#290F1C',
        border: '#F2CCDF', borderFocus: '#DA016E',
        inputBackground: '#FEF1F8', inputBorder: '#EEC4D9',
        ...FIXED_LIGHT,
      },
      dark: {
        primary: '#FB419E', primaryLight: '#34091F', primaryDark: '#FA0580', onPrimary: '#1D020F',
        secondary: '#AA72F8', secondaryLight: '#1B0934', secondaryDark: '#6C0DF2', onSecondary: '#0D021D',
        tertiary: '#F2C40D', tertiaryLight: '#342B09', tertiaryDark: '#F2C40D', onTertiary: '#1D1802',
        success: '#20DF80', successLight: '#0A291A',
        info: '#AA72F8', infoLight: '#1B0934',
        background: '#12050B', backgroundSecondary: '#190811',
        surface: '#220E18', surfaceSecondary: '#2E1521', surfaceElevated: '#361928', surfaceOverlay: '#412030',
        textPrimary: '#F8F2F5', textSecondary: '#BDA8B3', textTertiary: '#B7A4AD', textInverse: '#12050B',
        border: '#432333', borderFocus: '#FB419E',
        inputBackground: '#220E18', inputBorder: '#432333',
        ...FIXED_DARK,
      },
    },
  },
  // ── Electric Blue ───────────────────────────────────────────────────────────
  {
    id: 'electricBlue',
    previewColors: ['#418FFB', '#0DF2D4', '#F64CA1'],
    gradientDark: ['#050A12', '#080F19', '#0A1729'],
    gradientLight: ['#FFFFFF', '#EEF5FE', '#CEE2FD'],
    auroraBlobs: {
      dark:  [['#418FFB','#072755'],['#0DF2D4','#07554B'],['#F64CA1','#55072E'],['#5568FC','#08125E'],['#5AF6B3','#085E39'],['#9271F4','#220B65']],
      light: [['#DDEAFD','#BBD6FB'],['#DDFDF9','#BBFBF3'],['#FDDDED','#FBBBDB'],['#E2E5FD','#C5CBFC'],['#E2FDF2','#C5FCE4'],['#EDE7FE','#DACFFC']],
    },
    colors: {
      light: {
        primary: '#0168F9', primaryLight: '#E1EDFE', primaryDark: '#0055CC', onPrimary: '#FFFFFF',
        secondary: '#027E6D', secondaryLight: '#E1FEFA', secondaryDark: '#006658', onSecondary: '#FFFFFF',
        tertiary: '#DD0370', tertiaryLight: '#FEE1F0', tertiaryDark: '#B8005C', onTertiary: '#FFFFFF',
        success: '#038142', successLight: '#DCFCE7',
        info: '#027E6D', infoLight: '#E1FEFA',
        background: '#FFFFFF', backgroundSecondary: '#F3F8FE',
        surface: '#FFFFFF', surfaceSecondary: '#E5EFFD', surfaceElevated: '#F1F7FE',
        textPrimary: '#0F1A29',
        border: '#CCDCF2', borderFocus: '#0168F9',
        inputBackground: '#F1F7FE', inputBorder: '#C4D5EE',
        ...FIXED_LIGHT,
      },
      dark: {
        primary: '#418FFB', primaryLight: '#091B34', primaryDark: '#056BFA', onPrimary: '#020D1D',
        secondary: '#0DF2D4', secondaryLight: '#09342E', secondaryDark: '#0DF2D4', onSecondary: '#021D19',
        tertiary: '#F64CA1', tertiaryLight: '#34091F', tertiaryDark: '#F20D80', onTertiary: '#1D020F',
        success: '#20DF80', successLight: '#0A291A',
        info: '#0DF2D4', infoLight: '#09342E',
        background: '#050A12', backgroundSecondary: '#080F19',
        surface: '#0E1722', surfaceSecondary: '#151F2E', surfaceElevated: '#192536', surfaceOverlay: '#202E41',
        textPrimary: '#F2F4F8', textSecondary: '#A8B1BD', textTertiary: '#A4ACB7', textInverse: '#050A12',
        border: '#233043', borderFocus: '#418FFB',
        inputBackground: '#0E1722', inputBorder: '#233043',
        ...FIXED_DARK,
      },
    },
  },
  // ── Tangerine ───────────────────────────────────────────────────────────────
  {
    id: 'tangerine',
    previewColors: ['#FA5F05', '#F6519E', '#0DADF2'],
    gradientDark: ['#120A05', '#190E08', '#29150A'],
    gradientLight: ['#FFFFFF', '#FEF2EE', '#FDD9CE'],
    auroraBlobs: {
      dark:  [['#FA5F05','#552307'],['#F6519E','#55072B'],['#0DADF2','#073E55'],['#FCC455','#5E4108'],['#F65AD2','#5E084A'],['#EFF471','#62650B']],
      light: [['#FDE5DD','#FBCABB'],['#FDDDEC','#FBBBD9'],['#DDF4FD','#BBE8FB'],['#FDF1E2','#FCE2C5'],['#FDE2F7','#FCC5EF'],['#FEFBE7','#FCF8CF']],
    },
    colors: {
      light: {
        primary: '#D53301', primaryLight: '#FEE8E1', primaryDark: '#B22A00', onPrimary: '#FFFFFF',
        secondary: '#DD0369', secondaryLight: '#FEE1EF', secondaryDark: '#B80056', onSecondary: '#FFFFFF',
        tertiary: '#0378AB', tertiaryLight: '#E1F6FE', tertiaryDark: '#00648F', onTertiary: '#FFFFFF',
        success: '#038142', successLight: '#DCFCE7',
        info: '#DD0369', infoLight: '#FEE1EF',
        background: '#FFFFFF', backgroundSecondary: '#FEF6F3',
        surface: '#FFFFFF', surfaceSecondary: '#FDEBE5', surfaceElevated: '#FEF4F1',
        textPrimary: '#29150F',
        border: '#F2D5CC', borderFocus: '#D53301',
        inputBackground: '#FEF4F1', inputBorder: '#EECEC4',
        ...FIXED_LIGHT,
      },
      dark: {
        primary: '#FA5F05', primaryLight: '#341909', primaryDark: '#FA5F05', onPrimary: '#1D0C02',
        secondary: '#F6519E', secondaryLight: '#34091D', secondaryDark: '#F20D78', onSecondary: '#1D020E',
        tertiary: '#0DADF2', tertiaryLight: '#092734', tertiaryDark: '#0DADF2', onTertiary: '#02151D',
        success: '#20DF80', successLight: '#0A291A',
        info: '#F6519E', infoLight: '#34091D',
        background: '#120A05', backgroundSecondary: '#190E08',
        surface: '#22160E', surfaceSecondary: '#2E1E15', surfaceElevated: '#362419', surfaceOverlay: '#412C20',
        textPrimary: '#F8F4F2', textSecondary: '#BDB0A8', textTertiary: '#B7ABA4', textInverse: '#120A05',
        border: '#432F23', borderFocus: '#FA5F05',
        inputBackground: '#22160E', inputBorder: '#432F23',
        ...FIXED_DARK,
      },
    },
  },
  // ── Infrared ────────────────────────────────────────────────────────────────
  {
    id: 'infrared',
    previewColors: ['#FB505E', '#F2800D', '#CF5AF6'],
    gradientDark: ['#120506', '#19080A', '#290A0D'],
    gradientLight: ['#FFFFFF', '#FEEEEF', '#FDCED2'],
    auroraBlobs: {
      dark:  [['#FB505E','#55070D'],['#F2800D','#552E07'],['#CF5AF6','#410755'],['#FC7955','#5E1A08'],['#F6795A','#5E1908'],['#F4BD71','#65400B']],
      light: [['#FDDDE0','#FBBBC1'],['#FDEDDD','#FBDBBB'],['#F5DDFD','#EBBBFB'],['#FDE8E2','#FCD1C5'],['#FDE7E2','#FCD0C5'],['#FEF4E7','#FCE9CF']],
    },
    colors: {
      light: {
        primary: '#E40114', primaryLight: '#FEE1E4', primaryDark: '#BD0010', onPrimary: '#FFFFFF',
        secondary: '#B05903', secondaryLight: '#FEF0E1', secondaryDark: '#8F4700', onSecondary: '#FFFFFF',
        tertiary: '#B604F1', tertiaryLight: '#F7E1FE', tertiaryDark: '#9900CC', onTertiary: '#FFFFFF',
        success: '#038142', successLight: '#DCFCE7',
        info: '#B05903', infoLight: '#FEF0E1',
        background: '#FFFFFF', backgroundSecondary: '#FEF3F4',
        surface: '#FFFFFF', surfaceSecondary: '#FDE5E7', surfaceElevated: '#FEF1F3',
        textPrimary: '#290F12',
        border: '#F2CCCF', borderFocus: '#E40114',
        inputBackground: '#FEF1F3', inputBorder: '#EEC4C7',
        ...FIXED_LIGHT,
      },
      dark: {
        primary: '#FB505E', primaryLight: '#34090D', primaryDark: '#FA0519', onPrimary: '#1D0204',
        secondary: '#F2800D', secondaryLight: '#341F09', secondaryDark: '#F2800D', onSecondary: '#1D0F02',
        tertiary: '#CF5AF6', tertiaryLight: '#290934', tertiaryDark: '#B90DF2', onTertiary: '#16021D',
        success: '#20DF80', successLight: '#0A291A',
        info: '#F2800D', infoLight: '#341F09',
        background: '#120506', backgroundSecondary: '#19080A',
        surface: '#220E10', surfaceSecondary: '#2E1517', surfaceElevated: '#36191C', surfaceOverlay: '#412023',
        textPrimary: '#F8F2F2', textSecondary: '#BDA8AA', textTertiary: '#B7A4A5', textInverse: '#120506',
        border: '#432325', borderFocus: '#FB505E',
        inputBackground: '#220E10', inputBorder: '#432325',
        ...FIXED_DARK,
      },
    },
  },
];

/** Grupos del selector de Personalización. Una paleta que no esté en ningún grupo
 *  NO se ve en la app: el grid solo pinta lo que hay aquí. Lo vigila
 *  `utils/reportPalette.test.ts`. */

export const PALETTE_MAP: Record<PaletteId, PaletteDefinition> =
  Object.fromEntries(PALETTES.map((p) => [p.id, p])) as Record<PaletteId, PaletteDefinition>;

/**
 * Paletas retiradas en la v2.60 → a cuál va quien la tuviera puesta.
 *
 * Las dieciséis "pastel" tenían el modo oscuro IDÉNTICO token por token al de su
 * gemela: de noche eran la misma paleta, y de día se separaban por unos pocos
 * puntos de saturación. Se midió la distancia de color entre las 48 y ninguna de
 * esas parejas llegaba a distinguirse. `solarFlare` y `wine` cayeron por lo
 * mismo frente a `sunset` y `rose`.
 *
 * Cada una migra a su gemela, así que quien la tuviera puesta ve prácticamente
 * lo mismo — en oscuro, exactamente lo mismo.
 */
export const PALETTE_MIGRATION: Record<string, PaletteId> = {
  deepWaterPastel: 'deepWater',
  sunsetPastel: 'sunset',
  forestPastel: 'forest',
  midnightPastel: 'midnight',
  rosePastel: 'rose',
  oceanPastel: 'ocean',
  emberPastel: 'ember',
  lavenderPastel: 'lavender',
  slatePastel: 'slate',
  sakuraPastel: 'sakura',
  nordicPastel: 'nordic',
  cottonCandyPastel: 'cottonCandy',
  peachPastel: 'peach',
  mintPastel: 'mint',
  auroraPastel: 'aurora',
  mochaPastel: 'mocha',
  solarFlare: 'sunset',
  wine: 'rose',
};

/** Resuelve un id guardado: migra el legado y descarta lo que ya no existe. */
export function resolvePaletteId(id: string | undefined | null): PaletteId | null {
  if (!id) return null;
  const migrated = PALETTE_MIGRATION[id];
  if (migrated) return migrated;
  return PALETTE_MAP[id as PaletteId] ? (id as PaletteId) : null;
}
