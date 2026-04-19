import { useWindowDimensions } from 'react-native';

export const BREAKPOINTS = {
  xs: 360,
  sm: 480,
  tablet: 768,
  desktop: 1200,
} as const;

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

/** Max content width for different content types */
export const MAX_CONTENT_WIDTH = {
  form: 560,
  list: 768,
  wide: 960,
} as const;

export function useBreakpoint() {
  const { width } = useWindowDimensions();

  const isTablet = width >= BREAKPOINTS.tablet;
  const isDesktop = width >= BREAKPOINTS.desktop;
  const isMobile = !isTablet;

  const breakpoint: Breakpoint = isDesktop ? 'desktop' : isTablet ? 'tablet' : 'mobile';

  /** Horizontal padding that adapts to screen width */
  const hPad = width < BREAKPOINTS.xs ? 16 : width < BREAKPOINTS.sm ? 20 : 24;

  /** Max width for form/auth content */
  const maxFormWidth = isMobile ? undefined : MAX_CONTENT_WIDTH.form;

  /** Max width for list/tab content */
  const maxListWidth = isMobile ? undefined : MAX_CONTENT_WIDTH.list;

  return { breakpoint, isMobile, isTablet, isDesktop, width, hPad, maxFormWidth, maxListWidth };
}
