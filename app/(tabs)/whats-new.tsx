import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import { setWhatsNewSeen } from '../../hooks/useUserProfile';
import ScreenBackground from '../../components/ScreenBackground';
import ScreenTransition from '../../components/ScreenTransition';
import PageTitle from '../../components/PageTitle';
import { Fonts } from '../../config/fonts';
import appJson from '../../app.json';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const APP_VERSION = appJson.expo.version;

interface FeatureSection {
  key: string;
  icon: IoniconsName;
  color: string;
}

const FEATURE_SECTIONS: FeatureSection[] = [
  { key: 'savingsGoals',    icon: 'trophy-outline',          color: '#00897B' },
  { key: 'budget',          icon: 'wallet-outline',          color: '#00ACC1' },
  { key: 'friends',         icon: 'people-outline',          color: '#7C3AED' },
  { key: 'notifications',   icon: 'notifications-outline',   color: '#F59E0B' },
  { key: 'sharedExpenses',  icon: 'share-social-outline',    color: '#EF4444' },
  { key: 'improvements',    icon: 'sparkles-outline',        color: '#00897B' },
];

export default function WhatsNewScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user?.uid) {
      setWhatsNewSeen(user.uid, APP_VERSION).catch(() => {});
    }
  }, [user?.uid]);

  return (
    <ScreenTransition>
      <SafeAreaView style={styles.safe}>
        <ScreenBackground>
          <PageTitle
            title={t('whatsNew.title')}
            description={t('whatsNew.version', { version: APP_VERSION })}
          />

          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            {FEATURE_SECTIONS.map(({ key, icon, color }) => (
              <View
                key={key}
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                {/* Card header */}
                <View style={styles.cardHeader}>
                  <View style={[styles.iconWrap, { backgroundColor: `${color}18` }]}>
                    <Ionicons name={icon} size={22} color={color} />
                  </View>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                    {t(`whatsNew.${key}.title`)}
                  </Text>
                </View>

                {/* Bullet items */}
                {(['item1', 'item2', 'item3'] as const).map((item) => (
                  <View key={item} style={styles.bulletRow}>
                    <View style={[styles.bullet, { backgroundColor: color }]} />
                    <Text style={[styles.bulletText, { color: colors.textSecondary }]}>
                      {t(`whatsNew.${key}.${item}`)}
                    </Text>
                  </View>
                ))}
              </View>
            ))}

            <View style={{ height: 100 }} />
          </ScrollView>
        </ScreenBackground>
      </SafeAreaView>
    </ScreenTransition>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, paddingTop: 8 },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    flex: 1,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    flexShrink: 0,
  },
  bulletText: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    lineHeight: 19,
    flex: 1,
  },
});
