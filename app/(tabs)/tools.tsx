import { useState, type ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';

import AppIcon, { AppIconName } from '../../components/AppIcon';
import AppHeader from '../../components/AppHeader';
import PageTitle from '../../components/PageTitle';
import ScreenBackground from '../../components/ScreenBackground';
import ScreenTransition from '../../components/ScreenTransition';
import FeaturePausedSheet from '../../components/FeaturePausedSheet';
import { scrollFadeMask } from '../../components/ScrollFadeEdges';
import { TAB_BAR_SPACE } from '../../components/AppTabBar';
import {
  GoalsMetric, RecurringMetric, CategoriesMetric, BudgetMetric, GroupsMetric,
} from '../../components/tools/ToolMetrics';

import { Fonts } from '../../config/fonts';
import { useTheme } from '../../context/ThemeContext';
import { useFlags } from '../../context/FeatureFlagsContext';
import { useAuthStore } from '../../store/authStore';
import { mixHex, readableTint } from '../../utils/contrast';

/**
 * Herramientas — agrupadas por INTENCIÓN, no por permiso.
 *
 * Antes los grupos eran «Tu dinero» y «Compartido», y el segundo estaba dentro
 * de `{isPremium && ...}`: la pantalla que debía vender el plan de pago era la
 * única que escondía lo que vende. Ahora los grupos dicen qué quiere hacer el
 * usuario —planear, entender, compartir— y lo bloqueado se DIBUJA bloqueado.
 *
 * Dos cosas que se fueron y no vuelven:
 *  · el oro `#F5A623` quemado, que peleaba contra las 32 paletas del usuario
 *    (en una paleta fría se leía como error);
 *  · `opacity: 0.5` para apagar, que hacía que tres banderas apagadas
 *    parecieran una app rota en vez de una app configurada.
 */

type ToolState = 'ready' | 'locked' | 'paused';

interface Tool {
  key: string;
  icon: AppIconName;
  title: string;
  description: string;
  route: string;
  state: ToolState;
  /** Solo se monta si la herramienta está lista: una tesela bloqueada no consulta nada. */
  metric?: ReactNode;
}

function ToolTile({ tool, colors, onPress }: { tool: Tool; colors: any; onPress: () => void }) {
  const { t } = useTranslation();
  const locked = tool.state === 'locked';
  const paused = tool.state === 'paused';
  const muted = locked || paused;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={tool.title}
      accessibilityHint={locked ? t('tools.lockedHint') : paused ? t('tools.pausedHint') : undefined}
      style={[
        styles.tile,
        {
          backgroundColor: muted ? colors.backgroundSecondary : colors.surface,
          borderColor: colors.border,
        },
        paused && styles.tilePaused,
      ]}
    >
      <View style={styles.tileTop}>
        <AppIcon name={tool.icon} size={19} color={muted ? colors.textTertiary : colors.primary} />
        {paused && (
          <Text style={[styles.micro, { color: colors.textTertiary }]}>{t('tools.paused')}</Text>
        )}
      </View>
      <Text style={[styles.tileTitle, { color: muted ? colors.textSecondary : colors.textPrimary }]}>
        {tool.title}
      </Text>
      <Text style={[styles.tileDesc, { color: colors.textTertiary }]} numberOfLines={2}>
        {tool.description}
      </Text>
      {tool.metric}
    </TouchableOpacity>
  );
}

