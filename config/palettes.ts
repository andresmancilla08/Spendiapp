import { AppColors } from './colors';

export type PaletteId = 'deepWater' | 'sunset' | 'forest' | 'midnight' | 'rose' | 'ocean' | 'ember' | 'lavender' | 'slate';

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
  warning: '#F59E0B', warningLight: '#FEF3C7',
  expense: '#FF6B6B', expenseLight: '#FFF0F0',
  achievement: '#F59E0B',
  overlay: 'rgba(0,0,0,0.45)', overlayLight: 'rgba(0,0,0,0.3)',
  textSecondary: '#6B7280', textTertiary: '#9CA3AF', textInverse: '#FFFFFF',
};

const FIXED_DARK = {
  error: '#F87171', errorLight: '#3D1515',
  warning: '#FBBF24', warningLight: '#2D1F00',
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
        textPrimary: '#EEF6F8', textSecondary: '#9EABAF', textTertiary: '#637579', textInverse: '#1A2428',
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
        textSecondary: '#6B7280', textTertiary: '#9CA3AF', textInverse: '#FFFFFF',
      },
      dark: {
        primary: '#FBBF24', primaryLight: '#2D1F00', primaryDark: '#F59E0B', onPrimary: '#1A0F00',
        secondary: '#F87171', secondaryLight: '#3D1515', secondaryDark: '#EF4444', onSecondary: '#FFFFFF',
        tertiary: '#A78BFA', tertiaryLight: '#2E1065', tertiaryDark: '#8B5CF6', onTertiary: '#FFFFFF',
        success: '#22C55E', successLight: '#052E16',
        info: '#FBBF24', infoLight: '#2D1F00',
        background: '#1C0D00', backgroundSecondary: '#241200',
        surface: '#2D1800', surfaceSecondary: '#361D00', surfaceElevated: '#3D2100', surfaceOverlay: '#452500',
        textPrimary: '#FFF8F0', textSecondary: '#B09880', textTertiary: '#7A6858', textInverse: '#1A0F00',
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
        textPrimary: '#EEF8F0', textSecondary: '#8FA898', textTertiary: '#5E7568', textInverse: '#0A1A0D',
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
        textPrimary: '#F0EFF8', textSecondary: '#9B96AF', textTertiary: '#6B6580', textInverse: '#0D0B1A',
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
        textPrimary: '#F8EEF0', textSecondary: '#B09498', textTertiary: '#7A6065', textInverse: '#1C0510',
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
        textPrimary: '#EDF4FF', textSecondary: '#8BAABF', textTertiary: '#587490', textInverse: '#0A0F1E',
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
        textPrimary: '#F8EEEE', textSecondary: '#B09090', textTertiary: '#7A5A5A', textInverse: '#1A0808',
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
        textPrimary: '#F3EEFF', textSecondary: '#A890C8', textTertiary: '#705A90', textInverse: '#0F0B1E',
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
        textPrimary: '#EFF3F8', textSecondary: '#8899B0', textTertiary: '#556678', textInverse: '#0B1015',
        border: '#1C2E42', borderFocus: '#60A5FA',
        inputBackground: '#162030', inputBorder: '#1C2E42',
        ...FIXED_DARK,
      },
    },
  },
];

export const PALETTE_MAP: Record<PaletteId, PaletteDefinition> =
  Object.fromEntries(PALETTES.map((p) => [p.id, p])) as Record<PaletteId, PaletteDefinition>;
