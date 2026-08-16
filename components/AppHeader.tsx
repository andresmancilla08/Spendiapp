// components/AppHeader.tsx
import { View, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { goBack } from '../utils/nav';
import AppIcon from './AppIcon';
import { useTheme } from '../context/ThemeContext';
import { useAuthStore } from '../store/authStore';
import NotificationBell from './NotificationBell';
import { useFlags } from '../context/FeatureFlagsContext';

/** Alto del header: icono de 24 + su padding de 4 + los 10 verticales del bloque. */
export const APP_HEADER_HEIGHT = 52;

interface AppHeaderProps {
  showBack?: boolean;
  onBack?: () => void;
  showNotifications?: boolean;
  rightAction?: React.ReactNode;
  /** A dónde ir si no hay historial (recarga o enlace directo en web). */
  backFallback?: string;
}

export default function AppHeader({
  showBack = true,
  onBack,
  showNotifications = false,
  rightAction,
  backFallback,
}: AppHeaderProps) {
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const { flags } = useFlags();

  const handleBack = () => {
    if (onBack) onBack();
    else goBack(backFallback);
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
            <AppIcon name="chevron-back" size={24} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Derecha */}
      <View style={styles.right}>
        {showRightActions ? (
          // Vistas secundarias: notificaciones + perfil
          <>
            {rightAction}
            {flags.notificationsEnabled && <NotificationBell uid={user!.uid} />}
            <TouchableOpacity
              onPress={() => router.push('/profile')}
              activeOpacity={0.7}
              style={styles.iconButton}
            >
              {user?.photoURL ? (
                <Image
                  source={{ uri: user.photoURL }}
                  style={[styles.avatarThumb, { borderColor: colors.primary }]}
                />
              ) : (
                <AppIcon name="person-circle-outline" size={28} color={colors.primary} />
              )}
            </TouchableOpacity>
          </>
        ) : (
          // Vistas principales o sin usuario: logo + opcionalmente notificaciones
          <>
            {showNotifications && user?.uid && flags.notificationsEnabled && (
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
    height: APP_HEADER_HEIGHT,
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
