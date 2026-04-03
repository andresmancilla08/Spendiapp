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
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useGoogleSignIn } from '../../hooks/useAuth';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../../components/LanguageSelector';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '../../config/fonts';
import Svg, { Path, G, ClipPath, Defs, Rect } from 'react-native-svg';

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
  const { t } = useTranslation();
  const { colors, isDark, setThemeMode } = useTheme();

  useEffect(() => {
    if (error) Alert.alert('Error', error);
  }, [error]);

  const gradientColors: [string, string, string] = isDark
    ? ['#0D1A1C', '#062830', '#003840']
    : ['#FFFFFF', '#F5F9FA', '#E0F7FA'];

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.gradient}
      >
        {/* Blobs decorativos */}
        <View style={[styles.blobTopRight, { backgroundColor: colors.primaryLight, opacity: isDark ? 0.25 : 0.6 }]} />
        <View style={[styles.blobBottomLeft, { backgroundColor: colors.secondaryLight, opacity: isDark ? 0.2 : 0.45 }]} />

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
            <View style={[styles.logoContainer, {
              backgroundColor: colors.primaryLight,
              borderColor: isDark ? 'rgba(0,172,193,0.3)' : colors.border,
              shadowColor: colors.primary,
            }]}>
              <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
            </View>
            <Text style={[styles.appName, { color: colors.textPrimary }]}>Spendiapp</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('login.subtitle')}</Text>
          </View>

          <View style={styles.buttonsSection}>
            <TouchableOpacity
              style={[styles.googleButton, {
                borderColor: isDark ? 'rgba(238,246,248,0.18)' : colors.border,
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.surface,
              }]}
              activeOpacity={0.8}
              disabled={loading}
              onPress={promptAsync}
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
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: isDark ? 'rgba(238,246,248,0.1)' : colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.textTertiary }]}>o</Text>
              <View style={[styles.dividerLine, { backgroundColor: isDark ? 'rgba(238,246,248,0.1)' : colors.border }]} />
            </View>

            <TouchableOpacity
              style={[styles.emailButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
              activeOpacity={0.8}
              disabled={loading}
              onPress={() => router.push('/(auth)/login-email')}
            >
              <Ionicons name="mail-outline" size={18} color={colors.onPrimary} />
              <Text style={[styles.emailButtonText, { color: colors.onPrimary }]}>
                {t('login.emailButton')}
              </Text>
            </TouchableOpacity>
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
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  blobTopRight: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 999,
  },
  blobBottomLeft: {
    position: 'absolute',
    bottom: -60,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 999,
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
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 56,
  },
  logoContainer: {
    width: 112,
    height: 112,
    borderRadius: 32,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  logo: {
    width: 80,
    height: 80,
  },
  appName: {
    fontSize: 30,
    fontFamily: Fonts.extraBold,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonsSection: {
    width: '100%',
    marginBottom: 32,
  },
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
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
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
});
