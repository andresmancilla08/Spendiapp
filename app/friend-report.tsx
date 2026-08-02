// app/friend-report.tsx
// Reporte entre dos amigos, dirección "Cara a cara": la pareja es el sujeto —dos
// identidades con color propio, una balanza que se inclina y un veredicto que
// domina— y el detalle vive a los lados de un eje. Al compartir se elige primero
// el formato (chat, story u hoja) y se previsualiza la pieza real.
//
// Todo el cálculo vive en `utils/friendReportModel`, que es el mismo modelo que
// alimenta al generador de imagen: pantalla y documento no pueden discrepar.
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppIcon from '../components/AppIcon';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../context/ThemeContext';
import { accentInk } from '../utils/contrast';
import { formatMoneyAbs } from '../utils/formatMoney';
import { Fonts } from '../config/fonts';
import ScreenTransition, { ScreenTransitionRef } from '../components/ScreenTransition';
import AppHeader from '../components/AppHeader';
import PageTitle from '../components/PageTitle';
import ScreenBackground from '../components/ScreenBackground';
import { useFriendProfiles } from '../hooks/useFriendProfiles';
import { useTransactions } from '../hooks/useTransactions';
import { migrateIncomeClaims } from '../utils/migrateIncomeClaims';
import { localeFor, getMonthNames } from '../utils/dateLocale';
import { buildFriendReport, initialOf, scaleTilt } from '../utils/friendReportModel';
import {
  generateFriendReportImage, type ReportFormat, type FriendReportImageResult,
  type FriendReportImageLabels,
} from '../utils/generateFriendReportImage';
import {
  People, Verdict, FacingBar, EntryRow, Legend, SocialStat, sideColors,
} from '../components/friendReport/FaceToFace';
import { FormatSheet, PreviewModal } from '../components/friendReport/SharePreview';

const _logoMod = require('../assets/logo.png');
const LOGO_URI: string | undefined =
  typeof _logoMod === 'string' ? _logoMod : (_logoMod as any)?.uri ?? (_logoMod as any)?.default ?? undefined;

interface FriendOption {
  uid: string;
  displayName: string;
  userName: string;
}

