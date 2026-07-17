import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AppIcon, { AppIconName } from '../../components/AppIcon';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { router } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useFlags } from '../../context/FeatureFlagsContext';
import { useAuthStore } from '../../store/authStore';
import { useCategories } from '../../hooks/useCategories';
import AppHeader from '../../components/AppHeader';
import PageTitle from '../../components/PageTitle';
import ScreenBackground from '../../components/ScreenBackground';
import ScreenTransition from '../../components/ScreenTransition';
import FeaturePausedSheet from '../../components/FeaturePausedSheet';
import { Fonts } from '../../config/fonts';

const GOLD = '#F5A623';

// Chip de ícono con glow (firma Aurora Ledger).
function IconChip({ emoji, size, colors, locked }: { emoji: string; size: number; colors: any; locked?: boolean }) {
  const tint = locked ? GOLD : colors.primary;
  return (
    <View
      style={[
        { width: size, height: size, borderRadius: size * 0.3, alignItems: 'center', justifyContent: 'center', backgroundColor: tint + '1E' },
        Platform.OS === 'web'
          ? ({ boxShadow: `0 0 18px ${tint}44` } as any)
          : { shadowColor: tint, shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
      ]}
    >
      <Text style={{ fontSize: size * 0.46 }}>{emoji}</Text>
    </View>
  );
}

function PremiumBadge({ compact }: { compact?: boolean }) {
  return (
    <View style={[styles.premBadge, compact && styles.premBadgeCompact, { borderColor: GOLD + '59', backgroundColor: GOLD + '22' }]}>
      <AppIcon name="star" size={compact ? 9 : 10} color={GOLD} />
      {!compact && <Text style={[styles.premBadgeText, { color: GOLD }]}>Premium</Text>}
    </View>
  );
}

// Herramienta destacada (hero de la vista).
function FeaturedTool({ emoji, title, description, ctaLabel, onPress, colors, isDark, premiumLocked, disabled }: {
  emoji: string; title: string; description: string; ctaLabel: string; onPress: () => void; colors: any; isDark: boolean; premiumLocked?: boolean; disabled?: boolean;
}) {
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={[styles.feat, { borderColor: (premiumLocked ? GOLD : colors.primary) + '33', opacity: disabled ? 0.55 : 1 }]}>
      <LinearGradient
        colors={[colors.primary + (isDark ? '30' : '24'), colors.tertiary + '10', 'transparent']}
        start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.featTopRow}>
        <IconChip emoji={emoji} size={48} colors={colors} locked={premiumLocked} />
        {premiumLocked && <PremiumBadge />}
        {disabled && !premiumLocked && (
          <View style={[styles.pauseChip, { backgroundColor: colors.surface, borderColor: colors.textSecondary + '40' }]}>
            <AppIcon name="pause-circle" size={13} color={colors.textSecondary} />
          </View>
        )}
      </View>
      <Text style={[styles.featTitle, { color: colors.textPrimary }]}>{title}</Text>
      <Text style={[styles.featDesc, { color: colors.textSecondary }]}>{description}</Text>
      {!disabled && (
        <LinearGradient colors={[colors.primary, colors.primaryDark ?? colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.featCta}>
          <Text style={[styles.featCtaText, { color: colors.onPrimary }]}>{ctaLabel}</Text>
          <AppIcon name="arrow-forward" size={15} color={colors.onPrimary} />
        </LinearGradient>
      )}
    </TouchableOpacity>
  );
}

// Tile del bento grid.
function ToolTile({ emoji, title, description, metric, onPress, colors, isDark, premiumLocked, disabled, wide }: {
  emoji: string; title: string; description: string; metric?: string; onPress: () => void; colors: any; isDark: boolean; premiumLocked?: boolean; disabled?: boolean; wide?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={disabled ? 1 : 0.8}
      onPress={onPress}
      style={[
        styles.tile,
        wide ? styles.tileWide : styles.tileHalf,
        { backgroundColor: colors.surface, borderColor: (premiumLocked ? GOLD : colors.primary) + '24', opacity: disabled ? 0.5 : 1 },
      ]}
    >
      <View style={styles.tileTopRow}>
        <IconChip emoji={emoji} size={42} colors={colors} locked={premiumLocked} />
        {premiumLocked && <PremiumBadge compact />}
        {disabled && !premiumLocked && (
          <View style={[styles.pauseChip, { backgroundColor: colors.surface, borderColor: colors.textSecondary + '40' }]}>
            <AppIcon name="pause-circle" size={12} color={colors.textSecondary} />
          </View>
        )}
      </View>
      <Text style={[styles.tileTitle, { color: colors.textPrimary }]}>{title}</Text>
      <Text style={[styles.tileDesc, { color: colors.textTertiary }]} numberOfLines={2}>{description}</Text>
      {metric && <Text style={[styles.tileMetric, { color: colors.primary }]}>{metric}</Text>}
    </TouchableOpacity>
  );
}

function GroupHeader({ label, colors }: { label: string; colors: any }) {
  return (
    <View style={styles.grp}>
      <Text style={[styles.grpText, { color: colors.textTertiary }]}>{label}</Text>
      <View style={[styles.grpLine, { backgroundColor: colors.border }]} />
    </View>
  );
}

