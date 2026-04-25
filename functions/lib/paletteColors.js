"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PALETTE_COLORS = void 0;
exports.getPaletteColors = getPaletteColors;
exports.PALETTE_COLORS = {
    deepWater: { primary: '#00ACC1', primaryLight: '#E0F7FA', primaryDark: '#00838F' },
    sunset: { primary: '#F59E0B', primaryLight: '#FEF3C7', primaryDark: '#D97706' },
    forest: { primary: '#16A34A', primaryLight: '#DCFCE7', primaryDark: '#15803D' },
    midnight: { primary: '#6366F1', primaryLight: '#EEF2FF', primaryDark: '#4F46E5' },
    rose: { primary: '#F43F5E', primaryLight: '#FFF1F2', primaryDark: '#E11D48' },
    ocean: { primary: '#0EA5E9', primaryLight: '#E0F2FE', primaryDark: '#0284C7' },
    ember: { primary: '#EA580C', primaryLight: '#FFF7ED', primaryDark: '#C2410C' },
    lavender: { primary: '#8B5CF6', primaryLight: '#F5F3FF', primaryDark: '#7C3AED' },
    slate: { primary: '#64748B', primaryLight: '#F8FAFC', primaryDark: '#475569' },
    deepWaterPastel: { primary: '#00ACC1', primaryLight: '#E0F7FA', primaryDark: '#00838F' },
    sunsetPastel: { primary: '#F59E0B', primaryLight: '#FEF3C7', primaryDark: '#D97706' },
    forestPastel: { primary: '#16A34A', primaryLight: '#DCFCE7', primaryDark: '#15803D' },
    midnightPastel: { primary: '#6366F1', primaryLight: '#EEF2FF', primaryDark: '#4F46E5' },
    rosePastel: { primary: '#F43F5E', primaryLight: '#FFF1F2', primaryDark: '#E11D48' },
    oceanPastel: { primary: '#0EA5E9', primaryLight: '#E0F2FE', primaryDark: '#0284C7' },
    emberPastel: { primary: '#EA580C', primaryLight: '#FFF7ED', primaryDark: '#C2410C' },
    lavenderPastel: { primary: '#8B5CF6', primaryLight: '#F5F3FF', primaryDark: '#7C3AED' },
    slatePastel: { primary: '#64748B', primaryLight: '#F8FAFC', primaryDark: '#475569' },
    sakura: { primary: '#EC4899', primaryLight: '#FDF2F8', primaryDark: '#DB2777' },
    nordic: { primary: '#3B82F6', primaryLight: '#EFF6FF', primaryDark: '#2563EB' },
    cottonCandy: { primary: '#A855F7', primaryLight: '#FAF5FF', primaryDark: '#9333EA' },
    peach: { primary: '#F97316', primaryLight: '#FFF7ED', primaryDark: '#EA580C' },
    mint: { primary: '#10B981', primaryLight: '#ECFDF5', primaryDark: '#059669' },
    aurora: { primary: '#06B6D4', primaryLight: '#ECFEFF', primaryDark: '#0891B2' },
    mocha: { primary: '#78716C', primaryLight: '#FAFAF9', primaryDark: '#57534E' },
    sakuraPastel: { primary: '#EC4899', primaryLight: '#FDF2F8', primaryDark: '#DB2777' },
    nordicPastel: { primary: '#3B82F6', primaryLight: '#EFF6FF', primaryDark: '#2563EB' },
    cottonCandyPastel: { primary: '#A855F7', primaryLight: '#FAF5FF', primaryDark: '#9333EA' },
    peachPastel: { primary: '#F97316', primaryLight: '#FFF7ED', primaryDark: '#EA580C' },
    mintPastel: { primary: '#10B981', primaryLight: '#ECFDF5', primaryDark: '#059669' },
    auroraPastel: { primary: '#06B6D4', primaryLight: '#ECFEFF', primaryDark: '#0891B2' },
    mochaPastel: { primary: '#78716C', primaryLight: '#FAFAF9', primaryDark: '#57534E' },
};
function getPaletteColors(paletteId) {
    var _a;
    return (_a = exports.PALETTE_COLORS[paletteId]) !== null && _a !== void 0 ? _a : exports.PALETTE_COLORS['deepWater'];
}
//# sourceMappingURL=paletteColors.js.map