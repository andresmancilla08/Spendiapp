import { useRef, useMemo } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { useFrozenPhase } from '../hooks/useFrozenPhase';
import type { AuroraIntensity } from './AuroraBackground';

const CONFIG: Record<AuroraIntensity, { clusters: number; opacity: number }> = {
  subtle:  { clusters: 3, opacity: 0.55 },
  default: { clusters: 4, opacity: 1.0 },
  intense: { clusters: 6, opacity: 1.4 },
};

const CLUSTER_SIZE = 150;
// Posiciones y formas deterministas (sin Math.random → estable entre renders).
const CLUSTER_SLOTS = [
  { left: '4%',  top: '6%' },
  { left: '58%', top: '16%' },
  { left: '14%', top: '46%' },
  { left: '74%', top: '58%' },
  { left: '36%', top: '28%' },
  { left: '28%', top: '74%' },
];

interface Props {
  intensity?: AuroraIntensity;
}

/**
 * Constelaciones: pequeños grupos de estrellas unidas por líneas finas que
 * derivan muy lento y laten en fase alterna. Es el fondo más "dibujado" —
 * geometría visible, no solo manchas de color.
 */
export default function ConstellationBackground({ intensity = 'default' }: Props) {
  const { isDark, colors } = useTheme();
  const cfg = CONFIG[intensity];
  const starColor = isDark ? '#E7ECFF' : colors.textSecondary;

  const clusters = useMemo(() => (
    CLUSTER_SLOTS.slice(0, cfg.clusters).map((slot, ci) => {
      const raw = Array.from({ length: 4 + (ci % 2) }, (_, i) => ({
        x: 14 + ((ci * 53 + i * 137.5) % (CLUSTER_SIZE - 28)),
        y: 14 + ((ci * 91 + i * 73.1) % (CLUSTER_SIZE - 28)),
        r: 1.6 + ((ci + i) % 3) * 0.7,
      }));
      // Ordenar por ángulo respecto al centroide: la cadena de líneas forma un
      // polígono abierto en vez de un garabato que se auto-cruza.
      const cx = raw.reduce((s, p) => s + p.x, 0) / raw.length;
      const cy = raw.reduce((s, p) => s + p.y, 0) / raw.length;
      const points = [...raw].sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
      return {
        ...slot,
        points,
        accent: ci % 3 === 0 ? colors.primary : starColor,
        base: (0.5 + (ci % 3) * 0.12) * cfg.opacity * (isDark ? 1.25 : 1.2),
        dur: 6500 + ci * 1800,
        phase: (ci * 0.37) % 1,
        driftX: (ci % 2 === 0 ? 1 : -1) * (18 + (ci % 3) * 8),
        driftY: (ci % 3 === 0 ? -1 : 1) * (14 + (ci % 2) * 8),
      };
    })
  ), [cfg.clusters, cfg.opacity, colors.primary, starColor, isDark]);

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {clusters.map((c, i) => (
        <Cluster key={`${intensity}-${i}`} cluster={c} lineColor={starColor} />
      ))}
    </View>
  );
}

function Cluster({ cluster, lineColor }: {
  cluster: {
    left: string; top: string; base: number; dur: number; phase: number; driftX: number; driftY: number;
    accent: string; points: { x: number; y: number; r: number }[];
  };
  lineColor: string;
}) {
  const v = useRef(new Animated.Value(0)).current;
  useFrozenPhase(v, cluster.dur, cluster.phase);

  const opacity = v.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [cluster.base * 0.3, Math.min(cluster.base, 0.85), cluster.base * 0.3],
  });
  const tx = v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, cluster.driftX, 0] });
  const ty = v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, cluster.driftY, 0] });

  return (
    <Animated.View
      style={[
        styles.cluster,
        { left: cluster.left as any, top: cluster.top as any, opacity, transform: [{ translateX: tx }, { translateY: ty }] },
      ]}
    >
      <Svg width={CLUSTER_SIZE} height={CLUSTER_SIZE} viewBox={`0 0 ${CLUSTER_SIZE} ${CLUSTER_SIZE}`}>
        {cluster.points.slice(0, -1).map((p, i) => {
          const q = cluster.points[i + 1];
          return <Line key={i} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={lineColor} strokeOpacity={0.35} strokeWidth={0.8} />;
        })}
        {cluster.points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={p.r} fill={i === 0 ? cluster.accent : lineColor} />
        ))}
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cluster: { position: 'absolute', width: CLUSTER_SIZE, height: CLUSTER_SIZE },
});
