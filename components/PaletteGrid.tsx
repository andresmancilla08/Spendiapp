import { useRef, useState, useEffect, memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform, Dimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import AppIcon from './AppIcon';
import AppSegmentedControl from './AppSegmentedControl';
import { Fonts } from '../config/fonts';
import { PaletteId, PALETTES } from '../config/palettes';

// ── Palette groups ──────────────────────────────────────────────────────────
interface PaletteGroup {
  key: string;
  labelKey: string;
  ids: PaletteId[];
}

export const PALETTE_GROUPS: PaletteGroup[] = [
  {
    key: 'classic',
    labelKey: 'profile.palette.group.classic',
    ids: ['deepWater', 'sunset', 'forest', 'midnight', 'rose', 'ocean', 'ember', 'lavender', 'slate', 'sakura', 'nordic', 'cottonCandy', 'peach', 'mint', 'aurora', 'mocha'],
  },
  {
    key: 'pastel',
    labelKey: 'profile.palette.group.pastel',
    ids: ['deepWaterPastel', 'sunsetPastel', 'forestPastel', 'midnightPastel', 'rosePastel', 'oceanPastel', 'emberPastel', 'lavenderPastel', 'slatePastel', 'sakuraPastel', 'nordicPastel', 'cottonCandyPastel', 'peachPastel', 'mintPastel', 'auroraPastel', 'mochaPastel'],
  },
];

// ── PaletteCard — 3 columnas, swatches solapados, glow, haptics ─────────────
const CARD_W = Math.floor((Math.min(Dimensions.get('window').width, 560) - 24 - 16) / 3);

export const PaletteCard = memo(function PaletteCard({
  palette, isSelected, onPress, colors, label,
}: {
  palette: typeof PALETTES[0];
  isSelected: boolean;
  onPress: () => void;
  colors: any;
  label: string;
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
    <Animated.View style={{ transform: [{ scale }], width: CARD_W }}>
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

// ── PaletteGrid — tabs Clásico/Pastel + grid, embebible en cualquier pantalla ──
interface PaletteGridProps {
  colors: any;
  paletteId: PaletteId;
  setPaletteId: (id: PaletteId) => void;
  t: any;
}

export default function PaletteGrid({ colors, paletteId, setPaletteId, t }: PaletteGridProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [displayIdx, setDisplayIdx] = useState(0);
  const contentOpacity = useRef(new Animated.Value(1)).current;

  const switchGroup = (idx: number) => {
    if (idx === activeIdx) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveIdx(idx);
    Animated.timing(contentOpacity, { toValue: 0, duration: 90, useNativeDriver: Platform.OS !== 'web' }).start(() => {
      setDisplayIdx(idx);
      Animated.timing(contentOpacity, { toValue: 1, duration: 160, useNativeDriver: Platform.OS !== 'web' }).start();
    });
  };

  const currentGroup = PALETTE_GROUPS[displayIdx];

  return (
    <View>
      <AppSegmentedControl
        segments={PALETTE_GROUPS.map((g) => ({ key: g.key, label: t(g.labelKey) }))}
        activeKey={PALETTE_GROUPS[activeIdx].key}
        onChange={(key) => {
          const idx = PALETTE_GROUPS.findIndex((g) => g.key === key);
          if (idx !== -1) switchGroup(idx);
        }}
        style={styles.tabBarSpacing}
      />
      <Animated.View style={[styles.grid, { opacity: contentOpacity }]}>
        {currentGroup.ids.map((id) => {
          const palette = PALETTES.find((p) => p.id === id)!;
          return (
            <PaletteCard
              key={id}
              palette={palette}
              isSelected={paletteId === id}
              onPress={() => setPaletteId(id)}
              colors={colors}
              label={t(`profile.palette.${id}`)}
            />
          );
        })}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarSpacing: { marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
