import { useRef, useState } from 'react';
import { View, TextInput, StyleSheet, Text } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../config/fonts';

interface PinInputProps {
  value: string;
  onChange: (v: string) => void;
  error?: boolean;
}

export default function PinInput({ value, onChange, error = false }: PinInputProps) {
  const { colors } = useTheme();
  const inputs = useRef<(TextInput | null)[]>([null, null, null, null]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

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
    <View style={styles.row}>
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
                { borderColor, backgroundColor: bg, color: 'transparent' },
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
                <Text style={[styles.dotText, { color: colors.primary }]}>•</Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignSelf: 'stretch',
    gap: 16,
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
});
