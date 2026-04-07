import { useRef, useState } from 'react';
import { View, TextInput, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../config/fonts';

const SIZE_CONFIG = {
  md: { box: 60, radius: 16, fontSize: 28, gap: 12 },
  sm: { box: 44, radius: 12, fontSize: 18, gap: 8 },
};

interface PinInputProps {
  value: string;
  onChange: (v: string) => void;
  error?: boolean;
  defaultVisible?: boolean;
  size?: 'sm' | 'md';
}

export default function PinInput({ value, onChange, error = false, defaultVisible = false, size = 'md' }: PinInputProps) {
  const cfg = SIZE_CONFIG[size];
  const { colors } = useTheme();
  const inputs = useRef<(TextInput | null)[]>([null, null, null, null]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [showPin, setShowPin] = useState(defaultVisible);

  const handleChange = (text: string, index: number) => {
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    const chars = value.padEnd(4, '').split('');
    chars[index] = digit;
    const next = chars.join('').trimEnd();
    onChange(next);
    if (digit && index < 3) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !value[index] && index > 0) {
      const chars = value.padEnd(4, '').split('');
      chars[index - 1] = '';
      onChange(chars.join('').trimEnd());
      inputs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.wrapper}>
      {/* Grupo compacto: boxes + ícono ojo juntos, centrado en pantalla */}
      <View style={[styles.group, { gap: cfg.gap + 4 }]}>
        <View style={[styles.dotsRow, { gap: cfg.gap }]}>
          {[0, 1, 2, 3].map((i) => {
            const filled = !!value[i];
            const focused = focusedIndex === i;
            const borderColor = error
              ? colors.error
              : focused
              ? colors.borderFocus
              : filled
              ? colors.primary
              : colors.border;
            const bg = focused
              ? colors.primaryLight
              : filled
              ? colors.primaryLight
              : colors.backgroundSecondary;
            return (
              <View key={i} style={{ position: 'relative' }}>
                <TextInput
                  ref={(r) => { inputs.current[i] = r; }}
                  style={[
                    styles.box,
                    {
                      width: cfg.box,
                      height: cfg.box,
                      borderRadius: cfg.radius,
                      fontSize: cfg.fontSize,
                      borderColor,
                      backgroundColor: bg,
                      color: 'transparent',
                    },
                    focused && styles.boxFocused,
                  ]}
                  value={value[i] ? '•' : ''}
                  onChangeText={(t) => handleChange(t, i)}
                  onKeyPress={(e) => handleKeyPress(e.nativeEvent.key, i)}
                  onFocus={() => setFocusedIndex(i)}
                  onBlur={() => setFocusedIndex(null)}
                  keyboardType="numeric"
                  maxLength={1}
                  textAlign="center"
                  caretHidden
                />
                {!!value[i] && (
                  <View style={styles.dotOverlay} pointerEvents="none">
                    <Text style={[
                      styles.dotText,
                      { fontSize: showPin ? cfg.fontSize - 6 : cfg.fontSize },
                      showPin
                        ? { color: colors.textPrimary }
                        : { color: colors.primary },
                    ]}>
                      {showPin ? value[i] : '•'}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.eyeButton, { height: cfg.box }]}
          onPress={() => setShowPin((p) => !p)}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={showPin ? 'eye-outline' : 'eye-off-outline'}
            size={22}
            color={colors.textTertiary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  // Grupo compacto centrado: [⬜][⬜][⬜][⬜] [👁]
  group: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  box: {
    width: 60,
    height: 60,
    borderRadius: 16,
    borderWidth: 1.5,
    fontSize: 28,
    fontFamily: Fonts.bold,
  },
  dotOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotText: {
    fontSize: 28,
    fontFamily: Fonts.bold,
    lineHeight: 32,
  },
  boxFocused: {
    borderWidth: 2,
    shadowColor: '#00ACC1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  eyeButton: {
    width: 40,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
