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
import { useGoogleSignIn } from '../../hooks/useAuth';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../../components/LanguageSelector';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '../../config/fonts';

export default function LoginScreen() {
  const { promptAsync, loading, error } = useGoogleSignIn();
  const { t } = useTranslation();
  const { colors, isDark, setThemeMode } = useTheme();

  useEffect(() => {
    if (error) Alert.alert('Error', error);
  }, [error]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
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
      <View style={styles.container}>
        <View style={styles.headerSection}>
          <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
          <Text style={[styles.appName, { color: colors.textPrimary }]}>Spendiapp</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('login.subtitle')}</Text>
        </View>

        <View style={styles.buttonsSection}>
          <TouchableOpacity
            style={[styles.googleButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
            activeOpacity={0.8}
            disabled={loading}
            onPress={() => promptAsync()}
          >
            {loading ? (
              <ActivityIndicator color={colors.textSecondary} />
            ) : (
              <Text style={[styles.googleButtonText, { color: colors.textSecondary }]}>{t('login.googleButton')}</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textTertiary }]}>o</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <TouchableOpacity
            style={[styles.emailButton, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
            disabled={loading}
            onPress={() => router.push('/(auth)/login-email')}
          >
            <Text style={[styles.emailButtonText, { color: colors.onPrimary }]}>{t('login.emailButton')}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.registerLinkContainer}
          onPress={() => router.push('/(auth)/register')}
          activeOpacity={0.7}
        >
          <Text style={[styles.registerLinkText, { color: colors.textSecondary }]}>
            {t('login.noAccount')}{' '}
            <Text style={[styles.registerLinkHighlight, { color: colors.primary }]}>{t('login.registerLink')}</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
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
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 12,
  },
  appName: {
    fontSize: 28,
    fontFamily: Fonts.extraBold,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    textAlign: 'center',
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
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
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
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
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
  },
  registerLinkHighlight: {
    fontFamily: Fonts.semiBold,
  },
});
