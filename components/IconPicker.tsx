import { useMemo, useState } from 'react';
import { ScrollView, View, Text, Pressable, TextInput, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../config/fonts';
import AppIcon from './AppIcon';
import CategoryIcon from './CategoryIcon';
import { CATEGORY_ICON_GROUPS, KEYWORD_ICONS } from '../constants/categoryIcons';
import { accentInk } from '../utils/contrast';

interface Props {
  selected: string;
  onSelect: (icon: string) => void;
}

const normalize = (s: string): string =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** icono → todas sus palabras, para que el buscador entienda "gasolina" y no solo "gas-station". */
const ICON_TERMS: Record<string, string> = KEYWORD_ICONS.reduce((acc, [words, icon]) => {
  acc[icon] = `${acc[icon] ?? ''} ${words.join(' ')}`;
  return acc;
}, {} as Record<string, string>);

export default function IconPicker({ selected, onSelect }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return CATEGORY_ICON_GROUPS;
    return CATEGORY_ICON_GROUPS
      .map((g) => ({
        ...g,
        icons: g.icons.filter((i) => normalize(`${i} ${ICON_TERMS[i] ?? ''}`).includes(q)),
      }))
      .filter((g) => g.icons.length > 0);
  }, [query]);

  const labelInk = accentInk(colors, 'primary', colors.backgroundSecondary);

  return (
    <View>
      <View style={[styles.search, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
        <AppIcon name="search-outline" size={16} color={colors.textTertiary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('categories.iconSearch')}
          placeholderTextColor={colors.textTertiary}
          style={[styles.searchInput, { color: colors.textPrimary }]}
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityRole="button">
            <AppIcon name="close-circle" size={16} color={colors.textTertiary} />
          </Pressable>
        )}
      </View>

      <ScrollView
        style={styles.list}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
      >
        {groups.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textTertiary }]}>{t('categories.iconNoResults')}</Text>
        ) : (
          groups.map((group) => (
            <View key={group.id} style={styles.group}>
              <Text style={[styles.groupLabel, { color: labelInk }]}>
                {t(`categories.iconGroups.${group.id}`)}
              </Text>
              <View style={styles.grid}>
                {group.icons.map((icon) => {
                  const isSelected = icon === selected;
                  return (
                    <Pressable
                      key={icon}
                      onPress={() => onSelect(icon)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={icon}
                      style={[
                        styles.cell,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.surface,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <CategoryIcon
                        icon={icon}
                        size={22}
                        color={isSelected ? colors.onPrimary : colors.textSecondary}
                      />
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, height: 42, marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: Fonts.regular, padding: 0 },
  list: { maxHeight: 260 },
  group: { marginBottom: 14 },
  groupLabel: {
    fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 1.2,
    textTransform: 'uppercase', marginBottom: 8,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: {
    width: 44, height: 44, borderRadius: 14, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  empty: { fontSize: 13, fontFamily: Fonts.regular, textAlign: 'center', paddingVertical: 24 },
});
