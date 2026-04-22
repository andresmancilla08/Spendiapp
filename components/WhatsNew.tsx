// components/WhatsNew.tsx
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, Platform, ActivityIndicator,
} from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../config/fonts';
import { useTranslation } from 'react-i18next';
import appConfig from '../app.json';
import { useBreakpoint } from '../hooks/useBreakpoint';

const CONTENT_MAX_WIDTH: Record<string, number> = {
  tablet: 640,
  desktop: 720,
};

// WHATS_NEW_VERSION siempre debe coincidir con app.json version.
// Al hacer deploy, bump app.json y agregar entrada en VERSION_HISTORY.
// El modal aparece cuando whatsNewSeen del usuario ≠ WHATS_NEW_VERSION.
export const WHATS_NEW_VERSION = appConfig.expo.version;

interface WhatsNewProps {
  visible: boolean;
  onDismiss: () => Promise<void>;
}

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface Feature {
  icon: IoniconName;
  colorKey: 'primary' | 'success';
  titleKey: string;
  items: string[];
}

// Lista limpia y única de todas las funciones de la app (sin repetidos ni supersedidas).
const VERSION_HISTORY: { version: string; features: Feature[] }[] = [
  {
    version: '2.11.0',
    features: [
      {
        icon: 'people-outline',
        colorKey: 'primary',
        titleKey: 'whatsNew.sharedFixedPerms.title',
        items: ['whatsNew.sharedFixedPerms.item1', 'whatsNew.sharedFixedPerms.item2', 'whatsNew.sharedFixedPerms.item3'],
      },
      {
        icon: 'wallet-outline',
        colorKey: 'success',
        titleKey: 'whatsNew.balanceCardRedesign.title',
        items: ['whatsNew.balanceCardRedesign.item1', 'whatsNew.balanceCardRedesign.item2', 'whatsNew.balanceCardRedesign.item3'],
      },
    ],
  },
  {
    version: '2.10.0',
    features: [
      {
        icon: 'sparkles-outline',
        colorKey: 'primary',
        titleKey: 'whatsNew.auroraBlur.title',
        items: ['whatsNew.auroraBlur.item1', 'whatsNew.auroraBlur.item2', 'whatsNew.auroraBlur.item3'],
      },
      {
        icon: 'apps-outline',
        colorKey: 'success',
        titleKey: 'whatsNew.toolCardsRedesign.title',
        items: ['whatsNew.toolCardsRedesign.item1', 'whatsNew.toolCardsRedesign.item2', 'whatsNew.toolCardsRedesign.item3'],
      },
    ],
  },
  {
    version: '2.9.0',
    features: [
      {
        icon: 'star-outline',
        colorKey: 'primary',
        titleKey: 'whatsNew.defaultCard.title',
        items: ['whatsNew.defaultCard.item1', 'whatsNew.defaultCard.item2', 'whatsNew.defaultCard.item3'],
      },
      {
        icon: 'pencil-outline',
        colorKey: 'success',
        titleKey: 'whatsNew.cardManagement.title',
        items: ['whatsNew.cardManagement.item1', 'whatsNew.cardManagement.item2', 'whatsNew.cardManagement.item3'],
      },
    ],
  },
  {
    version: '2.8.0',
    features: [
      {
        icon: 'receipt-outline',
        colorKey: 'primary',
        titleKey: 'whatsNew.transactionDetail.title',
        items: [
          'whatsNew.transactionDetail.item1',
          'whatsNew.transactionDetail.item2',
          'whatsNew.transactionDetail.item3',
        ],
      },
      {
        icon: 'sparkles-outline',
        colorKey: 'success',
        titleKey: 'whatsNew.auroraBackground.title',
        items: [
          'whatsNew.auroraBackground.item1',
          'whatsNew.auroraBackground.item2',
          'whatsNew.auroraBackground.item3',
        ],
      },
    ],
  },
  {
    version: '2.5.1',
    features: [
      {
        icon: 'people-circle-outline',
        colorKey: 'primary',
        titleKey: 'whatsNew.expenseGroups.title',
        items: ['whatsNew.expenseGroups.item1', 'whatsNew.expenseGroups.item2', 'whatsNew.expenseGroups.item3'],
      },
      {
        icon: 'pricetag-outline',
        colorKey: 'primary',
        titleKey: 'whatsNew.customCategories.title',
        items: ['whatsNew.customCategories.item1', 'whatsNew.customCategories.item2', 'whatsNew.customCategories.item3'],
      },
      {
        icon: 'image-outline',
        colorKey: 'primary',
        titleKey: 'whatsNew.annualReportImage.title',
        items: ['whatsNew.annualReportImage.item1', 'whatsNew.annualReportImage.item2', 'whatsNew.annualReportImage.item3'],
      },
      {
        icon: 'people-outline',
        colorKey: 'success',
        titleKey: 'whatsNew.friendReport.title',
        items: ['whatsNew.friendReport.item1', 'whatsNew.friendReport.item2', 'whatsNew.friendReport.item3'],
      },
      {
        icon: 'flag-outline',
        colorKey: 'success',
        titleKey: 'whatsNew.savingsGoals.title',
        items: ['whatsNew.savingsGoals.item1', 'whatsNew.savingsGoals.item2', 'whatsNew.savingsGoals.item3'],
      },
      {
        icon: 'send-outline',
        colorKey: 'success',
        titleKey: 'whatsNew.sentIncomeFeature.title',
        items: ['whatsNew.sentIncomeFeature.item1', 'whatsNew.sentIncomeFeature.item2', 'whatsNew.sentIncomeFeature.item3'],
      },
      {
        icon: 'bar-chart-outline',
        colorKey: 'primary',
        titleKey: 'whatsNew.budget.title',
        items: ['whatsNew.budget.item1', 'whatsNew.budget.item2', 'whatsNew.budget.item3'],
      },
      {
        icon: 'apps-outline',
        colorKey: 'primary',
        titleKey: 'whatsNew.navbarRedesign.title',
        items: ['whatsNew.navbarRedesign.item1', 'whatsNew.navbarRedesign.item2', 'whatsNew.navbarRedesign.item3'],
      },
      {
        icon: 'construct-outline',
        colorKey: 'success',
        titleKey: 'whatsNew.toolsHub.title',
        items: ['whatsNew.toolsHub.item1', 'whatsNew.toolsHub.item2', 'whatsNew.toolsHub.item3'],
      },
      {
        icon: 'calculator-outline',
        colorKey: 'success',
        titleKey: 'whatsNew.splitCalc.title',
        items: ['whatsNew.splitCalc.item1', 'whatsNew.splitCalc.item2', 'whatsNew.splitCalc.item3'],
      },
      {
        icon: 'notifications-outline',
        colorKey: 'primary',
        titleKey: 'whatsNew.notifications.title',
        items: ['whatsNew.notifications.item1', 'whatsNew.notifications.item2', 'whatsNew.notifications.item3'],
      },
    ],
  },
];

