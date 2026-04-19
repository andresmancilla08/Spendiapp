// app/notifications.tsx
import { useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Timestamp } from 'firebase/firestore';
import { router } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationDoc, NotificationType } from '../types/friend';
import AppHeader from '../components/AppHeader';
import ScreenTransition, { ScreenTransitionRef } from '../components/ScreenTransition';
import PageTitle from '../components/PageTitle';
import ScreenBackground from '../components/ScreenBackground';
import { Fonts } from '../config/fonts';

function timeAgoLabel(createdAt: Timestamp | undefined, t: any): string {
  if (!createdAt) return '';
  const date = createdAt.toDate();
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return t('notifications.timeAgo.justNow');
  if (diffMin < 60) return t('notifications.timeAgo.minutesAgo', { n: diffMin });
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return t('notifications.timeAgo.hoursAgo', { n: diffH });
  return t('notifications.timeAgo.daysAgo', { n: Math.floor(diffH / 24) });
}

const NOTIF_ICONS: Record<NotificationType, React.ComponentProps<typeof Ionicons>['name']> = {
  friend_request: 'person-add-outline',
  friend_accepted: 'people-outline',
  shared_transaction_added: 'people-circle-outline',
  shared_transaction_updated: 'create-outline',
  shared_transaction_deleted: 'trash-outline',
  goal_monthly_reminder: 'flag-outline',
  sent_income: 'send-outline',
  sent_income_deleted: 'close-circle-outline',
};

// Each notification type gets a distinct color accent
const NOTIF_COLORS: Record<NotificationType, 'primary' | 'success'> = {
  friend_request: 'primary',
  friend_accepted: 'success',
  shared_transaction_added: 'primary',
  shared_transaction_updated: 'primary',
  shared_transaction_deleted: 'primary',
  goal_monthly_reminder: 'primary',
  sent_income: 'success',
  sent_income_deleted: 'primary',
};

function NotifItem({
  notif, onPress, onDelete, colors, t,
}: { notif: NotificationDoc; onPress: () => void; onDelete: () => void; colors: any; t: any }) {
  const icon = NOTIF_ICONS[notif.type] ?? 'notifications-outline';
  const colorKey = NOTIF_COLORS[notif.type] ?? 'primary';
  const accentColor = colors[colorKey];
  const accentBg = colorKey === 'success' ? colors.successLight : colors.primaryLight;

  // Build translation params based on notification type
  let translationParams: any = {};
  if (notif.type === 'goal_monthly_reminder') {
    translationParams = { count: (notif.data as any).count };
  } else if (notif.type === 'sent_income') {
    translationParams = {
      name: (notif.data as any).fromUserName ?? (notif.data as any).fromDisplayName,
      description: (notif.data as any).description,
      amount: (notif.data as any).amount,
    };
  } else {
    translationParams = {
      name: (notif.data as any).fromDisplayName ?? (notif.data as any).fromUserName,
      fromDisplayName: (notif.data as any).fromDisplayName,
      description: (notif.data as any).description,
    };
  }

  const text = t(`notifications.${notif.type}`, translationParams);

  return (
    <TouchableOpacity
      style={[
        styles.notifRow,
        !notif.read && { backgroundColor: colors.primaryLight + '30' },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* Unread left bar */}
      <View style={[
        styles.unreadBar,
        { backgroundColor: !notif.read ? accentColor : 'transparent' },
      ]} />

      <View style={[styles.notifIconWrap, { backgroundColor: accentBg }]}>
        <Ionicons name={icon} size={18} color={accentColor} />
      </View>

      <View style={styles.notifContent}>
        <Text
          style={[styles.notifText, { color: colors.textPrimary }]}
          numberOfLines={2}
        >
          {text}
        </Text>
        <View style={styles.notifMeta}>
          <Ionicons name="time-outline" size={11} color={colors.textTertiary} />
          <Text style={[styles.notifTime, { color: colors.textTertiary }]}>
            {timeAgoLabel(notif.createdAt, t)}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={onDelete}
        activeOpacity={0.7}
        style={[styles.deleteBtn, { backgroundColor: colors.errorLight }]}
        accessibilityLabel={t('notifications.delete')}
      >
        <Ionicons name="trash-outline" size={14} color={colors.error} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const uid = user?.uid ?? '';
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications(uid);

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
        <PageTitle title={t('notifications.title')} description={t('notifications.pageDesc')} />

        {unreadCount > 0 && (
          <View style={styles.actionsRow}>
            <View style={[styles.countBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.countBadgeText}>{unreadCount}</Text>
            </View>
            <TouchableOpacity
              onPress={markAllAsRead}
              activeOpacity={0.8}
              style={[styles.markAllBtn, { borderColor: colors.primary + '50' }]}
            >
              <Ionicons name="checkmark-done-outline" size={14} color={colors.primary} />
              <Text style={[styles.markAllText, { color: colors.primary }]}>
                {t('notifications.markAllRead')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIconWrap, { backgroundColor: colors.surfaceSecondary }]}>
                <Ionicons name="notifications-off-outline" size={36} color={colors.textTertiary} />
              </View>
              <Text style={[styles.emptyText, { color: colors.textPrimary }]}>
                {t('notifications.empty')}
              </Text>
              <Text style={[styles.emptySub, { color: colors.textTertiary }]}>
                {t('notifications.emptySub')}
              </Text>
            </View>
          ) : (
            <View style={[styles.listCard, { backgroundColor: colors.surface }]}>
              {notifications.map((n, i) => (
                <View
                  key={n.id}
                  style={i < notifications.length - 1
                    ? { borderBottomWidth: 1, borderBottomColor: colors.border }
                    : undefined}
                >
                  <NotifItem
                    notif={n}
                    onPress={() => {
                    if (!n.read) markAsRead(n.id).catch(() => {});
                    if (n.type === 'friend_request') router.push('/friends?tab=requests');
                  }}
                    onDelete={() => deleteNotification(n.id).catch(() => {})}
                    colors={colors}
                    t={t}
                  />
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </ScreenBackground>
    </SafeAreaView>
    </ScreenTransition>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },

  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  countBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 22,
    alignItems: 'center',
  },
  countBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: Fonts.bold,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  markAllText: { fontSize: 12, fontFamily: Fonts.semiBold },

  scroll: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'web' ? 120 : 40,
    width: '100%',
    maxWidth: 768,
    alignSelf: 'center',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyText: { fontSize: 16, fontFamily: Fonts.semiBold, textAlign: 'center' },
  emptySub: { fontSize: 13, fontFamily: Fonts.regular, textAlign: 'center', lineHeight: 19 },

  // List
  listCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  // Notification row
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  unreadBar: {
    width: 3,
    height: 36,
    borderRadius: 2,
    marginLeft: -4,
    marginRight: 4,
  },
  notifIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  notifContent: { flex: 1, gap: 4 },
  notifText: { fontSize: 13, fontFamily: Fonts.medium, lineHeight: 18 },
  notifMeta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  notifTime: { fontSize: 11, fontFamily: Fonts.regular },
  unreadDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginLeft: 4,
  },
});
