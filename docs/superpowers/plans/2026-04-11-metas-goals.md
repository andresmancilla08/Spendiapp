# Metas (Savings Goals) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar módulo Metas de ahorro: tab Herramientas con hub, pantalla metas con CRUD Firestore, y recordatorio mensual vía Cloud Function el día 3.

**Architecture:** Tab "Herramientas" → hub con cards → GoalsScreen con 2 tabs internos (Activas/Completadas). Hook `useGoals` maneja Firestore onSnapshot. Cloud Function scheduled day 3 escribe en colección `notifications`.

**Tech Stack:** React Native + Expo Router, Firebase Firestore JS SDK + Admin SDK (Cloud Functions v2), react-i18next, TypeScript, LinearGradient, Ionicons

---

## File Map

**Creados:**
- `types/goal.ts` — tipo Goal + GoalStatus
- `hooks/useGoals.ts` — CRUD + onSnapshot Firestore
- `app/(tabs)/tools.tsx` — hub Herramientas
- `app/goals.tsx` — pantalla metas (2 tabs internos)
- `functions/package.json`
- `functions/tsconfig.json`
- `functions/src/index.ts` — Cloud Function goalsReminder

**Modificados:**
- `types/friend.ts` — GoalReminderData + goal_monthly_reminder en NotificationType
- `app/notifications.tsx` — ícono/color/texto para goal_monthly_reminder
- `app/(tabs)/_layout.tsx` — agregar tab `tools`
- `components/AppTabBar.tsx` — config tab tools
- `firestore.rules` — colección goals
- `firebase.json` — agregar functions config
- `locales/es.json`, `en.json`, `it.json` — secciones goals + tools + tabBar.tools + notifications.goal_monthly_reminder

---

### Task 1: Tipo Goal + Hook useGoals

**Files:**
- Create: `types/goal.ts`
- Create: `hooks/useGoals.ts`

- [ ] **Step 1: Crear types/goal.ts**

```typescript
// types/goal.ts
import { Timestamp } from 'firebase/firestore';

export type GoalStatus = 'active' | 'completed';

export interface Goal {
  id: string;
  userId: string;
  name: string;
  emoji: string;
  targetAmount: number;
  savedAmount: number;
  status: GoalStatus;
  createdAt: Timestamp;
  completedAt?: Timestamp;
}
```

- [ ] **Step 2: Crear hooks/useGoals.ts**

```typescript
// hooks/useGoals.ts
import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  orderBy,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Goal } from '../types/goal';

interface UseGoalsResult {
  goals: Goal[];
  loading: boolean;
  addGoal: (name: string, emoji: string, targetAmount: number) => Promise<void>;
  addContribution: (
    goalId: string,
    amount: number,
    currentSaved: number,
    targetAmount: number,
  ) => Promise<boolean>;
  deleteGoal: (goalId: string) => Promise<void>;
}

export function useGoals(userId: string): UseGoalsResult {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'goals'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
    );

    const unsub = onSnapshot(q, (snap) => {
      setGoals(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Goal)));
      setLoading(false);
    });

    return unsub;
  }, [userId]);

  const addGoal = async (name: string, emoji: string, targetAmount: number): Promise<void> => {
    await addDoc(collection(db, 'goals'), {
      userId,
      name,
      emoji,
      targetAmount,
      savedAmount: 0,
      status: 'active' as const,
      createdAt: Timestamp.now(),
    });
  };

  // Returns true if the contribution completes the goal
  const addContribution = async (
    goalId: string,
    amount: number,
    currentSaved: number,
    targetAmount: number,
  ): Promise<boolean> => {
    const newSaved = currentSaved + amount;
    const completed = newSaved >= targetAmount;
    await updateDoc(doc(db, 'goals', goalId), {
      savedAmount: newSaved,
      ...(completed ? { status: 'completed', completedAt: Timestamp.now() } : {}),
    });
    return completed;
  };

  const deleteGoal = async (goalId: string): Promise<void> => {
    await deleteDoc(doc(db, 'goals', goalId));
  };

  return { goals, loading, addGoal, addContribution, deleteGoal };
}
```

- [ ] **Step 3: Commit**

```bash
git add types/goal.ts hooks/useGoals.ts
git commit -m "feat: tipo Goal y hook useGoals con CRUD Firestore"
```

---

### Task 2: i18n — secciones goals, tools, tabBar, notifications

**Files:**
- Modify: `locales/es.json`
- Modify: `locales/en.json`
- Modify: `locales/it.json`

- [ ] **Step 1: Editar locales/es.json**

Reemplazar la sección `tabBar` existente con:
```json
"tabBar": {
  "home": "Inicio",
  "budget": "Presupuesto",
  "history": "Historial",
  "tools": "Herramientas"
},
```

En la sección `notifications`, agregar después de `"shared_transaction_deleted"`:
```json
"goal_monthly_reminder": "Recuerda agregar a tus {{count}} metas activas este mes 🎯"
```

