import { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Animated, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import ScreenTransition, { ScreenTransitionRef } from '../components/ScreenTransition';
import ScreenBackground from '../components/ScreenBackground';
import { useTheme } from '../context/ThemeContext';
import { useAuthStore } from '../store/authStore';
import { useProMotion } from '../hooks/useProMotion';
import { accentInk } from '../utils/contrast';
import { Fonts } from '../config/fonts';
import { PremiumModules } from '../components/premium/PremiumModuleCards';

/**
 * Bienvenida al Premium. Se ve una vez, en la transición free→premium.
 *
 * La versión anterior puntuó 5/20 en la auditoría (`docs/audit-premium-welcome.md`):
 * un plano ámbar ocupaba media pantalla con texto blanco encima a 1,33:1 — y ese
 * ámbar era el token `warning`, idéntico en las 30 paletas, o sea el color de
 * "advertencia" usado para felicitar. Además mantenía tres bucles de animación
 * perpetuos, contra la regla 1 de CLAUDE.md.
 *
 * Ahora: sin planos de color, el acento viene de la paleta ACTIVA del usuario, y
 * los módulos se muestran con la misma miniatura que la pantalla de compra. La
 * única animación es una entrada que termina y se detiene.
 */
export default function PremiumWelcomeScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const { animate } = useProMotion();
  const transitionRef = useRef<ScreenTransitionRef>(null);

  const enter = useRef(new Animated.Value(animate ? 0 : 1)).current;

  useEffect(() => {
    if (!animate) return;
    const anim = Animated.timing(enter, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    });
    anim.start();
    // Una entrada, no un bucle: se detiene al desmontar.
    return () => anim.stop();
  }, [animate, enter]);

  const handleCTA = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (user?.uid) {
      updateDoc(doc(db, 'users', user.uid), { premiumWelcomeSeen: true }).catch(() => {});
    }
    transitionRef.current?.animateOut(() =>
      router.replace('/(tabs)/' as Parameters<typeof router.replace>[0]),
    );
  };

  const onCTA = accentInk(colors, 'primary', colors.primary);
  // En web no se transforma: WebKit deja la capa rasterizada y las imágenes se
  // quedan borrosas para siempre. Ver components/ScreenTransition.tsx.
  const rise = Platform.OS === 'web'
    ? {}
    : { transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] };

  return (
    <ScreenTransition ref={transitionRef}>
      <SafeAreaView style={styles.safeArea}>
        <ScreenBackground>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <Animated.View style={[{ opacity: enter }, rise]}>
              <View style={[styles.badge, { borderColor: colors.success + '66' }]}>
                <View style={[styles.badgeDot, { backgroundColor: colors.success }]} />
                <Text style={[styles.badgeText, { color: colors.success }]}>{t('premiumWelcome.badge')}</Text>
              </View>

              <Text style={[styles.title, { color: colors.textPrimary }]}>{t('premiumWelcome.title1')}</Text>
              <Text style={[styles.title, { color: colors.primary }]}>{t('premiumWelcome.title2')}</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {t('premiumWelcome.subtitle')}
              </Text>
            </Animated.View>

            <View style={styles.modules}>
              <PremiumModules colors={colors} />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity activeOpacity={0.9} onPress={handleCTA} accessibilityRole="button">
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.cta}
              >
                <Text style={[styles.ctaText, { color: onCTA }]}>{t('premiumWelcome.cta')}</Text>
              </LinearGradient>
            </TouchableOpacity>
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
    paddingTop: 40,
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
  title: { fontFamily: Fonts.extraBold, fontSize: 44, lineHeight: 45, letterSpacing: -2, marginTop: 8 },
  subtitle: { fontFamily: Fonts.regular, fontSize: 14.5, lineHeight: 21, marginTop: 12 },
  modules: { marginTop: 20 },
  footer: {
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16,
    width: '100%', maxWidth: 640, alignSelf: 'center',
  },
  cta: { height: 54, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontFamily: Fonts.extraBold, fontSize: 16, letterSpacing: -0.2 },
});
