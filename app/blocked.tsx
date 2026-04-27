import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import ScreenTransition from '../components/ScreenTransition';
import ScreenBackground from '../components/ScreenBackground';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../config/fonts';

export default function BlockedScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const handleContact = () => {
    Linking.openURL('https://wa.me/573183501077');
  };

  return (
    <ScreenTransition>
      <SafeAreaView style={styles.safeArea}>
        <ScreenBackground>
          <View style={styles.container}>
            <View style={[styles.content, { maxWidth: 400 }]}>
              <Ionicons name="ban-outline" size={72} color={colors.error} />
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {t('blocked.title')}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {t('blocked.subtitle')}
              </Text>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.primary }]}
                onPress={handleContact}
                activeOpacity={0.85}
              >
                <Text style={[styles.buttonText, { color: colors.onPrimary }]}>
                  {t('blocked.contact')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScreenBackground>
      </SafeAreaView>
    </ScreenTransition>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  content: {
    alignItems: 'center',
    gap: 16,
    width: '100%',
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 26,
    textAlign: 'center',
    marginTop: 16,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    marginTop: 24,
    height: 56,
    borderRadius: 50,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  buttonText: {
    fontFamily: Fonts.bold,
    fontSize: 17,
  },
});
