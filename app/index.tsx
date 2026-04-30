import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Link } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../config/fonts';
import ScreenBackground from '../components/ScreenBackground';
import ScreenTransition from '../components/ScreenTransition';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../components/LanguageSelector';

const FEATURES = [
  { icon: 'receipt-outline' as const, labelKey: 'landing.feature1Label' },
  { icon: 'bar-chart-outline' as const, labelKey: 'landing.feature2Label' },
  { icon: 'flag-outline' as const, labelKey: 'landing.feature3Label' },
];

export default function LandingScreen() {
  const { colors, isDark, setThemeMode } = useTheme();
  const { t } = useTranslation();

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.92)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(12)).current;
  const descOpacity = useRef(new Animated.Value(0)).current;
  const descY = useRef(new Animated.Value(12)).current;
  const featuresOpacity = useRef(new Animated.Value(0)).current;
  const featuresY = useRef(new Animated.Value(12)).current;
  const ctasOpacity = useRef(new Animated.Value(0)).current;
  const ctasY = useRef(new Animated.Value(12)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const ease = Easing.out(Easing.cubic);
    const slide = (opacity: Animated.Value, y: Animated.Value) =>
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 300, easing: ease, useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: 300, easing: ease, useNativeDriver: true }),
      ]);

    Animated.stagger(80, [
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 300, easing: ease, useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, mass: 0.6, stiffness: 180, damping: 14, useNativeDriver: true }),
      ]),
      slide(titleOpacity, titleY),
      slide(descOpacity, descY),
      slide(featuresOpacity, featuresY),
      slide(ctasOpacity, ctasY),
      Animated.timing(footerOpacity, { toValue: 1, duration: 250, easing: ease, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <ScreenTransition>
      <SafeAreaView style={styles.safe}>
        <ScreenBackground auroraIntensity="intense">
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={() => setThemeMode(isDark ? 'light' : 'dark')}
              activeOpacity={0.7}
              style={styles.themeToggle}
            >
              <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color={colors.primary} />
            </TouchableOpacity>
            <LanguageSelector />
          </View>

          <View style={styles.hero}>
            <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }] }}>
              <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
            </Animated.View>

            <Animated.View style={[styles.titleBlock, { opacity: titleOpacity, transform: [{ translateY: titleY }] }]}>
              <Text style={[styles.appName, { color: colors.textPrimary }]}>Spendia</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('login.subtitle')}</Text>
            </Animated.View>

            <Animated.Text style={[styles.description, { color: colors.textTertiary, opacity: descOpacity, transform: [{ translateY: descY }] }]}>
              {t('landing.description')}
            </Animated.Text>

            <Animated.View style={[styles.features, { opacity: featuresOpacity, transform: [{ translateY: featuresY }] }]}>
              {FEATURES.map((f, i) => (
                <View
                  key={i}
                  style={[
                    styles.featureItem,
                    {
                      borderColor: 'rgba(0,188,212,0.2)',
                      backgroundColor: isDark ? 'rgba(0,188,212,0.06)' : 'rgba(0,188,212,0.09)',
                    },
                  ]}
                >
                  <Ionicons name={f.icon} size={22} color={colors.primary} />
                  <Text style={[styles.featureLabel, { color: colors.textSecondary }]}>{t(f.labelKey)}</Text>
                </View>
              ))}
            </Animated.View>

            <Animated.View style={[styles.ctas, { opacity: ctasOpacity, transform: [{ translateY: ctasY }] }]}>
              <TouchableOpacity
                style={[styles.btnPrimary, { backgroundColor: colors.primary }]}
                activeOpacity={0.85}
                onPress={() => router.push('/(auth)/register' as any)}
              >
                <Text style={[styles.btnPrimaryText, { color: '#0D1A1C' }]}>{t('landing.register')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnGhost, { borderColor: colors.primary }]}
                activeOpacity={0.85}
                onPress={() => router.push('/(auth)/login' as any)}
              >
                <Text style={[styles.btnGhostText, { color: colors.primary }]}>{t('landing.signIn')}</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>

          <Animated.View style={[styles.footer, { opacity: footerOpacity }]}>
            <Link href="/privacy" style={[styles.footerLink, { color: colors.primary }]}>
              {t('consentModal.privacy')}
            </Link>
            <Text style={[styles.footerDot, { color: colors.textTertiary }]}>·</Text>
            <Link href="/terms" style={[styles.footerLink, { color: colors.primary }]}>
              {t('consentModal.terms')}
            </Link>
          </Animated.View>
        </ScreenBackground>
      </SafeAreaView>
    </ScreenTransition>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  themeToggle: { padding: 4 },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  logo: {
    width: 88,
    height: 88,
    marginBottom: 20,
  },
  titleBlock: {
    alignItems: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 42,
    fontFamily: Fonts.extraBold,
    textAlign: 'center',
    letterSpacing: -1,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    maxWidth: 340,
  },
  features: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 40,
    width: '100%',
  },
  featureItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  featureLabel: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    textAlign: 'center',
  },
  ctas: {
    width: '100%',
    gap: 12,
  },
  btnPrimary: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: {
    fontSize: 16,
    fontFamily: Fonts.bold,
  },
  btnGhost: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 50,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGhostText: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 24,
  },
  footerLink: {
    fontSize: 12,
    fontFamily: Fonts.medium,
  },
  footerDot: {
    fontSize: 12,
    fontFamily: Fonts.regular,
  },
});