export default function ToolsScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { flags } = useFlags();
  const { isPremium, user } = useAuthStore();
  const { categories } = useCategories(user?.uid ?? '');
  const [pausedFeature, setPausedFeature] = useState<string | null>(null);

  const paused = (name: string) => () => setPausedFeature(name);

  return (
    <ScreenTransition>
      <SafeAreaView style={styles.safe}>
        <ScreenBackground>
          <AppHeader />
          <PageTitle title={t('tools.title')} description={t('tools.pageDesc2')} />
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

            {/* Destacado: Presupuesto */}
            <FeaturedTool
              emoji="📊"
              title={t('tools.budgetCard.title')}
              description={t('tools.budgetCard.description')}
              ctaLabel={t('tools.open')}
              colors={colors}
              isDark={isDark}
              premiumLocked={!isPremium}
              disabled={isPremium && !flags.budgetsEnabled}
              onPress={
                !isPremium
                  ? () => router.push('/upgrade' as any)
                  : flags.budgetsEnabled
                  ? () => router.push('/budget' as any)
                  : paused(t('tools.budgetCard.title'))
              }
            />

            {/* Tu dinero */}
            <GroupHeader label={t('tools.groupMoney')} colors={colors} />
            <View style={styles.grid}>
              <ToolTile
                emoji="🎯"
                title={t('tools.goalsCard.title')}
                description={t('tools.goalsCard.description')}
                onPress={flags.goalsEnabled ? () => router.push('/goals') : paused(t('tools.goalsCard.title'))}
                disabled={!flags.goalsEnabled}
                colors={colors} isDark={isDark}
              />
              <ToolTile
                emoji="🔁"
                title={t('tools.recurringCard.title')}
                description={t('tools.recurringCard.description')}
                onPress={() => router.push('/recurring')}
                colors={colors} isDark={isDark}
              />
              <ToolTile
                emoji="📂"
                title={t('tools.categoriesCard.title')}
                description={t('tools.categoriesCard.description')}
                metric={categories.length > 0 ? t('tools.categoriesCount', { count: categories.length }) : undefined}
                onPress={flags.categoriesEnabled ? () => router.push('/categories') : paused(t('tools.categoriesCard.title'))}
                disabled={!flags.categoriesEnabled}
                colors={colors} isDark={isDark}
              />
              <ToolTile
                emoji="📄"
                title={t('tools.reportsCard.title')}
                description={t('tools.reportsCard.description')}
                onPress={flags.reportsEnabled ? () => router.push('/reports') : paused(t('tools.reportsCard.title'))}
                disabled={!flags.reportsEnabled}
                colors={colors} isDark={isDark}
                wide
              />
            </View>

            {/* Compartido (premium) */}
            {isPremium && (
              <>
                <GroupHeader label={t('tools.groupShared')} colors={colors} />
                <View style={styles.grid}>
                  <ToolTile
                    emoji="👥"
                    title={t('tools.friendReportCard.title')}
                    description={t('tools.friendReportCard.description')}
                    onPress={flags.friendsEnabled ? () => router.push('/friend-report') : paused(t('tools.friendReportCard.title'))}
                    disabled={!flags.friendsEnabled}
                    colors={colors} isDark={isDark}
                  />
                  <ToolTile
                    emoji="🧳"
                    title={t('tools.expenseGroupsCard.title')}
                    description={t('tools.expenseGroupsCard.description')}
                    onPress={flags.expenseGroupsEnabled ? () => router.push('/expense-groups') : paused(t('tools.expenseGroupsCard.title'))}
                    disabled={!flags.expenseGroupsEnabled}
                    colors={colors} isDark={isDark}
                  />
                </View>
              </>
            )}
          </ScrollView>
        </ScreenBackground>
      </SafeAreaView>

      <FeaturePausedSheet
        visible={!!pausedFeature}
        featureName={pausedFeature ?? ''}
        onClose={() => setPausedFeature(null)}
      />
    </ScreenTransition>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 110, width: '100%', maxWidth: 768, alignSelf: 'center' },

  // Featured
  feat: { borderRadius: 24, borderWidth: 1, padding: 18, overflow: 'hidden', position: 'relative', marginBottom: 8 },
  featTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  featTitle: { fontSize: 19, fontFamily: Fonts.bold, marginTop: 14 },
  featDesc: { fontSize: 13, fontFamily: Fonts.regular, lineHeight: 19, marginTop: 4 },
  featCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, height: 44, borderRadius: 14 },
  featCtaText: { fontSize: 14, fontFamily: Fonts.bold },

  // Grid
  grp: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 22, marginBottom: 12, paddingHorizontal: 2 },
  grpText: { fontSize: 11, fontFamily: Fonts.bold, letterSpacing: 1.6, textTransform: 'uppercase' },
  grpLine: { flex: 1, height: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { borderRadius: 20, borderWidth: 1, padding: 15, overflow: 'hidden', position: 'relative', minHeight: 132 },
  tileHalf: { width: '48%', flexGrow: 1 },
  tileWide: { width: '100%' },
  tileTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  tileTitle: { fontSize: 15, fontFamily: Fonts.bold, marginTop: 12 },
  tileDesc: { fontSize: 12, fontFamily: Fonts.regular, lineHeight: 16, marginTop: 3 },
  tileMetric: { fontSize: 12, fontFamily: Fonts.bold, marginTop: 8 },

  // Badges
  premBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  premBadgeCompact: { paddingHorizontal: 5, paddingVertical: 5, borderRadius: 20 },
  premBadgeText: { fontSize: 9, fontFamily: Fonts.bold },
  pauseChip: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
