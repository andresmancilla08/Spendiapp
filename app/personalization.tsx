import { useRef, useState, useEffect, type ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Animated, Easing, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import AppIcon, { AppIconName } from '../components/AppIcon';
import AppHeader from '../components/AppHeader';
import PageTitle from '../components/PageTitle';
import ScreenBackground from '../components/ScreenBackground';
import ScreenTransition from '../components/ScreenTransition';
import AppSegmentedControl from '../components/AppSegmentedControl';
import PaletteGrid from '../components/PaletteGrid';
import AuroraBackground from '../components/AuroraBackground';
import ParticlesBackground from '../components/ParticlesBackground';
import WavesBackground from '../components/WavesBackground';
import GrainBackground from '../components/GrainBackground';
import MeshBackground from '../components/MeshBackground';
import BokehBackground from '../components/BokehBackground';
import { useTheme, type BackgroundStyle, type AuroraIntensity, type IconStroke, type ChartSpeed } from '../context/ThemeContext';
import { useAuthStore } from '../store/authStore';
import { updateUserColorPalette } from '../hooks/useUserProfile';
import { Sparkline } from '../components/BalanceCard';
import { Fonts } from '../config/fonts';

// ── Acordeón — cada sección se expande/contrae de forma independiente ───────
function AccordionSection({ icon, title, defaultOpen, children }: {
  icon: AppIconName; title: string; defaultOpen?: boolean; children: ReactNode;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(!!defaultOpen);
  const [contentH, setContentH] = useState(0);
  const anim = useRef(new Animated.Value(defaultOpen ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: open ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [open]);

  return (
    <View style={[styles.accordion, { backgroundColor: colors.surface }]}>
      <TouchableOpacity
        style={styles.accordionHeader}
        onPress={() => setOpen((o) => !o)}
        activeOpacity={0.7}
      >
        <View style={[styles.accordionIconWrap, { backgroundColor: colors.primary + '18' }]}>
          <AppIcon name={icon} size={17} color={colors.primary} />
        </View>
        <Text style={[styles.accordionTitle, { color: colors.textPrimary }]}>{title}</Text>
        <AppIcon name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textTertiary} />
      </TouchableOpacity>
      <Animated.View style={{ height: anim.interpolate({ inputRange: [0, 1], outputRange: [0, contentH] }), overflow: 'hidden' }}>
        <View
          style={styles.accordionContent}
          onLayout={(e) => { const h = e.nativeEvent.layout.height; if (h && Math.abs(h - contentH) > 1) setContentH(h); }}
        >
          {children}
        </View>
      </Animated.View>
    </View>
  );
}

function SwitchRow({ icon, label, sub, value, onValueChange, isLast }: {
  icon: AppIconName; label: string; sub: string; value: boolean; onValueChange: (v: boolean) => void; isLast?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <>
      <View style={styles.optionRow}>
        <View style={[styles.optionIconWrap, { backgroundColor: colors.primary + '18' }]}>
          <AppIcon name={icon} size={18} color={colors.primary} />
        </View>
        <View style={styles.optionMeta}>
          <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>{label}</Text>
          <Text style={[styles.optionSub, { color: colors.textSecondary }]}>{sub}</Text>
        </View>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#FFFFFF"
        />
      </View>
      {!isLast && <View style={[styles.optionDivider, { backgroundColor: colors.border }]} />}
    </>
  );
}

const BACKGROUND_STYLES: BackgroundStyle[] = ['none', 'aurora', 'particles', 'waves', 'grain', 'mesh', 'bokeh'];

// ── Tarjeta de fondo con vista previa EN VIVO (renderiza el efecto real a la
// intensidad seleccionada, no un mockup) ──
function BackgroundPreviewCard({ styleKey, label, selected, intensity, onPress }: {
  styleKey: BackgroundStyle; label: string; selected: boolean; intensity: AuroraIntensity; onPress: () => void;
}) {
  const { colors, isDark } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.bgCard,
        {
          backgroundColor: colors.surfaceSecondary,
          borderColor: selected ? colors.primary : 'transparent',
        },
      ]}
    >
      <View style={[styles.bgPreviewBox, { backgroundColor: isDark ? colors.background : colors.backgroundSecondary }]}>
        {/* key={intensity} → remonta el efecto al cambiar la intensidad, para que la vista previa refleje el cambio al instante */}
        {styleKey === 'aurora' && <AuroraBackground key={intensity} intensity={intensity} />}
        {styleKey === 'particles' && <ParticlesBackground key={intensity} intensity={intensity} />}
        {styleKey === 'waves' && <WavesBackground key={intensity} intensity={intensity} />}
        {styleKey === 'grain' && <GrainBackground key={intensity} intensity={intensity} />}
        {styleKey === 'mesh' && <MeshBackground key={intensity} intensity={intensity} />}
        {styleKey === 'bokeh' && <BokehBackground key={intensity} intensity={intensity} />}
        {styleKey === 'none' && (
          <View style={styles.bgNoneWrap}>
            <AppIcon name="close-outline" size={18} color={colors.textTertiary} />
          </View>
        )}
      </View>
      <Text style={[styles.bgCardLabel, { color: selected ? colors.primary : colors.textSecondary }]} numberOfLines={1}>
        {label}
      </Text>
      {selected && (
        <View style={[styles.bgCheckBadge, { backgroundColor: colors.primary }]}>
          <AppIcon name="checkmark" size={9} color="#FFFFFF" />
        </View>
      )}
    </TouchableOpacity>
  );
}

