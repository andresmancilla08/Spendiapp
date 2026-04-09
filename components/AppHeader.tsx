// components/AppHeader.tsx
import { View, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuthStore } from '../store/authStore';
import NotificationBell from './NotificationBell';

interface AppHeaderProps {
  showBack?: boolean;
  onBack?: () => void;
  showNotifications?: boolean;
}

export default function AppHeader({
  showBack = true,
  onBack,
  showNotifications = false,
}: AppHeaderProps) {
  const { colors } = useTheme();
  const { user } = useAuthStore();

  const handleBack = () => {
    if (onBack) onBack();
    else router.back();
  };

  return (
    <View style={[styles.header, { backgroundColor: 'transparent' }]}>
      <View style={styles.left}>
        {showBack && (
          <TouchableOpacity
            onPress={handleBack}
            activeOpacity={0.7}
            style={styles.iconButton}
          >
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.right}>
        {showNotifications && user?.uid && (
          <NotificationBell uid={user.uid} />
        )}
        <Image
          source={require('../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  left: {
    width: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    padding: 4,
  },
  logo: {
    width: 44,
    height: 44,
  },
});
