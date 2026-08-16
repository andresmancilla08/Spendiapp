import { useRef, useState, useEffect, useMemo, memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform, LayoutChangeEvent } from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import AppIcon from './AppIcon';
import AppSegmentedControl from './AppSegmentedControl';
import { Fonts } from '../config/fonts';
import { PALETTES, type PaletteId } from '../config/palettes';
import { router } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { derivePalette } from '../utils/derivePalette';

const COLUMNS = 3;
const GRID_GAP = 10;
/** Arcoíris tenue de la tarjeta de crear: dice "aquí se eligen colores" sin
 *  necesidad de explicarlo, y no compite con las paletas reales de al lado. */
const CREATE_SPECTRUM = ['#FF6B6B33', '#FFD93D33', '#6BCB7733', '#4D96FF33', '#B983FF33'] as unknown as readonly [string, string, ...string[]];

// ── PaletteCard — 3 columnas, swatches solapados, glow, haptics ─────────────
export const PaletteCard = memo(function PaletteCard({
  palette, isSelected, onPress, colors, label, cardWidth,
}: {
  palette: typeof PALETTES[0];
  isSelected: boolean;
  onPress: () => void;
  colors: any;
  label: string;
  cardWidth: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const badgeScale = useRef(new Animated.Value(isSelected ? 1 : 0)).current;
  const badgeOpacity = useRef(new Animated.Value(isSelected ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(badgeScale, { toValue: isSelected ? 1 : 0, damping: 10, stiffness: 400, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(badgeOpacity, { toValue: isSelected ? 1 : 0, duration: isSelected ? 120 : 80, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, [isSelected]);

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scale, { toValue: 0.93, damping: 18, stiffness: 400, useNativeDriver: Platform.OS !== 'web' }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, damping: 12, stiffness: 280, useNativeDriver: Platform.OS !== 'web' }).start();
  };

  const handlePress = () => {
    if (!isSelected) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  const [p1, p2, p3] = palette.previewColors;
  const cardBg = palette.gradientLight[2];

  return (
    <Animated.View style={{ transform: [{ scale }], width: cardWidth }}>
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: isSelected }}
        style={[
          palCardStyles.card,
          {
            backgroundColor: cardBg,
            borderColor: isSelected ? p1 : 'transparent',
            shadowColor: isSelected ? p1 : '#000',
            shadowOpacity: isSelected ? 0.32 : 0.08,
            shadowRadius: isSelected ? 10 : 4,
            shadowOffset: { width: 0, height: isSelected ? 4 : 2 },
            elevation: isSelected ? 8 : 2,
          },
        ]}
      >
        {/* Swatches solapados */}
        <View style={palCardStyles.swatchRow}>
          <View style={[palCardStyles.swatch, { backgroundColor: p1, borderColor: cardBg, zIndex: 3 }]} />
          <View style={[palCardStyles.swatch, palCardStyles.swatchOverlap, { backgroundColor: p2, borderColor: cardBg, zIndex: 2 }]} />
          <View style={[palCardStyles.swatch, palCardStyles.swatchOverlap, { backgroundColor: p3, borderColor: cardBg, zIndex: 1 }]} />
        </View>

        {/* Nombre */}
        <Text
          style={[
            palCardStyles.name,
            {
              color: isSelected ? p1 : 'rgba(30,30,30,0.85)',
              fontFamily: isSelected ? Fonts.semiBold : Fonts.medium,
              letterSpacing: isSelected ? 0.4 : 0.1,
            },
          ]}
          numberOfLines={2}
        >
          {label}
        </Text>

        {/* Badge animado — siempre montado */}
        <Animated.View
          style={[
            palCardStyles.checkBadge,
            { backgroundColor: p1, transform: [{ scale: badgeScale }], opacity: badgeOpacity },
          ]}
        >
          <AppIcon name="checkmark" size={9} color="#FFFFFF" />
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const palCardStyles = StyleSheet.create({
  card: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 8,
    overflow: 'hidden',
    borderWidth: 2.5,
    minHeight: 90,
    justifyContent: 'center',
  },
  swatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  swatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
  },
  swatchOverlap: {
    marginLeft: -8,
  },
  name: {
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 13,
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 17,
    height: 17,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ── PaletteGrid — pestañas Clásicas / Mis paletas, embebible en cualquier pantalla ──
interface PaletteGridProps {
  colors: any;
  /** Del sistema o propia (`custom_…`). */
  paletteId: string;
  setPaletteId: (id: string) => void;
  t: any;
}

export default function PaletteGrid({ colors, paletteId, setPaletteId, t }: PaletteGridProps) {
  // Las propias se derivan aquí mismo: se guardan como tres parámetros, no como
  // sesenta colores (ver `utils/derivePalette.ts`).
  const { customPalettes } = useTheme();
  const mine = useMemo(
    () => customPalettes.map((c) => ({ def: derivePalette(c, c.id), name: c.name })),
    [customPalettes],
  );
  const [activeIdx, setActiveIdx] = useState(0);
  const [displayIdx, setDisplayIdx] = useState(0);
  const [gridWidth, setGridWidth] = useState(0);
  const contentOpacity = useRef(new Animated.Value(1)).current;

  const cardWidth = gridWidth > 0 ? (gridWidth - GRID_GAP * (COLUMNS - 1)) / COLUMNS : 0;

  const onGridLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (Math.abs(w - gridWidth) > 1) setGridWidth(w);
  };

  const switchGroup = (idx: number) => {
    if (idx === activeIdx) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveIdx(idx);
    Animated.timing(contentOpacity, { toValue: 0, duration: 90, useNativeDriver: Platform.OS !== 'web' }).start(() => {
      setDisplayIdx(idx);
      Animated.timing(contentOpacity, { toValue: 1, duration: 160, useNativeDriver: Platform.OS !== 'web' }).start();
    });
  };

  /**
   * Dos pestañas y no cinco. Las cuatro familias del sistema (clásicas, pastel,
   * carácter, neón) eran una taxonomía interna: quien busca un color no piensa
   * "quiero una pastel", va pasando hasta que una le gusta. Repartirlas en
   * cuatro cajones solo obligaba a mirar en cuatro sitios. Ahora la separación
   * es la única que el usuario sí tiene en la cabeza: las de la app y las suyas.
   */
  const systemPalettes = PALETTES;
  const showingMine = displayIdx === 1;

  return (
    <View>
      <AppSegmentedControl
        segments={[
          { key: 'system', label: t('palette.tabSystem') },
          { key: 'mine', label: t('palette.mine') },
        ]}
        activeKey={activeIdx === 1 ? 'mine' : 'system'}
        onChange={(key) => switchGroup(key === 'mine' ? 1 : 0)}
        style={styles.tabBarSpacing}
      />

      <Animated.View onLayout={onGridLayout} style={[styles.grid, { opacity: contentOpacity }]}>
        {gridWidth > 0 && showingMine && mine.length > 0 && (
          /* Con paletas ya creadas, crear es una casilla más de la rejilla. */
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/palette-editor' as any);
            }}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={t('palette.create')}
            style={[styles.createCard, { width: cardWidth, borderColor: colors.primary }]}
          >
            <LinearGradient
              colors={CREATE_SPECTRUM}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={[styles.createPlus, { backgroundColor: colors.surface }]}>
              <AppIcon name="add" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.createLabel, { color: colors.textPrimary }]} numberOfLines={1}>
              {t('palette.create')}
            </Text>
          </TouchableOpacity>
        )}

        {gridWidth > 0 && showingMine && mine.map(({ def, name }) => (
          <PaletteCard
            key={def.id}
            palette={def}
            isSelected={paletteId === def.id}
            onPress={() => setPaletteId(def.id)}
            colors={colors}
            label={name}
            cardWidth={cardWidth}
          />
        ))}

        {gridWidth > 0 && !showingMine && systemPalettes.map((palette) => (
          <PaletteCard
            key={palette.id}
            palette={palette}
            isSelected={paletteId === palette.id}
            onPress={() => setPaletteId(palette.id)}
            colors={colors}
            label={t(`profile.palette.${palette.id}`)}
            cardWidth={cardWidth}
          />
        ))}
      </Animated.View>

      {/* Sin ninguna paleta propia, la rejilla no tiene nada que ordenar: lo que
          toca es explicar qué es esto y ofrecer el único camino que hay. */}
      {showingMine && mine.length === 0 && (
        <View style={styles.emptyWrap}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.primary + '1A' }]}>
            <AppIcon name="color-palette-outline" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t('palette.emptyTitle')}</Text>
          <Text style={[styles.mineEmpty, { color: colors.textSecondary }]}>{t('palette.mineEmpty')}</Text>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/palette-editor' as any);
            }}
            activeOpacity={0.85}
            accessibilityRole="button"
            style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
          >
            <AppIcon name="add" size={18} color={colors.onPrimary} />
            <Text style={[styles.emptyBtnText, { color: colors.onPrimary }]}>{t('palette.create')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarSpacing: { marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  createCard: {
    aspectRatio: 1.06,
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  createPlus: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  createLabel: { fontSize: 12, fontFamily: Fonts.bold },
  emptyWrap: { alignItems: 'center', paddingVertical: 26, paddingHorizontal: 12, gap: 10 },
  emptyIcon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  emptyTitle: { fontSize: 16, fontFamily: Fonts.bold, textAlign: 'center' },
  mineEmpty: { fontSize: 13, fontFamily: Fonts.regular, lineHeight: 19, textAlign: 'center', maxWidth: 280 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, height: 46, borderRadius: 50, marginTop: 8 },
  emptyBtnText: { fontSize: 15, fontFamily: Fonts.bold },
});
