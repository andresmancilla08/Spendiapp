import { useState, useMemo } from 'react';
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
import { scrollFadeMask } from '../../components/ScrollFadeEdges';
import { isPinComplete, PIN_LENGTH, DEFAULT_MIGRATION_PIN } from '../../constants/pin';
import ScreenTransition from '../../components/ScreenTransition';
import ScreenBackground from '../../components/ScreenBackground';
import PinInput from '../../components/PinInput';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { Fonts } from '../../config/fonts';
import AppIcon from '../../components/AppIcon';
import { setOwnPin, signOut } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';

/**
 * Creación obligatoria del PIN propio tras la migración a 6 dígitos.
 *
 * No lleva AppHeader ni forma de saltarla: quien llega aquí entró con el PIN
 * por defecto, que es público. Lo único que se ofrece es cerrar sesión.
 */
export default function SetPinScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { showToast } = useToast();

  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matchStatus = useMemo<'idle' | 'match' | 'mismatch'>(() => {
    if (!isPinComplete(confirmPin)) return 'idle';
    return pin === confirmPin ? 'match' : 'mismatch';
  }, [pin, confirmPin]);

  // Dejar el PIN por defecto sería no haber hecho nada: es público.
  const isDefaultPin = pin === DEFAULT_MIGRATION_PIN;
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
      setError(e?.code === 'auth/requires-recent-login'
        ? t('setPin.errors.staleSession')
        : t('setPin.errors.generic'));
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
            style={styles.kav}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <ScrollView
              style={scrollFadeMask(0, 0)}
              contentContainerStyle={styles.scroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
                <AppIcon name="lock-closed-outline" size={28} color={colors.primary} />
              </View>

              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {t('setPin.title')}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {t('setPin.subtitle', { count: PIN_LENGTH })}
              </Text>

              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                  {t('setPin.newLabel')}
                </Text>
                <PinInput
                  value={pin}
                  onChange={(v) => { setPin(v); setConfirmPin(''); setError(null); }}
                  error={isDefaultPin}
                />
                {isDefaultPin && (
                  <Text style={[styles.hint, { color: colors.error }]}>
                    {t('setPin.errors.sameAsDefault')}
                  </Text>
                )}
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={[styles.section, { opacity: isPinComplete(pin) ? 1 : 0.45 }]}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
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
            </ScrollView>
          </KeyboardAvoidingView>

          {/* Fixed bottom button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.primary, opacity: canSave ? 1 : 0.4 }]}
              onPress={handleSave}
              activeOpacity={0.85}
              disabled={!canSave}
            >
              {loading
                ? <ActivityIndicator color={colors.onPrimary} />
                : <Text style={[styles.btnText, { color: colors.onPrimary }]}>
                    {t('setPin.save')}
                  </Text>
              }
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSignOut} activeOpacity={0.7} style={styles.signOut}>
              <Text style={[styles.signOutText, { color: colors.textTertiary }]}>
                {t('setPin.signOut')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScreenBackground>
      </SafeAreaView>
    </ScreenTransition>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  kav: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 24,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    alignItems: 'center',
    // Centrado vertical del contenido: el CTA vive fuera del scroll, así que
    // esto no lo mueve. Con flexGrow:1 el contenedor ocupa el alto libre y el
    // bloque queda a media altura en vez de pegado arriba.
    justifyContent: 'center',
  },
  iconCircle: {
    width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  title: { fontSize: 24, fontFamily: Fonts.bold, textAlign: 'center' },
  subtitle: {
    fontSize: 14, fontFamily: Fonts.regular, textAlign: 'center',
    marginTop: 8, lineHeight: 20,
  },
  section: { alignSelf: 'stretch', marginTop: 28, alignItems: 'center' },
  sectionLabel: {
    fontSize: 12, fontFamily: Fonts.bold, letterSpacing: 0.6, marginBottom: 12,
  },
  divider: { alignSelf: 'stretch', height: 1, marginTop: 28 },
  hint: { fontSize: 12, fontFamily: Fonts.medium, textAlign: 'center', marginTop: 10 },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  btn: {
    height: 56,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { fontSize: 17, fontFamily: Fonts.bold },
  signOut: { marginTop: 12, paddingVertical: 8, alignItems: 'center' },
  signOutText: { fontSize: 13, fontFamily: Fonts.medium },
});
