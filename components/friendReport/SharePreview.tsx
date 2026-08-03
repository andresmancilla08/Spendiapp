/**
 * Previsualización del documento.
 *
 * El mismo mes se cuenta distinto según dónde acabe: una tarjeta cuadrada
 * sobrevive a la miniatura de un chat, una story vertical llena la pantalla de
 * quien la mira, y la hoja larga es la que se revisa. El destino se elige aquí
 * mismo, sobre la pieza real —no en una hoja previa que pedía lo mismo dos veces.
 *
 * Instagram no admite publicar en historias desde la web: el formato story se
 * comparte por la hoja del sistema o se guarda, y el usuario lo sube. Se dice en
 * la interfaz para no prometer un botón que no existe.
 */
import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, Image, ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  const [page, setPage] = useState(0);

  useEffect(() => { setPage(0); }, [format, pages.length]);

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
              aspectRatio: dims.w / dims.h,
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
                // El tamaño lo pone el layout, no `useWindowDimensions`: medir la
                // ventana desde dentro del modal daba un ancho falso y la pieza
                // salía diminuta.
                style={[styles.piece, { aspectRatio: current.width / current.height }]}
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

  piece: { width: '100%', maxWidth: 420, borderRadius: 16 },
  skeleton: { width: '100%', maxWidth: 420, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
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
