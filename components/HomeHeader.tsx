// components/HomeHeader.tsx
// Franja superior del Home. Dos estados sobre un contenedor de altura fija:
//   · al abrir  — avatar con el anillo del mes a la izquierda, saludo y línea de contexto
//   · al bajar  — barra compacta con el mismo avatar+anillo, el nombre y el mes
// El anillo lleva el % del presupuesto usado, así que al contraerse no hace falta repetirlo
// como texto: la señal viaja con la foto.
//
// El colapso se ata al scroll con `transform`/`opacity` (lo único que corre en el hilo nativo:
// `height` no). Con reduce-motion activo no se colapsa — se queda expandido, sin movimiento y
// sin perder información.
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated, Easing, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useEffect, useState, type ReactNode } from 'react';
import Svg, { Circle } from 'react-native-svg';
import AppIcon from './AppIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../config/fonts';
import { readableOn } from '../utils/contrast';

/** Alto del bloque: avatar de 46 + 12 de padding arriba y abajo. */
export const HOME_HEADER_HEIGHT = 70;

// Un ÚNICO progreso 0→1 gobierna las dos capas: la que sale vale `1 - p` y la que entra
// vale `p`, así que la suma es siempre 1 y nunca hay un tramo con las dos a medio gas
// (el fallo del crossfade anterior: rangos distintos y solapados dejaban un hueco hacia
// la mitad del scroll en el que no se leía bien ninguna de las dos).
const COLLAPSE_FROM = 10;
const COLLAPSE_TO = 78;

// Histéresis del cambio de capa activa: con un único umbral, un scroll que temblaba
// alrededor de él encendía y apagaba `pointerEvents` en bucle.
const COMPACT_ON = 56;
const COMPACT_OFF = 28;

// Misma curva que el resto de la app para entradas/salidas.
const EASE = Easing.inOut(Easing.cubic);

interface Props {
  firstName: string;
  photoUrl?: string | null;
  avatarError: boolean;
  onAvatarError: () => void;
  isPremium: boolean;
  /** NotificationBell ya trae su propia lógica de no leídas; se inyecta tal cual. */
  bell?: ReactNode;
  /** % del presupuesto usado, o `null` si no hay ingresos y gastos con los que calcularlo. */
  percent: number | null;
  percentColor: string;
  /** Días que quedan del mes, o `null` si se está mirando un mes que no es el actual. */
  daysLeft: number | null;
  monthShort: string;
  /** Frase de contexto para cuando no hay porcentaje (mantiene el comportamiento anterior). */
  fallbackContext: string;
  contextFor: (percent: number, daysLeft: number | null) => string;
  loading?: boolean;
  scrollY: Animated.Value;
  /** `false` con reduce-motion: el header no se colapsa. */
  collapsible: boolean;
  onPressProfile: () => void;
}

