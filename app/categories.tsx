import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  deleteDoc,
  doc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { router } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../config/fonts';
import { useAuthStore } from '../store/authStore';
import { useCategories } from '../hooks/useCategories';
import { DEFAULT_CATEGORIES } from '../constants/categories';
import { CategoryFormModal } from '../components/CategoryFormModal';
import { Skeleton } from '../components/Skeleton';
import type { Category, CategoryType } from '../types/category';

// ── Type badge ──────────────────────────────────────────────────────────────

interface TypeBadgeProps {
  type: CategoryType;
}

function TypeBadge({ type }: TypeBadgeProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const config: Record<CategoryType, { bg: string; text: string; label: string }> = {
    expense: {
      bg: colors.errorLight,
      text: colors.error,
      label: t('categories.typeExpense'),
    },
    income: {
      bg: colors.successLight,
      text: colors.success,
      label: t('categories.typeIncome'),
    },
    both: {
      bg: colors.primaryLight,
      text: colors.primary,
      label: t('categories.typeBoth'),
    },
  };

  const { bg, text, label } = config[type];

  return (
    <View style={[styles.typeBadge, { backgroundColor: bg }]}>
      <Text style={[styles.typeBadgeText, { color: text }]}>{label}</Text>
    </View>
  );
}

// ── Section header ──────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionHeaderRow}>
      <View style={[styles.sectionHeaderDot, { backgroundColor: colors.tertiary }]} />
      <Text style={[styles.sectionHeaderText, { color: colors.textTertiary }]}>{label}</Text>
    </View>
  );
}

// ── Default category row ────────────────────────────────────────────────────

interface DefaultCategoryRowProps {
  emoji: string;
  name: string;
  type: CategoryType;
  isLast: boolean;
}

function DefaultCategoryRow({ emoji, name, type, isLast }: DefaultCategoryRowProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.categoryRow,
        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border },
      ]}
    >
      <View style={[styles.emojiCircle, { backgroundColor: colors.backgroundSecondary }]}>
        <Text style={styles.emojiText}>{emoji}</Text>
      </View>
      <Text style={[styles.categoryName, { color: colors.textPrimary }]} numberOfLines={1}>
        {name}
      </Text>
      <TypeBadge type={type} />
      <Ionicons name="lock-closed" size={14} color={colors.textTertiary} style={styles.lockIcon} />
    </View>
  );
}

// ── Custom category row ─────────────────────────────────────────────────────

