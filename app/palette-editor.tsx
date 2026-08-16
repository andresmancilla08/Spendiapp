import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import AppIcon from '../components/AppIcon';
import AppHeader from '../components/AppHeader';
import PageTitle from '../components/PageTitle';
import ScreenBackground from '../components/ScreenBackground';
import ScreenTransition from '../components/ScreenTransition';
import AppSegmentedControl from '../components/AppSegmentedControl';
import AppDialog from '../components/AppDialog';
import HuePicker from '../components/HuePicker';
import HomeMiniPreview from '../components/HomeMiniPreview';
import { scrollFadeMask } from '../components/ScrollFadeEdges';
import { useTheme } from '../context/ThemeContext';
import { useAuthStore } from '../store/authStore';
import { updateUserColorPalette, updateCustomPalettes } from '../hooks/useUserProfile';
import {
  derivePalette, paletteContrastReport,
  type CustomPalette, type SecondaryMode, type PaletteFeel,
} from '../utils/derivePalette';
import { Fonts } from '../config/fonts';

/**
 * Editor de paletas propias.
 *
 * Tres decisiones —color, cómo acompañarlo y si vivo o suave— y el generador
 * construye los sesenta colores de la app en claro y en oscuro. La vista previa
 * enseña las dos a la vez, porque una paleta se aprueba cuando funciona en
 * ambos modos, no solo en el que tengas puesto.
 *
 * Lo que se guarda son los tres parámetros, no los colores resueltos: si el
 * generador mejora, las paletas ya creadas mejoran con él.
 */

const SECONDARY_MODES: SecondaryMode[] = ['analogous', 'complementary', 'triadic'];
const FEELS: PaletteFeel[] = ['vivid', 'soft'];
const NAME_MAX = 24;

