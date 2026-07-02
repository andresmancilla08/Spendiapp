import { useRef, useState, useEffect, type ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { useTheme, type BackgroundStyle, type AuroraIntensity } from '../context/ThemeContext';
import { useAuthStore } from '../store/authStore';
import { updateUserColorPalette } from '../hooks/useUserProfile';
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

const BACKGROUND_STYLES: BackgroundStyle[] = ['none', 'aurora', 'particles', 'waves'];

// ── Tarjeta de fondo con vista previa EN VIVO (renderiza el efecto real, no un mockup) ──
function BackgroundPreviewCard({ styleKey, label, selected, onPress }: {
  styleKey: BackgroundStyle; label: string; selected: boolean; onPress: () => void;
}) {
  const { colors } = useTheme();
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
      <View style={[styles.bgPreviewBox, { backgroundColor: colors.background }]}>
        {styleKey === 'aurora' && <AuroraBackground intensity="default" />}
        {styleKey === 'particles' && <ParticlesBackground intensity="default" />}
        {styleKey === 'waves' && <WavesBackground intensity="default" />}
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

const INTENSITY_OPTIONS: AuroraIntensity[] = ['subtle', 'default', 'intense'];

export default function PersonalizationScreen() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const {
    colors, paletteId, setPaletteId,
    backgroundStyle, setBackgroundStyle, backgroundIntensity, setBackgroundIntensity,
    cardSheen, setCardSheen, cardGlass, setCardGlass,
    tickerFont, setTickerFont, countUpAnim, setCountUpAnim,
    streakConfetti, setStreakConfetti,
  } = useTheme();

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

            <AccordionSection icon="card-outline" title={t('personalization.sectionCards')}>
              <View style={styles.rowsWrap}>
                <SwitchRow
                  icon="sparkles-outline"
                  label={t('personalization.cardSheen.label')}
                  sub={t('personalization.cardSheen.sub')}
                  value={cardSheen}
                  onValueChange={setCardSheen}
                />
                <SwitchRow
                  icon="diamond-outline"
                  label={t('personalization.cardGlass.label')}
                  sub={t('personalization.cardGlass.sub')}
                  value={cardGlass}
                  onValueChange={setCardGlass}
                  isLast
                />
              </View>
            </AccordionSection>

            <AccordionSection icon="cash-outline" title={t('personalization.sectionNumbers')}>
              <View style={styles.rowsWrap}>
                <SwitchRow
                  icon="cash-outline"
                  label={t('personalization.tickerFont.label')}
                  sub={t('personalization.tickerFont.sub')}
                  value={tickerFont}
                  onValueChange={setTickerFont}
                />
                <SwitchRow
                  icon="refresh-outline"
                  label={t('personalization.countUp.label')}
                  sub={t('personalization.countUp.sub')}
                  value={countUpAnim}
                  onValueChange={setCountUpAnim}
                  isLast
                />
              </View>
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
