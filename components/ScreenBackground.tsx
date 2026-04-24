import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle, StatusBar, Platform } from 'react-native';
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
  const { isDark, activePalette } = useTheme();
  const { breakpoint, isMobile } = useBreakpoint();
  const gradientColors = isDark ? activePalette.gradientDark : activePalette.gradientLight;
  const statusBarColor = gradientColors[0] as string;

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'theme-color');
        document.head.appendChild(meta);
      }
      meta.content = statusBarColor;
    }
  }, [statusBarColor]);

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent={true}
      />
      <LinearGradient
      colors={gradientColors}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[styles.gradient, style]}
    >
      <AuroraBackground intensity={auroraIntensity} />
      {isDark && <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.45)' }]} pointerEvents="none" />}
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
    </>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1, overflow: 'hidden' },
  content: { flex: 1, zIndex: 1 },
});
