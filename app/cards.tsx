import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { useAuthStore } from '../store/authStore';
import { Fonts } from '../config/fonts';
import { useCards, deleteCardAndTransactions } from '../hooks/useCards';
import CardFormSheet from '../components/CardFormSheet';
import BankLogo from '../components/BankLogo';
import AppDialog from '../components/AppDialog';
import { router } from 'expo-router';
import AppHeader from '../components/AppHeader';
import ScreenTransition, { ScreenTransitionRef } from '../components/ScreenTransition';
import PageTitle from '../components/PageTitle';
import ScreenBackground from '../components/ScreenBackground';
import { Skeleton } from '../components/Skeleton';
import type { Card } from '../types/card';

export default function CardsScreen() {
  const { colors } = useTheme();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { cards, loading } = useCards(user?.uid ?? '');

  const [cardFormVisible, setCardFormVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Card | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCardAndTransactions(deleteTarget.id, user!.uid);
      showToast(t('cardsScreen.deletedSuccess'), 'success');
      setDeleteTarget(null);
    } catch {
      showToast(t('cardsScreen.deleteError'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const transitionRef = useRef<ScreenTransitionRef>(null);
  const handleBack = () => {
    if (transitionRef.current) {
      transitionRef.current.animateOut(() => router.back());
    } else {
      router.back();
    }
  };

  return (
    <ScreenTransition ref={transitionRef}>
    <SafeAreaView style={styles.safeArea}>
      <ScreenBackground>

      <AppHeader
        showBack
        onBack={handleBack}
        rightAction={
          <TouchableOpacity
            onPress={() => setCardFormVisible(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        }
      />
      <PageTitle title={t('cardsScreen.title')} description={t('cardsScreen.pageDesc')} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          {loading ? (
            <>
              <View style={styles.row}><Skeleton width={40} height={40} borderRadius={10} /><Skeleton width={140} height={14} borderRadius={6} /></View>
              <View style={styles.row}><Skeleton width={40} height={40} borderRadius={10} /><Skeleton width={120} height={14} borderRadius={6} /></View>
            </>
          ) : cards.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="card-outline" size={32} color={colors.textTertiary} style={{ marginBottom: 8 }} />
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                {t('cardsScreen.empty')}
              </Text>
              <Text style={[styles.emptyHint, { color: colors.textTertiary }]}>
                {t('cardsScreen.emptyHint')}
              </Text>
            </View>
          ) : (
            cards.map((card, idx) => (
              <View
                key={card.id}
                style={[
                  styles.row,
                  idx < cards.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                ]}
              >
                <BankLogo bankId={card.bankId} size={40} radius={10} />
                <View style={styles.meta}>
                  <Text style={[styles.cardName, { color: colors.textPrimary }]}>
                    {card.bankName}
                  </Text>
                  <View style={styles.badgeRow}>
                    {card.nickname ? (
                      <View style={[styles.badge, { backgroundColor: colors.primaryLight }]}>
                        <Text style={[styles.badgeText, { color: colors.primary }]}>
                          {card.nickname}
                        </Text>
                      </View>
                    ) : null}
                    <View style={[
                      styles.badge,
                      { backgroundColor: card.type === 'credit' ? colors.primaryLight : colors.tertiaryLight },
                    ]}>
                      <Text style={[
                        styles.badgeText,
                        { color: card.type === 'credit' ? colors.primary : colors.tertiaryDark },
                      ]}>
                        {card.type === 'credit' ? t('cardsScreen.credit') : t('cardsScreen.debit')}
                      </Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setDeleteTarget(card)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

      </ScrollView>

      <CardFormSheet
        visible={cardFormVisible}
        onClose={() => setCardFormVisible(false)}
      />

      <AppDialog
        visible={!!deleteTarget}
        type="error"
        title={t('cardsScreen.deleteDialog.title')}
        description={
          <Text style={[dialogDescStyle, { color: colors.textSecondary }]}>
            {t('cardsScreen.deleteDialog.descPart1')}
            <Text style={{ fontFamily: Fonts.bold, color: colors.textPrimary }}>
              {deleteTarget?.nickname ? `${deleteTarget.bankName} · ${deleteTarget.nickname}` : deleteTarget?.bankName ?? ''}
            </Text>
            {t('cardsScreen.deleteDialog.descPart2')}
            <Text style={{ fontFamily: Fonts.bold, color: colors.textPrimary }}>
              {t('cardsScreen.deleteDialog.descBold2')}
            </Text>
            {t('cardsScreen.deleteDialog.descPart3')}
            <Text style={{ fontFamily: Fonts.bold, color: colors.error }}>
              {t('cardsScreen.deleteDialog.descBoldDanger')}
            </Text>
          </Text>
        }
        primaryLabel={t('cardsScreen.deleteDialog.primaryLabel')}
        secondaryLabel={t('common.cancel')}
        onPrimary={confirmDelete}
        onSecondary={() => { if (!deleting) setDeleteTarget(null); }}
        loading={deleting}
        primaryDanger
      />
      </ScreenBackground>
    </SafeAreaView>
    </ScreenTransition>
  );
}

// Shared style for ReactNode dialog descriptions
const dialogDescStyle = { fontSize: 15, lineHeight: 22, textAlign: 'center' as const };

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  addButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 20, paddingBottom: 40, width: '100%', maxWidth: 640, alignSelf: 'center' },
  card: { borderRadius: 16, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  meta: { flex: 1 },
  cardName: { fontSize: 14, fontFamily: Fonts.semiBold, marginBottom: 4 },
  badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontFamily: Fonts.semiBold },
  emptyWrap: { alignItems: 'center', paddingVertical: 32, gap: 4 },
  emptyText: { fontSize: 14, fontFamily: Fonts.semiBold },
  emptyHint: { fontSize: 12, fontFamily: Fonts.regular },
});
