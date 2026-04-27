import { ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { Fonts } from '../config/fonts';
import { usePremium } from '../hooks/usePremium';

interface PremiumGateProps {
  children: ReactNode;
  featureKey?: string;
}

export default function PremiumGate({ children }: PremiumGateProps) {
  const { isPremium, loading } = usePremium();
  const { colors } = useTheme();
  const { t } = useTranslation();

  if (loading) return null;
  if (isPremium) return <>{children}</>;

  return (
    <View style={[styles.lock, { backgroundColor: colors.surface, borderColor: `${colors.primary}30` }]}>
      <Ionicons name="star-outline" size={40} color={colors.primary} />
      <Text style={[styles.title, { color: colors.textPrimary }]}>{t('premium.lockedTitle')}</Text>
      <Text style={[styles.sub, { color: colors.textSecondary }]}>{t('premium.lockedSubtitle')}</Text>
      <TouchableOpacity
        style={[styles.btn, { backgroundColor: colors.primary }]}
        onPress={() => router.push('/upgrade' as any)}
        activeOpacity={0.85}
      >
        <Text style={[styles.btnText, { color: colors.onPrimary }]}>{t('premium.upgradeButton')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  lock: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, margin: 16, borderRadius: 20, borderWidth: 1, gap: 12 },
  title: { fontSize: 20, fontFamily: Fonts.bold, textAlign: 'center' },
  sub: { fontSize: 14, fontFamily: Fonts.regular, textAlign: 'center', lineHeight: 20 },
  btn: { height: 48, borderRadius: 50, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  btnText: { fontSize: 15, fontFamily: Fonts.semiBold },
});
