import React from 'react';
import { View, StyleSheet, ViewStyle, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useProMotion } from '../hooks/useProMotion';
import { DARK_SCRIM } from './AppBackground';
import AuroraBackground, { AuroraIntensity } from './AuroraBackground';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Si se pasa, renderiza un fondo LOCAL opaco con Aurora a esta intensidad
   * (hoy solo lo usa el login, antes de que haya sesión). En el resto de la
   * app el fondo real es AppBackground, global y persistente en el layout
   * raíz — este componente solo aporta StatusBar + wrapper responsive. */
  auroraIntensity?: AuroraIntensity;
}

const CONTENT_MAX_WIDTH: Record<string, number> = {
  tablet: 720,
  desktop: 960,
};

export default function ScreenBackground({ children, style, auroraIntensity }: Props) {
  const { isDark, activePalette } = useTheme();
  const { breakpoint, isMobile } = useBreakpoint();
  const { reduceMotion } = useProMotion();

  const gradientColors = isDark ? activePalette.gradientDark : activePalette.gradientLight;

  const content = (
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
  );

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent={true}
      />
      {auroraIntensity ? (
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={[styles.fill, style]}
        >
          {/* Mismo orden de capas que AppBackground: scrim debajo del efecto */}
          {isDark && <View style={[StyleSheet.absoluteFillObject, { backgroundColor: DARK_SCRIM }]} pointerEvents="none" />}
          {!reduceMotion && <AuroraBackground intensity={auroraIntensity} />}
          {content}
        </LinearGradient>
      ) : (
        <View style={[styles.fill, styles.transparent, style]}>{content}</View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, overflow: 'hidden' },
  transparent: { backgroundColor: 'transparent' },
  content: { flex: 1, zIndex: 1 },
});
