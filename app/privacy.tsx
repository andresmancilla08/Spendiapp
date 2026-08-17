import { useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { goBack } from '../utils/nav';
import AppIcon from '../components/AppIcon';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../config/fonts';
import ScreenTransition, { ScreenTransitionRef } from '../components/ScreenTransition';
import ScreenBackground from '../components/ScreenBackground';
import { formatDate } from '../utils/dateLocale';
import LegalBody from '../components/LegalBody';

// Fecha de la última revisión del texto legal. Se formatea en el idioma activo:
// escrita a mano en español, en inglés e italiano salía en español.
const LAST_UPDATED_AT = new Date(2026, 7, 17);
const CONTACT_EMAIL = 'andres.mancilla@ikualo.com';
const CONTACT_PHONE = '+57 320 749 2444';
const WEBSITE = 'https://spendia.co';

export default function PrivacyScreen() {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();
  const transitionRef = useRef<ScreenTransitionRef>(null);
  const LAST_UPDATED = formatDate(LAST_UPDATED_AT, { day: 'numeric', month: 'long', year: 'numeric' }, i18n.language);

  const handleBack = () => {
    const go = () => goBack('/(auth)/login');
    if (transitionRef.current) {
      transitionRef.current.animateOut(go);
    } else {
      goBack('/(auth)/login');
    }
  };

  return (
    <ScreenTransition ref={transitionRef}>
      <SafeAreaView style={styles.safe}>
        <ScreenBackground>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
                <AppIcon name="arrow-back" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            <View style={styles.headerTitles}>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t('legal.title.privacy')}</Text>
              <Text style={[styles.headerSub, { color: colors.textTertiary }]}>Spendia · {t('legal.lastUpdated')}: {LAST_UPDATED}</Text>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {i18n.language !== 'es' && (
              <View style={[styles.langNotice, { backgroundColor: colors.primaryLight, borderColor: colors.primary + '40' }]}>
                <AppIcon name="information-circle-outline" size={16} color={colors.primary} />
                <Text style={[styles.langNoticeText, { color: colors.textSecondary }]}>{t('legal.translationNotice')}</Text>
              </View>
            )}
            <LegalBody i18nKey="legal.privacySections" vars={{ website: WEBSITE, email: CONTACT_EMAIL, phone: CONTACT_PHONE, updated: LAST_UPDATED }} />

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.textTertiary }]}>
                {t('legal.rights', { year: LAST_UPDATED_AT.getFullYear() })}{'\n'}{t('legal.updatedPrivacy', { date: LAST_UPDATED })}
              </Text>
            </View>
          </ScrollView>
        </ScreenBackground>
      </SafeAreaView>
    </ScreenTransition>
  );
}

const styles = StyleSheet.create({
  langNotice: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  langNoticeText: { flex: 1, fontSize: 13, fontFamily: Fonts.regular, lineHeight: 18 },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitles: { flex: 1 },
  headerTitle: { fontSize: 17, fontFamily: Fonts.bold },
  headerSub: { fontSize: 12, fontFamily: Fonts.regular, marginTop: 2 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxWidth: 720,
    alignSelf: 'center',
    width: '100%',
  },
  footer: {
    marginTop: 16,
    paddingTop: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 18,
  },
});
