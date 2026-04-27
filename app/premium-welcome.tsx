import { useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Animated, Easing, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { doc, updateDoc } from 'firebase/firestore';
import ScreenTransition, { ScreenTransitionRef } from '../components/ScreenTransition';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../config/fonts';
import { useAuthStore } from '../store/authStore';
import { db } from '../config/firebase';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const FEATURE_ICONS: IoniconsName[] = [
  'wallet-outline',
  'document-text-outline',
  'people-outline',
  'color-palette-outline',
  'contrast-outline',
];

const FEATURE_COLORS = ['#00ACC1', '#F59E0B', '#00897B', '#EC4899', '#6366F1'];

export default function PremiumWelcomeScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { user } = useAuthStore();
  const transitionRef = useRef<ScreenTransitionRef>(null);

  const starScale    = useRef(new Animated.Value(0)).current;
  const starPulse    = useRef(new Animated.Value(1)).current;
  const haloOpacity  = useRef(new Animated.Value(0.4)).current;
  const badgeOpacity = useRef(new Animated.Value(0)).current;
  const badgeSlide   = useRef(new Animated.Value(16)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleSlide   = useRef(new Animated.Value(20)).current;
  const subOpacity   = useRef(new Animated.Value(0)).current;
  const shimmerX     = useRef(new Animated.Value(-300)).current;
  const btnScale     = useRef(new Animated.Value(1)).current;
  const ctaOpacity   = useRef(new Animated.Value(0)).current;
  const ctaSlide     = useRef(new Animated.Value(20)).current;

  const featureAnims = useRef(
    [...Array(5)].map(() => ({
      opacity: new Animated.Value(0),
      slide: new Animated.Value(-28),
      check: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    // Star spring entrance
    Animated.spring(starScale, {
      toValue: 1, damping: 9, stiffness: 120, useNativeDriver: true,
    }).start();

    // Star pulse + halo breathing loop
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(starPulse, { toValue: 1.08, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(starPulse, { toValue: 1,    duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(haloOpacity, { toValue: 0,   duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(haloOpacity, { toValue: 0.5, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ])
    ).start();

    // Badge entrance
    Animated.parallel([
      Animated.timing(badgeOpacity, { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(badgeSlide,   { toValue: 0, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();

    // Title stagger
    Animated.sequence([
      Animated.delay(300),
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(titleSlide,   { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start();

    Animated.sequence([
      Animated.delay(420),
      Animated.timing(subOpacity, { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();

    // Features stagger — slide from left + checkmark spring
    featureAnims.forEach(({ opacity, slide, check }, i) => {
      const delay = 580 + i * 80;
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(opacity, { toValue: 1, duration: 340, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(slide,   { toValue: 0, duration: 340, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]),
      ]).start();
      Animated.sequence([
        Animated.delay(delay + 220),
        Animated.spring(check, { toValue: 1, damping: 9, stiffness: 200, useNativeDriver: true }),
      ]).start();
    });

    // CTA button entrance
    Animated.sequence([
      Animated.delay(1080),
      Animated.parallel([
        Animated.timing(ctaOpacity, { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(ctaSlide,   { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start();

    // Shimmer loop on CTA
    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(1800),
        Animated.timing(shimmerX, { toValue: 300, duration: 650, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(shimmerX, { toValue: -300, duration: 0, useNativeDriver: true }),
      ])
    );
    shimmerLoop.start();
    return () => shimmerLoop.stop();
  }, []);

  const handleCTA = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (user?.uid) {
      updateDoc(doc(db, 'users', user.uid), { premiumWelcomeSeen: true }).catch(() => {});
    }
    transitionRef.current?.animateOut(() =>
      router.replace('/(tabs)/' as Parameters<typeof router.replace>[0])
    );
  };

  const handlePressIn = () =>
    Animated.spring(btnScale, { toValue: 0.96, tension: 300, friction: 10, useNativeDriver: true }).start();

  const handlePressOut = () =>
    Animated.spring(btnScale, { toValue: 1, tension: 200, friction: 7, useNativeDriver: true }).start();

  const features = t('premiumWelcome.features', { returnObjects: true }) as string[];

  return (
    <ScreenTransition ref={transitionRef}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Hero ─────────────────────────────────────── */}
          <View style={styles.heroWrapper}>
            <LinearGradient
              colors={isDark
                ? ['#78350F', '#92400E', '#B45309', '#D97706']
                : ['#92400E', '#B45309', '#D97706', '#F59E0B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={[styles.decoCircle1, { backgroundColor: '#fff' }]} />
            <View style={[styles.decoCircle2, { backgroundColor: '#fff' }]} />
            <View style={[styles.decoCircle3, { backgroundColor: '#00ACC1' }]} />

            {/* Badge */}
            <Animated.View
              style={[
                styles.premiumBadge,
                { opacity: badgeOpacity, transform: [{ translateY: badgeSlide }] },
              ]}
            >
              <Ionicons name="star" size={10} color="#fff" />
              <Text style={styles.premiumBadgeText}>{t('premiumWelcome.badge')}</Text>
            </Animated.View>

            {/* Star icon */}
            <View style={styles.starContainer}>
              <Animated.View style={[styles.starHalo, { opacity: haloOpacity }]} />
              <Animated.View style={[styles.starHaloInner, { opacity: Animated.multiply(haloOpacity, 0.5) }]} />
              <Animated.View
                style={{ transform: [{ scale: Animated.multiply(starScale, starPulse) }], zIndex: 2 }}
              >
                <LinearGradient colors={['#FEF3C7', '#F59E0B']} style={styles.starCircle}>
                  <Ionicons name="star" size={36} color="#fff" />
                </LinearGradient>
              </Animated.View>
            </View>

            {/* Title */}
            <Animated.View
              style={{ opacity: titleOpacity, transform: [{ translateY: titleSlide }], alignItems: 'center' }}
            >
              <Text style={styles.heroTitle}>
                {t('premiumWelcome.title1')}{' '}
                <Text style={styles.heroTitleAccent}>{t('premiumWelcome.title2')}</Text>
              </Text>
            </Animated.View>

            <Animated.Text style={[styles.heroSub, { opacity: subOpacity }]}>
              {t('premiumWelcome.subtitle')}
            </Animated.Text>
          </View>

          {/* ── Features card ────────────────────────────── */}
          <View style={[
            styles.featuresCard,
            {
              backgroundColor: colors.surface,
              borderColor: `${colors.primary}22`,
              shadowColor: colors.primary,
            },
          ]}>
            {features.map((feature, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.featureRow,
                  {
                    opacity: featureAnims[i].opacity,
                    transform: [{ translateX: featureAnims[i].slide }],
                  },
                ]}
              >
                <View style={[styles.featureIconWrap, { backgroundColor: FEATURE_COLORS[i] + '20' }]}>
                  <Ionicons name={FEATURE_ICONS[i]} size={20} color={FEATURE_COLORS[i]} />
                </View>
                <Text style={[styles.featureText, { color: colors.textPrimary }]}>{feature}</Text>
                <Animated.View style={{ transform: [{ scale: featureAnims[i].check }] }}>
                  <Ionicons name="checkmark-circle" size={22} color="#22C55E" />
                </Animated.View>
              </Animated.View>
            ))}
          </View>
        </ScrollView>

        {/* ── Fixed CTA ────────────────────────────────── */}
        <Animated.View
          style={[
            styles.footer,
            {
              backgroundColor: colors.background,
              borderTopColor: `${colors.textPrimary}10`,
              opacity: ctaOpacity,
              transform: [{ translateY: ctaSlide }],
            },
          ]}
        >
          <Animated.View style={[styles.btnWrapper, { transform: [{ scale: btnScale }] }]}>
            <TouchableOpacity
              onPress={handleCTA}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              activeOpacity={1}
              style={styles.ctaBtnTouch}
            >
              <LinearGradient
                colors={['#D97706', '#F59E0B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaBtn}
              >
                <Ionicons name="star" size={20} color="#fff" />
                <Text style={styles.ctaBtnText}>{t('premiumWelcome.cta')}</Text>
                <Animated.View
                  pointerEvents="none"
                  style={[styles.shimmer, { transform: [{ translateX: shimmerX }, { rotate: '15deg' }] }]}
                >
                  <LinearGradient
                    colors={['transparent', 'rgba(255,255,255,0.25)', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ width: 60, flex: 1 }}
                  />
                </Animated.View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </SafeAreaView>
    </ScreenTransition>
  );
}

const styles = StyleSheet.create({
  safeArea:      { flex: 1 },
  scroll:        { flex: 1 },
  scrollContent: { padding: 20, gap: 20, paddingBottom: 16 },

  heroWrapper: {
    borderRadius: 28, overflow: 'hidden',
    alignItems: 'center',
    paddingTop: 36, paddingBottom: 40, paddingHorizontal: 24,
    gap: 12,
  },
  decoCircle1: {
    position: 'absolute', opacity: 0.08,
    width: 240, height: 240, borderRadius: 120,
    top: -80, right: -60,
  },
  decoCircle2: {
    position: 'absolute', opacity: 0.05,
    width: 180, height: 180, borderRadius: 90,
    bottom: -60, left: -50,
  },
  decoCircle3: {
    position: 'absolute', opacity: 0.14,
    width: 100, height: 100, borderRadius: 50,
    top: 20, left: 16,
  },

  premiumBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 50, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)',
    paddingHorizontal: 12, paddingVertical: 5,
  },
  premiumBadgeText: {
    fontSize: 10, fontFamily: Fonts.bold,
    color: '#fff', letterSpacing: 2.5,
  },

  starContainer: { alignItems: 'center', justifyContent: 'center', marginVertical: 4 },
  starHalo: {
    position: 'absolute',
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  starHaloInner: {
    position: 'absolute',
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  starCircle: {
    width: 72, height: 72, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55, shadowRadius: 16,
    elevation: 12,
  },

  heroTitle: {
    fontSize: 30, fontFamily: Fonts.bold,
    color: '#fff', textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    lineHeight: 36,
  },
  heroTitleAccent: {
    fontFamily: Fonts.extraBold,
    color: '#FEF3C7',
  },
  heroSub: {
    fontSize: 14, fontFamily: Fonts.regular,
    color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 21,
  },

  featuresCard: {
    borderRadius: 24, padding: 20, gap: 18, borderWidth: 1.5,
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 4,
  },
  featureRow:     { flexDirection: 'row', alignItems: 'center', gap: 14 },
  featureIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  featureText: { fontSize: 15, fontFamily: Fonts.semiBold, flex: 1, lineHeight: 22 },

  footer: { padding: 16, paddingBottom: 8, borderTopWidth: 1 },
  btnWrapper: {
    borderRadius: 50, overflow: 'hidden',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45, shadowRadius: 18, elevation: 10,
  },
  ctaBtnTouch: { borderRadius: 50, overflow: 'hidden' },
  ctaBtn: {
    height: 58, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 10, overflow: 'hidden',
  },
  ctaBtnText: { fontSize: 17, fontFamily: Fonts.bold, color: '#fff' },
  shimmer: {
    position: 'absolute', top: 0, bottom: 0, width: 60, overflow: 'hidden',
  },
});
