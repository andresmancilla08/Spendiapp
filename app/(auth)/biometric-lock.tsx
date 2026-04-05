import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import { Fonts } from '../../config/fonts';
import { authenticateWithBiometrics, setBiometricsAppEnrolled } from '../../hooks/useBiometrics';
import { signOut } from '../../hooks/useAuth';
import AppDialog from '../../components/AppDialog';
import { useTranslation } from 'react-i18next';

export default function BiometricLockScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const { user, setBiometricLocked } = useAuthStore();
  const [authenticating, setAuthenticating] = useState(false);
  const [failed, setFailed] = useState(false);
  const [signOutDialog, setSignOutDialog] = useState(false);

  const firstName = user?.displayName?.split(' ')[0] ?? t('biometricLock.greetingFallback');

  const gradientColors: [string, string, string] = isDark
    ? ['#0D1A1C', '#062830', '#003840']
    : ['#FFFFFF', '#F5F9FA', '#E0F7FA'];

  const handleAuthenticate = async () => {
    setAuthenticating(true);
    setFailed(false);
    try {
      const success = await authenticateWithBiometrics();
      if (success) {
        setBiometricLocked(false);
        router.replace('/(tabs)/');
      } else {
        setFailed(true);
      }
    } catch {
      setFailed(true);
    } finally {
      setAuthenticating(false);
    }
  };

  const handleSignOut = async () => {
    setSignOutDialog(false);
    await setBiometricsAppEnrolled(false);
    await signOut();
    // _layout.tsx maneja la redirección a login cuando user se vuelve null
  };

  // Auto-trigger al montar
  useEffect(() => {
    handleAuthenticate();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppDialog
        visible={signOutDialog}
        type="warning"
        title={t('profile.signOut.title')}
        description={
          <Text style={{ fontSize: 15, lineHeight: 22, textAlign: 'center', color: colors.textSecondary }}>
            {t('biometricLock.signOutDialog.descPart1')}
            <Text style={{ fontFamily: Fonts.bold, color: colors.textPrimary }}>{t('biometricLock.signOutDialog.descBold1')}</Text>
            {t('biometricLock.signOutDialog.descPart2')}
            <Text style={{ fontFamily: Fonts.bold, color: colors.textPrimary }}>{t('biometricLock.signOutDialog.descBold2')}</Text>
            {t('biometricLock.signOutDialog.descPart3')}
          </Text>
        }
        primaryLabel={t('profile.signOut.confirm')}
        secondaryLabel={t('common.cancel')}
        onPrimary={handleSignOut}
        onSecondary={() => setSignOutDialog(false)}
      />

      <LinearGradient
        colors={gradientColors}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.gradient}
      >
        <View style={[styles.blobTopRight, { backgroundColor: colors.primaryLight, opacity: isDark ? 0.25 : 0.6 }]} />

        <View style={styles.container}>
          <View style={styles.iconWrap}>
            <Ionicons name="shield-checkmark-outline" size={64} color={colors.primary} />
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t('biometricLock.greeting', { name: firstName })}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('biometricLock.subtitle')}
          </Text>

          {failed && (
            <Text style={[styles.errorText, { color: colors.error }]}>
              {t('biometricLock.error')}
            </Text>
          )}

          <TouchableOpacity
            style={[styles.biometricBtn, { backgroundColor: colors.primary }]}
            onPress={handleAuthenticate}
            disabled={authenticating}
            activeOpacity={0.85}
          >
            {authenticating
              ? <ActivityIndicator color="#FFFFFF" />
              : (
                <>
                  <Ionicons name="finger-print" size={22} color="#FFFFFF" />
                  <Text style={styles.biometricBtnText}>{t('biometricLock.button')}</Text>
                </>
              )
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signOutBtn}
            onPress={() => setSignOutDialog(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.signOutText, { color: colors.textTertiary }]}>
              {t('biometricLock.signOut')}
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  gradient: { flex: 1 },
  blobTopRight: {
    position: 'absolute', top: -80, right: -80,
    width: 280, height: 280, borderRadius: 999,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  iconWrap: { marginBottom: 8 },
  title: { fontSize: 26, fontFamily: Fonts.bold, textAlign: 'center' },
  subtitle: { fontSize: 15, fontFamily: Fonts.regular, textAlign: 'center', lineHeight: 22, marginBottom: 8 },
  errorText: { fontSize: 13, fontFamily: Fonts.regular, textAlign: 'center' },
  biometricBtn: {
    width: '100%',
    height: 56,
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
  },
  biometricBtnText: { fontSize: 17, fontFamily: Fonts.bold, color: '#FFFFFF' },
  signOutBtn: { marginTop: 8, padding: 8 },
  signOutText: { fontSize: 14, fontFamily: Fonts.regular },
});
