import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Link } from 'expo-router';
import appConfig from '../../app.json';
import ScreenBackground from '../../components/ScreenBackground';
import ScreenTransition from '../../components/ScreenTransition';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../../components/LanguageSelector';
import { useTheme } from '../../context/ThemeContext';
import { accentInk } from '../../utils/contrast';
import AppIcon from '../../components/AppIcon';
import { Fonts } from '../../config/fonts';
import PressableScale from '../../components/PressableScale';

export default function LoginScreen() {
  const { t } = useTranslation();
  const { colors, isDark, setThemeMode } = useTheme();

  return (
    <>
    <ScreenTransition>
    <SafeAreaView style={styles.safeArea}>
      <ScreenBackground auroraIntensity="intense">
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => setThemeMode(isDark ? 'light' : 'dark')}
            activeOpacity={0.7}
            style={styles.themeToggle}
          >
            <AppIcon
              name={isDark ? 'sunny-outline' : 'moon-outline'}
              size={20}
              color={colors.primary}
            />
          </TouchableOpacity>
          <LanguageSelector />
        </View>

        {/* Contenido central */}
        <View style={styles.container}>
          <View style={styles.headerSection}>
            <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
            <Text style={[styles.appName, { color: colors.textPrimary }]}>Spendia</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('login.subtitle')}</Text>
          </View>

          <View style={styles.buttonsSection}>
            <PressableScale
              style={[styles.emailButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/(auth)/login-email')}
            >
              <AppIcon name="mail-outline" size={18} color={colors.onPrimary} />
              <Text style={[styles.emailButtonText, { color: colors.onPrimary }]}>
                {t('login.emailButton')}
              </Text>
            </PressableScale>
          </View>

          <TouchableOpacity
            style={styles.registerLinkContainer}
            onPress={() => router.push('/(auth)/register')}
            activeOpacity={0.7}
          >
            <Text style={[styles.registerLinkText, { color: colors.textSecondary }]}>
              {t('login.noAccount')}{' '}
              <Text style={[styles.registerLinkHighlight, { color: accentInk(colors, 'primary', colors.background) }]}>
                {t('login.registerLink')}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Link href="/privacy" style={[styles.footerLink, { color: accentInk(colors, 'primary', colors.background) }]}>
            {t('consentModal.privacy')}
          </Link>
          <Text style={[styles.footerDot, { color: colors.textTertiary }]}>·</Text>
          <Link href="/terms" style={[styles.footerLink, { color: accentInk(colors, 'primary', colors.background) }]}>
            {t('consentModal.terms')}
          </Link>
        </View>
        <Text style={[styles.version, { color: colors.textTertiary }]}>
          {t('profile.version', { version: appConfig.expo.version })}
        </Text>
      </ScreenBackground>
    </SafeAreaView>
    </ScreenTransition>

    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  themeToggle: {
    padding: 4,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 56,
  },
  logo: {
    width: 160,
    height: 160,
    marginBottom: 16,
  },
  appName: {
    fontSize: 30,
    fontFamily: Fonts.extraBold,
    marginBottom: 14,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  buttonsSection: {
    width: '100%',
    marginBottom: 32,
  },
  emailButton: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emailButtonText: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
  },
  registerLinkContainer: {
    alignItems: 'center',
  },
  registerLinkText: {
    fontSize: 14,
    fontFamily: Fonts.regular,
  },
  registerLinkHighlight: {
    fontFamily: Fonts.semiBold,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 6,
  },
  footerLink: {
    fontSize: 12,
    fontFamily: Fonts.medium,
  },
  footerDot: {
    fontSize: 12,
    fontFamily: Fonts.regular,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    fontFamily: Fonts.regular,
    paddingBottom: 16,
  },
});
