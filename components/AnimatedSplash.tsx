/**
 * AnimatedSplash — Spendia fintech splash screen
 *
 * Timing sequence (all ms):
 *   0      → background present (instant, rendered before JS animation starts)
 *   0–600  → Fase 0: radial glow pulse in (opacity 0→0.6, scale 0.4→1)
 *   200–800→ Fase 1: logo ribbon draw + scale-spring (scale 0.6→1, opacity 0→1)
 *   600–950→ Fase 2: "SPENDIA" letter-group fade+slide-up (opacity 0→1, translateY 12→0)
 *   900–1300→Fase 3: shimmer sweep across wordmark
 *   1400–1600→Fase 3b: glow breathe pulse (scale 1→1.08→1)
 *   2400–2700→Fase 4: full-screen white overlay fade in → onComplete fires at 2700
 *
 * Reduced-motion path: skip all animation, hold 400ms, call onComplete.
 */

import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Path,
  G,
  Circle,
} from 'react-native-svg';

// ─── Brand tokens ──────────────────────────────────────────────────────────────
const BG           = '#07111A';      // deep dark navy — slightly deeper than app #0D1A1C for drama
const CYAN         = '#00BCD4';
const CYAN_BRIGHT  = '#26E5F5';      // light tip of ribbon
const TEAL         = '#00897B';
const TEAL_DEEP    = '#00695C';
const GLOW_COLOR   = '#00BCD4';
const OVERLAY_EXIT = '#07111A';      // same as BG — fade to dark before navigation

// ─── Geometry ──────────────────────────────────────────────────────────────────
const LOGO_SIZE    = 96;             // bounding box of the "S" ribbon SVG
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
}

