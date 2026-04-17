// app/friend-report.tsx
import { useState, useEffect, useRef, useMemo } from 'react';
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
import PageTitle from '../components/PageTitle';
import ScreenBackground from '../components/ScreenBackground';
import { useFriends } from '../hooks/useFriends';
import { useTransactions } from '../hooks/useTransactions';
import { getUserProfile } from '../hooks/useUserProfile';
import { UserProfile } from '../types/friend';
import { generateFriendReportImage, FriendReportImageData, FriendReportImageLabels, FriendReportImageResult } from '../utils/generateFriendReportImage';

// Resolve logo URI — Expo returns a string on web, a number on native
const _logoMod = require('../assets/logo.png');
const LOGO_URI: string | undefined =
  typeof _logoMod === 'string' ? _logoMod :
  (_logoMod as any)?.uri ?? (_logoMod as any)?.default ?? undefined;

interface FriendOption {
  uid: string;
  displayName: string;
  userName: string;
}

export default function FriendReportScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const transitionRef = useRef<ScreenTransitionRef>(null);
  const { width: screenWidth } = useWindowDimensions();

  const now = new Date();
  const MONTHS = t('history.months', { returnObjects: true }) as string[];

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedFriendUid, setSelectedFriendUid] = useState<string | null>(null);
  const [friendOptions, setFriendOptions] = useState<FriendOption[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [previewPages, setPreviewPages] = useState<(FriendReportImageResult & { url: string })[]>([]);
  const [previewVisible, setPreviewVisible] = useState(false);

  const { acceptedFriends, loading: friendshipsLoading } = useFriends(user?.uid ?? '');
  const { transactions, loading: txLoading } = useTransactions(user?.uid ?? '', year, month);

  // Stable string of UIDs to avoid re-running on every Firestore snapshot
  const friendUids = useMemo(
    () => acceptedFriends.map((f) => (f.fromId === user?.uid ? f.toId : f.fromId)).join(','),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [acceptedFriends.map((f) => f.id).join(','), user?.uid]
  );

  // Load friend profiles only when UIDs actually change
  useEffect(() => {
    if (friendshipsLoading) return;
    const uids = friendUids ? friendUids.split(',').filter(Boolean) : [];
    if (uids.length === 0) {
      setFriendOptions([]);
      setFriendsLoading(false);
      return;
    }
    let cancelled = false;
    setFriendsLoading(true);
    Promise.all(uids.map((uid) => getUserProfile(uid))).then((profiles) => {
      if (!cancelled) {
        setFriendOptions(
          profiles
            .filter((p): p is UserProfile => p !== null)
            .map((p) => ({ uid: p.uid, displayName: p.displayName, userName: p.userName }))
        );
        setFriendsLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [friendUids, friendshipsLoading]);

  const resetSelection = () => {
    setSelectedFriendUid(null);
    setPreviewVisible(false);
    previewPages.forEach((p) => URL.revokeObjectURL(p.url));
    setPreviewPages([]);
  };

  // Month navigation
  const goToPrevMonth = () => {
    resetSelection();
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const MAX_YEAR = now.getFullYear() + 2;
  const goToNextMonth = () => {
    resetSelection();
    if (month === 11) {
      if (year >= MAX_YEAR) return;
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  // Filter transactions for selected friend
  const sentToFriend = selectedFriendUid
    ? transactions.filter(
        (tx) => tx.sentIncomeTransactionId && tx.sentIncomeToUid === selectedFriendUid
      )
    : [];

  const receivedFromFriend = selectedFriendUid
    ? transactions.filter(
        (tx) => tx.isSentIncome && tx.sentByUid === selectedFriendUid
      )
    : [];

  const hasTransactions = sentToFriend.length > 0 || receivedFromFriend.length > 0;

  const selectedFriend = friendOptions.find((f) => f.uid === selectedFriendUid);

  const handleGeneratePreview = async () => {
    if (!selectedFriend || !user) return;
    setGenerating(true);
    try {
      const reportData: FriendReportImageData = {
        myName: user.displayName ?? user.email ?? 'Usuario',
        friendName: selectedFriend.displayName,
        month, year, sentToFriend, receivedFromFriend,
        logoUri: LOGO_URI,
      };
      const monthName = MONTHS[month];
      const labels: FriendReportImageLabels = {
        title: t('friendReport.pdfTitle', { name: selectedFriend.displayName }),
        generatedOn: t('friendReport.pdfGeneratedOn', {
          date: new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }),
        }),
        period: t('friendReport.pdfPeriod', { month: monthName, year }),
        sentSection: t('friendReport.sentSection'),
        receivedSection: t('friendReport.receivedSection'),
        totalSent: t('friendReport.totalSent'),
        totalReceived: t('friendReport.totalReceived'),
        netBalance: t('friendReport.netBalance'),
        dateCol: t('friendReport.pdfDateCol'),
        descCol: t('friendReport.pdfDescCol'),
        amountCol: t('friendReport.pdfAmountCol'),
        footer: t('friendReport.pdfFooter'),
        noTransactions: t('friendReport.noTransactions'),
        iOwe: t('friendReport.iOwe'),
        theyOwe: t('friendReport.theyOwe'),
        balanceTitle: net === 0
          ? t('friendReport.settled', { name: selectedFriend.displayName })
          : net > 0
            ? t('friendReport.theyOweYou', { name: selectedFriend.displayName, myName: user.displayName ?? user.email ?? 'Yo' })
            : t('friendReport.youOwe', { name: selectedFriend.displayName, myName: user.displayName ?? user.email ?? 'Yo' }),
      };
      const results = await generateFriendReportImage(reportData, labels);
      previewPages.forEach((p) => URL.revokeObjectURL(p.url));
      const pages = results.map((r) => ({ ...r, url: URL.createObjectURL(r.blob) }));
      setPreviewPages(pages);
      setPreviewVisible(true);
    } catch (e) {
      console.error('[FriendReport] image error:', e);
    } finally {
      setGenerating(false);
    }
  };

  const handleClosePreview = () => {
    setPreviewVisible(false);
  };

  const handleDownload = () => {
    if (!previewPages.length || !selectedFriend) return;
    previewPages.forEach((page, idx) => {
      const suffix = previewPages.length > 1 ? `-p${idx + 1}` : '';
      const filename = `reporte-${selectedFriend.displayName}-${month + 1}-${year}${suffix}.png`;
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
    if (!previewPages.length || !selectedFriend) return;
    try {
      const files = await Promise.all(
        previewPages.map(async (page, idx) => {
          const res = await fetch(page.url);
          const blob = await res.blob();
          const suffix = previewPages.length > 1 ? `-p${idx + 1}` : '';
          return new File([blob], `reporte-${selectedFriend.displayName}${suffix}.png`, { type: 'image/png' });
        })
      );
      if (navigator.share && navigator.canShare({ files })) {
        await navigator.share({ files, title: t('friendReport.pdfTitle', { name: selectedFriend.displayName }) });
        return;
      }
    } catch { /* fallback */ }
    handleDownload();
  };

  const handleBack = () => {
    transitionRef.current?.animateOut(() => router.back());
  };

  const isLoading = friendshipsLoading || friendsLoading;
  const canGenerate = !!selectedFriendUid && hasTransactions && !generating && !txLoading;

  const totalSent = sentToFriend.reduce((s, t) => s + t.amount, 0);
  const totalReceived = receivedFromFriend.reduce((s, t) => s + t.amount, 0);
  const net = totalReceived - totalSent;

  const formatCOP = (n: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(Math.abs(n));

  return (
    <ScreenTransition ref={transitionRef}>
      <ScreenBackground>
        <SafeAreaView style={styles.safe}>
          <AppHeader onBack={handleBack} />

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <PageTitle
              title={t('friendReport.title')}
              description={t('friendReport.pageDesc')}
            />

            {/* Month/Year selector */}
            <View style={[styles.monthNav, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TouchableOpacity onPress={goToPrevMonth} style={styles.monthNavBtn} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={20} color={colors.primary} />
              </TouchableOpacity>
              <Text style={[styles.monthNavLabel, { color: colors.primary }]}>
                {MONTHS[month].toUpperCase()} {year}
              </Text>
              <TouchableOpacity onPress={goToNextMonth} style={styles.monthNavBtn} activeOpacity={0.7}>
                <Ionicons name="chevron-forward" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Friends section */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                {t('friendReport.selectFriend')}
              </Text>

              {isLoading ? (
                <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
              ) : friendOptions.length === 0 ? (
                <View style={[styles.emptyBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Ionicons name="people-outline" size={36} color={colors.textTertiary} />
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                    {t('friendReport.noFriends')}
                  </Text>
                  <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                    {t('friendReport.noFriendsDesc')}
                  </Text>
                </View>
              ) : (
                <View style={[styles.friendList, { borderColor: colors.border }]}>
                  {friendOptions.map((friend, index) => {
                    const active = selectedFriendUid === friend.uid;
                    const initial = friend.displayName.charAt(0).toUpperCase();
                    const isLast = index === friendOptions.length - 1;
                    return (
                      <TouchableOpacity
                        key={friend.uid}
                        style={[
                          styles.friendRow,
                          { backgroundColor: active ? `${colors.primary}10` : colors.surface },
                          !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border },
                        ]}
                        onPress={() => setSelectedFriendUid(active ? null : friend.uid)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.friendAvatar, { backgroundColor: active ? colors.primary : `${colors.primary}20` }]}>
                          <Text style={[styles.friendAvatarText, { color: active ? '#fff' : colors.primary }]}>
                            {initial}
                          </Text>
                        </View>
                        <Text style={[styles.friendName, { color: colors.textPrimary, fontFamily: active ? Fonts.semiBold : Fonts.regular }]} numberOfLines={1}>
                          {friend.displayName}
                        </Text>
                        {active
                          ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                          : <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                        }
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Transactions summary */}
            {selectedFriendUid && (
              <View style={styles.section}>
                {txLoading ? (
                  <ActivityIndicator color={colors.primary} />
                ) : !hasTransactions ? (
                  <View style={[styles.emptyBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Ionicons name="document-outline" size={32} color={colors.textTertiary} />
                    <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                      {t('friendReport.noTransactions')}
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    {/* Sent rows */}
                    {sentToFriend.length > 0 && (
                      <>
                        <Text style={[styles.txSectionLabel, { color: colors.error ?? '#E53935' }]}>
                          {t('friendReport.sentSection')}
                        </Text>
                        {sentToFriend.map((tx) => (
                          <View key={tx.id} style={styles.txRow}>
                            <Text style={[styles.txDate, { color: colors.textTertiary }]}>
                              {tx.date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                            </Text>
                            <Text style={[styles.txDesc, { color: colors.textPrimary }]} numberOfLines={1}>
                              {tx.description}
                            </Text>
                            <Text style={[styles.txAmount, { color: colors.error ?? '#E53935' }]}>
                              −{formatCOP(tx.amount)}
                            </Text>
                          </View>
                        ))}
                      </>
                    )}

                    {/* Received rows */}
                    {receivedFromFriend.length > 0 && (
                      <>
                        <Text style={[styles.txSectionLabel, { color: colors.secondary ?? '#00897B' }]}>
                          {t('friendReport.receivedSection')}
                        </Text>
                        {receivedFromFriend.map((tx) => (
                          <View key={tx.id} style={styles.txRow}>
                            <Text style={[styles.txDate, { color: colors.textTertiary }]}>
                              {tx.date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                            </Text>
                            <Text style={[styles.txDesc, { color: colors.textPrimary }]} numberOfLines={1}>
                              {tx.description}
                            </Text>
                            <Text style={[styles.txAmount, { color: colors.secondary ?? '#00897B' }]}>
                              +{formatCOP(tx.amount)}
                            </Text>
                          </View>
                        ))}
                      </>
                    )}

                    {/* Totals divider */}
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <View style={styles.totalRow}>
                      <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>
                        {t('friendReport.totalSent')}
                      </Text>
                      <Text style={[styles.totalValue, { color: colors.error ?? '#E53935' }]}>
                        −{formatCOP(totalSent)}
                      </Text>
                    </View>
                    <View style={styles.totalRow}>
                      <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>
                        {t('friendReport.totalReceived')}
                      </Text>
                      <Text style={[styles.totalValue, { color: colors.secondary ?? '#00897B' }]}>
                        +{formatCOP(totalReceived)}
                      </Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    {/* Balance callout */}
                    {net === 0 ? (
                      <View style={[styles.balanceCallout, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}25` }]}>
                        <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                        <Text style={[styles.balanceCalloutText, { color: colors.primary }]}>
                          {t('friendReport.settled', { name: selectedFriend?.displayName })}
                        </Text>
                      </View>
                    ) : net > 0 ? (
                      <View style={[styles.balanceCallout, { backgroundColor: `${colors.secondary}12`, borderColor: `${colors.secondary}25` }]}>
                        <Ionicons name="arrow-down-circle" size={18} color={colors.secondary} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.balanceCalloutLabel, { color: colors.secondary }]}>
                            {t('friendReport.theyOweYou', { name: selectedFriend?.displayName, myName: user?.displayName ?? user?.email ?? 'Yo' })}
                          </Text>
                          <Text style={[styles.balanceCalloutAmount, { color: colors.secondary }]}>
                            {formatCOP(net)}
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <View style={[styles.balanceCallout, { backgroundColor: `${colors.error}10`, borderColor: `${colors.error}22` }]}>
                        <Ionicons name="arrow-up-circle" size={18} color={colors.error} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.balanceCalloutLabel, { color: colors.error }]}>
                            {t('friendReport.youOwe', { name: selectedFriend?.displayName, myName: user?.displayName ?? user?.email ?? 'Yo' })}
                          </Text>
                          <Text style={[styles.balanceCalloutAmount, { color: colors.error }]}>
                            {formatCOP(-net)}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

          </ScrollView>

          {/* Preview button — fixed footer */}
          <View style={[styles.generateFooter, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.generateBtn,
                { backgroundColor: colors.primary },
                !canGenerate && styles.btnDisabled,
              ]}
              onPress={handleGeneratePreview}
              disabled={!canGenerate}
              activeOpacity={0.8}
            >
              {generating ? (
                <>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.generateBtnText}>{t('friendReport.generatingPreview')}</Text>
                </>
              ) : (
                <>
                  <Ionicons name="eye-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.generateBtnText}>{t('friendReport.previewBtn')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
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
            {/* Header */}
            <View style={[styles.previewHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={handleClosePreview} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="chevron-down" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
              <View style={{ alignItems: 'center' }}>
                <Text style={[styles.previewTitle, { color: colors.textPrimary }]}>
                  {t('friendReport.previewTitle')}
                </Text>
                {previewPages.length > 1 && (
                  <Text style={[styles.previewPageCount, { color: colors.textTertiary }]}>
                    {previewPages.length} {t('friendReport.pages')}
                  </Text>
                )}
              </View>
              <View style={{ width: 24 }} />
            </View>

            {/* All pages stacked in scroll */}
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

            {/* Actions */}
            <View style={[styles.previewActions, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.previewActionBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
                onPress={handleDownload}
                activeOpacity={0.8}
              >
                <Ionicons name="download-outline" size={18} color={colors.primary} />
                <Text style={[styles.previewActionText, { color: colors.primary }]}>
                  {t('friendReport.downloadBtn')}
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
                  {t('friendReport.shareBtn')}
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
    paddingTop: 16,
    paddingBottom: 24,
    gap: 20,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  monthNavBtn: {
    padding: 8,
  },
  monthNavLabel: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    letterSpacing: 0.5,
  },
  section: {
    paddingHorizontal: 20,
    gap: 10,
  },
  sectionLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
  },
  friendList: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  friendAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendAvatarText: {
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  friendName: {
    flex: 1,
    fontSize: 14,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    textAlign: 'center',
  },
  emptyDesc: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    textAlign: 'center',
  },
  summaryCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 6,
  },
  txSectionLabel: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    letterSpacing: 0.5,
    marginTop: 4,
    marginBottom: 2,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  txDate: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    width: 52,
  },
  txDesc: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    flex: 1,
  },
  txAmount: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontFamily: Fonts.regular,
    fontSize: 13,
  },
  totalValue: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
  },
  netValue: {
    fontFamily: Fonts.bold,
    fontSize: 14,
  },
  balanceCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  balanceCalloutText: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    flex: 1,
  },
  balanceCalloutLabel: {
    fontFamily: Fonts.regular,
    fontSize: 12,
  },
  balanceCalloutAmount: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    marginTop: 2,
  },
  generateFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 15,
    borderRadius: 14,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  generateBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: '#FFFFFF',
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
  previewScroll: {
    flex: 1,
  },
  previewScrollContent: {
    alignItems: 'center',
    paddingBottom: 8,
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
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
  },
  previewActionText: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
  },
});
