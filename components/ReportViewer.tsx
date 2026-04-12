import React, { useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../config/fonts';
import { useTranslation } from 'react-i18next';
import { ReportData } from '../hooks/useReportGenerator';
import { useToast } from '../context/ToastContext';

interface ReportViewerProps {
  blob: Blob;
  data: ReportData;
  onClose: () => void;
}

export default function ReportViewer({ blob, data, onClose }: ReportViewerProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { showToast } = useToast();

  const blobUrl = useMemo(() => {
    if (Platform.OS !== 'web') return '';
    return URL.createObjectURL(blob);
  }, [blob]);

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  const fileName = `Extracto_${data.year}_${data.userName}.pdf`;

  const handleDownload = useCallback(() => {
    if (Platform.OS !== 'web') return;
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast(t('reports.savedSuccess'), 'success');
  }, [blobUrl, fileName, showToast, t]);

  const handleShare = useCallback(async () => {
    if (Platform.OS !== 'web') return;
    const file = new File(
      [blob],
      fileName,
      { type: 'application/pdf' },
    );
    if ((navigator as any).canShare?.({ files: [file] })) {
      try {
        await (navigator as any).share({
          files: [file],
          title: t('reports.viewerTitle', { year: data.year }),
        });
      } catch {
        // Usuario canceló — no mostrar error
      }
    } else {
      handleDownload();
    }
  }, [blob, data.year, handleDownload]);

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {t('reports.viewerTitle', { year: data.year })}
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={12} activeOpacity={0.7}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* PDF Viewer — solo web */}
        <View style={styles.pdfArea}>
          {Platform.OS === 'web' && blobUrl
            ? React.createElement('embed', {
                src: blobUrl,
                type: 'application/pdf',
                style: {
                  width: '100%',
                  height: '100%',
                } as React.CSSProperties,
              })
            : (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={colors.primary} size="large" />
              </View>
            )}
        </View>

        {/* Toolbar */}
        <View style={[styles.toolbar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.toolbarBtn, { backgroundColor: colors.primary + '15' }]}
            onPress={handleShare}
            activeOpacity={0.75}
          >
            <Ionicons name="share-outline" size={20} color={colors.primary} />
            <Text style={[styles.toolbarBtnText, { color: colors.primary }]}>
              {t('reports.share')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolbarBtn, { backgroundColor: colors.primary + '10' }]}
            onPress={handleDownload}
            activeOpacity={0.75}
          >
            <Ionicons name="download-outline" size={20} color={colors.primary} />
            <Text style={[styles.toolbarBtnText, { color: colors.primary }]}>
              {t('reports.save')}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 17,
  },
  pdfArea: {
    flex: 1,
    overflow: 'hidden',
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  toolbarBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  toolbarBtnText: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
  },
});
