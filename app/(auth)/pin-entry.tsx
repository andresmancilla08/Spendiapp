import { useState } from 'react';
import {
  View,
  SafeAreaView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import PinKeypad from '../../components/PinKeypad';
import AppDialog from '../../components/AppDialog';
import AppHeader from '../../components/AppHeader';
import { registerWithEmailAndPin, loginWithEmailAndPin } from '../../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';

export default function PinEntryScreen() {
  const { mode, name, email } = useLocalSearchParams<{ mode: string; name: string; email: string }>();
  const [loading, setLoading] = useState(false);
  const [showEmailTakenDialog, setShowEmailTakenDialog] = useState(false);
  const { t } = useTranslation();
  const { colors } = useTheme();

  const handlePinComplete = async (pin: string) => {
    if (loading) return;
    setLoading(true);
    try {
      const paddedPin = pin + '00';
      if (mode === 'register') {
        await registerWithEmailAndPin(name ?? '', email ?? '', paddedPin);
      } else {
        await loginWithEmailAndPin(email ?? '', paddedPin);
      }
    } catch (error: unknown) {
      const err = error as { code?: string };
      if (err.code === 'auth/email-already-in-use') {
        setShowEmailTakenDialog(true);
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        Alert.alert('PIN incorrecto', t('errors.wrongPin'));
      } else if (err.code === 'auth/user-not-found') {
        Alert.alert('Error', t('errors.genericError'));
      } else {
        Alert.alert('Error', t('errors.genericError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const title = mode === 'register' ? t('pinEntry.createTitle') : t('pinEntry.enterTitle');
  const subtitle = mode === 'register' ? t('pinEntry.createSubtitle') : t('pinEntry.enterSubtitle', { email: email ?? '' });

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader />
      <AppDialog
        visible={showEmailTakenDialog}
        type="error"
        title={t('dialogs.emailTaken.title')}
        description={t('dialogs.emailTaken.description')}
        primaryLabel={t('dialogs.emailTaken.primary')}
        secondaryLabel={t('dialogs.emailTaken.secondary')}
        onPrimary={() => {
          setShowEmailTakenDialog(false);
          router.replace({ pathname: '/(auth)/pin-entry', params: { mode: 'login', email } });
        }}
        onSecondary={() => setShowEmailTakenDialog(false)}
      />
      {loading && (
        <View style={[styles.loadingOverlay, { backgroundColor: colors.background + 'DD' }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
      <PinKeypad
        title={title}
        subtitle={subtitle}
        onComplete={handlePinComplete}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
});
