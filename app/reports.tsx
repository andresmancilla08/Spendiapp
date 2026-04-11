// app/reports.tsx
import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
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
import ReportViewer from '../components/ReportViewer';
import { getAvailableYears, generateReportData, ReportData } from '../hooks/useReportGenerator';
import { generateAnnualPDF, PdfLabels } from '../utils/generateAnnualPDF';
import { useCategories } from '../hooks/useCategories';
import { useToast } from '../context/ToastContext';

export default function ReportsScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { showToast } = useToast();
  const transitionRef = useRef<ScreenTransitionRef>(null);

  const [years, setYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear() - 1);
  const [loading, setLoading] = useState(false);
  const [yearsLoading, setYearsLoading] = useState(true);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [viewerVisible, setViewerVisible] = useState(false);

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
      const pdfLabels: PdfLabels = {
        extractTitle: t('reports.pdfExtract', { year: selectedYear }),
        generatedOn: t('reports.pdfGeneratedOn', { date: new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }) }),
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
        amountCol: 'Monto',
        footer: t('reports.pdfFooter'),
      };
      const blob = generateAnnualPDF(data, pdfLabels);
      setReportData(data);
      setPdfBlob(blob);
      setViewerVisible(true);
    } catch (e) {
      console.error('[Reports] Error generando PDF:', e);
      showToast(t('reports.shareError'), 'error');
    } finally {
      setLoading(false);
    }
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
            {/* Título y subtítulo de la pantalla */}
            <View style={styles.titleBlock}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {t('reports.title')}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {t('reports.subtitle')}
              </Text>
            </View>

            {/* Ícono decorativo */}
            <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
              <Ionicons name="document-text-outline" size={48} color={colors.primary} />
            </View>

            {/* Selector de año */}
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

            {/* Botón generar */}
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

          {/* PDF Viewer modal */}
          {viewerVisible && pdfBlob && reportData && (
            <ReportViewer
              blob={pdfBlob}
              data={reportData}
              onClose={() => setViewerVisible(false)}
            />
          )}
        </SafeAreaView>
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
});
