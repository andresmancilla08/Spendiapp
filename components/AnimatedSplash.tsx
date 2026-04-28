/**
 * AnimatedSplash — Spendia fintech splash screen
 *
 * Timing sequence (all ms):
 *   0      → background present (instant, rendered before JS animation starts)
 *   0–600  → Fase 0: radial glow pulse in (opacity 0→0.6, scale 0.4→1)
 *   200–800→ Fase 1: logo ribbon draw + scale-spring (scale 0.6→1, opacity 0→1)
 *   600–950→ Fase 2: "SPENDIA" letter-group fade+slide-up (opacity 0→1, translateY 12→0)
 *   900–1420→Fase 3: letterSpacing collapse 18→10 + scale settle 1.04→1
 *   1400–1600→Fase 3b: glow breathe pulse (scale 1→1.08→1)
 *   2400–2700→Fase 4: full-screen white overlay fade in → onComplete fires at 2700
 *
 * Reduced-motion path: skip all animation, hold 400ms, call onComplete.
 */

import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  Platform,
  StyleSheet,
  View,
} from 'react-native';

// ─── Brand tokens ──────────────────────────────────────────────────────────────
const CYAN         = '#00BCD4';
const CYAN_BRIGHT  = '#26E5F5';
const GLOW_COLOR   = '#00BCD4';

// ─── Geometry ──────────────────────────────────────────────────────────────────
const LOGO_SIZE    = 72;             // bounding box of the "S" ribbon SVG
const GLOW_RADIUS  = 140;            // radial glow circle behind logo

