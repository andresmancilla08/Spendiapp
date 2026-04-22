// app/(tabs)/tools.tsx
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import AppHeader from '../../components/AppHeader';
import PageTitle from '../../components/PageTitle';
import ScreenBackground from '../../components/ScreenBackground';
import ScreenTransition from '../../components/ScreenTransition';
import { Fonts } from '../../config/fonts';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface ToolCardData {
  emoji: string;
  icon: IoniconsName;
  title: string;
  description: string;
  onPress: () => void;
}

function ToolCard({ emoji, icon, title, description, onPress, colors }: ToolCardData & { colors: any }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.cardWrapper,
        {
          backgroundColor: colors.surface,
          borderColor: `${colors.primary}30`,
          borderWidth: 1,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 12,
          elevation: 4,
        },
      ]}
    >
      <View style={styles.card}>
        <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
          <Text style={styles.emoji}>{emoji}</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{title}</Text>
          <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>{description}</Text>
        </View>
        <View style={[styles.chevronWrap, { backgroundColor: `${colors.primary}12` }]}>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function ToolsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

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
              onPress={() => router.push('/goals')}
              colors={colors}
            />
            <ToolCard
              emoji="📂"
              icon="grid-outline"
              title={t('tools.categoriesCard.title')}
              description={t('tools.categoriesCard.description')}
              onPress={() => router.push('/categories')}
              colors={colors}
            />
            <ToolCard
              emoji="📄"
              icon="document-text-outline"
              title={t('tools.reportsCard.title')}
              description={t('tools.reportsCard.description')}
              onPress={() => router.push('/reports')}
              colors={colors}
            />
            <ToolCard
              emoji="👥"
              icon="people-outline"
              title={t('tools.friendReportCard.title')}
              description={t('tools.friendReportCard.description')}
              onPress={() => router.push('/friend-report')}
              colors={colors}
            />
            <ToolCard
              emoji="🧳"
              icon="people-outline"
              title={t('tools.expenseGroupsCard.title')}
              description={t('tools.expenseGroupsCard.description')}
              onPress={() => router.push('/expense-groups')}
              colors={colors}
            />
          </ScrollView>
        </ScreenBackground>
      </SafeAreaView>
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
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
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
