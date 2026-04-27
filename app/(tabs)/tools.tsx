import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { router } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useFlags } from '../../context/FeatureFlagsContext';
import { useAuthStore } from '../../store/authStore';
import AppHeader from '../../components/AppHeader';
import PageTitle from '../../components/PageTitle';
import ScreenBackground from '../../components/ScreenBackground';
import ScreenTransition from '../../components/ScreenTransition';
import FeaturePausedSheet from '../../components/FeaturePausedSheet';
import { Fonts } from '../../config/fonts';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface ToolCardData {
  emoji: string;
  icon: IoniconsName;
  title: string;
  description: string;
  onPress: () => void;
  disabled?: boolean;
}

function ToolCard({
  emoji,
  title,
  description,
  onPress,
  colors,
  disabled,
}: ToolCardData & { colors: any }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={disabled ? 1 : 0.8}
      style={[
        styles.cardWrapper,
        {
          backgroundColor: colors.surface,
          borderColor: `${colors.primary}30`,
          borderWidth: 1,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: disabled ? 0.04 : 0.12,
          shadowRadius: 12,
          elevation: disabled ? 0 : 4,
          opacity: disabled ? 0.45 : 1,
        },
      ]}
    >
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
            <Text style={styles.emoji}>{emoji}</Text>
          </View>
          {disabled && (
            <View
              style={[
                styles.pauseBadge,
                {
                  backgroundColor: colors.surface,
                  borderColor: `${colors.textSecondary}40`,
                },
              ]}
            >
              <Ionicons name="pause-circle" size={14} color={colors.textSecondary} />
            </View>
          )}
        </View>
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{title}</Text>
          <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>{description}</Text>
        </View>
        {!disabled && (
          <View style={[styles.chevronWrap, { backgroundColor: `${colors.primary}12` }]}>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function ToolsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { flags } = useFlags();
  const { isPremium } = useAuthStore();
  const [pausedFeature, setPausedFeature] = useState<string | null>(null);

  const paused = (name: string) => () => setPausedFeature(name);

  return (
    <ScreenTransition>
      <SafeAreaView style={styles.safe}>
        <ScreenBackground>
          <AppHeader />
          <PageTitle title={t('tools.title')} description={t('tools.pageDesc')} />
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <ToolCard
              emoji="🎯"
              icon="flag"
              title={t('tools.goalsCard.title')}
              description={t('tools.goalsCard.description')}
              onPress={flags.goalsEnabled ? () => router.push('/goals') : paused(t('tools.goalsCard.title'))}
              disabled={!flags.goalsEnabled}
              colors={colors}
            />
            <ToolCard
              emoji="📂"
              icon="grid-outline"
              title={t('tools.categoriesCard.title')}
              description={t('tools.categoriesCard.description')}
              onPress={flags.categoriesEnabled ? () => router.push('/categories') : paused(t('tools.categoriesCard.title'))}
              disabled={!flags.categoriesEnabled}
              colors={colors}
            />
            <ToolCard
              emoji="📄"
              icon="document-text-outline"
              title={t('tools.reportsCard.title')}
              description={t('tools.reportsCard.description')}
              onPress={flags.reportsEnabled ? () => router.push('/reports') : paused(t('tools.reportsCard.title'))}
              disabled={!flags.reportsEnabled}
              colors={colors}
            />
            {isPremium && (
              <ToolCard
                emoji="👥"
                icon="people-outline"
                title={t('tools.friendReportCard.title')}
                description={t('tools.friendReportCard.description')}
                onPress={flags.friendsEnabled ? () => router.push('/friend-report') : paused(t('tools.friendReportCard.title'))}
                disabled={!flags.friendsEnabled}
                colors={colors}
              />
            )}
            {isPremium && (
              <ToolCard
                emoji="🧳"
                icon="people-outline"
                title={t('tools.expenseGroupsCard.title')}
                description={t('tools.expenseGroupsCard.description')}
                onPress={flags.expenseGroupsEnabled ? () => router.push('/expense-groups') : paused(t('tools.expenseGroupsCard.title'))}
                disabled={!flags.expenseGroupsEnabled}
                colors={colors}
              />
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
  scroll: { padding: 16, paddingBottom: 100, width: '100%', maxWidth: 768, alignSelf: 'center' },
  cardWrapper: { marginBottom: 12, borderRadius: 20 },
  card: {
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconContainer: { position: 'relative' },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 26 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontFamily: Fonts.bold, marginBottom: 3 },
  cardDesc: { fontSize: 13, fontFamily: Fonts.regular, lineHeight: 19 },
  chevronWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
