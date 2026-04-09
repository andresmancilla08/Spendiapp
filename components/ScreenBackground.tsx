import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
}

export default function ScreenBackground({ children, style }: Props) {
  const { colors, isDark } = useTheme();

  const gradientColors: [string, string, string] = isDark
    ? ['#0D1A1C', '#062830', '#003840']
    : ['#FFFFFF', '#F5F9FA', '#E0F7FA'];

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[styles.gradient, style]}
    >
      {/* Blobs decorativos — z-index: 0 para que queden detrás del contenido */}
      <View
        style={[
          styles.blob1,
          { backgroundColor: colors.primaryLight, opacity: isDark ? 0.22 : 0.55 },
        ]}
      />
      <View
        style={[
          styles.blob2,
          { backgroundColor: colors.secondaryLight, opacity: isDark ? 0.18 : 0.4 },
        ]}
      />
      <View
        style={[
          styles.blob3,
          { backgroundColor: colors.primaryLight, opacity: isDark ? 0.1 : 0.25 },
        ]}
      />
      {/* Contenido siempre encima de los blobs */}
      <View style={styles.content}>
        {children}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1, overflow: 'hidden' },
  content: { flex: 1, zIndex: 1 },
  blob1: { position: 'absolute', top: -80, right: -80, width: 280, height: 280, borderRadius: 999, zIndex: 0 },
  blob2: { position: 'absolute', bottom: -70, left: -70, width: 220, height: 220, borderRadius: 999, zIndex: 0 },
  blob3: { position: 'absolute', top: '40%', right: -50, width: 140, height: 140, borderRadius: 999, zIndex: 0 },
});
