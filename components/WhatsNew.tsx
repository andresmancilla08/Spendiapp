// components/WhatsNew.tsx
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../config/fonts';
import { useTranslation } from 'react-i18next';
import appConfig from '../app.json';

// Actualizar SOLO cuando se agreguen features nuevas a FEATURES.
// No cambiar en patches ni bugfixes — así el modal no reaparece innecesariamente.
export const WHATS_NEW_VERSION = '1.6.5';

interface WhatsNewProps {
  visible: boolean;
  onDismiss: () => void;
}

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface Feature {
  icon: IoniconName;
  colorKey: 'primary' | 'success';
  titleKey: string;
  items: string[];
}

const FEATURES: Feature[] = [
  // v1.6.0
  {
    icon: 'people-circle-outline',
    colorKey: 'primary',
    titleKey: 'whatsNew.sharedExpenses.title',
    items: [
      'whatsNew.sharedExpenses.item1',
      'whatsNew.sharedExpenses.item2',
      'whatsNew.sharedExpenses.item3',
    ],
  },
  {
    icon: 'calculator-outline',
    colorKey: 'success',
    titleKey: 'whatsNew.splitCalc.title',
    items: [
      'whatsNew.splitCalc.item1',
      'whatsNew.splitCalc.item2',
      'whatsNew.splitCalc.item3',
    ],
  },
  {
    icon: 'expand-outline',
    colorKey: 'primary',
    titleKey: 'whatsNew.newForm.title',
    items: [
      'whatsNew.newForm.item1',
      'whatsNew.newForm.item2',
      'whatsNew.newForm.item3',
    ],
  },
  {
    icon: 'sync-outline',
    colorKey: 'success',
    titleKey: 'whatsNew.syncHistory.title',
    items: [
      'whatsNew.syncHistory.item1',
      'whatsNew.syncHistory.item2',
      'whatsNew.syncHistory.item3',
    ],
  },
  // v1.5.0
  {
    icon: 'bar-chart-outline',
    colorKey: 'primary',
    titleKey: 'whatsNew.budget.title',
    items: [
      'whatsNew.budget.item1',
      'whatsNew.budget.item2',
      'whatsNew.budget.item3',
    ],
  },
  {
    icon: 'people-outline',
    colorKey: 'success',
    titleKey: 'whatsNew.friends.title',
    items: [
      'whatsNew.friends.item1',
      'whatsNew.friends.item2',
      'whatsNew.friends.item3',
    ],
  },
  {
    icon: 'notifications-outline',
    colorKey: 'primary',
    titleKey: 'whatsNew.notifications.title',
    items: [
      'whatsNew.notifications.item1',
      'whatsNew.notifications.item2',
      'whatsNew.notifications.item3',
    ],
  },
  {
    icon: 'flash-outline',
    colorKey: 'success',
    titleKey: 'whatsNew.improvements.title',
    items: [
      'whatsNew.improvements.item1',
      'whatsNew.improvements.item2',
      'whatsNew.improvements.item3',
    ],
  },
];

export default function WhatsNew({ visible, onDismiss }: WhatsNewProps) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>

        {/* Header fijo */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={[styles.versionBadge, { backgroundColor: colors.primaryLight }]}>
            <View style={[styles.versionDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.versionText, { color: colors.primary }]}>
              {t('whatsNew.version', { version: appConfig.expo.version })}
            </Text>
          </View>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {t('whatsNew.title')}
          </Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
            {t('whatsNew.subtitle')}
          </Text>
        </View>

        {/* Contenido con scroll */}
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          focusable={false}
          style={Platform.OS === 'web' ? { outline: 'none' } as any : undefined}
        >
          {FEATURES.map((f) => {
            const accentColor = colors[f.colorKey];
            const accentBg = f.colorKey === 'success' ? colors.successLight : colors.primaryLight;
            return (
              <View
                key={f.titleKey}
                style={[styles.card, {
                  backgroundColor: colors.surface,
                  borderColor: isDark
                    ? (f.colorKey === 'success' ? 'rgba(0,168,150,0.12)' : 'rgba(0,172,193,0.12)')
                    : 'rgba(0,0,0,0.06)',
                }]}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.iconWrap, { backgroundColor: accentBg }]}>
                    <Ionicons name={f.icon} size={20} color={accentColor} />
                  </View>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                    {t(f.titleKey)}
                  </Text>
                </View>
                <View style={styles.itemsList}>
                  {f.items.map((itemKey) => (
                    <View key={itemKey} style={styles.itemRow}>
                      <View style={[styles.itemDot, { backgroundColor: accentColor }]} />
                      <Text style={[styles.itemText, { color: colors.textSecondary }]}>
                        {t(itemKey)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Botón fijo inferior */}
        <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[styles.dismissBtn, { backgroundColor: colors.primary }]}
            onPress={onDismiss}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color={colors.onPrimary} />
            <Text style={[styles.dismissText, { color: colors.onPrimary }]}>
              {t('whatsNew.dismiss')}
            </Text>
          </TouchableOpacity>
        </View>

      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  versionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 50,
    marginBottom: 16,
  },
  versionDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  versionText: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    letterSpacing: 0.3,
  },

  headerTitle: {
    fontSize: 30,
    fontFamily: Fonts.bold,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  headerSub: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },

  scroll: {
    padding: 20,
    gap: 16,
    paddingBottom: 8,
  },

  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    flex: 1,
  },

  itemsList: { gap: 10 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  itemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
    flexShrink: 0,
  },
  itemText: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    lineHeight: 20,
    flex: 1,
  },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 8 : 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  dismissBtn: {
    height: 56,
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  dismissText: {
    fontSize: 17,
    fontFamily: Fonts.bold,
  },
});
