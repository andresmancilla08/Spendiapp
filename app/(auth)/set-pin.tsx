import { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { isPinComplete, PIN_LENGTH } from '../../constants/pin';
import ScreenTransition from '../../components/ScreenTransition';
import ScreenBackground from '../../components/ScreenBackground';
import PinInput from '../../components/PinInput';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { Fonts } from '../../config/fonts';
import AppIcon from '../../components/AppIcon';
import { setOwnPin, signOut } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import { accentInk } from '../../utils/contrast';

/**
 * Creación obligatoria del PIN propio tras la migración a 6 dígitos.
 *
 * No hay botón de volver ni forma de saltarla: quien llega aquí entró con el
 * PIN por defecto, que es público. Lo único que se ofrece es cerrar sesión.
 */
export default function SetPinScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const scrollRef = useRef<ScrollView>(null);

  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matchStatus = useMemo<'idle' | 'match' | 'mismatch'>(() => {
    if (!isPinComplete(confirmPin)) return 'idle';
    return pin === confirmPin ? 'match' : 'mismatch';
  }, [pin, confirmPin]);

  // El PIN por defecto de la migración es público: dejarlo tal cual sería no
  // haber hecho nada.
  const isDefaultPin = pin === '123456';
  const canSave = isPinComplete(pin) && matchStatus === 'match' && !isDefaultPin && !loading;

  const handleSave = async () => {
    if (!canSave) return;
    setLoading(true);
    setError(null);
    try {
      await setOwnPin(pin);
      showToast(t('setPin.success'), 'success');
      router.replace('/(tabs)/');
    } catch (e: any) {
      // Firebase exige un login reciente para cambiar la contraseña. Si la
      // sesión venía de días atrás, hay que volver a entrar.
      if (e?.code === 'auth/requires-recent-login') {
        setError(t('setPin.errors.staleSession'));
      } else {
        setError(t('setPin.errors.generic'));
      }
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  return (
    <ScreenTransition>
      <SafeAreaView style={styles.safe}>
        <ScreenBackground>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              ref={scrollRef}
              contentContainerStyle={styles.scroll}
              keyboardShouldPersistTaps="handled"
            >
              <View style={[styles.badge, { backgroundColor: colors.primaryLight }]}>
                <AppIcon name="lock-closed-outline" size={30} color={colors.primary} />
              </View>

              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {t('setPin.title')}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {t('setPin.subtitle', { count: PIN_LENGTH })}
              </Text>

              <View style={styles.section}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  {t('setPin.newLabel')}
                </Text>
                <PinInput
                  value={pin}
                  onChange={(v) => { setPin(v); setConfirmPin(''); setError(null); }}
                  error={!!error}
                />
                {isDefaultPin && (
                  <Text style={[styles.hint, { color: colors.error }]}>
                    {t('setPin.errors.sameAsDefault')}
                  </Text>
                )}
              </View>

              <View style={[styles.section, { opacity: isPinComplete(pin) ? 1 : 0.45 }]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  {t('setPin.confirmLabel')}
                </Text>
                <PinInput
                  value={confirmPin}
                  onChange={(v) => { setConfirmPin(v); setError(null); }}
                  error={matchStatus === 'mismatch'}
                />
                {matchStatus === 'mismatch' && (
                  <Text style={[styles.hint, { color: colors.error }]}>
                    {t('setPin.errors.mismatch')}
                  </Text>
                )}
              </View>

              {!!error && (
                <Text style={[styles.hint, { color: colors.error }]}>{error}</Text>
              )}

              <TouchableOpacity
                onPress={handleSave}
                disabled={!canSave}
                activeOpacity={0.85}
                style={[
                  styles.cta,
                  { backgroundColor: colors.primary, opacity: canSave ? 1 : 0.4 },
                ]}
              >
                {loading
                  ? <ActivityIndicator size="small" color={accentInk(colors, 'primary', colors.primary)} />
                  : (
                    <Text style={[styles.ctaText, { color: accentInk(colors, 'primary', colors.primary) }]}>
                      {t('setPin.save')}
                    </Text>
                  )}
              </TouchableOpacity>

              <TouchableOpacity onPress={handleSignOut} activeOpacity={0.7} style={styles.signOut}>
                <Text style={[styles.signOutText, { color: colors.textTertiary }]}>
                  {t('setPin.signOut')}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </ScreenBackground>
      </SafeAreaView>
    </ScreenTransition>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    padding: 24,
    paddingTop: 48,
    paddingBottom: 40,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    alignItems: 'center',
  },
  badge: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  title: { fontSize: 24, fontFamily: Fonts.bold, textAlign: 'center' },
  subtitle: { fontSize: 14, fontFamily: Fonts.regular, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  section: { alignSelf: 'stretch', marginTop: 28, alignItems: 'center' },
  label: { fontSize: 12, fontFamily: Fonts.bold, letterSpacing: 0.6, marginBottom: 12 },
  hint: { fontSize: 12, fontFamily: Fonts.medium, textAlign: 'center', marginTop: 10 },
  cta: {
    alignSelf: 'stretch', marginTop: 32, borderRadius: 50,
    paddingVertical: 16, alignItems: 'center', justifyContent: 'center',
  },
  ctaText: { fontSize: 15, fontFamily: Fonts.bold },
  signOut: { marginTop: 20, padding: 8 },
  signOutText: { fontSize: 13, fontFamily: Fonts.medium },
});
