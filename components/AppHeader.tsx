import { View, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface AppHeaderProps {
  showBack?: boolean;
  onBack?: () => void;
}

export default function AppHeader({ showBack = true, onBack }: AppHeaderProps) {
  const { colors } = useTheme();

  const handleBack = () => {
    if (onBack) onBack();
    else router.back();
  };

  return (
    <View style={[styles.header, { backgroundColor: 'transparent' }]}>
      <View style={styles.left}>
        {showBack && (
          <TouchableOpacity onPress={handleBack} activeOpacity={0.7} style={styles.iconButton}>
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.right}>
        <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
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
    width: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  iconButton: {
    padding: 4,
  },
  logo: {
    width: 44,
    height: 44,
  },
});
