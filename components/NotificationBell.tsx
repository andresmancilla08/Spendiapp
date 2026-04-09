// components/NotificationBell.tsx
import { TouchableOpacity, View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../hooks/useNotifications';
import { Fonts } from '../config/fonts';

interface NotificationBellProps {
  uid: string;
}

export default function NotificationBell({ uid }: NotificationBellProps) {
  const { colors } = useTheme();
  const { unreadCount } = useNotifications(uid);

  return (
    <TouchableOpacity
      onPress={() => router.push('/notifications')}
      activeOpacity={0.7}
      style={styles.button}
    >
      <Ionicons name="notifications-outline" size={22} color={colors.primary} />
      {unreadCount > 0 && (
        <View style={[styles.badge, { backgroundColor: colors.error }]}>
          <Text style={styles.badgeText}>
            {unreadCount > 9 ? '9+' : String(unreadCount)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 6,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 1,
    right: 1,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: Fonts.bold,
    lineHeight: Platform.OS === 'android' ? 13 : 15,
  },
});
