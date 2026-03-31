import { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LANGUAGES, changeLanguage } from '../config/i18n';
import { useTheme } from '../context/ThemeContext';

export default function LanguageSelector() {
  const { i18n } = useTranslation();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0 });
  const triggerRef = useRef<View>(null);

  const current = LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[0];

  const handleOpen = () => {
    triggerRef.current?.measureInWindow((_x, y, _width, height) => {
      setDropdownPos({ top: y + height + 4 });
      setOpen(true);
    });
  };

  const handleSelect = async (code: string) => {
    await changeLanguage(code);
    setOpen(false);
  };

  return (
    <>
      <View ref={triggerRef} collapsable={false}>
        <TouchableOpacity
          style={styles.trigger}
          onPress={handleOpen}
          activeOpacity={0.7}
        >
          <Text style={styles.flag}>{current.flag}</Text>
        </TouchableOpacity>
      </View>

      <Modal transparent animationType="fade" visible={open} statusBarTranslucent>
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <View
            style={[
              styles.dropdown,
              {
                top: dropdownPos.top,
                right: 16,
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            {LANGUAGES.map((lang, index) => {
              const active = i18n.language === lang.code;
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.option,
                    index < LANGUAGES.length - 1 && [styles.optionBorder, { borderBottomColor: colors.border }],
                    active && { backgroundColor: colors.primaryLight },
                  ]}
                  onPress={() => handleSelect(lang.code)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.optionFlag}>{lang.flag}</Text>
                  <Text style={[styles.optionLabel, { color: active ? colors.primary : colors.textSecondary }]}>
                    {lang.label}
                  </Text>
                  {active && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  flag: {
    fontSize: 18,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  dropdown: {
    position: 'absolute',
    borderRadius: 14,
    borderWidth: 1.5,
    minWidth: 130,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  optionBorder: {
    borderBottomWidth: 1,
  },
  optionFlag: {
    fontSize: 16,
  },
  optionLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
});
