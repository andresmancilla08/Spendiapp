// app/reports.tsx
import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
  Image,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../config/fonts';
import ScreenTransition, { ScreenTransitionRef } from '../components/ScreenTransition';
import AppHeader from '../components/AppHeader';
import ScreenBackground from '../components/ScreenBackground';
import ReportYearPicker from '../components/ReportYearPicker';
import { getAvailableYears, generateReportData } from '../hooks/useReportGenerator';
import { generateAnnualReportImage, AnnualReportImageLabels, AnnualReportImageResult } from '../utils/generateAnnualReportImage';
import { useCategories } from '../hooks/useCategories';
import { useToast } from '../context/ToastContext';

const _logoMod = require('../assets/logo.png');
const LOGO_URI: string | undefined =
  typeof _logoMod === 'string' ? _logoMod :
  (_logoMod as any)?.uri ?? (_logoMod as any)?.default ?? undefined;

export default function ReportsScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { showToast } = useToast();
  const transitionRef = useRef<ScreenTransitionRef>(null);
  const { width: screenWidth } = useWindowDimensions();

  const [years, setYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear() - 1);
  const [loading, setLoading] = useState(false);
  const [yearsLoading, setYearsLoading] = useState(true);
  const [previewPages, setPreviewPages] = useState<(AnnualReportImageResult & { url: string })[]>([]);
  const [previewVisible, setPreviewVisible] = useState(false);

  const { categories: customCategories } = useCategories(user?.uid ?? '');

  useEffect(() => {
    if (!user?.uid) return;
    setYearsLoading(true);
    getAvailableYears(user.uid)
      .then((ys) => {
        setYears(ys);
        if (ys.length > 0) {
          const prevYear = new Date().getFullYear() - 1;
          setSelectedYear(ys.includes(prevYear) ? prevYear : ys[0]);
        }
      })
      .finally(() => setYearsLoading(false));
  }, [user?.uid]);

  const handleGenerate = async () => {
    if (!user?.uid || loading) return;
    setLoading(true);
    try {
      const data = await generateReportData(
        user.uid,
        user.displayName ?? user.email ?? 'Usuario',
        selectedYear,
        customCategories,
      );
      const labels: AnnualReportImageLabels = {
        extractTitle: t('reports.pdfExtract', { year: selectedYear }),
        generatedOn: t('reports.pdfGeneratedOn', {
          date: new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }),
        }),
        income: t('reports.pdfIncome'),
        expenses: t('reports.pdfExpenses'),
        balance: t('reports.pdfBalance'),
        byCategory: t('reports.pdfByCategory'),
        categoryCol: t('reports.pdfCategory'),
        transactionsCol: t('reports.pdfTransactions'),
        totalCol: t('reports.pdfTotal'),
        movementsTitle: t('reports.pdfMovements', { year: selectedYear }),
        dateCol: t('reports.pdfDate'),
        descriptionCol: t('reports.pdfDescription'),
        categoryLabel: t('reports.pdfCategory'),
        amountCol: 'Monto',
        footer: t('reports.pdfFooter'),
      };
      const results = await generateAnnualReportImage(data, labels, LOGO_URI);
      previewPages.forEach((p) => URL.revokeObjectURL(p.url));
      const pages = results.map((r) => ({ ...r, url: URL.createObjectURL(r.blob) }));
      setPreviewPages(pages);
      setPreviewVisible(true);
    } catch (e) {
      console.error('[Reports] Error generando imágenes:', e);
      showToast(t('reports.shareError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClosePreview = () => setPreviewVisible(false);

  const handleDownload = () => {
    if (!previewPages.length) return;
    previewPages.forEach((page, idx) => {
      const suffix = previewPages.length > 1 ? `-p${idx + 1}` : '';
      const filename = `Extracto-${selectedYear}${suffix}.png`;
      try {
        const a = document.createElement('a');
        a.href = page.url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => document.body.removeChild(a), 100);
      } catch {
        window.open(page.url, '_blank');
      }
    });
  };

  const handleShare = async () => {
    if (!previewPages.length) return;
    try {
      const files = await Promise.all(
        previewPages.map(async (page, idx) => {
          const res = await fetch(page.url);
          const blob = await res.blob();
          const suffix = previewPages.length > 1 ? `-p${idx + 1}` : '';
          return new File([blob], `Extracto-${selectedYear}${suffix}.png`, { type: 'image/png' });
        })
      );
      if (navigator.share && navigator.canShare({ files })) {
        await navigator.share({ files, title: t('reports.viewerTitle', { year: selectedYear }) });
        return;
      }
    } catch { /* fallback */ }
    handleDownload();
  };

  const handleBack = () => {
    transitionRef.current?.animateOut(() => router.back());
  };

  return (
    <ScreenTransition ref={transitionRef}>
      <ScreenBackground>
        <SafeAreaView style={styles.safe}>
          <AppHeader onBack={handleBack} />

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.titleBlock}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {t('reports.title')}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textPrimary }]}>
                {t('reports.subtitle')}
              </Text>
            </View>

            <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
              <Ionicons name="image-outline" size={48} color={colors.primary} />
            </View>

            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              {t('reports.selectYear')}
            </Text>

            {yearsLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
            ) : (
              <ReportYearPicker
                years={years}
                selected={selectedYear}
                onSelect={setSelectedYear}
              />
            )}

            <TouchableOpacity
              style={[
                styles.generateBtn,
                { backgroundColor: colors.primary },
                (loading || yearsLoading || years.length === 0) && styles.btnDisabled,
              ]}
              onPress={handleGenerate}
              disabled={loading || yearsLoading || years.length === 0}
              activeOpacity={0.8}
            >
              {loading ? (
                <>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.generateBtnText}>{t('reports.generating')}</Text>
                </>
              ) : (
                <>
                  <Ionicons name="create-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.generateBtnText}>{t('reports.generate')}</Text>
                </>
              )}
            </TouchableOpacity>

            {years.length === 0 && !yearsLoading && (
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                {t('reports.noTransactions')}
              </Text>
            )}
          </ScrollView>
        </SafeAreaView>

        {/* Image preview modal */}
        <Modal
          visible={previewVisible}
          transparent={false}
          animationType="slide"
          onRequestClose={handleClosePreview}
          statusBarTranslucent
        >
          <SafeAreaView style={[styles.previewSafe, { backgroundColor: colors.background ?? colors.surface }]}>
            <View style={[styles.previewHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={handleClosePreview} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="chevron-down" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
              <View style={{ alignItems: 'center' }}>
                <Text style={[styles.previewTitle, { color: colors.textPrimary }]}>
                  {t('reports.viewerTitle', { year: selectedYear })}
                </Text>
                {previewPages.length > 1 && (
                  <Text style={[styles.previewPageCount, { color: colors.textTertiary }]}>
                    {previewPages.length} {t('reports.pages')}
                  </Text>
                )}
              </View>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView
              style={styles.previewScroll}
              contentContainerStyle={styles.previewScrollContent}
              showsVerticalScrollIndicator={false}
              bounces
            >
              {previewPages.map((page, idx) => (
                <View key={idx} style={styles.previewPageWrapper}>
                  {previewPages.length > 1 && (
                    <View style={[styles.previewPageBadge, { backgroundColor: colors.primary }]}>
                      <Text style={styles.previewPageBadgeText}>
                        {idx + 1} / {previewPages.length}
                      </Text>
                    </View>
                  )}
                  <Image
                    source={{ uri: page.url }}
                    style={{
                      width: screenWidth,
                      height: screenWidth * (page.height / page.width),
                    }}
                    resizeMode="contain"
                  />
                </View>
              ))}
            </ScrollView>

            <View style={[styles.previewActions, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.previewActionBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
                onPress={handleDownload}
                activeOpacity={0.8}
              >
                <Ionicons name="download-outline" size={18} color={colors.primary} />
                <Text style={[styles.previewActionText, { color: colors.primary }]}>
                  {t('reports.save')}
                  {previewPages.length > 1 ? ` (${previewPages.length})` : ''}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.previewActionBtn, { backgroundColor: colors.primary }]}
                onPress={handleShare}
                activeOpacity={0.8}
              >
                <Ionicons name="share-outline" size={18} color="#fff" />
                <Text style={[styles.previewActionText, { color: '#fff' }]}>
                  {t('reports.share')}
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>
      </ScreenBackground>
    </ScreenTransition>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 0,
    paddingTop: 16,
    paddingBottom: 40,
    alignItems: 'center',
    gap: 20,
  },
  titleBlock: {
    alignSelf: 'stretch',
    paddingHorizontal: 20,
    gap: 4,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 24,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 14,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  sectionLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    alignSelf: 'flex-start',
    paddingHorizontal: 20,
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginHorizontal: 20,
    alignSelf: 'stretch',
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 8,
  },
  btnDisabled: {
    opacity: 0.55,
  },
  generateBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  emptyText: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
    marginTop: 8,
  },
  previewSafe: {
    flex: 1,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  previewTitle: {
    fontFamily: Fonts.bold,
    fontSize: 16,
  },
  previewPageCount: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    marginTop: 2,
  },
  previewScroll: {
    flex: 1,
  },
  previewScrollContent: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  previewPageWrapper: {
    width: '100%',
    position: 'relative',
    marginBottom: 12,
  },
  previewPageBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  previewPageBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: '#FFFFFF',
  },
  previewActions: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
  },
  previewActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 15,
    borderRadius: 14,
  },
  previewActionText: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
  },
});
