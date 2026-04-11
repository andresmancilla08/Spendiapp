import { useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeMode } from '../../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, changeLanguage } from '../../config/i18n';
import { router } from 'expo-router';
import AppHeader from '../../components/AppHeader';
import ScreenTransition, { ScreenTransitionRef } from '../../components/ScreenTransition';
import PageTitle from '../../components/PageTitle';
import ScreenBackground from '../../components/ScreenBackground';
import { Fonts } from '../../config/fonts';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function SectionTitle({ label }: { label: string }) {
  const { colors } = useTheme();
  return <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>{label}</Text>;
}

function OptionRow({ icon, label, value, color, onPress }: {
  icon: IoniconsName; label: string; value?: string; color?: string; onPress: () => void;
}) {
  const { colors } = useTheme();
  const ic = color ?? colors.primary;
  return (
    <TouchableOpacity style={[styles.row, { borderBottomColor: colors.border }]} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.iconWrap, { backgroundColor: ic + '18' }]}>
        <Ionicons name={icon} size={18} color={ic} />
      </View>
      <View style={styles.rowMeta}>
        <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{label}</Text>
        {value ? (
          <Text style={[styles.rowValue, { color: colors.textTertiary }]} numberOfLines={1} ellipsizeMode="tail">
            {value}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const { colors, themeMode, setThemeMode } = useTheme();
  const { t, i18n } = useTranslation();

  const themeLabels: Record<ThemeMode, string> = {
    system: t('profile.theme.system'),
    light: t('profile.theme.light'),
    dark: t('profile.theme.dark'),
  };
  const themeIcons: Record<ThemeMode, IoniconsName> = {
    system: 'phone-portrait-outline',
    light: 'sunny-outline',
    dark: 'moon-outline',
  };

  const cycleTheme = () => {
    const next: Record<ThemeMode, ThemeMode> = { system: 'light', light: 'dark', dark: 'system' };
    setThemeMode(next[themeMode]);
  };

  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[0];

  const pickLanguage = () => {
    Alert.alert(
      t('profile.language.title'),
      t('profile.language.subtitle'),
      LANGUAGES.map((l) => ({ text: `${l.flag} ${l.label}`, onPress: () => changeLanguage(l.code) }))
    );
  };

  const transitionRef = useRef<ScreenTransitionRef>(null);
  const handleBack = () => {
    if (transitionRef.current) {
      transitionRef.current.animateOut(() => router.back());
    } else {
      router.back();
    }
  };

  return (
    <ScreenTransition ref={transitionRef}>
    <SafeAreaView style={styles.safeArea}>
      <ScreenBackground>
      <AppHeader showBack onBack={handleBack} />
      <PageTitle title={t('settings.title')} description={t('settings.pageDesc')} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <SectionTitle label={t('settings.sections.appearance')} />
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <OptionRow
            icon={themeIcons[themeMode]}
            label={t('profile.theme.label')}
            value={themeLabels[themeMode]}
            onPress={cycleTheme}
          />
          <OptionRow
            icon="language-outline"
            label={t('profile.language.label')}
            value={`${currentLang.flag} ${currentLang.label}`}
            onPress={pickLanguage}
          />
        </View>

        <SectionTitle label={t('settings.sections.security')} />
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <OptionRow icon="lock-closed-outline" label={t('settings.security.changePin')} onPress={() => Alert.alert(t('common.comingSoon'), t('common.comingSoonDesc'))} />
          <OptionRow icon="finger-print-outline" label={t('settings.security.faceId')} value={t('settings.security.faceIdValue')} onPress={() => Alert.alert(t('common.comingSoon'), t('common.comingSoonDesc'))} />
          <OptionRow icon="time-outline" label={t('settings.security.inactivity')} value={t('settings.security.inactivityValue')} onPress={() => Alert.alert(t('common.comingSoon'), t('common.comingSoonDesc'))} />
        </View>

        <SectionTitle label={t('settings.sections.notifications')} />
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <OptionRow icon="notifications-outline" label={t('settings.notifications.push')} value={t('settings.notifications.pushValue')} onPress={() => Alert.alert(t('common.comingSoon'), t('common.comingSoonDesc'))} />
          <OptionRow icon="mail-outline" label={t('settings.notifications.weekly')} onPress={() => Alert.alert(t('common.comingSoon'), t('common.comingSoonDesc'))} />
        </View>

        <SectionTitle label={t('settings.sections.data')} />
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <OptionRow icon="cloud-download-outline" label={t('settings.data.export')} onPress={() => Alert.alert(t('common.comingSoon'), t('common.comingSoonDesc'))} />
          <OptionRow
            icon="trash-outline"
            label={t('settings.data.delete')}
            color={colors.error}
            onPress={() => Alert.alert(t('settings.data.deleteDialog.title'), t('settings.data.deleteDialog.desc'), [
              { text: t('common.cancel'), style: 'cancel' },
              { text: t('settings.data.delete'), style: 'destructive', onPress: () => {} },
            ])}
          />
        </View>

        <SectionTitle label={t('settings.sections.about')} />
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <OptionRow icon="shield-checkmark-outline" label={t('profile.privacy.label')} onPress={() => Alert.alert(t('common.comingSoon'), '')} />
          <OptionRow icon="document-text-outline" label={t('settings.about.terms')} onPress={() => Alert.alert(t('common.comingSoon'), '')} />
          <OptionRow icon="information-circle-outline" label={t('settings.about.version')} value="1.0.0" onPress={() => {}} />
        </View>

      </ScrollView>
      </ScreenBackground>
    </SafeAreaView>
    </ScreenTransition>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 11, fontFamily: Fonts.bold, marginBottom: 8, marginLeft: 4 },
  card: { borderRadius: 20, marginBottom: 24, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  iconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowMeta: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 14, fontFamily: Fonts.medium },
  rowValue: { fontSize: 12, fontFamily: Fonts.regular },
});
