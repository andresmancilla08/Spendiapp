import { useRef } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
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
        const borderColor = error ? colors.error : filled ? colors.primary : colors.border;
        const bg = filled ? colors.primaryLight : colors.backgroundSecondary;
        return (
          <TextInput
            key={i}
            ref={(r) => { inputs.current[i] = r; }}
            style={[styles.box, { borderColor, backgroundColor: bg, color: colors.primary }]}
            value={value[i] ? '•' : ''}
            onChangeText={(t) => handleChange(t, i)}
            onKeyPress={(e) => handleKeyPress(e.nativeEvent.key, i)}
            keyboardType="numeric"
            maxLength={1}
            textAlign="center"
            caretHidden
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
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
});