Agregar las siguientes secciones al objeto raíz (antes del `}` de cierre):
```json
"tools": {
  "title": "Herramientas",
  "pageDesc": "Funcionalidades para potenciar tus finanzas",
  "goalsCard": {
    "title": "Metas de ahorro",
    "description": "Ahorra para lo que más importa"
  }
},
"goals": {
  "title": "Mis Metas",
  "pageDesc": "Ahorra paso a paso hacia tus sueños",
  "activeTab": "Activas",
  "completedTab": "Completadas",
  "createTitle": "Nueva meta",
  "nameLabel": "Nombre de la meta",
  "namePlaceholder": "Ej: Viaje a Europa",
  "emojiLabel": "Emoji",
  "emojiPlaceholder": "✈️",
  "targetLabel": "Monto objetivo",
  "targetPlaceholder": "$ 0",
  "addContributionTitle": "Agregar ahorro",
  "contributionLabel": "¿Cuánto vas a agregar?",
  "deleteTitle": "Eliminar meta",
  "deleteDescBefore": "¿Seguro que quieres eliminar",
  "deleteDescAfter": "? Esta acción no se puede deshacer.",
  "completedTitle": "¡Meta cumplida! 🎉",
  "completedDesc": "¡Felicitaciones, lograste tu meta",
  "completedDescAfter": "!",
  "emptyActive": "Aún no tienes metas activas",
  "emptyActiveSub": "Crea tu primera meta y empieza a ahorrar",
  "emptyCompleted": "Aún no has completado ninguna meta",
  "emptyCompletedSub": "¡Sigue adelante, pronto lo lograrás!",
  "saved": "guardado",
  "of": "de",
  "createButton": "Crear meta",
  "cancelButton": "Cancelar",
  "deleteButton": "Eliminar",
  "addButton": "Agregar",
  "newGoalButton": "Nueva meta",
  "gotIt": "¡Genial!",
  "toasts": {
    "created": "¡Meta creada!",
    "deleted": "Meta eliminada",
    "contributed": "¡Ahorro registrado!",
    "completed": "¡Meta cumplida! 🎉",
    "error": "Ocurrió un error"
  }
}
```

- [ ] **Step 2: Editar locales/en.json**

Agregar `"tools": "Tools"` a `tabBar`.

En `notifications`, agregar:
```json
"goal_monthly_reminder": "Remember to add to your {{count}} active goals this month 🎯"
```

Agregar secciones:
```json
"tools": {
  "title": "Tools",
  "pageDesc": "Features to boost your finances",
  "goalsCard": {
    "title": "Savings Goals",
    "description": "Save for what matters most"
  }
},
"goals": {
  "title": "My Goals",
  "pageDesc": "Save step by step toward your dreams",
  "activeTab": "Active",
  "completedTab": "Completed",
  "createTitle": "New goal",
  "nameLabel": "Goal name",
  "namePlaceholder": "E.g.: Trip to Europe",
  "emojiLabel": "Emoji",
  "emojiPlaceholder": "✈️",
  "targetLabel": "Target amount",
  "targetPlaceholder": "$ 0",
  "addContributionTitle": "Add savings",
  "contributionLabel": "How much are you adding?",
  "deleteTitle": "Delete goal",
  "deleteDescBefore": "Are you sure you want to delete",
  "deleteDescAfter": "? This action cannot be undone.",
  "completedTitle": "Goal achieved! 🎉",
  "completedDesc": "Congratulations, you reached your goal",
  "completedDescAfter": "!",
  "emptyActive": "No active goals yet",
  "emptyActiveSub": "Create your first goal and start saving",
  "emptyCompleted": "No completed goals yet",
  "emptyCompletedSub": "Keep going, you'll get there!",
  "saved": "saved",
  "of": "of",
  "createButton": "Create goal",
  "cancelButton": "Cancel",
  "deleteButton": "Delete",
  "addButton": "Add",
  "newGoalButton": "New goal",
  "gotIt": "Got it!",
  "toasts": {
    "created": "Goal created!",
    "deleted": "Goal deleted",
    "contributed": "Savings added!",
    "completed": "Goal achieved! 🎉",
    "error": "An error occurred"
  }
}
```

- [ ] **Step 3: Editar locales/it.json**

Agregar `"tools": "Strumenti"` a `tabBar`.

En `notifications`, agregar:
```json
"goal_monthly_reminder": "Ricorda di aggiungere ai tuoi {{count}} obiettivi attivi questo mese 🎯"
```

