import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import AppHeader from '../../components/AppHeader';
import { Fonts } from '../../config/fonts';

export default function BudgetScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader showBack={false} />
      <View style={styles.body}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}15` }]}>
            <Ionicons name="wallet-outline" size={36} color={colors.primary} />
          </View>
          <Text style={[styles.badge, { color: colors.primary, backgroundColor: `${colors.primary}15` }]}>
            {t('budget.comingSoon')}
          </Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t('budget.title')}
          </Text>
          <Text style={[styles.desc, { color: colors.textSecondary }]}>
            {t('budget.comingSoonDesc')}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  badge: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    overflow: 'hidden',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 22,
    fontFamily: Fonts.bold,
    textAlign: 'center',
  },
  desc: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 4,
  },
});
