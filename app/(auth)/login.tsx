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
import { authTokens } from '../../utils/authTheme';
import AppIcon, { type AppIconName } from '../../components/AppIcon';
import { Fonts } from '../../config/fonts';
import AppButton from '../../components/AppButton';

/** Lo que hace la app, en tres líneas. Antes la portada solo decía cómo se llama. */
const FEATURES: { icon: AppIconName; key: string }[] = [
  { icon: 'stats-chart-outline', key: 'login.featureCategories' },
  { icon: 'repeat',              key: 'login.featureFixed' },
  { icon: 'people-outline',      key: 'login.featureShared' },
];

export default function LoginScreen() {
  const { t } = useTranslation();
  const { colors, isDark, setThemeMode } = useTheme();
  const tk = authTokens(colors, isDark);

  return (
    <ScreenTransition>
    <SafeAreaView style={styles.safeArea}>
      <ScreenBackground auroraIntensity="intense">
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => setThemeMode(isDark ? 'light' : 'dark')}
            activeOpacity={0.7}
            style={styles.themeToggle}
            accessibilityRole="button"
            accessibilityLabel={t(isDark ? 'settings.lightMode' : 'settings.darkMode')}
          >
            <AppIcon
              name={isDark ? 'sunny-outline' : 'moon-outline'}
              size={20}
              color={tk.accent}
            />
          </TouchableOpacity>
          <LanguageSelector />
        </View>

        {/* Contenido: la frase manda, no el logo */}
        <View style={styles.container}>
          <Image
            source={require('../../assets/logo-mark.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.headline, { color: colors.textPrimary }]}>
            {t('login.headline')}
          </Text>

          <View style={styles.features}>
            {FEATURES.map((f) => (
              <View key={f.key} style={styles.feature}>
                <View style={[styles.featureIcon, { backgroundColor: tk.soft }]}>
                  <AppIcon name={f.icon} size={17} color={tk.accent} />
                </View>
                <Text style={[styles.featureText, { color: colors.textPrimary }]}>{t(f.key)}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.actions}>
          <AppButton
            size="lg"
            label={t('login.emailButton')}
            onPress={() => router.push('/(auth)/login-email')}
          />
          <AppButton
            size="lg"
            variant="secondary"
            label={t('login.createAccount')}
            onPress={() => router.push('/(auth)/register')}
          />

          <View style={styles.footer}>
            <Link href="/privacy" style={[styles.footerLink, { color: colors.textSecondary }]}>
              {t('consentModal.privacy')}
            </Link>
            <Text style={[styles.footerDot, { color: colors.textTertiary }]}>·</Text>
            <Link href="/terms" style={[styles.footerLink, { color: colors.textSecondary }]}>
              {t('consentModal.terms')}
            </Link>
            <Text style={[styles.footerDot, { color: colors.textTertiary }]}>·</Text>
            <Text style={[styles.footerLink, { color: colors.textTertiary }]}>
              {t('profile.version', { version: appConfig.expo.version })}
            </Text>
          </View>
        </View>
      </ScreenBackground>
    </SafeAreaView>
    </ScreenTransition>
  );
}

const CONTENT = { width: '100%' as const, maxWidth: 520, alignSelf: 'center' as const };

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  themeToggle: { padding: 4 },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 26,
    ...CONTENT,
  },
  // `logo-mark.png` conserva la proporción real del dibujo (0.583), así que el ancho
  // se deriva del alto: con otra proporción `contain` deja bandas transparentes.
  logo: { width: 74, height: 127, marginBottom: 22, marginLeft: -6 },
  headline: {
    fontSize: 40,
    lineHeight: 43,
    fontFamily: Fonts.extraBold,
    letterSpacing: -1.6,
  },
  features: { marginTop: 26, gap: 13 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  featureIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { flex: 1, fontSize: 13.5, fontFamily: Fonts.semiBold },
  actions: {
    paddingHorizontal: 26,
    paddingBottom: 14,
    gap: 10,
    ...CONTENT,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 10,
    paddingBottom: 6,
  },
  footerLink: { fontSize: 12.5, fontFamily: Fonts.medium },
  footerDot: { fontSize: 12.5, fontFamily: Fonts.regular },
});