Agregar secciones:
```json
"tools": {
  "title": "Strumenti",
  "pageDesc": "Funzionalità per potenziare le tue finanze",
  "goalsCard": {
    "title": "Obiettivi di risparmio",
    "description": "Risparmia per ciò che conta di più"
  }
},
"goals": {
  "title": "I miei obiettivi",
  "pageDesc": "Risparmia passo dopo passo verso i tuoi sogni",
  "activeTab": "Attivi",
  "completedTab": "Completati",
  "createTitle": "Nuovo obiettivo",
  "nameLabel": "Nome obiettivo",
  "namePlaceholder": "Es: Viaggio in Europa",
  "emojiLabel": "Emoji",
  "emojiPlaceholder": "✈️",
  "targetLabel": "Importo obiettivo",
  "targetPlaceholder": "$ 0",
  "addContributionTitle": "Aggiungi risparmio",
  "contributionLabel": "Quanto vuoi aggiungere?",
  "deleteTitle": "Elimina obiettivo",
  "deleteDescBefore": "Sei sicuro di voler eliminare",
  "deleteDescAfter": "? Questa azione non può essere annullata.",
  "completedTitle": "Obiettivo raggiunto! 🎉",
  "completedDesc": "Congratulazioni, hai raggiunto il tuo obiettivo",
  "completedDescAfter": "!",
  "emptyActive": "Nessun obiettivo attivo",
  "emptyActiveSub": "Crea il tuo primo obiettivo e inizia a risparmiare",
  "emptyCompleted": "Nessun obiettivo completato",
  "emptyCompletedSub": "Continua così, ce la farai!",
  "saved": "risparmiato",
  "of": "di",
  "createButton": "Crea obiettivo",
  "cancelButton": "Annulla",
  "deleteButton": "Elimina",
  "addButton": "Aggiungi",
  "newGoalButton": "Nuovo obiettivo",
  "gotIt": "Ottimo!",
  "toasts": {
    "created": "Obiettivo creato!",
    "deleted": "Obiettivo eliminato",
    "contributed": "Risparmio aggiunto!",
    "completed": "Obiettivo raggiunto! 🎉",
    "error": "Si è verificato un errore"
  }
}
```

- [ ] **Step 4: Verificar JSON válido**

```bash
node -e "require('./locales/es.json'); require('./locales/en.json'); require('./locales/it.json'); console.log('JSON válido')"
```

Expected output: `JSON válido`

- [ ] **Step 5: Commit**

```bash
git add locales/es.json locales/en.json locales/it.json
git commit -m "feat: i18n metas, tab herramientas y recordatorio notificaciones"
```

---

### Task 3: Firestore rules + tipos de notificación

**Files:**
- Modify: `firestore.rules`
- Modify: `types/friend.ts`

- [ ] **Step 1: Agregar goals a firestore.rules**

Agregar dentro de `match /databases/{database}/documents`, antes del `}` de cierre:

```
match /goals/{goalId} {
  allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
  allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
}
```

- [ ] **Step 2: Actualizar types/friend.ts**

Agregar `GoalReminderData` y expandir `NotificationType` y `NotificationDoc`:

```typescript
// Agregar después de SharedTransactionNotificationData:
export interface GoalReminderData {
  count: number;
}

// Reemplazar NotificationType:
export type NotificationType =
  | 'friend_request'
  | 'friend_accepted'
  | 'shared_transaction_added'
  | 'shared_transaction_updated'
  | 'shared_transaction_deleted'
  | 'goal_monthly_reminder';

// Reemplazar NotificationDoc:
export interface NotificationDoc {
  id: string;
  toUserId: string;
  type: NotificationType;
  data: NotificationData | SharedTransactionNotificationData | GoalReminderData;
  read: boolean;
  createdAt: Timestamp;
}
```

- [ ] **Step 3: Commit**

```bash
git add firestore.rules types/friend.ts
git commit -m "feat: Firestore rules goals + tipo goal_monthly_reminder"
```

---

### Task 4: Tab bar + navegación

**Files:**
- Modify: `app/(tabs)/_layout.tsx`
- Modify: `components/AppTabBar.tsx`

- [ ] **Step 1: Agregar tab tools a _layout.tsx**

En `app/(tabs)/_layout.tsx`, agregar `<Tabs.Screen name="tools" />` junto a los otros screens visibles:

```tsx
<Tabs.Screen name="index" />
<Tabs.Screen name="budget" />
<Tabs.Screen name="history" />
<Tabs.Screen name="tools" />
<Tabs.Screen name="profile" options={{ href: null }} />
<Tabs.Screen name="settings" options={{ href: null }} />
```

- [ ] **Step 2: Agregar tools en AppTabBar.tsx**

En `TAB_CONFIG`, agregar:
```typescript
tools: { icon: 'hammer-outline', iconActive: 'hammer' },
```

En `tabLabels`, agregar:
```typescript
tools: t('tabBar.tools'),
```

- [ ] **Step 3: Commit**

```bash
git add "app/(tabs)/_layout.tsx" components/AppTabBar.tsx
git commit -m "feat: tab Herramientas en navegación inferior"
```

---

### Task 5: Pantalla Tools hub

**Files:**
- Create: `app/(tabs)/tools.tsx`

- [ ] **Step 1: Crear app/(tabs)/tools.tsx**

