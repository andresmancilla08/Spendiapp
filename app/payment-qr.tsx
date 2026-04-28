import { useRef, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Linking,
  StyleSheet, Animated, Easing, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import ScreenTransition, { ScreenTransitionRef } from '../components/ScreenTransition';
import ScreenBackground from '../components/ScreenBackground';
import AppHeader from '../components/AppHeader';
import { useTheme } from '../context/ThemeContext';
import { useAuthStore } from '../store/authStore';
import { db } from '../config/firebase';
import { Fonts } from '../config/fonts';

const LLAVE = '@Mancilla124';
const ADMIN_PHONE = '573207492444';

type Plan = 'monthly' | 'annual';

const STEP_ICONS: Array<React.ComponentProps<typeof Ionicons>['name']> = [
  'copy-outline',
  'cash-outline',
  'checkmark-done-outline',
  'logo-whatsapp',
];

export default function PaymentQrScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { user } = useAuthStore();
  const transitionRef = useRef<ScreenTransitionRef>(null);

  const [selectedPlan, setSelectedPlan] = useState<Plan>('monthly');
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerSlide   = useRef(new Animated.Value(16)).current;
  const cardOpacity   = useRef(new Animated.Value(0)).current;
  const cardSlide     = useRef(new Animated.Value(12)).current;
  const stepsOpacity  = useRef(new Animated.Value(0)).current;
  const btnScale      = useRef(new Animated.Value(1)).current;
  const shimmerX      = useRef(new Animated.Value(-300)).current;

  useEffect(() => {
    Animated.stagger(80, [
      Animated.parallel([
        Animated.timing(headerOpacity, { toValue: 1, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(headerSlide,   { toValue: 0, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }),
      ]),
      Animated.parallel([
        Animated.timing(cardOpacity, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(cardSlide,   { toValue: 0, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }),
      ]),
      Animated.timing(stepsOpacity, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }),
    ]).start();

    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(1800),
        Animated.timing(shimmerX, { toValue: 300, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(shimmerX, { toValue: -300, duration: 0, useNativeDriver: Platform.OS !== 'web' }),
      ])
    );
    shimmerLoop.start();
    return () => shimmerLoop.stop();
  }, []);

  const handleBack = () => transitionRef.current?.animateOut(() => router.back());

  const handleCopy = async () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Clipboard.setStringAsync(LLAVE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handlePressIn = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.spring(btnScale, { toValue: 0.96, tension: 300, friction: 10, useNativeDriver: Platform.OS !== 'web' }).start();
  };

  const handlePressOut = () => {
    Animated.spring(btnScale, { toValue: 1, tension: 200, friction: 7, useNativeDriver: Platform.OS !== 'web' }).start();
  };

  const handlePlanSelect = (plan: Plan) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    setSelectedPlan(plan);
  };

  const handlePaid = async () => {
    if (status === 'sending' || status === 'sent') return;
    setStatus('sending');

    const planLabel = selectedPlan === 'monthly'
      ? `${t('paymentQr.planMonthly')} – ${t('paymentQr.planMonthlyPrice')}`
      : `${t('paymentQr.planAnnual')} – ${t('paymentQr.planAnnualPrice')}`;

    const dateStr = new Date().toLocaleDateString('es-CO', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    try {
      await addDoc(collection(db, 'premium_requests'), {
        uid: user?.uid ?? 'unknown',
        displayName: user?.displayName ?? 'Sin nombre',
        email: user?.email ?? 'Sin email',
        plan: selectedPlan,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      const msg = encodeURIComponent(
        `🌟 *Nuevo pago Spendia Premium*\n\n` +
        `👤 *Nombre:* ${user?.displayName ?? 'Sin nombre'}\n` +
        `📧 *Email:* ${user?.email ?? 'Sin email'}\n` +
        `💰 *Plan:* ${planLabel}\n` +
        `📅 *Fecha:* ${dateStr}\n\n` +
        `Por favor activa su acceso Premium desde el panel de administración. ¡Gracias! 🚀`
      );

      await Linking.openURL(`https://wa.me/${ADMIN_PHONE}?text=${msg}`);
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  };

  const planMonthlyPrice = t('paymentQr.planMonthlyPrice');
  const planAnnualPrice  = t('paymentQr.planAnnualPrice');

  return (
    <ScreenTransition ref={transitionRef}>
      <SafeAreaView style={styles.safe}>
        <ScreenBackground>
          <AppHeader showBack onBack={handleBack} />

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* ── Hero ──────────────────────────────────────── */}
            <Animated.View style={{ opacity: headerOpacity, transform: [{ translateY: headerSlide }] }}>
              <LinearGradient
                colors={isDark
                  ? ['#00455A', '#005F6B', '#003D35']
                  : ['#00697A', '#00ACC1', '#00695C']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.hero}
              >
                <View style={[styles.decoCircle, { top: -50, right: -30, width: 160, height: 160, borderRadius: 80 }]} />
                <View style={[styles.decoCircle, { bottom: -40, left: -20, width: 110, height: 110, borderRadius: 55 }]} />
                <View style={styles.heroBadge}>
                  <Ionicons name="star" size={10} color="#FFD166" />
                  <Text style={styles.heroBadgeText}>PREMIUM</Text>
                </View>
                <Text style={styles.heroTitle}>{t('paymentQr.title')}</Text>
                <Text style={styles.heroSubtitle}>{t('paymentQr.subtitle')}</Text>
              </LinearGradient>
            </Animated.View>

            {/* ── Plan selector ─────────────────────────────── */}
            <Animated.View style={[styles.planRow, { opacity: headerOpacity }]}>
              {(['monthly', 'annual'] as Plan[]).map((plan) => {
                const isSelected = selectedPlan === plan;
                const price = plan === 'monthly' ? planMonthlyPrice : planAnnualPrice;
                const label = plan === 'monthly' ? t('paymentQr.planMonthly') : t('paymentQr.planAnnual');
                const annualSelected = plan === 'annual' && isSelected;
                const priceColor = annualSelected ? '#00897B' : isSelected ? colors.primary : colors.textSecondary;
                const [amount, period] = price.split(' / ');

                return (
                  <TouchableOpacity
                    key={plan}
                    onPress={() => handlePlanSelect(plan)}
                    activeOpacity={0.85}
                    style={[
                      styles.planCard,
                      {
                        backgroundColor: annualSelected ? '#00897B12' : isSelected ? `${colors.primary}18` : colors.surface,
                        borderColor: annualSelected ? '#00897B' : isSelected ? colors.primary : `${colors.textPrimary}15`,
                        borderWidth: isSelected ? 2 : 1.5,
                      },
                    ]}
                  >
                    <View style={styles.planCardInner}>
                      <View style={[styles.planRadio, {
                        borderColor: annualSelected ? '#00897B' : isSelected ? colors.primary : `${colors.textPrimary}40`,
                        backgroundColor: annualSelected ? '#00897B' : isSelected ? colors.primary : 'transparent',
                      }]}>
                        {isSelected && <View style={styles.planRadioDot} />}
                      </View>
                      <Text style={[styles.planLabel, { color: colors.textPrimary }]}>{label}</Text>
                    </View>

                    <View style={styles.planPriceRow}>
                      <Text style={[styles.planAmount, { color: priceColor }]}>{amount}</Text>
                      <Text style={[styles.planPeriod, { color: priceColor }]}>/ {period}</Text>
                    </View>

                    {plan === 'annual' && (
                      <View style={[styles.savingsBadge, { backgroundColor: '#00897B20' }]}>
                        <Text style={[styles.savingsText, { color: '#00897B' }]}>{t('paymentQr.planAnnualSavings')}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </Animated.View>

            {/* ── Alias Bre-B ───────────────────────────────── */}
            <Animated.View style={{ opacity: cardOpacity, transform: [{ translateY: cardSlide }] }}>
              <View style={[styles.aliasCard, {
                backgroundColor: colors.surface,
                borderColor: `${colors.primary}20`,
                shadowColor: colors.primary,
              }]}>
                <View style={[styles.breBBadge, { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}35` }]}>
                  <Ionicons name="phone-portrait-outline" size={13} color={colors.primary} />
                  <Text style={[styles.breBBadgeText, { color: colors.primary }]}>Bre-B</Text>
                </View>

                <View style={[styles.keyRow, {
                  backgroundColor: isDark ? `${colors.primary}15` : `${colors.primary}08`,
                  borderColor: `${colors.primary}25`,
                }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.keyLabel, { color: colors.textSecondary }]}>{t('paymentQr.keyLabel')}</Text>
                    <Text style={[styles.keyValue, { color: colors.primary }]}>{LLAVE}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={handleCopy}
                    activeOpacity={0.75}
                    style={[styles.copyBtn, { backgroundColor: copied ? '#00897B' : colors.primary }]}
                  >
                    <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color="#fff" />
                    <Text style={styles.copyBtnText}>
                      {copied ? t('paymentQr.keyCopied') : t('paymentQr.copyKey')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>

            {/* ── Steps ─────────────────────────────────────── */}
            <Animated.View style={{ opacity: stepsOpacity }}>
              <View style={[styles.stepsCard, {
                backgroundColor: colors.surface,
                borderColor: `${colors.textPrimary}10`,
              }]}>
                <Text style={[styles.stepsTitle, { color: colors.textPrimary }]}>{t('paymentQr.howTitle')}</Text>
                {(['step1', 'step2', 'step3', 'step4'] as const).map((key, i) => (
                  <View key={key} style={styles.stepRow}>
                    <View style={[styles.stepNum, { backgroundColor: `${colors.primary}18` }]}>
                      <Ionicons name={STEP_ICONS[i]} size={15} color={colors.primary} />
                    </View>
                    <Text style={[styles.stepText, { color: colors.textSecondary }]}>{t(`paymentQr.${key}`)}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>

            {status === 'sent' && (
              <View style={[styles.statusBox, { backgroundColor: '#00897B18', borderColor: '#00897B40' }]}>
                <Ionicons name="checkmark-circle" size={20} color="#00897B" />
                <Text style={[styles.statusText, { color: '#00897B' }]}>{t('paymentQr.sent')}</Text>
              </View>
            )}
            {status === 'error' && (
              <View style={[styles.statusBox, { backgroundColor: '#EF444418', borderColor: '#EF444440' }]}>
                <Ionicons name="alert-circle" size={20} color="#EF4444" />
                <Text style={[styles.statusText, { color: '#EF4444' }]}>{t('paymentQr.error')}</Text>
              </View>
            )}

            <View style={{ height: 16 }} />
          </ScrollView>

          {/* ── Footer CTA ────────────────────────────────── */}
          <View style={[styles.footer, {
            backgroundColor: colors.background,
            borderTopColor: `${colors.textPrimary}10`,
          }]}>
            <Animated.View style={[styles.btnWrapper, { transform: [{ scale: btnScale }], shadowColor: status === 'sent' ? '#00897B' : '#00C4D9' }]}>
              <TouchableOpacity
                onPress={handlePaid}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={1}
                disabled={status === 'sending' || status === 'sent'}
                style={styles.ctaTouch}
              >
                <LinearGradient
                  colors={status === 'sent' ? ['#00BFA5', '#00695C'] : ['#007B8E', '#00ACC1', '#005F73']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={[styles.ctaBtn, { opacity: status === 'sending' ? 0.8 : 1 }]}
                >
                  {status === 'sending' ? (
                    <>
                      <ActivityIndicator size="small" color="#fff" />
                      <Text style={styles.ctaBtnText}>{t('paymentQr.sending')}</Text>
                    </>
                  ) : (
                    <>
                      {/* Left icon circle */}
                      <View style={styles.ctaIconCircle}>
                        <Ionicons
                          name={status === 'sent' ? 'checkmark' : 'logo-whatsapp'}
                          size={19} color="#fff"
                        />
                      </View>

                      {/* Center text */}
                      <View style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={styles.ctaBtnText}>
                          {status === 'sent'
                            ? t('paymentQr.sent').split('!')[0] + '!'
                            : t('paymentQr.paidButton')}
                        </Text>
                      </View>

                      {/* Right: price tag (idle) or spacer (sent) */}
                      {status === 'idle' ? (
                        <View style={styles.ctaPriceTag}>
                          <Text style={styles.ctaPriceTagText}>
                            {selectedPlan === 'monthly' ? planMonthlyPrice : planAnnualPrice}
                          </Text>
                        </View>
                      ) : (
                        <View style={{ width: 38 }} />
                      )}
                    </>
                  )}

                  {status === 'idle' && (
                    <Animated.View
                      pointerEvents="none"
                      style={[styles.shimmer, { transform: [{ translateX: shimmerX }, { rotate: '15deg' }] }]}
                    >
                      <LinearGradient
                        colors={['transparent', 'rgba(255,255,255,0.20)', 'transparent']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={{ width: 70, flex: 1 }}
                      />
                    </Animated.View>
                  )}
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
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },

  // Hero
  hero: { borderRadius: 24, padding: 24, alignItems: 'center', gap: 8, overflow: 'hidden' },
  decoCircle: { position: 'absolute', backgroundColor: '#fff', opacity: 0.06 },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 50,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)',
    paddingHorizontal: 12, paddingVertical: 5, marginBottom: 2,
  },
  heroBadgeText: { fontSize: 10, fontFamily: Fonts.bold, color: '#FFD166', letterSpacing: 2.5 },
  heroTitle: { fontSize: 22, fontFamily: Fonts.bold, color: '#fff', textAlign: 'center' },
  heroSubtitle: { fontSize: 13, fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },

  // Plan selector
  planRow: { flexDirection: 'row', gap: 12 },
  planCard: { flex: 1, borderRadius: 16, padding: 14, minHeight: 90, gap: 8 },
  planCardInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  planRadio: {
    width: 18, height: 18, borderRadius: 9, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  planRadioDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#fff' },
  planLabel: { fontSize: 13, fontFamily: Fonts.semiBold, flex: 1 },
  planPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  planAmount: { fontSize: 20, fontFamily: Fonts.bold },
  planPeriod: { fontSize: 11, fontFamily: Fonts.medium, opacity: 0.75 },
  savingsBadge: { borderRadius: 50, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  savingsText: { fontSize: 10, fontFamily: Fonts.bold },

  // Alias card
  aliasCard: {
    borderRadius: 24, padding: 20, alignItems: 'center', gap: 14,
    borderWidth: 1.5, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
  },
  breBBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'center', borderRadius: 50, borderWidth: 1.5,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  breBBadgeText: { fontSize: 13, fontFamily: Fonts.bold, letterSpacing: 0.5 },
  keyRow: {
    width: '100%', flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, borderWidth: 1, padding: 12,
  },
  keyLabel: { fontSize: 11, fontFamily: Fonts.regular, marginBottom: 2 },
  keyValue: { fontSize: 18, fontFamily: Fonts.bold, letterSpacing: 0.5 },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    minWidth: 44, minHeight: 44, justifyContent: 'center',
  },
  copyBtnText: { fontSize: 12, fontFamily: Fonts.semiBold, color: '#fff' },

  // Steps
  stepsCard: { borderRadius: 20, padding: 18, gap: 14, borderWidth: 1 },
  stepsTitle: { fontSize: 15, fontFamily: Fonts.bold, marginBottom: 2, textAlign: 'center' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepNum: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 13, fontFamily: Fonts.regular, flex: 1, lineHeight: 20 },

  // Status
  statusBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, borderWidth: 1, padding: 14,
  },
  statusText: { fontSize: 13, fontFamily: Fonts.medium, flex: 1, lineHeight: 18 },

  // Footer
  footer: { padding: 16, paddingBottom: 8, borderTopWidth: 1 },
  btnWrapper: {
    borderRadius: 50, overflow: 'hidden',
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 10,
  },
  ctaTouch: { borderRadius: 50, overflow: 'hidden' },
  ctaBtn: {
    height: 64, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 12, borderRadius: 50, paddingHorizontal: 16,
  },
  ctaIconCircle: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  ctaPriceTag: {
    backgroundColor: 'rgba(0,0,0,0.20)',
    borderRadius: 50,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
    flexShrink: 0,
  },
  ctaPriceTagText: { fontSize: 11, fontFamily: Fonts.semiBold, color: 'rgba(255,255,255,0.88)', letterSpacing: 0.2 },
  ctaBtnText: { fontSize: 16, fontFamily: Fonts.bold, color: '#fff' },
  shimmer: { position: 'absolute', top: 0, bottom: 0, width: 70, overflow: 'hidden' },
});