export default function AnimatedSplash({ onComplete }: Props) {
  const reducedMotion = prefersReducedMotion();

  // Animated values
  const glowOpacity   = useRef(new Animated.Value(0)).current;
  const glowScale     = useRef(new Animated.Value(0.35)).current;
  const logoOpacity   = useRef(new Animated.Value(0)).current;
  const logoScale     = useRef(new Animated.Value(0.55)).current;
  const textOpacity   = useRef(new Animated.Value(0)).current;
  const textTranslateY= useRef(new Animated.Value(14)).current;
  const shimmerX      = useRef(new Animated.Value(-240)).current;  // sweeps L→R over 240px text
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
        toValue: 0.55,
        duration: 600,
        easing: ease,
        useNativeDriver: true,
      }),
      Animated.timing(glowScale, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.back(1.4)),
        useNativeDriver: true,
      }),
    ]);

    // Fase 1 — logo entrance (200–820ms)
    const phase1 = Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 480,
        easing: ease,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        damping: 18,
        stiffness: 220,
        mass: 0.9,
        useNativeDriver: true,
      }),
    ]);

    // Fase 2 — wordmark entrance (600–950ms)
    const phase2 = Animated.parallel([
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 340,
        easing: ease,
        useNativeDriver: true,
      }),
      Animated.timing(textTranslateY, {
        toValue: 0,
        duration: 360,
        easing: ease,
        useNativeDriver: true,
      }),
    ]);

    // Tagline fade (slightly after wordmark)
    const phaseTagline = Animated.timing(taglineOpacity, {
      toValue: 1,
      duration: 300,
      easing: ease,
      useNativeDriver: true,
    });

    // Fase 3 — shimmer sweep (900–1350ms)
    const phase3Shimmer = Animated.timing(shimmerX, {
      toValue: 320,
      duration: 520,
      easing: easeInOut,
      useNativeDriver: true,
    });

    // Fase 3b — glow breathe (1400–1800ms)
    const phase3Breath = Animated.sequence([
      Animated.timing(glowBreath, {
        toValue: 1.10,
        duration: 220,
        easing: Easing.out(Easing.sin),
        useNativeDriver: true,
      }),
      Animated.timing(glowBreath, {
        toValue: 1,
        duration: 320,
        easing: Easing.in(Easing.sin),
        useNativeDriver: true,
      }),
    ]);

    // Fase 4 — exit overlay (2350–2700ms)
    const phase4 = Animated.timing(exitOpacity, {
      toValue: 1,
      duration: 360,
      easing: easeIn,
      useNativeDriver: true,
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
      // Phase 3 shimmer: 250ms hold
      Animated.sequence([
        Animated.delay(250),
        phase3Shimmer,
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

  // Shimmer clipped translate — clamped to text area
  const shimmerTranslate = shimmerX;

  return (
    <View style={styles.root}>
      {/* ── Radial glow behind logo ── */}
      <Animated.View
        style={[
          styles.glowContainer,
          {
            opacity: glowOpacity,
            transform: [
              { scale: Animated.multiply(glowScale, glowBreath) },
            ],
          },
        ]}
        pointerEvents="none"
      >
        {/* Outer diffuse ring */}
        <View style={styles.glowOuter} />
        {/* Inner core */}
        <View style={styles.glowInner} />
      </Animated.View>

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
        <SpendiaLogoSvg size={LOGO_SIZE} />
      </Animated.View>

      {/* ── Wordmark + shimmer ── */}
      <Animated.View
        style={[
          styles.wordmarkContainer,
          {
            opacity: textOpacity,
            transform: [{ translateY: textTranslateY }],
          },
        ]}
      >
        <View style={styles.wordmarkClip}>
          <Animated.Text style={styles.wordmark}>
            SPENDIA
          </Animated.Text>
          {/* Shimmer overlay — translates across the text */}
          <Animated.View
            style={[
              styles.shimmerBar,
              { transform: [{ translateX: shimmerTranslate }] },
            ]}
            pointerEvents="none"
          />
        </View>

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
        style={[styles.exitOverlay, { opacity: exitOpacity }]}
        pointerEvents="none"
      />
    </View>
  );
}

// ─── Spendia "S" ribbon SVG ────────────────────────────────────────────────────
// Geometry: two fluid curved bands forming an "S":
//   • Upper band: cyan (#00BCD4 → #26E5F5) — sweeps top-right to center-left
//   • Lower band: teal (#00897B → #00695C) — sweeps center-right to bottom-left
// Each band is a filled bezier path with width ≈ 22px, gap of ~6px between them.
// The overall shape fits in a 96×96 viewBox.

function SpendiaLogoSvg({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 96 96" fill="none">
      <Defs>
        {/* Cyan band gradient — upper ribbon */}
        <SvgLinearGradient id="gradCyan" x1="72" y1="10" x2="24" y2="46" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#26E5F5" />
          <Stop offset="0.5" stopColor="#00BCD4" />
          <Stop offset="1" stopColor="#0097A7" />
        </SvgLinearGradient>

        {/* Teal band gradient — lower ribbon */}
        <SvgLinearGradient id="gradTeal" x1="24" y1="50" x2="72" y2="86" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#00A896" />
          <Stop offset="0.5" stopColor="#00897B" />
          <Stop offset="1" stopColor="#00695C" />
        </SvgLinearGradient>

        {/* Highlight gradient for inner edge shimmer */}
        <SvgLinearGradient id="gradHighCyan" x1="72" y1="12" x2="40" y2="32" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.35" />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </SvgLinearGradient>

        <SvgLinearGradient id="gradHighTeal" x1="24" y1="64" x2="56" y2="84" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.25" />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </SvgLinearGradient>
      </Defs>

      {/* ── Upper cyan ribbon ──
          Entry: top-right (≈72,12)
          Sweeps through center, exits center-left (≈18,44)
          Band thickness ≈ 22px */}
      <G>
        {/* Outer (upper) edge of cyan band */}
        <Path
          d={[
            'M 72 12',
            'C 64 10, 52 10, 42 18',
            'C 32 26, 22 36, 18 44',
            'C 20 46, 22 48, 26 48',
            'C 30 40, 38 30, 48 24',
            'C 56 18, 68 16, 76 18',
            'C 78 16, 76 12, 72 12',
            'Z',
          ].join(' ')}
          fill="url(#gradCyan)"
        />
        {/* Inner highlight on cyan band */}
        <Path
          d={[
            'M 72 12',
            'C 64 10, 52 10, 42 18',
            'C 36 22, 30 28, 26 34',
            'C 30 30, 38 22, 48 18',
            'C 58 14, 68 14, 76 18',
            'C 78 16, 76 12, 72 12',
            'Z',
          ].join(' ')}
          fill="url(#gradHighCyan)"
        />
      </G>

      {/* ── Lower teal ribbon ──
          Entry: center-right (≈72,50)
          Sweeps through center, exits bottom-left (≈24,84) */}
      <G>
        <Path
          d={[
            'M 78 50',
            'C 74 48, 70 48, 66 50',
            'C 60 54, 50 62, 44 70',
            'C 36 80, 28 86, 20 86',
            'C 18 88, 20 90, 24 90',
            'C 34 90, 44 82, 52 72',
            'C 60 62, 68 52, 76 52',
            'C 80 52, 82 50, 78 50',
            'Z',
          ].join(' ')}
          fill="url(#gradTeal)"
        />
        {/* Inner highlight on teal band */}
        <Path
          d={[
            'M 78 50',
            'C 74 48, 70 48, 66 50',
            'C 62 52, 58 56, 54 62',
            'C 58 56, 64 52, 70 50',
            'C 74 50, 78 50, 78 50',
            'Z',
          ].join(' ')}
          fill="url(#gradHighTeal)"
        />
      </G>

      {/* ── Center connector dot — where ribbons cross ──
          Small glowing circle at the intersection (~48, 48) */}
      <Circle cx="44" cy="47" r="5" fill="#00BCD4" opacity={0.9} />
      <Circle cx="44" cy="47" r="3" fill="#26E5F5" opacity={0.7} />
    </Svg>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BG,
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
    alignItems: 'center',
    marginTop: 20,
  },
  wordmarkClip: {
    overflow: 'hidden',
    position: 'relative',
  },
  wordmark: {
    fontFamily: 'Montserrat_800ExtraBold',
    fontSize: 36,
    letterSpacing: 10,
    color: '#EEF6F8',
    includeFontPadding: false,
    ...(Platform.OS === 'web'
      ? ({
          textShadow: `0 0 32px rgba(0,188,212,0.45), 0 0 8px rgba(0,188,212,0.25)`,
        } as any)
      : {}),
  },

  // Shimmer bar: a narrow diagonal bright stripe
  shimmerBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 60,
    height: '100%' as any,
    opacity: 0.28,
    ...(Platform.OS === 'web'
      ? ({
          background: 'linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.85) 50%, transparent 80%)',
        } as any)
      : {
          backgroundColor: 'rgba(255,255,255,0.18)',
        }),
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
          background: `linear-gradient(to bottom, transparent, ${CYAN}, transparent)`,
          width: 1,
        } as any)
      : {}),
  },

  // Exit overlay — fades to BG color before navigation
  exitOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: OVERLAY_EXIT,
    zIndex: 10,
  },
});
