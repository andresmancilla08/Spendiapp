import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import AppHeader from '../../components/AppHeader';

export default function BudgetScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader showBack={false} />
      <View style={styles.body}>
        <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '600' }}>{t('budget.title')}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
