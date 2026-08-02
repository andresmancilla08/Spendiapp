/**
 * "¿Para dónde va?" y la previsualización del documento.
 *
 * El mismo mes se cuenta distinto según dónde acabe: una tarjeta cuadrada
 * sobrevive a la miniatura de un chat, una story vertical llena la pantalla de
 * quien la mira, y la hoja larga es la que se revisa. Se elige destino ANTES de
 * generar, y se previsualiza la pieza real —no un recorte de otra.
 *
 * Instagram no admite publicar en historias desde la web: el formato story se
 * comparte por la hoja del sistema o se guarda, y el usuario lo sube. Se dice en
 * la interfaz para no prometer un botón que no existe.
 */
import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, Image, ScrollView,
  ActivityIndicator, useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import AppIcon from '../AppIcon';
import { useTheme } from '../../context/ThemeContext';
import { Fonts } from '../../config/fonts';
import { accentInk } from '../../utils/contrast';
import type { ReportFormat, FriendReportImageResult } from '../../utils/generateFriendReportImage';
import { formatDimensions } from '../../utils/generateFriendReportImage';

export const FORMATS: { id: ReportFormat; icon: 'square' | 'story' | 'sheet' }[] = [
  { id: 'chat', icon: 'square' },
  { id: 'story', icon: 'story' },
  { id: 'sheet', icon: 'sheet' },
];

/** Silueta de la proporción de cada formato: se entiende antes que cualquier texto. */
function FormatShape({ format, color, bg }: { format: ReportFormat; color: string; bg: string }) {
  const size = format === 'chat'
    ? { width: 44, height: 44 }
    : format === 'story'
      ? { width: 27, height: 48 }
      : { width: 24, height: 53 };
  return (
    <View style={[styles.shape, size, { borderColor: color, backgroundColor: bg }]}>
      <View style={[styles.shapeBar, { backgroundColor: color }]} />
    </View>
  );
}

// ── Hoja "¿Para dónde va?" ─────────────────────────────────────────────────

interface SheetProps {
  visible: boolean;
  selected: ReportFormat;
  onSelect: (f: ReportFormat) => void;
  onPreview: () => void;
  onClose: () => void;
  entryCount: number;
  busy?: boolean;
}

