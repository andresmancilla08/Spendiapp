import { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { goBack } from '../utils/nav';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import ScreenTransition, { ScreenTransitionRef } from '../components/ScreenTransition';
import ScreenBackground from '../components/ScreenBackground';
import AppHeader from '../components/AppHeader';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { accentInk } from '../utils/contrast';
import { Fonts } from '../config/fonts';
import { PremiumModules } from '../components/premium/PremiumModuleCards';
import { usePremiumPreview } from '../hooks/usePremiumPreview';
import { useAuthStore } from '../store/authStore';

type Plan = 'monthly' | 'annual';

/**
 * Pantalla de compra del Premium.
 *
 * El diseño anterior era un plano rosa-azul con una estrella y una lista de seis
 * viñetas, dos de las cuales vendían funciones que NO existen ("Reportes PDF
 * ilimitados", "Notificaciones inteligentes"). Ahora los módulos se MUESTRAN con
 * una miniatura de cada uno; el catálogo vive en `components/premium/`, compartido
 * con la pantalla de bienvenida para que no vuelvan a desincronizarse.
 */
export default function UpgradeScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  // Las miniaturas van con SUS cifras, no con las de un usuario inventado.
  const { user } = useAuthStore();
  const preview = usePremiumPreview(user?.uid);
  const { showToast } = useToast();
  const transitionRef = useRef<ScreenTransitionRef>(null);
  const btnScale = useRef(new Animated.Value(1)).current;
  const [plan, setPlan] = useState<Plan>('annual');

  const handleBack = () => transitionRef.current?.animateOut(() => goBack('/(tabs)/tools'));

  const handlePressIn = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.spring(btnScale, { toValue: 0.97, tension: 300, friction: 10, useNativeDriver: Platform.OS !== 'web' }).start();
  };
  const handlePressOut = () => {
    Animated.spring(btnScale, { toValue: 1, tension: 200, friction: 7, useNativeDriver: Platform.OS !== 'web' }).start();
  };
  // El cobro manual por transferencia y WhatsApp se retiró: era motivo de rechazo
  // en Play y en App Store. Hasta que entren Wompi (Colombia) y Paddle (resto),
  // el botón avisa en vez de llevar a ningún sitio — ver
  // docs/plan-pagos-wompi-paddle.md.
  const handleActivate = () => showToast(t('upgrade.ctaSoon'), 'info');

  const onCTA = accentInk(colors, 'primary', colors.primary);

  const PlanCard = ({ id, label, price, per, save }: {
    id: Plan; label: string; price: string; per: string; save?: string;
  }) => {
    const active = plan === id;
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setPlan(id)}
        style={[
          styles.plan,
          {
            backgroundColor: colors.surface,
            borderColor: active ? colors.primary : colors.border,
            borderWidth: active ? 1.5 : 1,
          },
        ]}
        accessibilityRole="radio"
        accessibilityState={{ selected: active }}
      >
        {!!save && (
          <View style={[styles.saveTag, { backgroundColor: colors.primary }]}>
            <Text style={[styles.saveText, { color: onCTA }]}>{save}</Text>
          </View>
        )}
        <Text style={[styles.planLabel, { color: active ? colors.primary : colors.textTertiary }]}>{label}</Text>
        <Text style={[styles.planPrice, { color: colors.textPrimary }]}>{price}</Text>
        <Text style={[styles.planPer, { color: active ? colors.success : colors.textTertiary }]}>{per}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenTransition ref={transitionRef}>
      <SafeAreaView style={styles.safeArea}>
        <ScreenBackground>
          <AppHeader showBack onBack={handleBack} backFallback="/(tabs)/tools" />

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* Marca */}
            <View style={[styles.badge, { borderColor: colors.primary + '66' }]}>
              <View style={[styles.badgeDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.badgeText, { color: colors.primary }]}>{t('upgrade.badge')}</Text>
            </View>

            {/* Titular a dos líneas: la segunda es el acento */}
            <Text style={[styles.title, { color: colors.textPrimary }]}>{t('upgrade.title1')}</Text>
            <Text style={[styles.title, { color: colors.primary, marginBottom: 4 }]}>{t('upgrade.title2')}</Text>

            {/* Planes */}
            <View style={styles.plans}>
              <PlanCard
                id="monthly"
                label={t('upgrade.planMonthly')}
                price="$9.900"
                per={t('upgrade.planMonthlyPer')}
              />
              <PlanCard
                id="annual"
                label={t('upgrade.planAnnual')}
                price="$79.900"
                per={t('upgrade.planAnnualPer', { amount: '$6.658' })}
                save={t('upgrade.planAnnualSave')}
              />
            </View>

            {/* Catálogo de módulos */}
            <View style={styles.modulesHead}>
              <Text style={[styles.modulesTitle, { color: colors.textTertiary }]}>{t('upgrade.modulesTitle')}</Text>
              <Text style={[styles.sampleNote, { color: colors.textTertiary }]}>{t('upgrade.sampleNote')}</Text>
            </View>
            <PremiumModules colors={colors} data={preview} />
          </ScrollView>

          {/* CTA fijo al fondo, fuera del scroll */}
          <View style={styles.footer}>
            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={handleActivate}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                accessibilityRole="button"
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.cta}
                >
                  <Text style={[styles.ctaText, { color: onCTA }]}>{t('upgrade.ctaButton')}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
            <Text style={[styles.ctaNote, { color: colors.textTertiary }]}>{t('upgrade.ctaNote')}</Text>
          </View>
        </ScreenBackground>
      </SafeAreaView>
    </ScreenTransition>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 24,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start',
    borderWidth: 1, borderRadius: 50, paddingHorizontal: 12, paddingVertical: 6,
  },
  badgeDot: { width: 5, height: 5, borderRadius: 3 },
  badgeText: { fontFamily: Fonts.bold, fontSize: 9.5, letterSpacing: 1.6 },
  title: { fontFamily: Fonts.extraBold, fontSize: 34, lineHeight: 36, letterSpacing: -1.4, marginTop: 10 },

  plans: { flexDirection: 'row', gap: 9, marginTop: 18 },
  plan: { flex: 1, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 14 },
  saveTag: {
    position: 'absolute', top: -9, right: 10, borderRadius: 50,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  saveText: { fontFamily: Fonts.extraBold, fontSize: 8.5, letterSpacing: 0.8 },
  planLabel: { fontFamily: Fonts.bold, fontSize: 8.5, letterSpacing: 1.3 },
  planPrice: { fontFamily: Fonts.extraBold, fontSize: 24, letterSpacing: -1.1, marginTop: 7 },
  planPer: { fontFamily: Fonts.regular, fontSize: 10.5, marginTop: 3 },

  modulesHead: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline',
    marginTop: 22, marginBottom: 11,
  },
  modulesTitle: { fontFamily: Fonts.bold, fontSize: 8.5, letterSpacing: 1.5 },
  sampleNote: { fontFamily: Fonts.regular, fontSize: 9.5 },

  footer: {
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16,
    width: '100%', maxWidth: 640, alignSelf: 'center',
  },
  cta: { height: 54, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontFamily: Fonts.extraBold, fontSize: 16, letterSpacing: -0.2 },
  ctaNote: { fontFamily: Fonts.regular, fontSize: 11, textAlign: 'center', marginTop: 9 },
});
