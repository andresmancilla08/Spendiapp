import { useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Linking,
  StyleSheet, Animated, Easing, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import ScreenTransition, { ScreenTransitionRef } from '../components/ScreenTransition';
import ScreenBackground from '../components/ScreenBackground';
import AppHeader from '../components/AppHeader';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../config/fonts';

const WHATSAPP_URL = 'https://wa.me/573207492444?text=Quiero%20activar%20Spendia%20Premium';

const BENEFIT_ICONS: Array<React.ComponentProps<typeof Ionicons>['name']> = [
  'document-text-outline',
  'trending-up-outline',
  'people-outline',
  'notifications-outline',
  'color-palette-outline',
  'headset-outline',
];

const BENEFIT_COLORS = ['#00ACC1', '#F59E0B', '#00897B', '#6366F1', '#EC4899', '#00BCD4'];

export default function UpgradeScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const transitionRef = useRef<ScreenTransitionRef>(null);

  // Star animations
  const starScale  = useRef(new Animated.Value(0)).current;
  const starPulse  = useRef(new Animated.Value(1)).current;
  const haloOpacity = useRef(new Animated.Value(0.5)).current;

  // Stagger entrance
  const heroOpacity    = useRef(new Animated.Value(0)).current;
  const heroSlide      = useRef(new Animated.Value(20)).current;
  const badgeOpacity   = useRef(new Animated.Value(0)).current;
  const badgeSlide     = useRef(new Animated.Value(12)).current;
  const cardOpacity    = useRef(new Animated.Value(0)).current;
  const cardSlide      = useRef(new Animated.Value(20)).current;

  // Shimmer on WhatsApp button
  const shimmerX = useRef(new Animated.Value(-300)).current;

  // Button press
  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Star entrance
    Animated.spring(starScale, {
      toValue: 1, damping: 9, stiffness: 120, useNativeDriver: true,
    }).start();

    // Star pulse loop
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(starPulse, { toValue: 1.1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(starPulse, { toValue: 1,   duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(haloOpacity, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(haloOpacity, { toValue: 0.5, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ])
    ).start();

    // Hero section fade-in
    Animated.stagger(100, [
      Animated.parallel([
        Animated.timing(heroOpacity, { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(heroSlide,   { toValue: 0, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(badgeOpacity, { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(badgeSlide,   { toValue: 0, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(cardOpacity, { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(cardSlide,   { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start();

    // Shimmer loop on CTA button
    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(1600),
        Animated.timing(shimmerX, { toValue: 300, duration: 650, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(shimmerX, { toValue: -300, duration: 0, useNativeDriver: true }),
      ])
    );
    shimmerLoop.start();
    return () => shimmerLoop.stop();
  }, []);

  const handleBack = () => {
    transitionRef.current?.animateOut(() => router.back());
  };

  const handlePressIn = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.spring(btnScale, { toValue: 0.96, tension: 300, friction: 10, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(btnScale, { toValue: 1, tension: 200, friction: 7, useNativeDriver: true }).start();
  };

  const handleActivate = () => {
    Linking.openURL(WHATSAPP_URL);
  };

  const benefits = t('upgrade.benefits', { returnObjects: true }) as string[];

  return (
    <ScreenTransition ref={transitionRef}>
      <SafeAreaView style={styles.safeArea}>
        <ScreenBackground>
          <AppHeader showBack onBack={handleBack} />
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* ── Hero section ─────────────────────────────── */}
            <Animated.View style={{ opacity: heroOpacity, transform: [{ translateY: heroSlide }] }}>
              <View style={styles.heroWrapper}>
                <LinearGradient
                  colors={isDark
                    ? ['#005F6B', '#007A8A', '#005046']
                    : ['#00838F', '#00ACC1', '#00796B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />

                {/* Decorative circles */}
                <View style={[styles.decoCircle1, { backgroundColor: '#fff' }]} />
                <View style={[styles.decoCircle2, { backgroundColor: '#fff' }]} />
                <View style={[styles.decoCircle3, { backgroundColor: colors.warning }]} />

                {/* PREMIUM badge */}
                <View style={styles.premiumBadge}>
                  <Ionicons name="star" size={10} color={colors.warning} />
                  <Text style={[styles.premiumBadgeText, { color: colors.warning }]}>PREMIUM</Text>
                </View>

                {/* Star icon with glow */}
                <View style={styles.starContainer}>
                  <Animated.View style={[styles.starHalo, { opacity: haloOpacity }]} />
                  <Animated.View style={[styles.starHaloInner, { opacity: Animated.multiply(haloOpacity, 0.5) }]} />
                  <Animated.View style={{ transform: [{ scale: Animated.multiply(starScale, starPulse) }], zIndex: 2 }}>
                    <LinearGradient
                      colors={['#FFE566', '#F59E0B']}
                      style={styles.starCircle}
                    >
                      <Ionicons name="star" size={36} color="#fff" />
                    </LinearGradient>
                  </Animated.View>
                </View>

                <Text style={styles.heroTitle}>{t('upgrade.title')}</Text>
                <Text style={styles.heroSub}>{t('upgrade.subtitle')}</Text>

                {/* Price pill */}
                <LinearGradient
                  colors={['#F59E0B', '#FBBF24']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.pricePill}
                >
                  <Ionicons name="pricetag-outline" size={13} color="#fff" />
                  <Text style={styles.priceText}>{t('upgrade.price')}</Text>
                </LinearGradient>
              </View>
            </Animated.View>

            {/* ── Benefits card ─────────────────────────────── */}
            <Animated.View style={{ opacity: cardOpacity, transform: [{ translateY: cardSlide }] }}>
              <View style={[styles.benefitsCard, {
                backgroundColor: colors.surface,
                borderColor: `${colors.primary}22`,
                shadowColor: colors.primary,
              }]}>
                <Text style={[styles.benefitsTitle, { color: colors.textPrimary }]}>
                  {t('upgrade.benefitsTitle')}
                </Text>
                {benefits.map((benefit, i) => (
                  <View key={i} style={styles.benefitRow}>
                    <View style={[styles.benefitIconWrap, { backgroundColor: BENEFIT_COLORS[i % BENEFIT_COLORS.length] + '20' }]}>
                      <Ionicons
                        name={BENEFIT_ICONS[i % BENEFIT_ICONS.length]}
                        size={18}
                        color={BENEFIT_COLORS[i % BENEFIT_COLORS.length]}
                      />
                    </View>
                    <Text style={[styles.benefitText, { color: colors.textPrimary }]}>{benefit}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>

            {/* CTA note */}
            <Animated.View style={{ opacity: badgeOpacity, transform: [{ translateY: badgeSlide }] }}>
              <Text style={[styles.ctaNote, { color: colors.textTertiary }]}>
                {t('upgrade.ctaNote')}
              </Text>
            </Animated.View>
          </ScrollView>

          {/* ── Footer CTA ─────────────────────────────────── */}
          <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: `${colors.textPrimary}10` }]}>
            <Animated.View style={[styles.btnWrapper, { transform: [{ scale: btnScale }] }]}>
              <TouchableOpacity
                onPress={handleActivate}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={1}
                style={styles.ctaBtnTouch}
              >
                <LinearGradient
                  colors={['#25D366', '#128C7E']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.ctaBtn}
                >
                  <Ionicons name="logo-whatsapp" size={22} color="#fff" />
                  <Text style={styles.ctaBtnText}>{t('upgrade.ctaButton')}</Text>

                  {/* Shimmer sweep */}
                  <Animated.View
                    pointerEvents="none"
                    style={[styles.shimmer, { transform: [{ translateX: shimmerX }, { rotate: '15deg' }] }]}
                  >
                    <LinearGradient
                      colors={['transparent', 'rgba(255,255,255,0.22)', 'transparent']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{ width: 60, flex: 1 }}
                    />
                  </Animated.View>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </ScreenBackground>
      </SafeAreaView>
    </ScreenTransition>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, gap: 20, paddingBottom: 16 },

  // Hero
  heroWrapper: {
    borderRadius: 28,
    overflow: 'hidden',
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 32,
    paddingHorizontal: 24,
    gap: 10,
  },
  decoCircle1: {
    position: 'absolute', opacity: 0.07,
    width: 220, height: 220, borderRadius: 110,
    top: -70, right: -50,
  },
  decoCircle2: {
    position: 'absolute', opacity: 0.05,
    width: 160, height: 160, borderRadius: 80,
    bottom: -50, left: -40,
  },
  decoCircle3: {
    position: 'absolute', opacity: 0.12,
    width: 100, height: 100, borderRadius: 50,
    top: 30, left: 20,
  },
  premiumBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(245,158,11,0.18)',
    borderRadius: 50, borderWidth: 1, borderColor: 'rgba(245,158,11,0.4)',
    paddingHorizontal: 12, paddingVertical: 5,
    marginBottom: 4,
  },
  premiumBadgeText: {
    fontSize: 10, fontFamily: Fonts.bold,
    letterSpacing: 2.5,
  },
  starContainer: { alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  starHalo: {
    position: 'absolute',
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: '#F59E0B',
  },
  starHaloInner: {
    position: 'absolute',
    width: 82, height: 82, borderRadius: 41,
    backgroundColor: '#FBBF24',
  },
  starCircle: {
    width: 68, height: 68, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5, shadowRadius: 14,
    elevation: 10,
  },
  heroTitle: {
    fontSize: 28, fontFamily: Fonts.bold,
    color: '#fff', textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroSub: {
    fontSize: 14, fontFamily: Fonts.regular,
    color: 'rgba(255,255,255,0.82)', textAlign: 'center', lineHeight: 21,
  },
  pricePill: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    borderRadius: 50, paddingHorizontal: 18, paddingVertical: 10,
    marginTop: 4, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)',
    shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45, shadowRadius: 12, elevation: 8,
  },
  priceText: { fontSize: 13, fontFamily: Fonts.semiBold, color: '#fff' },

  // Benefits
  benefitsCard: {
    borderRadius: 24, padding: 20, gap: 16, borderWidth: 1.5,
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 4,
  },
  benefitsTitle: { fontSize: 16, fontFamily: Fonts.bold, marginBottom: 2 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  benefitIconWrap: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  benefitText: { fontSize: 14, fontFamily: Fonts.medium, flex: 1, lineHeight: 20 },

  ctaNote: { fontSize: 12, fontFamily: Fonts.regular, textAlign: 'center', lineHeight: 18, paddingHorizontal: 20 },

  // Footer
  footer: { padding: 16, paddingBottom: 8, borderTopWidth: 1 },
  btnWrapper: {
    borderRadius: 50, overflow: 'hidden',
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 18, elevation: 10,
  },
  ctaBtnTouch: { borderRadius: 50, overflow: 'hidden' },
  ctaBtn: {
    height: 58, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 10, overflow: 'hidden',
  },
  ctaBtnText: { fontSize: 17, fontFamily: Fonts.bold, color: '#fff' },
  shimmer: {
    position: 'absolute', top: 0, bottom: 0,
    width: 60, overflow: 'hidden',
  },
});
