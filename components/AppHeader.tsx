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
  rightAction?: React.ReactNode;
}

export default function AppHeader({
  showBack = true,
  onBack,
  showNotifications = false,
  rightAction,
}: AppHeaderProps) {
  const { colors } = useTheme();
  const { user } = useAuthStore();

  const handleBack = () => {
    if (onBack) onBack();
    else router.back();
  };

  // Vistas secundarias con usuario autenticado: mostrar acciones de navegación rápida
  const showRightActions = showBack && !!user?.uid;

  return (
    <View style={[styles.header, { backgroundColor: 'transparent' }]}>
      {/* Izquierda: botón volver */}
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

      {/* Derecha */}
      <View style={styles.right}>
        {showRightActions ? (
          // Vistas secundarias: notificaciones + perfil
          <>
            {rightAction}
            <NotificationBell uid={user!.uid} />
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/profile')}
              activeOpacity={0.7}
              style={styles.iconButton}
            >
              {user?.photoURL ? (
                <Image
                  source={{ uri: user.photoURL }}
                  style={[styles.avatarThumb, { borderColor: colors.primary }]}
                />
              ) : (
                <Ionicons name="person-circle-outline" size={28} color={colors.primary} />
              )}
            </TouchableOpacity>
          </>
        ) : (
          // Vistas principales o sin usuario: logo + opcionalmente notificaciones
          <>
            {showNotifications && user?.uid && (
              <NotificationBell uid={user.uid} />
            )}
            <Image
              source={require('../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </>
        )}
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
    gap: 4,
  },
  iconButton: {
    padding: 4,
  },
  logo: {
    width: 44,
    height: 44,
  },
  avatarThumb: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
  },
});