export default function ToolsScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { flags } = useFlags();
  const { isPremium, user } = useAuthStore();
  const uid = user?.uid ?? '';
  const [pausedFeature, setPausedFeature] = useState<string | null>(null);

  const ruleInk = mixHex(colors.border, colors.textPrimary, isDark ? 0.22 : 0.18);
  const accessInk = readableTint(colors.primary, colors.surface, 4.5);

  /** `web` marca lo que se dibuja en <canvas> y no existe en nativo. */
  const isWeb = Platform.OS === 'web';

  const stateOf = (enabled: boolean, premium: boolean): ToolState =>
    premium && !isPremium ? 'locked' : enabled ? 'ready' : 'paused';

  const budgetState = stateOf(flags.budgetsEnabled, true);
  const goalsState = stateOf(flags.goalsEnabled, false);
  const simState = stateOf(flags.simulatorEnabled, false);
  const recurringState: ToolState = 'ready';
  const catState = stateOf(flags.categoriesEnabled, false);
  const reportState = stateOf(flags.reportsEnabled, false);
  const friendState = stateOf(flags.friendsEnabled, true);
  const groupState = stateOf(flags.expenseGroupsEnabled, true);

  const GROUPS: { key: string; label: string; tools: Tool[] }[] = [
    {
      key: 'plan',
      label: t('tools.groupPlan'),
      tools: [
        { key: 'budget', icon: 'stats-chart-outline', title: t('tools.budgetCard.title'), description: t('tools.budgetCard.description'), route: '/budget', state: budgetState,
          metric: budgetState === 'ready' ? <BudgetMetric uid={uid} /> : undefined },
        { key: 'goals', icon: 'flag', title: t('tools.goalsCard.title'), description: t('tools.goalsCard.description'), route: '/goals', state: goalsState,
          metric: goalsState === 'ready' ? <GoalsMetric uid={uid} /> : undefined },
        { key: 'sim', icon: 'calculator-outline', title: t('tools.simulatorCard.title'), description: t('tools.simulatorCard.description'), route: '/purchase-simulator', state: simState },
      ],
    },
    {
      key: 'understand',
      label: t('tools.groupUnderstand'),
      tools: [
        { key: 'recurring', icon: 'repeat', title: t('tools.recurringCard.title'), description: t('tools.recurringCard.description'), route: '/recurring', state: recurringState,
          metric: <RecurringMetric uid={uid} /> },
        { key: 'categories', icon: 'grid-outline', title: t('tools.categoriesCard.title'), description: t('tools.categoriesCard.description'), route: '/categories', state: catState,
          metric: catState === 'ready' ? <CategoriesMetric uid={uid} /> : undefined },
        ...(isWeb ? [{ key: 'reports', icon: 'document-text-outline' as AppIconName, title: t('tools.reportsCard.title'), description: t('tools.reportsCard.description'), route: '/reports', state: reportState }] : []),
      ],
    },
    {
      key: 'share',
      label: t('tools.groupShare'),
      tools: [
        ...(isWeb ? [{ key: 'friendReport', icon: 'people-outline' as AppIconName, title: t('tools.friendReportCard.title'), description: t('tools.friendReportCard.description'), route: '/friend-report', state: friendState }] : []),
        { key: 'groups', icon: 'people-circle-outline', title: t('tools.expenseGroupsCard.title'), description: t('tools.expenseGroupsCard.description'), route: '/expense-groups', state: groupState,
          metric: groupState === 'ready' ? <GroupsMetric uid={uid} /> : undefined },
      ],
    },
  ];

  const lockedCount = GROUPS.flatMap((g) => g.tools).filter((x) => x.state === 'locked').length;

  const open = (tool: Tool) => {
    if (tool.state === 'locked') { router.push('/upgrade' as never); return; }
    if (tool.state === 'paused') { setPausedFeature(tool.title); return; }
    router.push(tool.route as never);
  };

  return (
    <ScreenTransition>
      <SafeAreaView style={styles.safe}>
        <ScreenBackground>
          <AppHeader />
          <PageTitle title={t('tools.title')} description={t('tools.pageDesc2')} />

          <ScrollView
            style={scrollFadeMask(0, 74)}
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            {GROUPS.map((g) => (
              g.tools.length === 0 ? null : (
                <View key={g.key}>
                  <View style={styles.groupHead}>
                    <Text style={[styles.groupLabel, { color: accessInk }]}>{g.label}</Text>
                    <View style={[styles.groupRule, { backgroundColor: ruleInk }]} />
                  </View>
                  <View style={styles.grid}>
                    {g.tools.map((tool) => (
                      <ToolTile key={tool.key} tool={tool} colors={colors} onPress={() => open(tool)} />
                    ))}
                  </View>
                </View>
              )
            ))}

            {/* ── Franja de acceso ──
                Lo bloqueado ya se ve dentro de su grupo; esto es la vía para
                desbloquearlo, una sola vez y sin esconder nada. La barra está a
                cero a propósito: es una cerradura, no un progreso falso. */}
            {lockedCount > 0 && (
              <TouchableOpacity
                onPress={() => router.push('/upgrade' as never)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={t('tools.accessCta')}
                style={[styles.access, { borderColor: colors.primary + '55', backgroundColor: colors.surface }]}
              >
                <View style={styles.accessTop}>
                  <Text style={[styles.accessTitle, { color: colors.textPrimary }]}>
                    {t('tools.accessTitle')}
                  </Text>
                  <Text style={[styles.accessCount, { color: colors.textTertiary }]}>
                    {t('tools.accessCount', { n: lockedCount })}
                  </Text>
                </View>
                <View style={[styles.accessBar, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.accessCta, { color: accessInk }]}>{t('tools.accessCta')}</Text>
                </View>
              </TouchableOpacity>
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
  scroll: { padding: 16, paddingTop: 4, paddingBottom: TAB_BAR_SPACE, width: '100%', maxWidth: 768, alignSelf: 'center' },

  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20, marginBottom: 11 },
  groupLabel: { fontSize: 10.5, fontFamily: Fonts.bold, letterSpacing: 1.6, textTransform: 'uppercase' },
  groupRule: { flex: 1, height: 1 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '48%', flexGrow: 1, minHeight: 116, borderRadius: 16, borderWidth: 1, padding: 13 },
  // Apagado se dibuja apagado, nunca con opacidad: el borde discontinuo dice
  // «esto volverá», la translucidez decía «esto falló».
  tilePaused: { borderStyle: 'dashed' },
  tileTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 20 },
  micro: { fontSize: 8.5, fontFamily: Fonts.monoBold, letterSpacing: 1.1, textTransform: 'uppercase' },
  tileTitle: { fontSize: 13.5, fontFamily: Fonts.bold, marginTop: 9 },
  tileDesc: { fontSize: 11, fontFamily: Fonts.regular, lineHeight: 15, marginTop: 3 },

  access: { marginTop: 24, borderRadius: 16, borderWidth: 1, padding: 14 },
  accessTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 },
  accessTitle: { fontSize: 14, fontFamily: Fonts.bold },
  accessCount: { fontSize: 9.5, fontFamily: Fonts.bold, letterSpacing: 1.1, textTransform: 'uppercase' },
  accessBar: { height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  accessCta: { fontSize: 12, fontFamily: Fonts.bold, letterSpacing: 0.5 },
});