export default function PaletteEditor() {
  const { colors, customPalettes, saveCustomPalette, removeCustomPalette, setPaletteId } = useTheme();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const params = useLocalSearchParams<{ id?: string }>();

  const editing = useMemo(
    () => customPalettes.find((c) => c.id === params.id),
    [customPalettes, params.id],
  );

  const [name, setName] = useState(editing?.name ?? '');
  const [hue, setHue] = useState(editing?.hue ?? 190);
  const [secondaryMode, setSecondaryMode] = useState<SecondaryMode>(editing?.secondaryMode ?? 'analogous');
  const [feel, setFeel] = useState<PaletteFeel>(editing?.feel ?? 'vivid');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const id = editing?.id ?? `custom_${Date.now()}`;
  const preview = useMemo(
    () => derivePalette({ hue, secondaryMode, feel }, id),
    [hue, secondaryMode, feel, id],
  );

  // Aviso, no bloqueo: el generador ya corrige el contraste, así que esto solo
  // saltaría si una combinación se escapa. Mejor decirlo que ocultarlo.
  const contrastIssue = useMemo(
    () => paletteContrastReport(preview).some((r) => r.ratio < r.min),
    [preview],
  );

  const trimmed = name.trim();
  const canSave = trimmed.length > 0;

  const onSave = async () => {
    if (!canSave) return;
    const record: CustomPalette = {
      id, name: trimmed, hue, secondaryMode, feel,
      createdAt: editing?.createdAt ?? Date.now(),
    };
    await saveCustomPalette(record);
    // La lista sincronizada se arma aquí: el contexto acaba de guardarla en
    // local, pero su estado todavía no ha vuelto en este render.
    if (user?.uid) {
      const next = [record, ...customPalettes.filter((c) => c.id !== record.id)];
      updateCustomPalettes(user.uid, next).catch(() => {});
    }
    // Se aplica al guardar: has estado mirándola todo el rato, lo raro sería
    // tener que ir a buscarla a la rejilla después.
    await setPaletteId(id);
    if (user?.uid) updateUserColorPalette(user.uid, id).catch(() => {});
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.back();
  };

  const onDelete = async () => {
    setConfirmDelete(false);
    if (editing) {
      await removeCustomPalette(editing.id);
      if (user?.uid) {
        updateCustomPalettes(user.uid, customPalettes.filter((c) => c.id !== editing.id)).catch(() => {});
      }
    }
    router.back();
  };

  const previewCard = (mode: 'light' | 'dark') => {
    const themed = preview.colors[mode];
    const gradient = mode === 'dark' ? preview.gradientDark : preview.gradientLight;
    return (
      <View style={[styles.previewCard, { borderColor: colors.border }]}>
        <LinearGradient colors={gradient} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFillObject} />
        {mode === 'dark' && <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.7)' }]} />}
        <HomeMiniPreview themed={themed} chartColor={themed.primary} width={PREVIEW_W} />
      </View>
    );
  };

  return (
    <ScreenTransition>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ScreenBackground>
          <AppHeader showBack />
          <ScrollView
            style={scrollFadeMask(0, 0)}
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <PageTitle
              title={t(editing ? 'palette.editTitle' : 'palette.newTitle')}
              description={t('palette.subtitle')}
            />

            {/* Las dos caras a la vez: una paleta se aprueba cuando funciona en
                claro Y en oscuro, no solo en el modo que tengas puesto. */}
            <View style={styles.previewRow}>
              <View style={styles.previewCol}>
                {previewCard('light')}
                <Text style={[styles.previewLabel, { color: colors.textTertiary }]}>{t('palette.modeLight')}</Text>
              </View>
              <View style={styles.previewCol}>
                {previewCard('dark')}
                <Text style={[styles.previewLabel, { color: colors.textTertiary }]}>{t('palette.modeDark')}</Text>
              </View>
            </View>

            {contrastIssue && (
              <View style={[styles.warning, { backgroundColor: colors.warningLight, borderColor: colors.warning }]}>
                <AppIcon name="alert-circle" size={16} color={colors.warningDark} />
                <Text style={[styles.warningText, { color: colors.warningDark }]}>{t('palette.contrastWarning')}</Text>
              </View>
            )}

            <Text style={[styles.label, { color: colors.textTertiary }]}>{t('palette.nameLabel')}</Text>
            <TextInput
              value={name}
              onChangeText={(v) => setName(v.slice(0, NAME_MAX))}
              placeholder={t('palette.namePlaceholder')}
              placeholderTextColor={colors.textTertiary}
              maxLength={NAME_MAX}
              style={[
                styles.input,
                { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.textPrimary },
                Platform.OS === 'web' ? ({ outline: 'none' } as any) : null,
              ]}
            />

            <Text style={[styles.label, { color: colors.textTertiary }]}>{t('palette.hueLabel')}</Text>
            <HuePicker hue={hue} onChange={setHue} />

            <Text style={[styles.label, { color: colors.textTertiary }]}>{t('palette.harmonyLabel')}</Text>
            <AppSegmentedControl
              segments={SECONDARY_MODES.map((m) => ({ key: m, label: t(`palette.harmony.${m}`) }))}
              activeKey={secondaryMode}
              onChange={(k) => setSecondaryMode(k as SecondaryMode)}
            />
            <Text style={[styles.hint, { color: colors.textTertiary }]}>{t(`palette.harmonyHint.${secondaryMode}`)}</Text>

            <Text style={[styles.label, { color: colors.textTertiary }]}>{t('palette.feelLabel')}</Text>
            <AppSegmentedControl
              segments={FEELS.map((f) => ({ key: f, label: t(`palette.feel.${f}`) }))}
              activeKey={feel}
              onChange={(k) => setFeel(k as PaletteFeel)}
            />

            {editing && (
              <TouchableOpacity
                onPress={() => setConfirmDelete(true)}
                activeOpacity={0.8}
                accessibilityRole="button"
                style={styles.deleteRow}
              >
                <AppIcon name="trash-outline" size={16} color={colors.error} />
                <Text style={[styles.deleteText, { color: colors.error }]}>{t('palette.delete')}</Text>
              </TouchableOpacity>
            )}

            <View style={{ height: 24 }} />
          </ScrollView>

          {/* El botón vive al fondo, fijo: es la única acción de la pantalla. */}
          <View style={[styles.cta, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
            <TouchableOpacity
              onPress={onSave}
              disabled={!canSave}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSave }}
              style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: canSave ? 1 : 0.4 }]}
            >
              <Text style={[styles.saveText, { color: colors.onPrimary }]}>
                {canSave ? t('palette.save') : t('palette.needName')}
              </Text>
            </TouchableOpacity>
          </View>

          <AppDialog
            visible={confirmDelete}
            title={t('palette.deleteTitle')}
            description={t('palette.deleteMessage')}
            primaryLabel={t('palette.delete')}
            secondaryLabel={t('common.cancel')}
            primaryDanger
            onPrimary={onDelete}
            onSecondary={() => setConfirmDelete(false)}
          />
        </ScreenBackground>
      </SafeAreaView>
    </ScreenTransition>
  );
}

/** Ancho de cada maqueta: dos caben en una fila de móvil con holgura. */
const PREVIEW_W = 150;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 24, gap: 8 },
  previewRow: { flexDirection: 'row', gap: 12, justifyContent: 'center', marginTop: 4, marginBottom: 8 },
  previewCol: { alignItems: 'center', gap: 8 },
  previewCard: {
    width: PREVIEW_W,
    height: Math.round(PREVIEW_W * 1.72),
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  previewLabel: { fontSize: 12, fontFamily: Fonts.semiBold },
  label: { fontSize: 11, fontFamily: Fonts.bold, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 18, marginBottom: 10 },
  hint: { fontSize: 12, fontFamily: Fonts.regular, lineHeight: 17, marginTop: 8 },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: Fonts.medium },
  warning: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 4 },
  warningText: { flex: 1, fontSize: 12.5, fontFamily: Fonts.medium, lineHeight: 17 },
  deleteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 26, paddingVertical: 10 },
  deleteText: { fontSize: 14, fontFamily: Fonts.semiBold },
  cta: { padding: 15, borderTopWidth: StyleSheet.hairlineWidth },
  saveBtn: { height: 52, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  saveText: { fontSize: 16, fontFamily: Fonts.bold },
});