export default function HomeHeader({
  firstName,
  photoUrl,
  avatarError,
  onAvatarError,
  isPremium,
  bell,
  percent,
  percentColor,
  daysLeft,
  monthShort,
  fallbackContext,
  contextFor,
  loading,
  scrollY,
  collapsible,
  onPressProfile,
}: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const profileLabel = t('profile.openProfile');
  const [compact, setCompact] = useState(false);

  // Un solo re-render por cruce del umbral: el resto del colapso es interpolación nativa.
  // Sirve para que la capa oculta no capture toques.
  useEffect(() => {
    if (!collapsible) {
      setCompact(false);
      return;
    }
    const id = scrollY.addListener(({ value }) => {
      setCompact((prev) => {
        if (!prev && value > COMPACT_ON) return true;
        if (prev && value < COMPACT_OFF) return false;
        return prev;
      });
    });
    return () => scrollY.removeListener(id);
  }, [collapsible, scrollY]);

  // p: 0 = saludo completo · 1 = barra compacta. La curva vive aquí y solo aquí.
  const progress = scrollY.interpolate({
    inputRange: [COLLAPSE_FROM, COLLAPSE_TO],
    outputRange: [0, 1],
    easing: EASE,
    extrapolate: 'clamp',
  });

  // El desplazamiento y la escala acompañan al desvanecido: sin ellos el avatar salta de
  // 56 a 40 px entre capas y el ojo lee un corte aunque la opacidad sea gradual.
  //
  // La escala, en web, NO: WebKit rasteriza la capa a la escala con la que la crea y el
  // texto se queda borroso en iOS aunque el valor vuelva a 1 — la capa compacta nace en
  // 0.96, así que era la peor de las dos. Fuera de web el escalado no rasteriza y se queda.
  // En web NO se transforma NADA: ni escala ni desplazamiento.
  //
  // La escala ya estaba fuera por el motivo de arriba. El translateY hacía lo
  // mismo: promueve la capa y WebKit la rasteriza en una posición fraccionaria,
  // así que el saludo y el avatar quedaban con doble contorno. En la PWA
  // instalada la capa no se despromueve nunca y el borrón se queda fijo.
  // El desvanecido cruzado se conserva: la opacidad no rasteriza geometría.
  const transforms = Platform.OS !== 'web';
  const withMotion = (fromY: number, toY: number, fromS: number, toS: number) =>
    transforms
      ? [
          { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [fromY, toY] }) },
          { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [fromS, toS] }) },
        ]
      : [];

  const expandedStyle = collapsible
    ? {
        opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
        transform: withMotion(0, -12, 1, 0.96),
      }
    : undefined;

  const compactStyle = collapsible
    ? {
        opacity: progress,
        transform: withMotion(12, 0, 0.96, 1),
      }
    : { opacity: 0 };

  const context = percent != null ? contextFor(percent, daysLeft) : fallbackContext;
  // El color del pill (ámbar/rojo) no se lee como texto sobre fondo claro: se mide y, si no
  // llega a 4.5:1, cae a un color de texto que sí.
  const contextColor = percent != null
    ? readableOn(colors.background, [percentColor, colors.textSecondary])
    : colors.textSecondary;

  const avatar = (size: number) => {
    const inner = photoUrl && !avatarError
      ? <Image source={{ uri: photoUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} onError={onAvatarError} />
      : (
        <View style={[
          styles.avatarFallback,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primaryLight, borderColor: `${colors.primary}40` },
        ]}>
          <AppIcon name="person" size={size * 0.42} color={colors.primary} />
        </View>
      );
    return inner;
  };

  /** Avatar con el anillo del mes alrededor. Sin porcentaje, avatar a secas. */
  const ringAvatar = (box: number) => {
    const avatarSize = Math.round(box * 0.74);
    if (percent == null) return avatar(avatarSize);
    const stroke = box >= 52 ? 4 : 3;
    const r = (box - stroke) / 2;
    const circumference = 2 * Math.PI * r;
    const clamped = Math.min(percent, 100) / 100;
    return (
      <View style={{ width: box, height: box, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={box} height={box} style={StyleSheet.absoluteFillObject}>
          <Circle cx={box / 2} cy={box / 2} r={r} stroke={colors.border} strokeWidth={stroke} fill="none" />
          <Circle
            cx={box / 2}
            cy={box / 2}
            r={r}
            stroke={percentColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={circumference * (1 - clamped)}
            transform={`rotate(-90 ${box / 2} ${box / 2})`}
          />
        </Svg>
        <View style={[styles.avatarInRing, { borderColor: colors.background }]}>{avatar(avatarSize)}</View>
      </View>
    );
  };

  const premiumDot = isPremium ? (
    <View style={[styles.premiumDot, { backgroundColor: colors.warning, borderColor: colors.background }]}>
      <AppIcon name="star" size={7} color="#FFF" />
    </View>
  ) : null;

  return (
    <View style={[styles.root, { height: HOME_HEADER_HEIGHT }]}>
      {/* Al abrir */}
      <Animated.View style={[styles.layer, expandedStyle]} pointerEvents={compact ? 'none' : 'auto'}>
        {/* El saludo entra en el área táctil junto al avatar: el bloque entero
            se lee como una sola cosa —"tú"— y tocar el nombre para ir a tu
            perfil es lo que espera cualquiera. Antes solo respondía la foto. */}
        <TouchableOpacity
          onPress={onPressProfile}
          activeOpacity={0.8}
          style={styles.identityHit}
          accessibilityRole="button"
          accessibilityLabel={profileLabel}
        >
          <View style={styles.avatarHit}>
            <View>
              {ringAvatar(56)}
              {premiumDot}
            </View>
          </View>
          <View style={styles.texts}>
            <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
              {firstName}
            </Text>
            {!loading && (
              <Text style={[styles.context, { color: contextColor }]} numberOfLines={2}>
                {context}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* Al bajar */}
      <Animated.View style={[styles.layer, styles.compactLayer, compactStyle]} pointerEvents={compact ? 'auto' : 'none'}>
        <View
          style={[
            styles.pill,
            { backgroundColor: colors.surface, borderColor: colors.border },
            Platform.OS === 'web'
              ? ({ boxShadow: '0 2px 10px rgba(0,0,0,0.10)' } as any)
              : { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
          ]}
        >
          {/* Misma regla en la barra compacta: avatar y nombre son un solo destino. */}
          <TouchableOpacity
            onPress={onPressProfile}
            activeOpacity={0.8}
            style={styles.identityHitCompact}
            accessibilityRole="button"
            accessibilityLabel={profileLabel}
          >
            <View>
              {ringAvatar(40)}
              {isPremium && (
                <View style={[styles.premiumDotSm, { backgroundColor: colors.warning, borderColor: colors.surface }]} />
              )}
            </View>
            <Text style={[styles.compactName, { color: colors.textPrimary }]} numberOfLines={1}>
              {firstName}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.compactMonth, { color: colors.textTertiary }]}>{monthShort}</Text>
        </View>
      </Animated.View>

      {/* Fuera de las capas: una sola instancia, para no duplicar su suscripción de no leídas. */}
      {bell ? <View style={styles.bellSlot}>{bell}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { justifyContent: 'center' },
  layer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 20,
    paddingRight: 64,
  },
  compactLayer: { paddingLeft: 16, paddingRight: 60 },
  bellSlot: { position: 'absolute', right: 16, top: 0, bottom: 0, justifyContent: 'center' },
  // 56 de anillo dentro de un área tocable de 60: por encima del mínimo de 44.
  avatarHit: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
  avatarInRing: { borderWidth: 2, borderRadius: 999 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  premiumDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 15, height: 15, borderRadius: 8, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  premiumDotSm: {
    position: 'absolute', bottom: 0, right: 0,
    width: 11, height: 11, borderRadius: 6, borderWidth: 1.5,
  },
  texts: { flex: 1, minWidth: 0 },
  // Avatar + saludo son un solo destino táctil hacia el perfil.
  identityHit: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  identityHitCompact: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 },
  name: { fontSize: 21, fontFamily: Fonts.bold, letterSpacing: -0.5 },
  context: { fontSize: 12.5, fontFamily: Fonts.semiBold, marginTop: 3, lineHeight: 17 },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingLeft: 5,
    paddingRight: 14,
    paddingVertical: 5,
  },
  compactName: { flex: 1, minWidth: 0, fontSize: 13.5, fontFamily: Fonts.bold },
  compactMonth: { fontSize: 12, fontFamily: Fonts.semiBold, textTransform: 'lowercase' },
});