export default function FriendReportScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const transitionRef = useRef<ScreenTransitionRef>(null);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedFriendUid, setSelectedFriendUid] = useState<string | null>(null);

  // Compartir
  const [sheetVisible, setSheetVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [format, setFormat] = useState<ReportFormat>('chat');
  const [pages, setPages] = useState<(FriendReportImageResult & { url: string })[]>([]);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState(false);
  /** Cada generación lleva número: si llega tarde y ya hay otra en curso, se descarta. */
  const runId = useRef(0);

  const { profiles: friendProfiles, loading: friendsLoading } = useFriendProfiles(user?.uid ?? '');
  const { transactions, loading: txLoading } = useTransactions(user?.uid ?? '', year, month);

  useEffect(() => {
    if (user?.uid) migrateIncomeClaims(user.uid);
  }, [user?.uid]);

  const releasePages = useCallback((list: { url: string }[]) => {
    list.forEach((p) => { try { URL.revokeObjectURL(p.url); } catch { /* noop */ } });
  }, []);

  // Sin esto se fugan los object URLs al salir de la pantalla con una vista previa abierta.
  useEffect(() => () => releasePages(pages), [pages, releasePages]);

  const friendOptions: FriendOption[] = useMemo(
    () => friendProfiles.map((p) => ({
      uid: p.uid,
      displayName: p.displayName || p.userName || '…',
      userName: p.userName,
    })),
    [friendProfiles],
  );

  /** Al cambiar de mes se descartan las imágenes, pero se conserva la persona:
   *  comparar dos meses seguidos obligaba a volver a elegirla cada vez. */
  const resetPreview = () => {
    runId.current++;
    setSheetVisible(false);
    setPreviewVisible(false);
    setGenerating(false);
    setGenError(false);
    setPages((prev) => { releasePages(prev); return []; });
  };

  const goToPrevMonth = () => {
    resetPreview();
    if (month === 0) { setMonth(11); setYear((y) => y - 1); } else setMonth((m) => m - 1);
  };
  const MAX_YEAR = now.getFullYear() + 2;
  const goToNextMonth = () => {
    resetPreview();
    if (month === 11) {
      if (year >= MAX_YEAR) return;
      setMonth(0); setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  };

  const selectedFriend = friendOptions.find((f) => f.uid === selectedFriendUid);

  // ── Modelo ───────────────────────────────────────────────────────────────
  const model = useMemo(() => {
    if (!selectedFriendUid || !selectedFriend || !user) return null;
    return buildFriendReport({
      myName: user.displayName ?? user.email ?? t('common.user'),
      myUid: user.uid,
      friendName: selectedFriend.displayName,
      friendUserName: selectedFriend.userName,
      friendUid: selectedFriendUid,
      month, year,
      sentToFriend: transactions.filter((tx) => tx.sentIncomeTransactionId && tx.sentIncomeToUid === selectedFriendUid),
      receivedFromFriend: transactions.filter((tx) => tx.isSentIncome && tx.sentByUid === selectedFriendUid),
      sharedIOwe: transactions.filter((tx) => tx.isShared && tx.sharedOwnerUid === selectedFriendUid
        && tx.sharedParticipants?.some((p) => p.uid === user.uid)),
      sharedTheyOwe: transactions.filter((tx) => tx.isShared && tx.sharedOwnerUid === user.uid
        && tx.sharedParticipants?.some((p) => p.uid === selectedFriendUid)),
    });
  }, [selectedFriendUid, selectedFriend, user, transactions, month, year, t]);

  const monthNames = useMemo(() => getMonthNames(), [t]);
  const monthLabel = monthNames[month];
  const hasMovements = !!model && model.movementCount > 0;

  const verdictText = useMemo(() => {
    if (!model || !selectedFriend) return '';
    if (model.net === 0) return t('friendReport.faceToFace.settled', { name: selectedFriend.displayName });
    return model.net > 0
      ? t('friendReport.faceToFace.theyOwe', { name: selectedFriend.displayName.split(' ')[0] })
      : t('friendReport.faceToFace.youOwe', { name: selectedFriend.displayName.split(' ')[0] });
  }, [model, selectedFriend, t]);

  const labels: FriendReportImageLabels | null = useMemo(() => {
    if (!model || !selectedFriend) return null;
    return {
      verdict: verdictText,
      verdictHint: model.net === 0 ? '' : t('friendReport.faceToFace.oneTransfer'),
      resultOf: t('friendReport.faceToFace.resultOf', { month: monthLabel }),
      period: `${monthLabel} ${year}`,
      you: t('friendReport.faceToFace.you'),
      favourMine: t('friendReport.faceToFace.favourMine'),
      favourTheirs: t('friendReport.faceToFace.favourTheirs', { name: selectedFriend.displayName.split(' ')[0] }),
      sharedSection: t('friendReport.faceToFace.sharedSection'),
      transfersSection: t('friendReport.faceToFace.transfersSection'),
      monthTotal: t('friendReport.faceToFace.monthTotal'),
      movementsTitle: t('friendReport.faceToFace.movementsTitle', { count: model.movementCount }),
      socialStat: t('friendReport.faceToFace.socialStat', { paid: model.paidByMe, count: model.movementCount }),
      tiltMine: t('friendReport.faceToFace.tiltMine'),
      tiltTheirs: t('friendReport.faceToFace.tiltTheirs', { name: selectedFriend.displayName.split(' ')[0] }),
      tiltEven: t('friendReport.faceToFace.tiltEven'),
      sent: t('friendReport.faceToFace.sent'),
      received: t('friendReport.faceToFace.received'),
      footer: `${model.myName} ↔ ${model.friendName} · ${monthLabel} ${year}`,
      movementsContinued: (n: number) => t('friendReport.faceToFace.movementsContinued', { count: n }),
      pageLabel: (n: number, total: number) => t('friendReport.share.page', { n, total }),
    };
  }, [model, selectedFriend, verdictText, monthLabel, year, t]);

  // ── Generación ───────────────────────────────────────────────────────────
  const generate = useCallback(async (fmt: ReportFormat) => {
    if (!model || !labels) return;
    const id = ++runId.current;
    setGenerating(true);
    setGenError(false);
    try {
      const results = await generateFriendReportImage(model, labels, { format: fmt, logoUri: LOGO_URI });
      if (id !== runId.current) return;   // llegó tarde: manda la generación posterior
      setPages((prev) => {
        releasePages(prev);
        return results.map((r) => ({ ...r, url: URL.createObjectURL(r.blob) }));
      });
    } catch (e) {
      if (id !== runId.current) return;
      console.error('[FriendReport] no se pudo generar la imagen:', e);
      setPages((prev) => { releasePages(prev); return []; });
      setGenError(true);
    } finally {
      if (id === runId.current) setGenerating(false);
    }
  }, [model, labels, releasePages]);

  const handlePreview = async () => {
    setSheetVisible(false);
    setPreviewVisible(true);
    await generate(format);
  };

  const handleChangeFormat = async (next: ReportFormat) => {
    if (next === format) return;
    setFormat(next);
    await generate(next);
  };

  const fileBase = () =>
    `spendia-${selectedFriend?.displayName.replace(/\s+/g, '-').toLowerCase() ?? 'reporte'}-${month + 1}-${year}-${format}`;

  const handleDownload = () => {
    pages.forEach((page, idx) => {
      const suffix = pages.length > 1 ? `-p${idx + 1}` : '';
      try {
        const a = document.createElement('a');
        a.href = page.url;
        a.download = `${fileBase()}${suffix}.png`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => document.body.removeChild(a), 100);
      } catch {
        window.open(page.url, '_blank');
      }
    });
  };

  const handleShare = async () => {
    if (!pages.length) return;
    try {
      const files = await Promise.all(pages.map(async (page, idx) => {
        const res = await fetch(page.url);
        const blob = await res.blob();
        const suffix = pages.length > 1 ? `-p${idx + 1}` : '';
        return new File([blob], `${fileBase()}${suffix}.png`, { type: 'image/png' });
      }));
      if (navigator.share && navigator.canShare?.({ files })) {
        await navigator.share({ files, title: verdictText });
        return;
      }
    } catch (e) {
      // Cancelar la hoja del sistema lanza AbortError: no es un fallo y no debe
      // acabar con N archivos en Descargas.
      if ((e as Error)?.name === 'AbortError') return;
    }
    handleDownload();
  };

  const handleBack = () => transitionRef.current?.animateOut(() => router.back());

  const c = sideColors(isDark);
  const tiltValue = model ? scaleTilt(model.totals) : 0;
  const tiltLabel = !model || !selectedFriend
    ? ''
    : tiltValue === 0
      ? t('friendReport.faceToFace.tiltEven')
      : tiltValue < 0
        ? t('friendReport.faceToFace.tiltMine')
        : t('friendReport.faceToFace.tiltTheirs', { name: selectedFriend.displayName.split(' ')[0] });

  return (
    <ScreenTransition ref={transitionRef}>
      <ScreenBackground>
        <SafeAreaView style={styles.safe}>
          <AppHeader onBack={handleBack} />

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <PageTitle title={t('friendReport.title')} description={t('friendReport.pageDesc')} />

            {/* Mes */}
            <View style={[styles.monthNav, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TouchableOpacity onPress={goToPrevMonth} style={styles.monthBtn} activeOpacity={0.7}
                accessibilityRole="button" accessibilityLabel={t('history.prevMonth')}>
                <AppIcon name="chevron-back" size={20} color={colors.primary} />
              </TouchableOpacity>
              <Text style={[styles.monthLabel, { color: accentInk(colors, 'primary', colors.surface) }]}>
                {monthLabel.toUpperCase()} {year}
              </Text>
              <TouchableOpacity onPress={goToNextMonth} style={styles.monthBtn} activeOpacity={0.7}
                accessibilityRole="button" accessibilityLabel={t('history.nextMonth')}>
                <AppIcon name="chevron-forward" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Amigos */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              {t('friendReport.selectFriend')}
            </Text>

            {friendsLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
            ) : friendOptions.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <AppIcon name="people-outline" size={34} color={colors.textTertiary} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t('friendReport.noFriends')}</Text>
                <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>{t('friendReport.noFriendsDesc')}</Text>
              </View>
            ) : (
              <View style={styles.friendRow}>
                {friendOptions.map((friend) => {
                  const active = selectedFriendUid === friend.uid;
                  return (
                    <TouchableOpacity
                      key={friend.uid}
                      onPress={() => setSelectedFriendUid(active ? null : friend.uid)}
                      activeOpacity={0.8}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                      style={[styles.friendChip, {
                        backgroundColor: active ? `${colors.primary}14` : colors.surface,
                        borderColor: active ? colors.primary : colors.border,
                      }]}
                    >
                      <View style={[styles.friendAvatar, { backgroundColor: active ? c.theirsFill : `${colors.primary}20` }]}>
                        <Text style={[styles.friendInitial, { color: active ? '#1E2200' : accentInk(colors, 'primary', colors.surface) }]}>
                          {initialOf(friend.displayName)}
                        </Text>
                      </View>
                      <Text style={[styles.friendName, {
                        color: colors.textPrimary,
                        fontFamily: active ? Fonts.bold : Fonts.regular,
                      }]} numberOfLines={1}>
                        {friend.displayName.split(' ')[0]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Cara a cara */}
            {selectedFriendUid && (
              txLoading ? (
                <ActivityIndicator color={colors.primary} style={{ marginTop: 28 }} />
              ) : !hasMovements || !model ? (
                <View style={[styles.emptyBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <AppIcon name="document-outline" size={30} color={colors.textTertiary} />
                  <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>{t('friendReport.noTransactions')}</Text>
                </View>
              ) : (
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <People model={model} isDark={isDark} tiltLabel={tiltLabel} youLabel={t('friendReport.faceToFace.you')} />
                  <Verdict
                    model={model}
                    isDark={isDark}
                    kicker={t('friendReport.faceToFace.resultOf', { month: monthLabel })}
                    verdict={verdictText}
                    hint={model.net === 0 ? undefined : t('friendReport.faceToFace.oneTransfer')}
                  />

                  <Legend
                    mineLabel={t('friendReport.faceToFace.favourMine')}
                    theirsLabel={t('friendReport.faceToFace.favourTheirs', { name: selectedFriend!.displayName.split(' ')[0] })}
                    isDark={isDark}
                  />
                  <FacingBar
                    title={t('friendReport.faceToFace.sharedSection')}
                    mine={model.totals.sharedTheyOwe}
                    theirs={model.totals.sharedIOwe}
                    isDark={isDark}
                  />
                  <FacingBar
                    title={t('friendReport.faceToFace.transfersSection')}
                    mine={model.totals.received}
                    theirs={model.totals.sent}
                    isDark={isDark}
                  />
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  <FacingBar
                    title={t('friendReport.faceToFace.monthTotal')}
                    mine={model.totals.mine}
                    theirs={model.totals.theirs}
                    isDark={isDark}
                  />

                  <SocialStat label={t('friendReport.faceToFace.socialStat', {
                    paid: model.paidByMe, count: model.movementCount,
                  })} />

                  <Text style={[styles.entriesTitle, { color: colors.textTertiary }]}>
                    {t('friendReport.faceToFace.movementsTitle', { count: model.movementCount }).toUpperCase()}
                  </Text>
                  <View style={styles.entries}>
                    {/* El eje se dibuja UNA vez para toda la lista: por fila, su
                        posición dependía del ancho de cada celda y se veía torcido. */}
                    <View style={[styles.entriesAxis, { backgroundColor: colors.border }]} pointerEvents="none" />
                    {model.entries.map((entry) => (
                      <EntryRow
                        key={entry.id}
                        entry={entry}
                        isDark={isDark}
                        sentLabel={t('friendReport.faceToFace.sent')}
                        receivedLabel={t('friendReport.faceToFace.received')}
                        dateLabel={entry.date.toLocaleDateString(localeFor(), { day: 'numeric', month: 'short' })}
                        sideLabel={entry.side === 'me'
                          ? t('friendReport.faceToFace.favourMine')
                          : t('friendReport.faceToFace.favourTheirs', { name: selectedFriend!.displayName.split(' ')[0] })}
                      />
                    ))}
                  </View>
                </View>
              )
            )}
          </ScrollView>

          {/* Compartir */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.shareBtn, { backgroundColor: colors.primary }, !hasMovements && styles.disabled]}
              onPress={() => setSheetVisible(true)}
              disabled={!hasMovements}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <AppIcon name="share-outline" size={20} color={colors.onPrimary} />
              <Text style={[styles.shareText, { color: colors.onPrimary }]}>
                {t('friendReport.share.openSheet')}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        <FormatSheet
          visible={sheetVisible}
          selected={format}
          onSelect={setFormat}
          onPreview={handlePreview}
          onClose={() => setSheetVisible(false)}
          entryCount={model?.movementCount ?? 7}
          busy={generating}
        />

        {previewVisible && (
          <PreviewModal
            visible={previewVisible}
            format={format}
            onChangeFormat={handleChangeFormat}
            pages={pages}
            loading={generating}
            error={genError}
            friendName={selectedFriend?.displayName ?? ''}
            periodLabel={`${monthLabel} ${year}`}
            verdictLabel={verdictText}
            amountLabel={formatMoneyAbs(model?.net ?? 0)}
            entryCount={model?.movementCount ?? 7}
            onShare={handleShare}
            onDownload={handleDownload}
            onRetry={() => generate(format)}
            onClose={() => {
              runId.current++;          // lo que esté en vuelo ya no manda
              setGenerating(false);
              setGenError(false);
              setPreviewVisible(false);
            }}
          />
        )}
      </ScreenBackground>
    </ScreenTransition>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 28, width: '100%', maxWidth: 768, alignSelf: 'center' },

  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 16, borderWidth: 1, paddingHorizontal: 6, height: 48, marginTop: 8,
  },
  monthBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  monthLabel: { fontSize: 13.5, fontFamily: Fonts.bold, letterSpacing: 1.2 },

  sectionLabel: { fontSize: 11, fontFamily: Fonts.bold, letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 22, marginBottom: 10 },
  friendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  friendChip: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 50, borderWidth: 1.5, paddingLeft: 5, paddingRight: 14, height: 44 },
  friendAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  friendInitial: { fontSize: 13, fontFamily: Fonts.bold },
  friendName: { fontSize: 13.5, maxWidth: 120 },

  emptyBox: { borderRadius: 18, borderWidth: 1, padding: 26, alignItems: 'center', gap: 8, marginTop: 20 },
  emptyTitle: { fontSize: 14.5, fontFamily: Fonts.bold },
  emptyDesc: { fontSize: 12.5, fontFamily: Fonts.regular, textAlign: 'center', lineHeight: 18 },

  card: { borderRadius: 22, borderWidth: 1, padding: 18, marginTop: 20 },
  divider: { height: 1, marginTop: 16 },
  entriesTitle: { fontSize: 9, fontFamily: Fonts.bold, letterSpacing: 1.3, textAlign: 'center', marginTop: 22 },
  entries: { marginTop: 10, position: 'relative' },
  entriesAxis: { position: 'absolute', top: 4, bottom: 4, left: '50%', width: 1, marginLeft: -0.5 },

  footer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 6, borderTopWidth: 1, width: '100%', maxWidth: 768, alignSelf: 'center' },
  shareBtn: { height: 52, borderRadius: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  shareText: { fontSize: 14.5, fontFamily: Fonts.bold },
  disabled: { opacity: 0.45 },
});
