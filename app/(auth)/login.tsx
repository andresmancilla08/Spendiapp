import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import appConfig from '../../app.json';
import { useGoogleSignIn } from '../../hooks/useGoogleSignIn';
import ScreenBackground from '../../components/ScreenBackground';
import ScreenTransition from '../../components/ScreenTransition';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../../components/LanguageSelector';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '../../config/fonts';
import Svg, { Path, G, ClipPath, Defs, Rect } from 'react-native-svg';
import PressableScale from '../../components/PressableScale';

function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <ClipPath id="clip">
          <Rect width="24" height="24" />
        </ClipPath>
      </Defs>
      <G clipPath="url(#clip)">
        <Path d="M23.52 12.27c0-.85-.07-1.67-.2-2.45H12v4.63h6.46a5.52 5.52 0 01-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.8z" fill="#4285F4" />
        <Path d="M12 24c3.24 0 5.95-1.07 7.94-2.9l-3.88-3.01c-1.07.72-2.45 1.14-4.06 1.14-3.12 0-5.76-2.11-6.7-4.95H1.28v3.1A11.99 11.99 0 0012 24z" fill="#34A853" />
        <Path d="M5.3 14.28A7.19 7.19 0 014.93 12c0-.79.14-1.56.37-2.28V6.62H1.28A11.99 11.99 0 000 12c0 1.93.46 3.76 1.28 5.38l4.02-3.1z" fill="#FBBC05" />
        <Path d="M12 4.77c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0A11.99 11.99 0 001.28 6.62l4.02 3.1C6.24 6.88 8.88 4.77 12 4.77z" fill="#EA4335" />
      </G>
    </Svg>
  );
}

export default function LoginScreen() {
  const { promptAsync, loading, error } = useGoogleSignIn();
  const [consentAccepted, setConsentAccepted] = useState(false);
  const { t } = useTranslation();
  const { colors, isDark, setThemeMode } = useTheme();

  useEffect(() => {
    if (error) Alert.alert('Error', error);
  }, [error]);

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
          >
            <Ionicons
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
            {/* Consent checkbox */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setConsentAccepted(v => !v)}
              style={styles.consentRow}
            >
              <View style={[
                styles.checkbox,
                {
                  backgroundColor: consentAccepted ? colors.primary : 'transparent',
                  borderColor: consentAccepted ? colors.primary : colors.border,
                }
              ]}>
                {consentAccepted && <Ionicons name="checkmark" size={13} color={colors.onPrimary} />}
              </View>
              <Text style={[styles.consentText, { color: colors.textSecondary }]}>
                {t('login.consentPrefix')}{' '}
                <Text
                  style={{ color: colors.primary, fontFamily: Fonts.semiBold }}
                  onPress={(e) => { e.stopPropagation?.(); router.push('/terms' as any); }}
                >
                  {t('login.consentTerms')}
                </Text>
                {' '}{t('login.consentAnd')}{' '}
                <Text
                  style={{ color: colors.primary, fontFamily: Fonts.semiBold }}
                  onPress={(e) => { e.stopPropagation?.(); router.push('/privacy' as any); }}
                >
                  {t('login.consentPrivacy')}
                </Text>
              </Text>
            </TouchableOpacity>

            <PressableScale
              style={[styles.googleButton, {
                borderColor: isDark ? colors.border : colors.border,
                backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
                opacity: consentAccepted ? 1 : 0.4,
              }]}
              disabled={loading || !consentAccepted}
              onPress={() => promptAsync()}
            >
              {loading ? (
                <ActivityIndicator color={colors.textSecondary} />
              ) : (
                <>
                  <GoogleIcon size={18} />
                  <Text style={[styles.googleButtonText, { color: colors.textSecondary }]}>
                    {t('login.googleButton')}
                  </Text>
                </>
              )}
            </PressableScale>

            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.textTertiary }]}>o</Text>
              <View style={[styles.dividerLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border }]} />
            </View>

            <PressableScale
              style={[styles.emailButton, {
                backgroundColor: colors.primary,
                opacity: consentAccepted ? 1 : 0.4,
              }]}
              disabled={loading || !consentAccepted}
              onPress={() => router.push('/(auth)/login-email')}
            >
              <Ionicons name="mail-outline" size={18} color={colors.onPrimary} />
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
              <Text style={[styles.registerLinkHighlight, { color: colors.primary }]}>
                {t('login.registerLink')}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.version, { color: colors.textTertiary }]}>
          {t('profile.version', { version: appConfig.expo.version })}
        </Text>
      </ScreenBackground>
    </SafeAreaView>
    </ScreenTransition>
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
    width: 110,
    height: 110,
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
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  checkbox: {
    width: 22, height: 22,
    borderRadius: 6, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 1, flexShrink: 0,
  },
  consentText: { flex: 1, fontSize: 13, fontFamily: Fonts.regular, lineHeight: 20 },
  googleButton: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 50,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  googleButtonText: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 14,
    fontFamily: Fonts.medium,
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
  version: {
    textAlign: 'center',
    fontSize: 12,
    fontFamily: Fonts.regular,
    paddingBottom: 16,
  },
});