```tsx
// app/(tabs)/tools.tsx
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import AppHeader from '../../components/AppHeader';
import PageTitle from '../../components/PageTitle';
import ScreenBackground from '../../components/ScreenBackground';
import ScreenTransition from '../../components/ScreenTransition';
import { Fonts } from '../../config/fonts';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface ToolCardData {
  emoji: string;
  icon: IoniconsName;
  title: string;
  description: string;
  onPress: () => void;
}

function ToolCard({ emoji, icon, title, description, onPress, colors }: ToolCardData & { colors: any }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={styles.cardWrapper}>
      <LinearGradient
        colors={[`${colors.primary}18`, `${colors.primary}06`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, { borderColor: `${colors.primary}28`, borderWidth: 1 }]}
      >
        <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}18` }]}>
          <Text style={styles.emoji}>{emoji}</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{title}</Text>
          <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>{description}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.primary} />
      </LinearGradient>
    </TouchableOpacity>
  );
}

export default function ToolsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <ScreenTransition>
      <SafeAreaView style={styles.safe}>
        <ScreenBackground>
          <AppHeader />
          <PageTitle title={t('tools.title')} description={t('tools.pageDesc')} />
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <ToolCard
              emoji="🎯"
              icon="flag"
              title={t('tools.goalsCard.title')}
              description={t('tools.goalsCard.description')}
              onPress={() => router.push('/goals')}
              colors={colors}
            />
          </ScrollView>
        </ScreenBackground>
      </SafeAreaView>
    </ScreenTransition>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 40 },
  cardWrapper: { marginBottom: 12 },
  card: {
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 26 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontFamily: Fonts.bold, marginBottom: 3 },
  cardDesc: { fontSize: 13, fontFamily: Fonts.regular, lineHeight: 19 },
});
```

- [ ] **Step 2: Commit**

```bash
git add "app/(tabs)/tools.tsx"
git commit -m "feat: pantalla hub Herramientas"
```

---

### Task 6: Pantalla Goals (mayor complejidad)

**Files:**
- Create: `app/goals.tsx`

- [ ] **Step 1: Crear app/goals.tsx**

```tsx
// app/goals.tsx
import { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../context/ThemeContext';
import { useGoals } from '../hooks/useGoals';
import { Goal } from '../types/goal';
import AppDialog from '../components/AppDialog';
import AppHeader from '../components/AppHeader';
import PageTitle from '../components/PageTitle';
import ScreenBackground from '../components/ScreenBackground';
import ScreenTransition, { ScreenTransitionRef } from '../components/ScreenTransition';
import { Fonts } from '../config/fonts';
import { useToast } from '../context/ToastContext';
import { router } from 'expo-router';

type TabType = 'active' | 'completed';
type DialogMode = 'create' | 'contribute' | 'delete' | 'completed' | null;

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(n);
}

function formatCurrencyInput(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(parseInt(digits, 10));
}

function ProgressBar({ percent, color }: { percent: number; color: string }) {
  const clamped = Math.min(Math.max(percent, 0), 100);
  return (
    <View style={progressStyles.track}>
      <View style={[progressStyles.fill, { width: `${clamped}%` as any, backgroundColor: color }]} />
    </View>
  );
}

const progressStyles = StyleSheet.create({
  track: { height: 6, borderRadius: 3, backgroundColor: '#E5E7EB', overflow: 'hidden', marginTop: 8 },
  fill: { height: 6, borderRadius: 3 },
});

