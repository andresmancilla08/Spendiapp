import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import AppIcon, { AppIconName } from '../components/AppIcon';
import AppHeader from '../components/AppHeader';
import PageTitle from '../components/PageTitle';
import ScreenBackground from '../components/ScreenBackground';
import ScreenTransition from '../components/ScreenTransition';
import AppSegmentedControl from '../components/AppSegmentedControl';
import PaletteGrid from '../components/PaletteGrid';
import { useTheme, type BackgroundStyle, type AuroraIntensity } from '../context/ThemeContext';
import { useAuthStore } from '../store/authStore';
import { updateUserColorPalette } from '../hooks/useUserProfile';
import { Fonts } from '../config/fonts';

function SectionTitle({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionTitleRow}>
      <View style={[styles.sectionTitleAccent, { backgroundColor: colors.primary }]} />
      <Text style={[styles.sectionTitleText, { color: colors.textSecondary }]}>{label}</Text>
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

const BACKGROUND_OPTIONS: { key: BackgroundStyle; icon: AppIconName }[] = [
  { key: 'none', icon: 'close-outline' },
  { key: 'aurora', icon: 'sparkles-outline' },
  { key: 'particles', icon: 'flash-outline' },
  { key: 'waves', icon: 'wifi-outline' },
];

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
            {/* Paleta de colores */}
            <SectionTitle label={t('personalization.sectionPalette')} />
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <PaletteGrid colors={colors} paletteId={paletteId} setPaletteId={handleSetPaletteId} t={t} />
            </View>

            {/* Fondo animado */}
            <SectionTitle label={t('personalization.sectionBackground')} />
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <AppSegmentedControl
                segments={BACKGROUND_OPTIONS.map((o) => ({ key: o.key, label: t(`personalization.background.${o.key}`), icon: o.icon }))}
                activeKey={backgroundStyle}
                onChange={(key) => setBackgroundStyle(key as BackgroundStyle)}
              />
              {backgroundStyle !== 'none' && (
                <AppSegmentedControl
                  segments={INTENSITY_OPTIONS.map((i) => ({ key: i, label: t(`personalization.intensity.${i}`) }))}
                  activeKey={backgroundIntensity}
                  onChange={(key) => setBackgroundIntensity(key as AuroraIntensity)}
                  style={styles.intensitySpacing}
                />
              )}
            </View>

            {/* Tarjetas */}
            <SectionTitle label={t('personalization.sectionCards')} />
            <View style={[styles.optionCard, { backgroundColor: colors.surface }]}>
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

            {/* Cifras */}
            <SectionTitle label={t('personalization.sectionNumbers')} />
            <View style={[styles.optionCard, { backgroundColor: colors.surface }]}>
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

            {/* Celebraciones */}
            <SectionTitle label={t('personalization.sectionCelebrations')} />
            <View style={[styles.optionCard, { backgroundColor: colors.surface }]}>
              <SwitchRow
                icon="gift-outline"
                label={t('personalization.confetti.label')}
                sub={t('personalization.confetti.sub')}
                value={streakConfetti}
                onValueChange={setStreakConfetti}
                isLast
              />
            </View>

            {/* Roadmap — sugerencias para próximas versiones */}
            <SectionTitle label={t('personalization.roadmapTitle')} />
            <View style={[styles.roadmapCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
              {(t('personalization.roadmapItems', { returnObjects: true }) as string[]).map((item, i) => (
                <View key={i} style={styles.roadmapRow}>
                  <AppIcon name="star-outline" size={13} color={colors.textTertiary} />
                  <Text style={[styles.roadmapText, { color: colors.textSecondary }]}>{item}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </ScreenBackground>
      </SafeAreaView>
    </ScreenTransition>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, paddingTop: 4, paddingBottom: 40, width: '100%', maxWidth: 640, alignSelf: 'center' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 8 },
  sectionTitleAccent: { width: 3, height: 14, borderRadius: 2 },
  sectionTitleText: { fontSize: 12, fontFamily: Fonts.bold, letterSpacing: 0.4 },
  card: { borderRadius: 20, padding: 16, marginBottom: 8 },
  intensitySpacing: { marginTop: 10 },
  optionCard: { borderRadius: 20, marginBottom: 8, overflow: 'hidden' },
  optionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, gap: 12 },
  optionIconWrap: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  optionMeta: { flex: 1, gap: 2 },
  optionLabel: { fontSize: 14, fontFamily: Fonts.medium },
  optionSub: { fontSize: 12, fontFamily: Fonts.regular, marginTop: 1 },
  optionDivider: { height: 1, marginLeft: 68 },
  roadmapCard: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 10 },
  roadmapRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  roadmapText: { flex: 1, fontSize: 13, fontFamily: Fonts.regular, lineHeight: 18 },
});
