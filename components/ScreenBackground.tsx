import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useBreakpoint } from '../hooks/useBreakpoint';
import AuroraBackground, { AuroraIntensity } from './AuroraBackground';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  auroraIntensity?: AuroraIntensity;
}

const CONTENT_MAX_WIDTH: Record<string, number> = {
  tablet: 720,
  desktop: 960,
};

export default function ScreenBackground({ children, style, auroraIntensity = 'default' }: Props) {
  const { isDark } = useTheme();
  const { breakpoint, isMobile } = useBreakpoint();

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
      <AuroraBackground intensity={auroraIntensity} />
      {/* Contenido siempre encima de los blobs — centrado en tablet/desktop */}
      <View
        style={[
          styles.content,
          !isMobile && {
            maxWidth: CONTENT_MAX_WIDTH[breakpoint] ?? CONTENT_MAX_WIDTH.desktop,
            alignSelf: 'center' as const,
            width: '100%' as any,
          },
        ]}
      >
        {children}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1, overflow: 'hidden' },
  content: { flex: 1, zIndex: 1 },
});