const ICON_STROKE_OPTIONS: { key: IconStroke; labelKey: string }[] = [
  { key: 1.5, labelKey: 'thin' },
  { key: 2, labelKey: 'regular' },
  { key: 2.5, labelKey: 'bold' },
];

// ── Vista previa en vivo del brillo (barrido de luz) — réplica fiel de la
// tarjeta real que lo recibe hoy en Home: "Gastos por categoría" (el balance
// premium ya no tiene caja, así que ya no es el ejemplo correcto). ──
function CardEffectPreview({ sheen }: { sheen: boolean }) {
  const { colors, isDark } = useTheme();
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!sheen) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }),
        Animated.delay(1100),
        Animated.timing(sweep, { toValue: 0, duration: 0, useNativeDriver: Platform.OS !== 'web' }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [sheen, sweep]);

  const sweepX = sweep.interpolate({ inputRange: [0, 1], outputRange: [-70, 260] });
  const rows: { label: string; pct: number; color: string }[] = [
    { label: 'Alimentación', pct: 62, color: colors.primary },
    { label: 'Transporte', pct: 34, color: colors.tertiary },
  ];

  const inner = (
    <View
      style={[
        styles.previewCard,
        { backgroundColor: colors.surface, borderColor: isDark ? colors.primary + '20' : colors.border },
      ]}
    >
      <LinearGradient
        colors={[colors.primary + '16', 'transparent', colors.primary + '0A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <Text style={[styles.previewLabel, { color: colors.textTertiary, marginBottom: 12 }]}>GASTOS POR CATEGORÍA</Text>
      {rows.map((r) => (
        <View key={r.label} style={styles.previewCatRow}>
          <View style={styles.previewCatTop}>
            <View style={[styles.previewDot, { backgroundColor: r.color }]} />
            <Text style={[styles.previewCatLabel, { color: colors.textPrimary }]}>{r.label}</Text>
            <Text style={[styles.previewCatPct, { color: colors.textTertiary }]}>{r.pct}%</Text>
          </View>
          <View style={[styles.previewTrack, { backgroundColor: colors.border }]}>
            <View style={[styles.previewFill, { width: `${r.pct}%`, backgroundColor: r.color }]} />
          </View>
        </View>
      ))}
      {sheen && (
        <Animated.View pointerEvents="none" style={[styles.previewSheen, { transform: [{ translateX: sweepX }, { rotate: '18deg' }] }]}>
          <LinearGradient
            colors={['transparent', isDark ? 'rgba(255,255,255,0.20)' : colors.primary + '38', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
    </View>
  );

  return <View style={styles.previewWrap}>{inner}</View>;
}

const INTENSITY_OPTIONS: AuroraIntensity[] = ['subtle', 'default', 'intense'];
const CHART_SPEED_OPTIONS: ChartSpeed[] = ['slow', 'normal', 'fast'];
const CHART_PREVIEW_VALUES = [1080, 1240, 1190, 1340, 1284];

export default function PersonalizationScreen() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const {
    colors, paletteId, setPaletteId,
    backgroundStyle, setBackgroundStyle, backgroundIntensity, setBackgroundIntensity,
    cardSheen, setCardSheen,
    iconStroke, setIconStroke,
    streakConfetti, setStreakConfetti,
    chartPulse, setChartPulse, chartSpeed, setChartSpeed,
  } = useTheme();
  const pulseDuration = chartSpeed === 'slow' ? 6500 : chartSpeed === 'normal' ? 4200 : 2600;

  const handleSetPaletteId = (id: typeof paletteId) => {
    setPaletteId(id);
    if (user?.uid) updateUserColorPalette(user.uid, id).catch(() => {});
  };

  return (
    <ScreenTransition>
      <SafeAreaView style={styles.safe}>
        <ScreenBackground>
          <AppHeader showBack />
          <PageTitle title={t('profile.palette.title')} description={t('profile.palette.subtitle')} />

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <AccordionSection icon="color-palette-outline" title={t('personalization.sectionPalette')}>
              <PaletteGrid colors={colors} paletteId={paletteId} setPaletteId={handleSetPaletteId} t={t} />
            </AccordionSection>

            <AccordionSection icon="image-outline" title={t('personalization.sectionBackground')}>
              <View style={styles.bgGrid}>
                {BACKGROUND_STYLES.map((key) => (
                  <BackgroundPreviewCard
                    key={key}
                    styleKey={key}
                    label={t(`personalization.background.${key}`)}
                    selected={backgroundStyle === key}
                    intensity={backgroundIntensity}
                    onPress={() => setBackgroundStyle(key)}
                  />
                ))}
              </View>
              {backgroundStyle !== 'none' && (
                <AppSegmentedControl
                  segments={INTENSITY_OPTIONS.map((i) => ({ key: i, label: t(`personalization.intensity.${i}`) }))}
                  activeKey={backgroundIntensity}
                  onChange={(key) => setBackgroundIntensity(key as AuroraIntensity)}
                  style={styles.intensitySpacing}
                />
              )}
            </AccordionSection>

            <AccordionSection icon="card-outline" title={t('personalization.sectionCards')} defaultOpen>
              <CardEffectPreview sheen={cardSheen} />
              <View style={styles.rowsWrap}>
                <SwitchRow
                  icon="sparkles-outline"
                  label={t('personalization.cardSheen.label')}
                  sub={t('personalization.cardSheen.sub')}
                  value={cardSheen}
                  onValueChange={setCardSheen}
                  isLast
                />
              </View>
            </AccordionSection>

            <AccordionSection icon="trending-up-outline" title={t('personalization.sectionChart')}>
              <View style={styles.chartPreviewWrap}>
                <Sparkline
                  key={`${chartPulse}-${chartSpeed}`}
                  values={CHART_PREVIEW_VALUES}
                  color={colors.primary}
                  accent={colors.primary}
                  height={64}
                  animate={chartPulse}
                  duration={pulseDuration}
                />
              </View>
              <View style={styles.rowsWrap}>
                <SwitchRow
                  icon="trending-up-outline"
                  label={t('personalization.chartPulse.label')}
                  sub={t('personalization.chartPulse.sub')}
                  value={chartPulse}
                  onValueChange={setChartPulse}
                  isLast
                />
              </View>
              {chartPulse && (
                <AppSegmentedControl
                  segments={CHART_SPEED_OPTIONS.map((s) => ({ key: s, label: t(`personalization.chartSpeed.${s}`) }))}
                  activeKey={chartSpeed}
                  onChange={(key) => setChartSpeed(key as ChartSpeed)}
                  style={styles.intensitySpacing}
                />
              )}
            </AccordionSection>

            <AccordionSection icon="options-outline" title={t('personalization.sectionIcons')}>
              <View style={styles.iconPreviewRow}>
                {(['home-outline', 'wallet-outline', 'card-outline', 'star-outline', 'person-outline'] as const).map((n) => (
                  <AppIcon key={n} name={n} size={24} color={colors.primary} strokeWidth={iconStroke} />
                ))}
              </View>
              <AppSegmentedControl
                segments={ICON_STROKE_OPTIONS.map((o) => ({ key: String(o.key), label: t(`personalization.iconStroke.${o.labelKey}`) }))}
                activeKey={String(iconStroke)}
                onChange={(key) => setIconStroke(Number(key) as IconStroke)}
                style={styles.intensitySpacing}
              />
            </AccordionSection>

            <AccordionSection icon="gift-outline" title={t('personalization.sectionCelebrations')}>
              <View style={styles.rowsWrap}>
                <SwitchRow
                  icon="gift-outline"
                  label={t('personalization.confetti.label')}
                  sub={t('personalization.confetti.sub')}
                  value={streakConfetti}
                  onValueChange={setStreakConfetti}
                  isLast
                />
              </View>
            </AccordionSection>

            <AccordionSection icon="flag-outline" title={t('personalization.roadmapTitle')}>
              <View style={styles.roadmapWrap}>
                {(t('personalization.roadmapItems', { returnObjects: true }) as string[]).map((item, i) => (
                  <View key={i} style={styles.roadmapRow}>
                    <AppIcon name="star-outline" size={13} color={colors.textTertiary} />
                    <Text style={[styles.roadmapText, { color: colors.textSecondary }]}>{item}</Text>
                  </View>
                ))}
              </View>
            </AccordionSection>
          </ScrollView>
        </ScreenBackground>
      </SafeAreaView>
    </ScreenTransition>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, paddingTop: 4, paddingBottom: 40, width: '100%', maxWidth: 640, alignSelf: 'center' },
  accordion: { borderRadius: 20, marginBottom: 10, overflow: 'hidden' },
  accordionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 15 },
  accordionIconWrap: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  accordionTitle: { flex: 1, fontSize: 14, fontFamily: Fonts.semiBold },
  accordionContent: { paddingHorizontal: 16, paddingBottom: 16 },
  intensitySpacing: { marginTop: 10 },
  bgGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  bgCard: { width: '47%', flexGrow: 1, borderRadius: 16, borderWidth: 2, padding: 8, alignItems: 'center' },
  bgPreviewBox: { width: '100%', height: 64, borderRadius: 10, overflow: 'hidden', position: 'relative', marginBottom: 8 },
  bgNoneWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bgCardLabel: { fontSize: 12, fontFamily: Fonts.semiBold },
  bgCheckBadge: { position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rowsWrap: { marginHorizontal: -16 },
  // Preview en vivo de efectos de tarjeta — réplica de "Gastos por categoría"
  previewWrap: { alignItems: 'center', marginBottom: 14 },
  chartPreviewWrap: { marginBottom: 14, paddingHorizontal: 4 },
  previewCard: { width: '100%', maxWidth: 320, borderRadius: 22, borderWidth: 1, paddingVertical: 18, paddingHorizontal: 18, overflow: 'hidden', position: 'relative' },
  previewLabel: { fontSize: 9, fontFamily: Fonts.bold, letterSpacing: 1.4 },
  previewCatRow: { marginBottom: 12 },
  previewCatTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  previewDot: { width: 8, height: 8, borderRadius: 3 },
  previewCatLabel: { flex: 1, fontSize: 13, fontFamily: Fonts.semiBold },
  previewCatPct: { fontSize: 12, fontFamily: Fonts.semiBold },
  previewTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  previewFill: { height: '100%', borderRadius: 3 },
  previewSheen: { position: 'absolute', top: -30, bottom: -30, width: 60 },
  iconPreviewRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 8, marginBottom: 4 },
  optionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  optionIconWrap: { width: 36, height: 36, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  optionMeta: { flex: 1, gap: 2 },
  optionLabel: { fontSize: 14, fontFamily: Fonts.medium },
  optionSub: { fontSize: 12, fontFamily: Fonts.regular, marginTop: 1 },
  optionDivider: { height: 1, marginLeft: 64 },
  roadmapWrap: { gap: 10 },
  roadmapRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  roadmapText: { flex: 1, fontSize: 13, fontFamily: Fonts.regular, lineHeight: 18 },
});