// ─── Helpers ───────────────────────────────────────────────────────────────────
function prefersReducedMotion(): boolean {
  if (Platform.OS !== 'web') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

// ─── Component ─────────────────────────────────────────────────────────────────
interface Props {
  onComplete: () => void;
  backgroundColor?: string;
  isDark?: boolean;
}

export default function AnimatedSplash({ onComplete, backgroundColor = '#0D1A1C', isDark = true }: Props) {
  const textColor  = isDark ? '#EEF6F8' : '#1A2428';
  const glowAlpha  = isDark ? 0.55 : 0.35;
  const reducedMotion = prefersReducedMotion();

  // Animated values
  const glowOpacity   = useRef(new Animated.Value(0)).current;
  const glowScale     = useRef(new Animated.Value(0.35)).current;
  const logoOpacity   = useRef(new Animated.Value(0)).current;
  const logoScale     = useRef(new Animated.Value(0.55)).current;
  const textOpacity   = useRef(new Animated.Value(0)).current;
  const textTranslateY= useRef(new Animated.Value(14)).current;
  const wordmarkLetterSpacing = useRef(new Animated.Value(12)).current;  // collapses 12→5
  const wordmarkScale         = useRef(new Animated.Value(1.04)).current; // settles 1.04→1
  const glowBreath    = useRef(new Animated.Value(1)).current;
  const taglineOpacity= useRef(new Animated.Value(0)).current;
  const exitOpacity   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reducedMotion) {
      // instant static — hold 400ms, done
      glowOpacity.setValue(0.45);
      glowScale.setValue(1);
      logoOpacity.setValue(1);
      logoScale.setValue(1);
      textOpacity.setValue(1);
      textTranslateY.setValue(0);
      wordmarkLetterSpacing.setValue(5);
      wordmarkScale.setValue(1);
      taglineOpacity.setValue(1);
      const t = setTimeout(() => onComplete(), 400);
      return () => clearTimeout(t);
    }

    const ease      = Easing.out(Easing.cubic);
    const easeIn    = Easing.in(Easing.cubic);
    const easeInOut = Easing.inOut(Easing.cubic);

    // Fase 0 — glow pulse in (0–600ms)
    const phase0 = Animated.parallel([
      Animated.timing(glowOpacity, {
        toValue: glowAlpha,
        duration: 600,
        easing: ease,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(glowScale, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.back(1.4)),
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]);

    // Fase 1 — logo entrance (200–820ms)
    const phase1 = Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 480,
        easing: ease,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        damping: 18,
        stiffness: 220,
        mass: 0.9,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]);

    // Fase 2 — wordmark entrance (600–950ms)
    const phase2 = Animated.parallel([
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 340,
        easing: ease,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(textTranslateY, {
        toValue: 0,
        duration: 360,
        easing: ease,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]);

    // Tagline fade (slightly after wordmark)
    const phaseTagline = Animated.timing(taglineOpacity, {
      toValue: 1,
      duration: 300,
      easing: ease,
      useNativeDriver: Platform.OS !== 'web',
    });

    // Fase 3 — letterSpacing collapse + scale settle (900–1420ms)
    // useNativeDriver must be consistent within a parallel group; letterSpacing requires false
    const phase3Collapse = Animated.parallel([
      Animated.timing(wordmarkLetterSpacing, {
        toValue: 5,
        duration: 520,
        easing: ease,
        useNativeDriver: false,
      }),
      Animated.spring(wordmarkScale, {
        toValue: 1,
        damping: 18,
        stiffness: 120,
        mass: 0.8,
        useNativeDriver: false,
      }),
    ]);

    // Fase 3b — glow breathe (1400–1800ms)
    const phase3Breath = Animated.sequence([
      Animated.timing(glowBreath, {
        toValue: 1.10,
        duration: 220,
        easing: Easing.out(Easing.sin),
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(glowBreath, {
        toValue: 1,
        duration: 320,
        easing: Easing.in(Easing.sin),
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]);

    // Fase 4 — exit overlay (2350–2700ms)
    const phase4 = Animated.timing(exitOpacity, {
      toValue: 1,
      duration: 360,
      easing: easeIn,
      useNativeDriver: Platform.OS !== 'web',
    });

    // Master sequence
    Animated.sequence([
      // Phase 0 + 1 overlap — start glow first, logo 200ms later
      Animated.parallel([
        phase0,
        Animated.sequence([
          Animated.delay(200),
          phase1,
        ]),
      ]),
      // Phase 2 wordmark: 50ms after logo done
      Animated.sequence([
        Animated.delay(50),
        Animated.parallel([phase2, Animated.sequence([Animated.delay(80), phaseTagline])]),
      ]),
      // Phase 3 letterSpacing collapse: 250ms hold
      Animated.sequence([
        Animated.delay(250),
        phase3Collapse,
      ]),
      // Phase 3b breath: 50ms gap
      Animated.sequence([
        Animated.delay(50),
        phase3Breath,
      ]),
      // Hold for reading (500ms)
      Animated.delay(500),
      // Phase 4 exit
      phase4,
    ]).start(() => {
      onComplete();
    });
  }, []);

  return (
    <View style={[styles.root, { backgroundColor }]}>
      {/* ── Logo: double-ribbon "S" SVG ── */}
      <Animated.View
        style={[
          styles.logoWrapper,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Image
          source={require('../assets/logo-transparent.png')}
          style={{ width: LOGO_SIZE, height: LOGO_SIZE }}
          resizeMode="contain"
        />
      </Animated.View>

      {/* ── Wordmark ── */}
      <Animated.View
        style={[
          styles.wordmarkContainer,
          {
            opacity: textOpacity,
            transform: [{ translateY: textTranslateY }],
            backgroundColor: 'transparent',
          },
        ]}
      >
        <Animated.Text
          style={[
            styles.wordmark,
            {
              color: textColor,
              backgroundColor: 'transparent',
              letterSpacing: wordmarkLetterSpacing,
              transform: [{ scale: wordmarkScale }],
            },
          ]}
        >
          SPENDIA
        </Animated.Text>

        {/* Tagline */}
        <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
          control inteligente
        </Animated.Text>
      </Animated.View>

      {/* ── Bottom scan line — decorative fintech detail ── */}
      <Animated.View
        style={[styles.scanLine, { opacity: textOpacity }]}
        pointerEvents="none"
      />

      {/* ── Exit overlay ── */}
      <Animated.View
        style={[styles.exitOverlay, { opacity: exitOpacity, backgroundColor }]}
        pointerEvents="none"
      />
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },

  // Glow behind logo
  glowContainer: {
    position: 'absolute',
    width: GLOW_RADIUS * 2,
    height: GLOW_RADIUS * 2,
    alignItems: 'center',
    justifyContent: 'center',
    // Nudge slightly above center to optically balance with text below
    marginTop: -30,
  },
  glowOuter: {
    position: 'absolute',
    width: GLOW_RADIUS * 2,
    height: GLOW_RADIUS * 2,
    borderRadius: GLOW_RADIUS,
    backgroundColor: GLOW_COLOR,
    opacity: 0.08,
    ...(Platform.OS === 'web'
      ? ({ filter: `blur(48px)` } as any)
      : {}),
  },
  glowInner: {
    position: 'absolute',
    width: GLOW_RADIUS * 0.9,
    height: GLOW_RADIUS * 0.9,
    borderRadius: GLOW_RADIUS * 0.45,
    backgroundColor: CYAN_BRIGHT,
    opacity: 0.13,
    ...(Platform.OS === 'web'
      ? ({ filter: `blur(28px)` } as any)
      : {}),
  },

  // Logo
  logoWrapper: {
    marginBottom: 0,
    marginTop: -30,  // same as glow nudge so they're centered together
  },

  // Wordmark block
  wordmarkContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
    backgroundColor: 'transparent',
  },
  wordmark: {
    fontFamily: 'Montserrat_800ExtraBold',
    fontSize: 36,
    includeFontPadding: false,
    textAlign: 'center',
    width: '100%',
  },

  // Tagline
  tagline: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 11,
    letterSpacing: 4,
    color: CYAN,
    marginTop: 8,
    textTransform: 'uppercase' as const,
    opacity: 0.8,
  },

  // Decorative horizontal scan line at bottom-center
  scanLine: {
    position: 'absolute',
    bottom: '28%',
    width: 1,
    height: 40,
    backgroundColor: CYAN,
    opacity: 0.18,
    ...(Platform.OS === 'web'
      ? ({
          backgroundImage: `linear-gradient(to bottom, transparent, ${CYAN}, transparent)`,
          width: 1,
        } as any)
      : {}),
  },

  exitOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
});
