// app/notifications.tsx
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Timestamp } from 'firebase/firestore';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationDoc, NotificationType } from '../types/friend';
import AppHeader from '../components/AppHeader';
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
};

function NotifItem({
  notif, onPress, colors, t,
}: { notif: NotificationDoc; onPress: () => void; colors: any; t: any }) {
  const icon = NOTIF_ICONS[notif.type] ?? 'notifications-outline';
  const text = t(`notifications.${notif.type}`, { name: notif.data.fromDisplayName });

  return (
    <TouchableOpacity
      style={[
        styles.notifRow,
        !notif.read && { backgroundColor: colors.primaryLight + '40' },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.notifIcon, { backgroundColor: colors.primaryLight }]}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.notifText, { color: colors.textPrimary }]} numberOfLines={2}>
          {text}
        </Text>
        <Text style={[styles.notifTime, { color: colors.textTertiary }]}>
          {timeAgoLabel(notif.createdAt, t)}
        </Text>
      </View>
      {!notif.read && (
        <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
      )}
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const uid = user?.uid ?? '';
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(uid);

  const handleNotifPress = (notif: NotificationDoc) => {
    if (!notif.read) markAsRead(notif.id).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenBackground>
        <AppHeader showBack />

        {/* Header row */}
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t('notifications.title')}</Text>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllAsRead} activeOpacity={0.8}>
              <Text style={[styles.markAllText, { color: colors.primary }]}>{t('notifications.markAllRead')}</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textPrimary }]}>{t('notifications.empty')}</Text>
              <Text style={[styles.emptySub, { color: colors.textTertiary }]}>{t('notifications.emptySub')}</Text>
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
                  <NotifItem notif={n} onPress={() => handleNotifPress(n)} colors={colors} t={t} />
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </ScreenBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  titleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12,
  },
  title: { fontSize: 20, fontFamily: Fonts.bold },
  markAllText: { fontSize: 13, fontFamily: Fonts.medium },
  scroll: { paddingHorizontal: 20, paddingBottom: Platform.OS === 'web' ? 120 : 40 },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 15, fontFamily: Fonts.semiBold },
  emptySub: { fontSize: 13, fontFamily: Fonts.regular },
  listCard: { borderRadius: 20, overflow: 'hidden' },
  notifRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  notifIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  notifText: { fontSize: 13, fontFamily: Fonts.medium, lineHeight: 18 },
  notifTime: { fontSize: 11, fontFamily: Fonts.regular },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
});
