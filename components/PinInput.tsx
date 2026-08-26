import { useRef, useState } from 'react';
import { View, TextInput, StyleSheet, Text, TouchableOpacity } from 'react-native';
import AppIcon from './AppIcon';
import { useTheme } from '../context/ThemeContext';
import { authTokens } from '../utils/authTheme';
import { Fonts } from '../config/fonts';
import { PIN_LENGTH } from '../constants/pin';

const SIZE_CONFIG = {
  md: { box: 60, radius: 16, fontSize: 28, gap: 12 },
  /** 6 casillas de 60 px se salen de un móvil estrecho (360 dp). */
  mdWide: { box: 48, radius: 15, fontSize: 22, gap: 8 },
  sm: { box: 44, radius: 12, fontSize: 18, gap: 8 },
};

interface PinInputProps {
  value: string;
  onChange: (v: string) => void;
  error?: boolean;
  defaultVisible?: boolean;
  size?: 'sm' | 'md';
  /** Nº de casillas. El PIN son 6; el código de recuperación sigue siendo de 4. */
  length?: number;
  /**
   * Parte la fila en dos mitades, como un número de tarjeta. Con 6 casillas seguidas
   * hay que contarlas una a una para saber cuántas van; en 3+3 se ve de un vistazo.
   */
  grouped?: boolean;
  /**
   * El ojo lo pinta el padre, en la fila del label. Su sitio de antes —al final de la
   * fila— hacía que las casillas no cupieran a lo ancho (368px pedidos en 342 dispo-
   * nibles), y por eso se veía descolgado.
   */
  hideEye?: boolean;
  /** Visibilidad controlada desde fuera cuando el ojo lo pinta el padre. */
  visible?: boolean;
  /** Las casillas ocupan todo el ancho disponible en vez de quedar centradas. */
  stretch?: boolean;
}

export default function PinInput({
  value, onChange, error = false, defaultVisible = false, size = 'md', length = PIN_LENGTH,
  grouped = false, hideEye = false, visible, stretch = false,
}: PinInputProps) {
  // Con 6 casillas, las de 60 px no caben en un móvil estrecho.
  const cfg = size === 'md' && length > 4 ? SIZE_CONFIG.mdWide : SIZE_CONFIG[size];
  const { colors, isDark } = useTheme();
  const tk = authTokens(colors, isDark);
  const inputs = useRef<(TextInput | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [ownVisible, setOwnVisible] = useState(defaultVisible);
  const showPin = visible ?? ownVisible;

  const handleChange = (text: string, index: number) => {
    const typed = text.replace(/[^0-9]/g, '');
    // Pegar o autorrellenar mete el código entero en una casilla: repartirlo.
    if (typed.length > 1) {
      const next = typed.slice(0, length);
      onChange(next);
      inputs.current[Math.min(next.length, length - 1)]?.focus();
      return;
    }
    const chars = value.padEnd(length, ' ').split('');
    chars[index] = typed || ' ';
    const next = chars.join('').trimEnd();
    onChange(next);
    if (typed && index < length - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !value[index] && index > 0) {
      const chars = value.padEnd(length, ' ').split('');
      chars[index - 1] = ' ';
      onChange(chars.join('').trimEnd());
      inputs.current[index - 1]?.focus();
    }
  };

  const renderCell = (i: number) => {
    const filled = /\d/.test(value[i] ?? '');
    const focused = focusedIndex === i;
    const borderColor = error
      ? colors.error
      : focused || filled
      ? colors.textPrimary
      : tk.fieldLine;
    const bg = filled ? colors.surface : tk.fieldBg;
    return (
      <View key={i} style={[styles.cellWrap, stretch ? styles.cellFlex : { width: cfg.box }]}>
        <TextInput
          ref={(r) => { inputs.current[i] = r; }}
          style={[
            styles.box,
            {
              height: cfg.box,
              borderRadius: cfg.radius,
              fontSize: cfg.fontSize,
              borderColor,
              borderWidth: focused || filled ? 2 : 1.5,
              backgroundColor: bg,
              color: 'transparent',
            },
            !stretch && { width: cfg.box },
          ]}
          value={filled ? '•' : ''}
          onChangeText={(t) => handleChange(t, i)}
          onKeyPress={(e) => handleKeyPress(e.nativeEvent.key, i)}
          onFocus={() => setFocusedIndex(i)}
          onBlur={() => setFocusedIndex(null)}
          keyboardType="numeric"
          maxLength={length}
          textAlign="center"
          caretHidden
        />
        {filled && (
          <View style={styles.dotOverlay} pointerEvents="none">
            {showPin ? (
              <Text style={[styles.dotText, { fontSize: cfg.fontSize - 6, color: colors.textPrimary }]}>
                {value[i]}
              </Text>
            ) : (
              <View style={[styles.dot, { backgroundColor: colors.textPrimary }]} />
            )}
          </View>
        )}
      </View>
    );
  };

  const cells = Array.from({ length }, (_, i) => i);
  const half = Math.ceil(length / 2);

  return (
    <View style={styles.wrapper}>
      <View style={[styles.group, { gap: hideEye ? 0 : cfg.gap + 4 }]}>
        {grouped && length % 2 === 0 ? (
          <View style={[styles.dotsRow, stretch && styles.rowFlex]}>
            <View style={[styles.dotsRow, { gap: cfg.gap }, stretch && styles.rowFlex]}>
              {cells.slice(0, half).map(renderCell)}
            </View>
            <View style={{ width: cfg.gap + 5 }} />
            <View style={[styles.dotsRow, { gap: cfg.gap }, stretch && styles.rowFlex]}>
              {cells.slice(half).map(renderCell)}
            </View>
          </View>
        ) : (
          <View style={[styles.dotsRow, { gap: cfg.gap }, stretch && styles.rowFlex]}>
            {cells.map(renderCell)}
          </View>
        )}

        {!hideEye && (
          <TouchableOpacity
            style={[styles.eyeButton, { height: cfg.box }]}
            onPress={() => setOwnVisible((p) => !p)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <AppIcon
              name={showPin ? 'eye-outline' : 'eye-off-outline'}
              size={22}
              color={colors.textTertiary}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignSelf: 'stretch', alignItems: 'center' },
  group: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', justifyContent: 'center' },
  dotsRow: { flexDirection: 'row', alignItems: 'center' },
  rowFlex: { flex: 1 },
  cellWrap: { position: 'relative' },
  cellFlex: { flex: 1 },
  box: {
    width: '100%',
    height: 60,
    borderRadius: 16,
    borderWidth: 1.5,
    fontSize: 28,
    fontFamily: Fonts.bold,
    // El recuadro azul del navegador se pintaba encima del borde propio.
    ...(({ outlineStyle: 'none' } as unknown) as object),
  },
  dotOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 9, height: 9, borderRadius: 5 },
  dotText: { fontFamily: Fonts.bold, lineHeight: 26 },
  eyeButton: { width: 40, height: 60, justifyContent: 'center', alignItems: 'center' },
});