export default function WhatsNew({ visible, onDismiss }: WhatsNewProps) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const { breakpoint, isMobile } = useBreakpoint();
  const [dismissing, setDismissing] = useState(false);

  const contentStyle = !isMobile ? {
    maxWidth: CONTENT_MAX_WIDTH[breakpoint] ?? CONTENT_MAX_WIDTH.desktop,
    alignSelf: 'center' as const,
    width: '100%' as any,
  } : {};

  const handleDismiss = async () => {
    if (dismissing) return;
    setDismissing(true);
    try {
      await onDismiss();
    } finally {
      setDismissing(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.inner, contentStyle]}>

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

        {/* Contenido con scroll — todas las versiones */}
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          focusable={false}
          style={Platform.OS === 'web' ? { outline: 'none' } as any : undefined}
        >
          {VERSION_HISTORY[0].features.map((f) => {
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
            style={[styles.dismissBtn, { backgroundColor: dismissing ? colors.primaryLight : colors.primary }]}
            onPress={handleDismiss}
            activeOpacity={0.85}
            disabled={dismissing}
          >
            {dismissing
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <>
                  <Ionicons name="checkmark-circle-outline" size={20} color={colors.onPrimary} />
                  <Text style={[styles.dismissText, { color: colors.onPrimary }]}>
                    {t('whatsNew.dismiss')}
                  </Text>
                </>
            }
          </TouchableOpacity>
        </View>

        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inner: { flex: 1 },

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
