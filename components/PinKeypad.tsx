import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface PinKeypadProps {
  onComplete: (pin: string) => void;
  title?: string;
  subtitle?: string;
}

const PIN_LENGTH = 4;

const keys = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['backspace', '0', 'confirm'],
];

export default function PinKeypad({
  onComplete,
  title,
  subtitle,
}: PinKeypadProps) {
  const { colors } = useTheme();
  const [pin, setPin] = useState<string>('');

  const handleKeyPress = (key: string) => {
    if (key === 'backspace') {
      setPin((prev) => prev.slice(0, -1));
      return;
    }
    if (key === 'confirm') return;
    if (pin.length >= PIN_LENGTH) return;

    const newPin = pin + key;
    setPin(newPin);

    if (newPin.length === PIN_LENGTH) {
      setTimeout(() => {
        onComplete(newPin);
        setPin('');
      }, 100);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {!!title && <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>}
      {!!subtitle && <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}

      <View style={styles.dotsRow}>
        {Array.from({ length: PIN_LENGTH }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index < pin.length
                ? { backgroundColor: colors.primary, borderColor: colors.primary, borderWidth: 2 }
                : { backgroundColor: 'transparent', borderWidth: 2, borderColor: colors.border },
            ]}
          />
        ))}
      </View>

      <View style={styles.keypad}>
        {keys.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((key) => {
              const isBackspace = key === 'backspace';
              const isConfirm = key === 'confirm';
              const isSpecial = isBackspace || isConfirm;

              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.key,
                    isSpecial
                      ? styles.keySpecial
                      : { backgroundColor: colors.surfaceSecondary },
                  ]}
                  onPress={() => handleKeyPress(key)}
                  activeOpacity={0.6}
                  accessibilityLabel={isBackspace ? 'Borrar' : isConfirm ? 'Confirmar' : key}
                >
                  {isBackspace ? (
                    <Text style={[styles.keySpecialText, { color: colors.primary }]}>{'←'}</Text>
                  ) : isConfirm ? (
                    <Text style={[styles.keySpecialText, { color: colors.primary }]}>{'✓'}</Text>
                  ) : (
                    <Text style={[styles.keyText, { color: colors.textPrimary }]}>{key}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 24,
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 32,
    gap: 20,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  keypad: {
    width: '100%',
    maxWidth: 320,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  key: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keySpecial: {
    backgroundColor: 'transparent',
  },
  keyText: {
    fontSize: 28,
    fontWeight: '500',
  },
  keySpecialText: {
    fontSize: 24,
    fontWeight: '500',
  },
});