function GoalCard({
  goal,
  colors,
  t,
  onContribute,
  onDelete,
}: {
  goal: Goal;
  colors: any;
  t: any;
  onContribute?: () => void;
  onDelete: () => void;
}) {
  const pct = goal.targetAmount > 0 ? (goal.savedAmount / goal.targetAmount) * 100 : 0;
  const isCompleted = goal.status === 'completed';
  const accentColor = isCompleted ? colors.success : colors.primary;

  return (
    <TouchableOpacity
      onPress={onContribute}
      onLongPress={onDelete}
      activeOpacity={onContribute ? 0.75 : 1}
      style={[styles.goalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={[styles.goalAccent, { backgroundColor: accentColor }]} />
      <View style={styles.goalInner}>
        <View style={styles.goalTop}>
          <View style={[styles.goalEmojiWrap, { backgroundColor: `${accentColor}18` }]}>
            <Text style={styles.goalEmoji}>{goal.emoji}</Text>
          </View>
          <View style={styles.goalMeta}>
            <Text style={[styles.goalName, { color: colors.textPrimary }]} numberOfLines={1}>
              {goal.name}
            </Text>
            <Text style={[styles.goalPct, { color: accentColor }]}>
              {isCompleted ? '✓ ' : ''}{Math.round(pct)}%
            </Text>
          </View>
          <View style={styles.goalAmounts}>
            <Text style={[styles.goalSaved, { color: accentColor }]}>
              {formatCurrency(goal.savedAmount)}
            </Text>
            <Text style={[styles.goalTarget, { color: colors.textTertiary }]}>
              {' / '}{formatCurrency(goal.targetAmount)}
            </Text>
          </View>
        </View>
        <ProgressBar percent={pct} color={accentColor} />
        {isCompleted && goal.completedAt && (
          <Text style={[styles.completedDate, { color: colors.textTertiary }]}>
            {goal.completedAt.toDate().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function GoalsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const { showToast } = useToast();
  const transitionRef = useRef<ScreenTransitionRef>(null);

  const { goals, loading, addGoal, addContribution, deleteGoal } = useGoals(user?.uid ?? '');

  const activeGoals = useMemo(() => goals.filter((g) => g.status === 'active'), [goals]);
  const completedGoals = useMemo(() => goals.filter((g) => g.status === 'completed'), [goals]);

  const [tab, setTab] = useState<TabType>('active');
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [saving, setSaving] = useState(false);

  // Create form
  const [nameInput, setNameInput] = useState('');
  const [emojiInput, setEmojiInput] = useState('');
  const [targetInput, setTargetInput] = useState('');

  // Contribute form
  const [contributionInput, setContributionInput] = useState('');

  const closeDialog = () => {
    setDialogMode(null);
    setSelectedGoal(null);
    setNameInput('');
    setEmojiInput('');
    setTargetInput('');
    setContributionInput('');
  };

  const openCreate = () => setDialogMode('create');

  const openContribute = (goal: Goal) => {
    setSelectedGoal(goal);
    setContributionInput('');
    setDialogMode('contribute');
  };

  const openDelete = (goal: Goal) => {
    setSelectedGoal(goal);
    setDialogMode('delete');
  };

  const handleCreate = async () => {
    const target = parseInt(targetInput.replace(/\D/g, ''), 10);
    if (!nameInput.trim() || !emojiInput.trim() || !target || target <= 0) return;
    setSaving(true);
    try {
      await addGoal(nameInput.trim(), emojiInput.trim(), target);
      showToast(t('goals.toasts.created'), 'success');
      closeDialog();
    } catch {
      showToast(t('goals.toasts.error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleContribute = async () => {
    if (!selectedGoal) return;
    const amount = parseInt(contributionInput.replace(/\D/g, ''), 10);
    if (!amount || amount <= 0) return;
    setSaving(true);
    try {
      const completed = await addContribution(
        selectedGoal.id,
        amount,
        selectedGoal.savedAmount,
        selectedGoal.targetAmount,
      );
      closeDialog();
      if (completed) {
        showToast(t('goals.toasts.completed'), 'success');
        setSelectedGoal({ ...selectedGoal, savedAmount: selectedGoal.savedAmount + amount, status: 'completed' });
        setDialogMode('completed');
      } else {
        showToast(t('goals.toasts.contributed'), 'success');
      }
    } catch {
      showToast(t('goals.toasts.error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedGoal) return;
    setSaving(true);
    try {
      await deleteGoal(selectedGoal.id);
      showToast(t('goals.toasts.deleted'), 'success');
      closeDialog();
    } catch {
      showToast(t('goals.toasts.error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const isCreateDisabled =
    !nameInput.trim() ||
    !emojiInput.trim() ||
    parseInt(targetInput.replace(/\D/g, ''), 10) <= 0 ||
    targetInput.trim() === '';

  const isContributeDisabled =
    parseInt(contributionInput.replace(/\D/g, ''), 10) <= 0 ||
    contributionInput.trim() === '';

  const displayedGoals = tab === 'active' ? activeGoals : completedGoals;

  return (
    <ScreenTransition ref={transitionRef}>
      <SafeAreaView style={styles.safe}>
        <ScreenBackground>
          <AppHeader showBack onBack={() => transitionRef.current?.animateOut(() => router.back())} />
          <PageTitle title={t('goals.title')} description={t('goals.pageDesc')} />

          {/* Tabs */}
          <View style={[styles.tabRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {(['active', 'completed'] as TabType[]).map((tabKey) => {
              const isActive = tab === tabKey;
              return (
                <TouchableOpacity
                  key={tabKey}
                  style={[styles.tabBtn, isActive && { backgroundColor: colors.primary }]}
                  onPress={() => setTab(tabKey)}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.tabLabel,
                      { color: isActive ? colors.onPrimary : colors.textSecondary },
                    ]}
                  >
                    {tabKey === 'active' ? t('goals.activeTab') : t('goals.completedTab')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
              {/* Nueva meta button (solo en tab activas) */}
              {tab === 'active' && (
                <TouchableOpacity
                  onPress={openCreate}
                  activeOpacity={0.8}
                  style={[styles.newGoalBtn, { backgroundColor: colors.primary }]}
                >
                  <Ionicons name="add" size={18} color={colors.onPrimary} />
                  <Text style={[styles.newGoalBtnText, { color: colors.onPrimary }]}>
                    {t('goals.newGoalButton')}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Estado vacío */}
              {displayedGoals.length === 0 && (
                <LinearGradient
                  colors={[`${colors.primary}18`, `${colors.primary}06`]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.emptyCard, { borderColor: `${colors.primary}25`, borderWidth: 1 }]}
                >
                  <View style={[styles.emptyIconWrap, { backgroundColor: `${colors.primary}18` }]}>
                    <Ionicons name="flag-outline" size={36} color={colors.primary} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                    {tab === 'active' ? t('goals.emptyActive') : t('goals.emptyCompleted')}
                  </Text>
                  <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                    {tab === 'active' ? t('goals.emptyActiveSub') : t('goals.emptyCompletedSub')}
                  </Text>
                </LinearGradient>
              )}

              {/* Lista de metas */}
              {displayedGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  colors={colors}
                  t={t}
                  onContribute={goal.status === 'active' ? () => openContribute(goal) : undefined}
                  onDelete={() => openDelete(goal)}
                />
              ))}

              <View style={{ height: 100 }} />
            </ScrollView>
          )}

          {/* Dialog: Crear meta */}
          {dialogMode === 'create' && (
            <AppDialog
              visible
              type="info"
              title={t('goals.createTitle')}
              description={
                <View style={{ alignSelf: 'stretch', gap: 12 }}>
                  <View>
                    <Text style={{ fontFamily: Fonts.regular, fontSize: 13, marginBottom: 6, color: colors.textSecondary }}>
                      {t('goals.emojiLabel')}
                    </Text>
                    <TextInput
                      value={emojiInput}
                      onChangeText={setEmojiInput}
                      placeholder={t('goals.emojiPlaceholder')}
                      style={{
                        borderWidth: 1.5,
                        borderColor: emojiInput ? colors.primary : colors.border,
                        borderRadius: 12,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        fontFamily: Fonts.regular,
                        fontSize: 22,
                        color: colors.textPrimary,
                        backgroundColor: colors.backgroundSecondary,
                        textAlign: 'center',
                      }}
                      maxLength={4}
                    />
                  </View>
                  <View>
                    <Text style={{ fontFamily: Fonts.regular, fontSize: 13, marginBottom: 6, color: colors.textSecondary }}>
                      {t('goals.nameLabel')}
                    </Text>
                    <TextInput
                      value={nameInput}
                      onChangeText={setNameInput}
                      placeholder={t('goals.namePlaceholder')}
                      style={{
                        borderWidth: 1.5,
                        borderColor: nameInput ? colors.primary : colors.border,
                        borderRadius: 12,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        fontFamily: Fonts.regular,
                        fontSize: 15,
                        color: colors.textPrimary,
                        backgroundColor: colors.backgroundSecondary,
                      }}
                      maxLength={40}
                    />
                  </View>
                  <View>
                    <Text style={{ fontFamily: Fonts.regular, fontSize: 13, marginBottom: 6, color: colors.textSecondary }}>
                      {t('goals.targetLabel')}
                    </Text>
                    <TextInput
                      value={targetInput}
                      onChangeText={(v) => setTargetInput(formatCurrencyInput(v))}
                      placeholder={t('goals.targetPlaceholder')}
                      keyboardType="numeric"
                      style={{
                        borderWidth: 1.5,
                        borderColor: targetInput ? colors.primary : colors.border,
                        borderRadius: 12,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        fontFamily: Fonts.semiBold,
                        fontSize: 18,
                        color: colors.textPrimary,
                        backgroundColor: colors.backgroundSecondary,
                      }}
                    />
                  </View>
                </View>
              }
              primaryLabel={t('goals.createButton')}
              secondaryLabel={t('goals.cancelButton')}
              onPrimary={handleCreate}
              onSecondary={closeDialog}
              loading={saving}
              primaryDisabled={isCreateDisabled}
            />
          )}

          {/* Dialog: Agregar contribución */}
          {dialogMode === 'contribute' && selectedGoal && (
            <AppDialog
              visible
              type="info"
              title={t('goals.addContributionTitle')}
              description={
                <View style={{ alignSelf: 'stretch' }}>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: `${colors.primary}15`,
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 14,
                  }}>
                    <Text style={{ fontSize: 22 }}>{selectedGoal.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: Fonts.semiBold, fontSize: 14, color: colors.textPrimary }}>
                        {selectedGoal.name}
                      </Text>
                      <Text style={{ fontFamily: Fonts.regular, fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                        {formatCurrency(selectedGoal.savedAmount)}
                        {' '}{t('goals.of')}{' '}
                        <Text style={{ fontFamily: Fonts.bold, color: colors.primary }}>
                          {formatCurrency(selectedGoal.targetAmount)}
                        </Text>
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontFamily: Fonts.regular, fontSize: 13, marginBottom: 8, color: colors.textSecondary }}>
                    {t('goals.contributionLabel')}
                  </Text>
                  <TextInput
                    value={contributionInput}
                    onChangeText={(v) => setContributionInput(formatCurrencyInput(v))}
                    placeholder="$ 0"
                    keyboardType="numeric"
                    autoFocus
                    style={{
                      borderWidth: 1.5,
                      borderColor: contributionInput ? colors.primary : colors.border,
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      fontFamily: Fonts.semiBold,
                      fontSize: 18,
                      color: colors.textPrimary,
                      backgroundColor: colors.backgroundSecondary,
                      width: '100%',
                    }}
                  />
                </View>
              }
              primaryLabel={t('goals.addButton')}
              secondaryLabel={t('goals.cancelButton')}
              onPrimary={handleContribute}
              onSecondary={closeDialog}
              loading={saving}
              primaryDisabled={isContributeDisabled}
            />
          )}

          {/* Dialog: Eliminar */}
          {dialogMode === 'delete' && selectedGoal && (
            <AppDialog
              visible
              type="warning"
              title={t('goals.deleteTitle')}
              description={
                <Text style={{ fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20, color: colors.textSecondary, textAlign: 'center', alignSelf: 'stretch' }}>
                  {t('goals.deleteDescBefore')}{' '}
                  <Text style={{ fontFamily: Fonts.bold, color: colors.textPrimary }}>{selectedGoal.name}</Text>
                  {t('goals.deleteDescAfter')}
                </Text>
              }
              primaryLabel={t('goals.deleteButton')}
              secondaryLabel={t('goals.cancelButton')}
              onPrimary={handleDelete}
              onSecondary={closeDialog}
              loading={saving}
            />
          )}

          {/* Dialog: Meta cumplida */}
          {dialogMode === 'completed' && selectedGoal && (
            <AppDialog
              visible
              type="success"
              title={t('goals.completedTitle')}
              description={
                <Text style={{ fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20, color: colors.textSecondary, textAlign: 'center', alignSelf: 'stretch' }}>
                  {t('goals.completedDesc')}{' '}
                  <Text style={{ fontFamily: Fonts.bold, color: colors.textPrimary }}>{selectedGoal.name}</Text>
                  {t('goals.completedDescAfter')}
                </Text>
              }
              primaryLabel={t('goals.gotIt')}
              onPrimary={() => {
                closeDialog();
                setTab('completed');
              }}
            />
          )}
        </ScreenBackground>
      </SafeAreaView>
    </ScreenTransition>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, paddingTop: 8, paddingBottom: 40 },
  // Tabs
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
  },
  tabLabel: { fontFamily: Fonts.semiBold, fontSize: 14 },
  // Nueva meta
  newGoalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  newGoalBtnText: { fontFamily: Fonts.semiBold, fontSize: 15 },
  // Empty state
  emptyCard: { borderRadius: 20, padding: 36, alignItems: 'center', marginBottom: 16 },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontFamily: Fonts.bold, marginBottom: 8, textAlign: 'center' },
  emptySub: { fontSize: 14, fontFamily: Fonts.regular, textAlign: 'center', lineHeight: 21 },
  // Goal card
  goalCard: {
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  goalAccent: { width: 4 },
  goalInner: { flex: 1, padding: 14 },
  goalTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  goalEmojiWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  goalEmoji: { fontSize: 22 },
  goalMeta: { flex: 1 },
  goalName: { fontSize: 14, fontFamily: Fonts.semiBold },
  goalPct: { fontSize: 11, fontFamily: Fonts.medium, marginTop: 2 },
  goalAmounts: { flexDirection: 'row', alignItems: 'baseline' },
  goalSaved: { fontSize: 12, fontFamily: Fonts.bold },
  goalTarget: { fontSize: 11, fontFamily: Fonts.regular },
  completedDate: { fontSize: 11, fontFamily: Fonts.regular, marginTop: 6 },
});
```

- [ ] **Step 2: Commit**

```bash
git add app/goals.tsx
git commit -m "feat: pantalla Metas con tabs Activas/Completadas y dialogs CRUD"
```

---

### Task 7: Actualizar app/notifications.tsx

**Files:**
- Modify: `app/notifications.tsx`

- [ ] **Step 1: Agregar goal_monthly_reminder a NOTIF_ICONS y NOTIF_COLORS**

En `app/notifications.tsx`, actualizar los objetos:

```typescript
const NOTIF_ICONS: Record<NotificationType, React.ComponentProps<typeof Ionicons>['name']> = {
  friend_request: 'person-add-outline',
  friend_accepted: 'people-outline',
  shared_transaction_added: 'people-circle-outline',
  shared_transaction_updated: 'create-outline',
  shared_transaction_deleted: 'trash-outline',
  goal_monthly_reminder: 'flag-outline',
};

const NOTIF_COLORS: Record<NotificationType, 'primary' | 'success'> = {
  friend_request: 'primary',
  friend_accepted: 'success',
  shared_transaction_added: 'primary',
  shared_transaction_updated: 'primary',
  shared_transaction_deleted: 'primary',
  goal_monthly_reminder: 'primary',
};
```

- [ ] **Step 2: Actualizar text interpolation en NotifItem para pasar count**

Reemplazar la línea `const text = ...` en `NotifItem`:

```typescript
const text = t(`notifications.${notif.type}`, {
  ...notif.data,
  name: (notif.data as any).fromDisplayName,
  fromDisplayName: (notif.data as any).fromDisplayName,
  description: (notif.data as any).description,
});
```

- [ ] **Step 3: Commit**

```bash
git add app/notifications.tsx
git commit -m "feat: soporte goal_monthly_reminder en pantalla notificaciones"
```

---

### Task 8: Cloud Functions — recordatorio mensual

**Files:**
- Create: `functions/package.json`
- Create: `functions/tsconfig.json`
- Create: `functions/src/index.ts`
- Modify: `firebase.json`

> **Prerequisito:** Tener Firebase CLI instalado (`npm i -g firebase-tools`) y estar autenticado (`firebase login`).

- [ ] **Step 1: Crear functions/package.json**

```json
{
  "name": "functions",
  "scripts": {
    "build": "tsc",
    "deploy": "npm run build && firebase deploy --only functions"
  },
  "engines": { "node": "20" },
  "main": "lib/index.js",
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^6.0.0"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "@types/node": "^20.0.0"
  },
  "private": true
}
```

- [ ] **Step 2: Crear functions/tsconfig.json**

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "noImplicitReturns": true,
    "noUnusedLocals": false,
    "outDir": "lib",
    "sourceMap": true,
    "strict": true,
    "target": "es2017",
    "esModuleInterop": true
  },
  "compileOnSave": true,
  "include": ["src"]
}
```

- [ ] **Step 3: Crear functions/src/index.ts**

```typescript
// functions/src/index.ts
import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';

admin.initializeApp();
const db = admin.firestore();

// Día 3 de cada mes a las 9:00 AM hora Colombia
// timeZone convierte automáticamente — el schedule va en hora local Colombia
export const goalsMonthlyReminder = onSchedule(
  { schedule: '0 9 3 * *', timeZone: 'America/Bogota' },
  async () => {
    const goalsSnap = await db
      .collection('goals')
      .where('status', '==', 'active')
      .get();

    if (goalsSnap.empty) return;

    // Agrupar metas por userId
    const countByUser: Record<string, number> = {};
    for (const docSnap of goalsSnap.docs) {
      const { userId } = docSnap.data();
      countByUser[userId] = (countByUser[userId] ?? 0) + 1;
    }

    // Escribir una notificación por usuario
    const batch = db.batch();
    for (const [userId, count] of Object.entries(countByUser)) {
      const notifRef = db.collection('notifications').doc();
      batch.set(notifRef, {
        toUserId: userId,
        type: 'goal_monthly_reminder',
        read: false,
        createdAt: admin.firestore.Timestamp.now(),
        data: { count },
      });
    }
    await batch.commit();
  },
);
```

> **Nota sobre el schedule:** `0 14 3 * *` = 9:00 AM Colombia (UTC-5 = UTC+14:00 → usar hora UTC que corresponda). Verificar con el timezone `America/Bogota` en el campo `timeZone` que ya convierte automáticamente.

- [ ] **Step 4: Actualizar firebase.json**

```json
{
  "firestore": {
    "rules": "firestore.rules"
  },
  "functions": {
    "source": "functions",
    "codebase": "default"
  }
}
```

- [ ] **Step 5: Instalar dependencias y compilar**

```bash
cd functions && npm install && npm run build
```

Expected: carpeta `functions/lib/` generada sin errores de TypeScript.

- [ ] **Step 6: Deploy de la Cloud Function**

```bash
cd .. && firebase deploy --only functions
```

Expected: `Deploy complete! Project Console: https://console.firebase.google.com/...`

- [ ] **Step 7: Commit**

```bash
git add functions/ firebase.json
git commit -m "feat: Cloud Function goalsMonthlyReminder - recordatorio día 3 cada mes"
```

---

## Verificación final

- [ ] Abrir app en web (`npx expo start` → tecla `w`)
- [ ] Verificar que aparece el 4to tab "Herramientas" en la nav inferior
- [ ] Navegar a Herramientas → ver card "Metas de ahorro"
- [ ] Tap en card → pantalla Metas con tabs Activas/Completadas
- [ ] Crear una meta con emoji, nombre y monto
- [ ] Tap en la meta → agregar contribución
- [ ] Agregar contribución que complete la meta → dialog de celebración → meta pasa a "Completadas"
- [ ] Long press en meta → eliminar
- [ ] Verificar en Firebase Console → colección `goals` tiene los documentos correctos
- [ ] Verificar en Firebase Console → Functions → `goalsMonthlyReminder` desplegada

```bash
git add -A
git commit -m "feat: módulo Metas de ahorro completo con hub Herramientas y recordatorio mensual"
```