interface CustomCategoryRowProps {
  category: Category;
  isLast: boolean;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

function CustomCategoryRow({ category, isLast, onEdit, onDelete }: CustomCategoryRowProps) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.categoryRow,
        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border },
      ]}
      onPress={() => onEdit(category)}
      activeOpacity={0.7}
    >
      <View style={[styles.emojiCircle, { backgroundColor: colors.backgroundSecondary }]}>
        <Text style={styles.emojiText}>{category.icon}</Text>
      </View>
      <Text
        style={[styles.categoryName, { color: colors.textPrimary }]}
        numberOfLines={1}
      >
        {category.name}
      </Text>
      <TypeBadge type={category.type} />
      <TouchableOpacity
        onPress={() => onDelete(category)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={styles.deleteIconButton}
        activeOpacity={0.7}
      >
        <Ionicons name="trash-outline" size={18} color={colors.error} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ── Loading skeleton for category rows ─────────────────────────────────────

function CategoryRowSkeleton() {
  return (
    <View style={[styles.categoryRow, { gap: 12 }]}>
      <Skeleton width={40} height={40} borderRadius={20} />
      <Skeleton width={120} height={14} borderRadius={6} />
    </View>
  );
}

// ── Delete confirmation dialog ──────────────────────────────────────────────

interface DeleteDialogProps {
  visible: boolean;
  transactionCount: number;
  counting: boolean;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

function DeleteDialog({
  visible,
  transactionCount,
  counting,
  deleting,
  onCancel,
  onConfirm,
}: DeleteDialogProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={[styles.dialogOverlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.dialogCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.dialogIconWrap, { backgroundColor: colors.errorLight }]}>
            <Ionicons name="trash" size={28} color={colors.error} />
          </View>
          <Text style={[styles.dialogTitle, { color: colors.textPrimary }]}>
            {t('categories.deleteTitle')}
          </Text>
          <Text style={[styles.dialogBody, { color: colors.textSecondary }]}>
            {counting
              ? t('categories.suggestingEmoji')
              : t('categories.deleteDesc', { count: transactionCount })}
          </Text>
          <View style={styles.dialogActions}>
            <TouchableOpacity
              style={[
                styles.dialogBtn,
                { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1.5 },
              ]}
              onPress={onCancel}
              activeOpacity={0.8}
              disabled={deleting}
            >
              <Text style={[styles.dialogBtnText, { color: colors.textSecondary }]}>
                {t('categories.deleteCancel')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.dialogBtn,
                { backgroundColor: colors.error },
                (deleting || counting) && styles.dialogBtnDisabled,
              ]}
              onPress={onConfirm}
              activeOpacity={0.8}
              disabled={deleting || counting}
            >
              {deleting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={[styles.dialogBtnText, { color: '#FFFFFF' }]}>
                  {t('categories.deleteConfirm')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Main screen ─────────────────────────────────────────────────────────────

export default function CategoriesScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const userId = user?.uid ?? '';
  const { categories, loading } = useCategories(userId);

  // Form modal state
  const [formVisible, setFormVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [transactionCount, setTransactionCount] = useState(0);
  const [counting, setCounting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormVisible(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setFormVisible(true);
  };

  const handleFormClose = () => {
    setFormVisible(false);
    setEditingCategory(null);
  };

  const handleFormSaved = () => {
    setFormVisible(false);
    setEditingCategory(null);
  };

  const handleDeletePress = async (category: Category): Promise<void> => {
    setDeleteTarget(category);
    setTransactionCount(0);
    setCounting(true);

    try {
      const q = query(
        collection(db, 'transactions'),
        where('userId', '==', userId),
        where('category', '==', category.id),
      );
      const snap = await getDocs(q);
      setTransactionCount(snap.size);
    } finally {
      setCounting(false);
    }
  };

  const handleDeleteCancel = () => {
    if (deleting) return;
    setDeleteTarget(null);
    setTransactionCount(0);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!deleteTarget) return;
    setDeleting(true);

    try {
      const q = query(
        collection(db, 'transactions'),
        where('userId', '==', userId),
        where('category', '==', deleteTarget.id),
      );
      const snap = await getDocs(q);

      const batch = writeBatch(db);
      snap.docs.forEach((txDoc) => {
        batch.update(txDoc.ref, { category: 'other' });
      });
      await batch.commit();

      await deleteDoc(doc(db, 'categories', deleteTarget.id));

      setDeleteTarget(null);
      setTransactionCount(0);
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
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {t('categories.title')}
        </Text>
        <TouchableOpacity
          onPress={openCreateModal}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={22} color={colors.onPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* DEFAULT CATEGORIES section */}
        <SectionHeader label={t('categories.defaultSection')} />
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              shadowColor: '#000',
            },
          ]}
        >
          {DEFAULT_CATEGORIES.map((cat, index) => (
            <DefaultCategoryRow
              key={cat.id}
              emoji={cat.icon}
              name={t(`categories.names.${cat.id}`)}
              type={cat.type}
              isLast={index === DEFAULT_CATEGORIES.length - 1}
            />
          ))}
        </View>

        {/* CUSTOM CATEGORIES section */}
        <SectionHeader label={t('categories.customSection')} />
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              shadowColor: '#000',
            },
          ]}
        >
          {loading ? (
            <>
              <CategoryRowSkeleton />
              <CategoryRowSkeleton />
            </>
          ) : categories.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📂</Text>
              <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
                {t('categories.emptyCustom')}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
                {t('categories.emptyCustomSub')}
              </Text>
            </View>
          ) : (
            categories.map((cat, index) => (
              <CustomCategoryRow
                key={cat.id}
                category={cat}
                isLast={index === categories.length - 1}
                onEdit={openEditModal}
                onDelete={handleDeletePress}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Create / Edit modal */}
      <CategoryFormModal
        visible={formVisible}
        onClose={handleFormClose}
        onSaved={handleFormSaved}
        editingCategory={editingCategory}
      />

      {/* Delete confirmation dialog */}
      <DeleteDialog
        visible={deleteTarget != null}
        transactionCount={transactionCount}
        counting={counting}
        deleting={deleting}
        onCancel={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: Fonts.bold,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Scroll
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },

  // Section header
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    marginLeft: 2,
    marginTop: 8,
  },
  sectionHeaderDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sectionHeaderText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    letterSpacing: 0.5,
  },

  // Card container
  card: {
    borderRadius: 20,
    marginBottom: 24,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  // Category row
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  emojiCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: 20,
  },
  categoryName: {
    flex: 1,
    fontSize: 15,
    fontFamily: Fonts.semiBold,
  },
  lockIcon: {
    marginLeft: 4,
  },
  deleteIconButton: {
    padding: 4,
  },

  // Type badge
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  typeBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.semiBold,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    textAlign: 'center',
  },

  // Delete dialog
  dialogOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  dialogCard: {
    width: '100%',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  dialogIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  dialogTitle: {
    fontSize: 17,
    fontFamily: Fonts.bold,
    textAlign: 'center',
  },
  dialogBody: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 4,
  },
  dialogActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 4,
  },
  dialogBtn: {
    flex: 1,
    height: 48,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogBtnDisabled: {
    opacity: 0.5,
  },
  dialogBtnText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
});
