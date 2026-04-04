import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { useAuthStore } from '../store/authStore';
import { Fonts } from '../config/fonts';
import { useCards, deleteCardAndTransactions } from '../hooks/useCards';
import CardFormSheet from '../components/CardFormSheet';
import BankLogo from '../components/BankLogo';
import AppDialog from '../components/AppDialog';
import { Skeleton } from '../components/Skeleton';
import type { Card } from '../types/card';

export default function CardsScreen() {
  const { colors } = useTheme();
  const { showToast } = useToast();
  const { user } = useAuthStore();
  const { cards, loading } = useCards(user?.uid ?? '');

  const [cardFormVisible, setCardFormVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Card | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCardAndTransactions(deleteTarget.id);
      showToast('Tarjeta eliminada correctamente', 'success');
      setDeleteTarget(null);
    } catch {
      showToast('No se pudo eliminar la tarjeta', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.backgroundSecondary }]}>

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.backgroundSecondary }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Mis tarjetas</Text>
        <TouchableOpacity
          onPress={() => setCardFormVisible(true)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

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
                No tienes tarjetas registradas
              </Text>
              <Text style={[styles.emptyHint, { color: colors.textTertiary }]}>
                Toca + para agregar tu primera tarjeta
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
                    {`${card.bankName} •••• ${card.lastFour}`}
                  </Text>
                  <View style={[
                    styles.badge,
                    { backgroundColor: card.type === 'credit' ? colors.primaryLight : colors.tertiaryLight },
                  ]}>
                    <Text style={[
                      styles.badgeText,
                      { color: card.type === 'credit' ? colors.primary : colors.tertiaryDark },
                    ]}>
                      {card.type === 'credit' ? 'Crédito' : 'Débito'}
                    </Text>
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
        title="Eliminar tarjeta"
        description={
          <Text style={[dialogDescStyle, { color: colors.textSecondary }]}>
            {'Si eliminas '}
            <Text style={{ fontFamily: Fonts.bold, color: colors.textPrimary }}>
              {`${deleteTarget?.bankName} •••• ${deleteTarget?.lastFour}`}
            </Text>
            {', se eliminarán también '}
            <Text style={{ fontFamily: Fonts.bold, color: colors.textPrimary }}>
              todas las transacciones
            </Text>
            {' asociadas a esta tarjeta en todos los meses. Esta acción es '}
            <Text style={{ fontFamily: Fonts.bold, color: colors.error }}>
              permanente y no se puede deshacer.
            </Text>
          </Text>
        }
        primaryLabel="Eliminar todo"
        secondaryLabel="Cancelar"
        onPrimary={confirmDelete}
        onSecondary={() => { if (!deleting) setDeleteTarget(null); }}
        loading={deleting}
      />
    </SafeAreaView>
  );
}

// Shared style for ReactNode dialog descriptions
const dialogDescStyle = { fontSize: 15, lineHeight: 22, textAlign: 'center' as const };

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: { padding: 4, marginRight: 4 },
  headerTitle: { flex: 1, fontSize: 20, fontFamily: Fonts.bold, marginLeft: 4 },
  addButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 20, paddingBottom: 40 },
  card: { borderRadius: 16, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  meta: { flex: 1 },
  cardName: { fontSize: 14, fontFamily: Fonts.semiBold, marginBottom: 4 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontFamily: Fonts.semiBold },
  emptyWrap: { alignItems: 'center', paddingVertical: 32, gap: 4 },
  emptyText: { fontSize: 14, fontFamily: Fonts.semiBold },
  emptyHint: { fontSize: 12, fontFamily: Fonts.regular },
});