export function FormatSheet({ visible, selected, onSelect, onPreview, onClose, entryCount, busy }: SheetProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  if (!visible) return null;

  return (
    <View style={styles.sheetLayer} pointerEvents="box-none">
      <TouchableOpacity
        style={styles.scrim}
        activeOpacity={1}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={t('common.close')}
      />
      <View
        style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border, paddingBottom: 26 + insets.bottom }]}
        accessibilityViewIsModal
      >
        <View style={[styles.grab, { backgroundColor: colors.border }]} />
        <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>{t('friendReport.share.whereTitle')}</Text>
        <Text style={[styles.sheetSub, { color: colors.textSecondary }]}>{t('friendReport.share.whereSub')}</Text>

        <View style={styles.formatRow} accessibilityRole="radiogroup">
          {FORMATS.map(({ id }) => {
            const active = id === selected;
            const dims = formatDimensions(id, entryCount);
            return (
              <TouchableOpacity
                key={id}
                onPress={() => onSelect(id)}
                activeOpacity={0.85}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                style={[styles.formatCard, {
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active ? `${colors.primary}12` : colors.surface,
                }]}
              >
                <FormatShape
                  format={id}
                  color={active ? colors.primary : colors.textTertiary}
                  bg={active ? `${colors.primary}18` : 'transparent'}
                />
                <Text style={[styles.formatName, { color: colors.textPrimary }]}>
                  {t(`friendReport.share.format.${id}.name`)}
                </Text>
                <View style={[styles.ratioPill, { backgroundColor: active ? `${colors.primary}20` : colors.surfaceSecondary ?? colors.surface }]}>
                  <Text style={[styles.ratioText, { color: active ? accentInk(colors, 'primary', colors.surface) : colors.textTertiary }]}>
                    {dims.ratio}
                  </Text>
                </View>
                <Text style={[styles.formatWhere, { color: colors.textTertiary }]} numberOfLines={1}>
                  {t(`friendReport.share.format.${id}.where`)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.cta, { backgroundColor: colors.primary }, busy && styles.disabled]}
          onPress={onPreview}
          disabled={busy}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          {busy
            ? <ActivityIndicator size="small" color={colors.onPrimary} />
            : <AppIcon name="eye-outline" size={18} color={colors.onPrimary} />}
          <Text style={[styles.ctaText, { color: colors.onPrimary }]}>
            {t('friendReport.share.previewCta', { name: t(`friendReport.share.format.${selected}.name`) })}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Previsualización ───────────────────────────────────────────────────────

interface PreviewProps {
  visible: boolean;
  format: ReportFormat;
  onChangeFormat: (f: ReportFormat) => void;
  pages: (FriendReportImageResult & { url: string })[];
  loading: boolean;
  error: boolean;
  friendName: string;
  periodLabel: string;
  verdictLabel: string;
  amountLabel: string;
  entryCount: number;
  onShare: () => void;
  onDownload: () => void;
  onRetry: () => void;
  onClose: () => void;
}

export function PreviewModal({
  visible, format, onChangeFormat, pages, loading, error, friendName, periodLabel,
  verdictLabel, amountLabel, entryCount, onShare, onDownload, onRetry, onClose,
}: PreviewProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { width: screenW } = useWindowDimensions();
  const [page, setPage] = useState(0);

  useEffect(() => { setPage(0); }, [format, pages.length]);

  const maxW = Math.min(screenW - 40, 420);
  const current = pages[Math.min(page, pages.length - 1)];
  const dims = formatDimensions(format, entryCount);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <SafeAreaView style={[styles.previewSafe, { backgroundColor: colors.background }]}>
        <View style={[styles.previewHead, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
          >
            <AppIcon name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={[styles.previewTitle, { color: colors.textPrimary }]}>{t('friendReport.share.previewTitle')}</Text>
          <View style={{ width: 22 }} />
        </View>

        {/* Selector de formato: cambiarlo regenera la pieza */}
        <View style={styles.segment}>
          {FORMATS.map(({ id }) => {
            const active = id === format;
            return (
              <TouchableOpacity
                key={id}
                onPress={() => onChangeFormat(id)}
                activeOpacity={0.85}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                style={[styles.segmentItem, {
                  backgroundColor: active ? colors.surface : 'transparent',
                  borderColor: active ? colors.primary : 'transparent',
                }]}
              >
                <Text style={[styles.segmentText, {
                  color: active ? accentInk(colors, 'primary', colors.surface) : colors.textSecondary,
                  fontFamily: active ? Fonts.bold : Fonts.regular,
                }]}>
                  {t(`friendReport.share.format.${id}.name`)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView contentContainerStyle={styles.previewBody} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={[styles.skeleton, {
              width: maxW,
              height: maxW * (dims.h / dims.w),
              backgroundColor: colors.surface,
              borderColor: colors.border,
            }]}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.skeletonText, { color: colors.textSecondary }]}>
                {t('friendReport.share.generating')}
              </Text>
            </View>
          ) : error ? (
            <View style={[styles.errorBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <AppIcon name="alert-circle" size={26} color={colors.expense} />
              <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>{t('friendReport.share.errorTitle')}</Text>
              <Text style={[styles.errorText, { color: colors.textSecondary }]}>{t('friendReport.share.errorText')}</Text>
              <TouchableOpacity
                onPress={onRetry}
                activeOpacity={0.85}
                accessibilityRole="button"
                style={[styles.retry, { backgroundColor: colors.surface, borderColor: colors.primary }]}
              >
                <Text style={[styles.retryText, { color: accentInk(colors, 'primary', colors.surface) }]}>
                  {t('friendReport.share.retry')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : current ? (
            <>
              <Image
                source={{ uri: current.url }}
                style={{
                  width: maxW,
                  height: (maxW * current.height) / current.width,
                  borderRadius: 16,
                }}
                resizeMode="contain"
                accessibilityLabel={t('friendReport.share.imageAlt', { name: friendName, period: periodLabel })}
              />
              <Text style={[styles.dims, { color: colors.textTertiary }]}>
                {t('friendReport.share.realSize', { w: current.width, h: current.height })}
              </Text>

              {pages.length > 1 && (
                <View style={styles.dots}>
                  {pages.map((_, i) => (
                    <TouchableOpacity
                      key={i}
                      onPress={() => setPage(i)}
                      hitSlop={{ top: 18, bottom: 18, left: 10, right: 10 }}
                      accessibilityRole="button"
                      accessibilityLabel={t('friendReport.share.page', { n: i + 1, total: pages.length })}
                      style={[styles.dot, {
                        backgroundColor: i === page ? colors.primary : colors.border,
                        width: i === page ? 20 : 7,
                      }]}
                    />
                  ))}
                </View>
              )}

              {/* Cómo llega: la prueba de que se lee en miniatura */}
              {format === 'chat' && (
                <View style={[styles.chatSim, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.chatSimLabel, { color: colors.textTertiary }]}>
                    {t('friendReport.share.chatSim')}
                  </Text>
                  <View style={styles.chatSimRow}>
                    <Image source={{ uri: current.url }} style={styles.chatSimThumb} resizeMode="cover" />
                    <View style={styles.flex}>
                      <Text style={[styles.chatSimName, { color: colors.textPrimary }]} numberOfLines={1}>{friendName}</Text>
                      <Text style={[styles.chatSimMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                        {verdictLabel} · {amountLabel}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {format === 'story' && (
                <View style={[styles.notice, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <AppIcon name="information-circle" size={16} color={colors.textTertiary} />
                  <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
                    {t('friendReport.share.storyNotice')}
                  </Text>
                </View>
              )}
            </>
          ) : null}
        </ScrollView>

        <View style={[styles.previewFoot, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.cta, styles.flex, { backgroundColor: colors.primary }, (loading || error) && styles.disabled]}
            onPress={onShare}
            disabled={loading || error}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <AppIcon name="share-outline" size={18} color={colors.onPrimary} />
            <Text style={[styles.ctaText, { color: colors.onPrimary }]}>
              {t('friendReport.share.shareCta', { name: t(`friendReport.share.format.${format}.name`) })}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, { borderColor: colors.primary }, (loading || error) && styles.disabled]}
            onPress={onDownload}
            disabled={loading || error}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={t('friendReport.share.download')}
          >
            <AppIcon name="cloud-download-outline" size={20} color={accentInk(colors, 'primary', colors.background)} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  disabled: { opacity: 0.45 },

  sheetLayer: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', zIndex: 20 },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(6,18,20,0.45)' },
  sheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, borderTopWidth: 1, paddingHorizontal: 20, paddingTop: 9 },
  grab: { width: 38, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  sheetTitle: { fontSize: 19, fontFamily: Fonts.extraBold, textAlign: 'center', letterSpacing: -0.3 },
  sheetSub: { fontSize: 11.5, fontFamily: Fonts.regular, textAlign: 'center', marginTop: 4 },

  formatRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  formatCard: { flex: 1, borderWidth: 1.5, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center', gap: 7 },
  shape: { borderWidth: 1.5, borderRadius: 5, alignItems: 'center', paddingTop: 5 },
  shapeBar: { width: '55%', height: 3, borderRadius: 2, opacity: 0.85 },
  formatName: { fontSize: 12.5, fontFamily: Fonts.bold },
  ratioPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  ratioText: { fontSize: 10, fontFamily: Fonts.bold, fontVariant: ['tabular-nums'] },
  formatWhere: { fontSize: 9, fontFamily: Fonts.bold, letterSpacing: 0.8 },

  cta: { height: 52, borderRadius: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 18 },
  ctaText: { fontSize: 14.5, fontFamily: Fonts.bold },

  previewSafe: { flex: 1 },
  previewHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1 },
  previewTitle: { fontSize: 15, fontFamily: Fonts.bold },
  segment: { flexDirection: 'row', gap: 6, paddingHorizontal: 18, paddingTop: 14 },
  segmentItem: { flex: 1, height: 38, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  segmentText: { fontSize: 12.5 },
  previewBody: { alignItems: 'center', paddingVertical: 20, paddingHorizontal: 20, gap: 12 },
  dims: { fontSize: 10.5, fontFamily: Fonts.regular, fontVariant: ['tabular-nums'] },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { height: 7, borderRadius: 4 },

  skeleton: { borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  skeletonText: { fontSize: 12, fontFamily: Fonts.regular },

  errorBox: { borderRadius: 18, borderWidth: 1, padding: 24, alignItems: 'center', gap: 8, maxWidth: 340 },
  errorTitle: { fontSize: 14.5, fontFamily: Fonts.bold, marginTop: 4 },
  errorText: { fontSize: 12.5, fontFamily: Fonts.regular, textAlign: 'center', lineHeight: 18 },
  retry: { marginTop: 10, height: 42, minWidth: 150, borderRadius: 50, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  retryText: { fontSize: 13.5, fontFamily: Fonts.bold },

  chatSim: { width: '100%', maxWidth: 420, borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
  chatSimLabel: { fontSize: 9, fontFamily: Fonts.bold, letterSpacing: 1.2 },
  chatSimRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chatSimThumb: { width: 76, height: 76, borderRadius: 10 },
  chatSimName: { fontSize: 13, fontFamily: Fonts.bold },
  chatSimMeta: { fontSize: 11.5, fontFamily: Fonts.regular, marginTop: 2 },

  notice: { flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 14, borderWidth: 1, padding: 12, maxWidth: 420 },
  noticeText: { flex: 1, fontSize: 11.5, fontFamily: Fonts.regular, lineHeight: 16 },

  previewFoot: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 8, borderTopWidth: 1 },
  iconBtn: { width: 52, height: 52, borderRadius: 26, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
});
