import { useWindowDimensions } from 'react-native';

export const BREAKPOINTS = {
  tablet: 768,
  desktop: 1200,
} as const;

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export function useBreakpoint() {
  const { width } = useWindowDimensions();

  const isTablet = width >= BREAKPOINTS.tablet;
  const isDesktop = width >= BREAKPOINTS.desktop;
  const isMobile = !isTablet;

  const breakpoint: Breakpoint = isDesktop ? 'desktop' : isTablet ? 'tablet' : 'mobile';

  return { breakpoint, isMobile, isTablet, isDesktop, width };
}
