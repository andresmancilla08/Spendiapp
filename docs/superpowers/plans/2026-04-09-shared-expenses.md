# Gastos Compartidos — Fase 2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar el formulario de nueva transacción a pantalla completa, agregar sección "Compartir este gasto" con selección de amigos y cálculo proporcional de cuotas, crear docs espejo en Firestore por participante, y mostrar chip visual en el historial.

**Architecture:** Patrón de documentos espejo en la colección plana `transactions` (cada participante tiene su propio doc con su `userId`). Una colección `sharedTransactions` actúa como coordinador de refs para propagación de eliminaciones. Toda la lógica corre en el cliente con `writeBatch`, sin Cloud Functions. El formulario de nueva transacción se migra de modal a pantalla completa en `app/add-transaction.tsx`.

**Tech Stack:** React Native + Expo Router, Firebase Firestore (writeBatch, onSnapshot), react-i18next (es/en/it), expo-crypto (UUID), TypeScript

---

## File Map

| Archivo | Acción |
|---------|--------|
| `types/transaction.ts` | Modificar — agregar campos `isShared`, `sharedId`, `sharedOwnerUid`, `sharedOwnerUserName`, `sharedParticipants`, `sharedAmount` |
| `types/sharedTransaction.ts` | Crear — interfaces `SharedParticipant`, `MirrorRef`, `SharedTransaction` |
| `types/friend.ts` | Modificar — extender `NotificationType` con 3 nuevos tipos |
| `utils/sharedCalc.ts` | Crear — `calcSharedAmount()` y `calcEqualPercentages()` |
| `hooks/useSharedTransactions.ts` | Crear — `createSharedTransaction`, `deleteSharedTransaction` |
| `hooks/useTransactions.ts` | Modificar — mapear campos compartidos en snapshot |
| `components/SharedExpenseSection.tsx` | Crear — sección del formulario (toggle + amigos + split + preview) |
| `components/SharedExpenseChip.tsx` | Crear — chip visual en historial |
| `app/add-transaction.tsx` | Crear — pantalla completa con toda la lógica del modal + `SharedExpenseSection` |
| `app/(tabs)/index.tsx` | Modificar — FAB apunta a `router.push('/add-transaction')` |
| `app/(tabs)/history.tsx` | Modificar — mostrar chip y `sharedAmount`, conectar delete compartido |
| `locales/es.json` | Modificar — claves `sharedExpense.*` + 3 tipos de notificación |
| `locales/en.json` | Ídem |
| `locales/it.json` | Ídem |
| `firestore.rules` | Modificar — reglas para colección `sharedTransactions` |

---

### Task 1: Extender tipos

**Files:**
- Create: `types/sharedTransaction.ts`
- Modify: `types/transaction.ts`
- Modify: `types/friend.ts`

- [ ] **Step 1: Crear `types/sharedTransaction.ts`**

```ts
import { Timestamp } from 'firebase/firestore';

export interface SharedParticipant {
  uid: string;
  userName: string;
  displayName: string;
  percentage: number; // 0-100, suma total debe ser 100
}

export interface MirrorRef {
  uid: string;
  transactionId: string; // ID del doc en /transactions (una entrada por doc)
  installmentGroupId?: string; // si es cuotas, mismo valor para las N entradas del participante
}

export interface SharedTransaction {
  sharedId: string;
  ownerUid: string;
  createdAt: Timestamp;
  mirrorRefs: MirrorRef[]; // incluye refs del owner Y de todos los participantes
  participantUids: string[]; // [ownerUid, p1Uid, p2Uid, ...] — array plano para reglas Firestore
}
```

- [ ] **Step 2: Extender `types/transaction.ts`**

Agregar al inicio del archivo:
```ts
import type { SharedParticipant } from './sharedTransaction';
```

Agregar al final de la interfaz `Transaction` (después de `isPaid?`):
```ts
  // Gastos compartidos — solo presentes si isShared === true
  isShared?: boolean;
  sharedId?: string;
  sharedOwnerUid?: string;
  sharedOwnerUserName?: string;
  sharedParticipants?: SharedParticipant[];
  sharedAmount?: number; // monto calculado para ESTE usuario específico
```

- [ ] **Step 3: Extender `NotificationType` en `types/friend.ts`**

Cambiar:
```ts
export type NotificationType = 'friend_request' | 'friend_accepted';
```
Por:
```ts
export type NotificationType =
  | 'friend_request'
  | 'friend_accepted'
  | 'shared_transaction_added'
  | 'shared_transaction_updated'
  | 'shared_transaction_deleted';
```

Agregar interfaz de datos para notificaciones de gastos compartidos al final del archivo:
```ts
export interface SharedTransactionNotificationData {
  fromUserId: string;
  fromUserName: string;
  fromDisplayName: string;
  sharedId: string;
  description: string;
  sharedAmount: number;
}
```

- [ ] **Step 4: Commit**

```bash
git add types/sharedTransaction.ts types/transaction.ts types/friend.ts
git commit -m "feat: extender tipos para gastos compartidos fase 2"
```

---

### Task 2: Utilidad de cálculo de montos compartidos

**Files:**
- Create: `utils/sharedCalc.ts`

- [ ] **Step 1: Crear `utils/sharedCalc.ts`**

```ts
/**
 * Calcula el monto mensual que corresponde a un participante.
 *
 * @param amount          Monto base de la transacción (entero, sin interés)
 * @param interestRate    TEA en porcentaje (0 si no aplica)
 * @param installmentTotal Número de cuotas (1 = pago único)
 * @param percentage      Porcentaje del participante (0-100)
 * @returns Monto redondeado al entero más cercano
 */
export function calcSharedAmount(
  amount: number,
  interestRate: number,
  installmentTotal: number,
  percentage: number,
): number {
  const withInterest = amount + (amount * interestRate / 100);
  const perPerson = withInterest * (percentage / 100);
  const monthly = perPerson / installmentTotal;
  return Math.round(monthly);
}

/**
 * Calcula porcentajes iguales para N participantes.
 * El último participante absorbe el residuo de redondeo para que la suma sea exactamente 100.
 *
 * @returns Array de N enteros que suma exactamente 100
 */
export function calcEqualPercentages(count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(100 / count);
  const remainder = 100 - base * count;
  return Array.from({ length: count }, (_, i) =>
    i === count - 1 ? base + remainder : base,
  );
}
```

- [ ] **Step 2: Verificar manualmente los cálculos**

Ejecutar en la terminal con node:
```bash
node -e "
const { calcSharedAmount, calcEqualPercentages } = require('./utils/sharedCalc');
console.log(calcSharedAmount(1200, 0, 4, 50));      // → 150
console.log(calcSharedAmount(1200, 0, 1, 50));      // → 600
console.log(calcEqualPercentages(2));               // → [50, 50]
console.log(calcEqualPercentages(3));               // → [33, 33, 34]
console.log(calcEqualPercentages(4));               // → [25, 25, 25, 25]
"
```

Si falla por ES modules, verificar manualmente que las fórmulas son correctas leyendo el código.

- [ ] **Step 3: Commit**

```bash
git add utils/sharedCalc.ts
git commit -m "feat: agregar utils calcSharedAmount y calcEqualPercentages"
```

---

### Task 3: Hook `useSharedTransactions`

**Files:**
- Create: `hooks/useSharedTransactions.ts`

- [ ] **Step 1: Crear `hooks/useSharedTransactions.ts`**

```ts
import {
  collection,
  doc,
  writeBatch,
  Timestamp,
  addDoc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { SharedParticipant, MirrorRef, SharedTransaction } from '../types/sharedTransaction';
import type { TransactionType } from '../types/transaction';
import { calcSharedAmount } from '../utils/sharedCalc';
import { calculateInstallments, calculateInstallmentDates } from '../utils/installmentCalc';
import * as Crypto from 'expo-crypto';

interface CreateSharedParams {
  participants: SharedParticipant[]; // incluye al owner con su porcentaje como primer elemento
  ownerUid: string;
  ownerUserName: string;
  baseDoc: {
    type: TransactionType;
    category: string;
    description: string;
    cardId?: string;
    isFixed: boolean;
  };
  amount: number;
  installmentCount: number;
  withInterest: boolean;
  teaValue: number | null;
  selectedDate: Date;
}

interface DeleteSharedParams {
  sharedId: string;
  currentUserUid: string;
  currentUserName: string;
  description: string;
}

export function useSharedTransactions() {
  async function createSharedTransaction(params: CreateSharedParams): Promise<void> {
    const {
      participants, ownerUid, ownerUserName, baseDoc,
      amount, installmentCount, withInterest, teaValue, selectedDate,
    } = params;

    const sharedId = doc(collection(db, 'sharedTransactions')).id;
    const batch = writeBatch(db);
    const mirrorRefs: MirrorRef[] = [];
    const participantUids = participants.map((p) => p.uid);
    const interestRate = (withInterest && teaValue != null) ? teaValue : 0;
    const isInstallment = installmentCount > 1;

    // Extraer cardId para no propagarlo a mirrors
    const { cardId, ...baseDocWithoutCard } = baseDoc;

    for (const participant of participants) {
      const isOwner = participant.uid === ownerUid;

      const sharedFields = {
        isShared: true,
        sharedId,
        sharedOwnerUid: ownerUid,
        sharedOwnerUserName: ownerUserName,
        sharedParticipants: participants,
        sharedAmount: calcSharedAmount(amount, interestRate, installmentCount, participant.percentage),
      };

      if (isInstallment) {
        // Para cuotas: calcular sobre el monto proporcional al porcentaje del participante
        const participantBaseAmount = Math.round(amount * participant.percentage / 100);
        const amounts = calculateInstallments(
          participantBaseAmount,
          installmentCount,
          withInterest ? teaValue : null,
        );
        const dates = calculateInstallmentDates(selectedDate, installmentCount);
        const groupId = Crypto.randomUUID();

        amounts.forEach((amt, i) => {
          const ref = doc(collection(db, 'transactions'));
          batch.set(ref, {
            userId: participant.uid,
            ...baseDocWithoutCard,
            ...(isOwner && cardId ? { cardId } : {}),
            amount: amt,
            date: Timestamp.fromDate(dates[i]),
            createdAt: Timestamp.fromDate(new Date()),
            isFixed: false,
            installmentGroupId: groupId,
            installmentNumber: i + 1,
            installmentTotal: installmentCount,
            isInstallment: true,
            ...sharedFields,
          });
          mirrorRefs.push({
            uid: participant.uid,
            transactionId: ref.id,
            installmentGroupId: groupId,
          });
        });
      } else {
        const ref = doc(collection(db, 'transactions'));
        const sharedAmount = calcSharedAmount(amount, interestRate, 1, participant.percentage);
        batch.set(ref, {
          userId: participant.uid,
          ...baseDocWithoutCard,
          ...(isOwner && cardId ? { cardId } : {}),
          amount,
          date: Timestamp.fromDate(selectedDate),
          createdAt: Timestamp.fromDate(new Date()),
          ...sharedFields,
          sharedAmount,
        });
        mirrorRefs.push({ uid: participant.uid, transactionId: ref.id });
      }
    }

    // Doc de coordinación en /sharedTransactions/{sharedId}
    const coordRef = doc(db, 'sharedTransactions', sharedId);
    const coordData: SharedTransaction = {
      sharedId,
      ownerUid,
      createdAt: Timestamp.fromDate(new Date()),
      mirrorRefs,
      participantUids,
    };
    batch.set(coordRef, coordData);

    await batch.commit();

    // Enviar notificaciones a participantes no-owner (fuera del batch — no crítico)
    const nonOwners = participants.filter((p) => p.uid !== ownerUid);
    for (const p of nonOwners) {
      await addDoc(collection(db, 'notifications'), {
        toUserId: p.uid,
        type: 'shared_transaction_added',
        data: {
          fromUserId: ownerUid,
          fromUserName: ownerUserName,
          fromDisplayName: ownerUserName,
          sharedId,
          description: baseDoc.description,
          sharedAmount: calcSharedAmount(amount, interestRate, installmentCount, p.percentage),
        },
        read: false,
        createdAt: Timestamp.fromDate(new Date()),
      });
    }
  }

  async function deleteSharedTransaction(params: DeleteSharedParams): Promise<void> {
    const { sharedId, currentUserUid, currentUserName, description } = params;

    const coordSnap = await getDoc(doc(db, 'sharedTransactions', sharedId));
    if (!coordSnap.exists()) return;

    const coordData = coordSnap.data() as SharedTransaction;
    const batch = writeBatch(db);

    // Eliminar todos los docs de transacciones (owner + mirrors)
    for (const ref of coordData.mirrorRefs) {
      batch.delete(doc(db, 'transactions', ref.transactionId));
    }

    // Eliminar doc de coordinación
    batch.delete(doc(db, 'sharedTransactions', sharedId));

    await batch.commit();

    // Notificaciones a todos los participantes excepto quien eliminó
    const others = coordData.participantUids.filter((uid) => uid !== currentUserUid);
    for (const uid of others) {
      await addDoc(collection(db, 'notifications'), {
        toUserId: uid,
        type: 'shared_transaction_deleted',
        data: {
          fromUserId: currentUserUid,
          fromUserName: currentUserName,
          fromDisplayName: currentUserName,
          sharedId,
          description,
          sharedAmount: 0,
        },
        read: false,
        createdAt: Timestamp.fromDate(new Date()),
      });
    }
  }

  return { createSharedTransaction, deleteSharedTransaction };
}
```

- [ ] **Step 2: Commit**

```bash
git add hooks/useSharedTransactions.ts
git commit -m "feat: agregar hook useSharedTransactions con create y delete"
```

---

### Task 4: Actualizar `useTransactions` para mapear campos compartidos

**Files:**
- Modify: `hooks/useTransactions.ts`

- [ ] **Step 1: Agregar mapeo de campos en el snapshot de Query 1**

En `hooks/useTransactions.ts`, en el `.map((doc) => { ... })` (alrededor de la línea 56), agregar los siguientes campos al objeto retornado, después de `isPaid`:

```ts
isShared: d.isShared ?? false,
sharedId: d.sharedId,
sharedOwnerUid: d.sharedOwnerUid,
sharedOwnerUserName: d.sharedOwnerUserName,
sharedParticipants: d.sharedParticipants,
sharedAmount: d.sharedAmount,
```

- [ ] **Step 2: Commit**

```bash
git add hooks/useTransactions.ts
git commit -m "feat: mapear campos compartidos en useTransactions snapshot"
```

---

### Task 5: Componente `SharedExpenseSection`

**Files:**
- Create: `components/SharedExpenseSection.tsx`

- [ ] **Step 1: Crear `components/SharedExpenseSection.tsx`**

```tsx
// components/SharedExpenseSection.tsx
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Switch,
} from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../config/fonts';
import { useFriends } from '../hooks/useFriends';
import { getUserProfile } from '../hooks/useUserProfile';
import type { UserProfile } from '../types/friend';
import type { SharedParticipant } from '../types/sharedTransaction';
import { calcEqualPercentages, calcSharedAmount } from '../utils/sharedCalc';

interface Props {
  userId: string;
  userName: string;        // userName del usuario actual (owner)
  displayName: string;     // displayName del usuario actual
  isShared: boolean;
  onIsSharedChange: (v: boolean) => void;
  participants: SharedParticipant[];       // solo participantes no-owner seleccionados
  onParticipantsChange: (p: SharedParticipant[]) => void;
  amount: number;
  interestRate: number;
  installmentCount: number;
  ownerPercentage: number;
  onOwnerPercentageChange: (p: number) => void;
}

type SplitType = 'equal' | 'custom';

export default function SharedExpenseSection({
  userId, userName, displayName,
  isShared, onIsSharedChange,
  participants, onParticipantsChange,
  amount, interestRate, installmentCount,
  ownerPercentage, onOwnerPercentageChange,
}: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { acceptedFriends } = useFriends(userId);
  const [friendProfiles, setFriendProfiles] = useState<UserProfile[]>([]);
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});

  // Cargar perfiles de amigos aceptados al montar
  useEffect(() => {
    if (acceptedFriends.length === 0) return;
    async function load() {
      const profiles: UserProfile[] = [];
      for (const f of acceptedFriends) {
        const friendUid = f.fromId === userId ? f.toId : f.fromId;
        const profile = await getUserProfile(friendUid);
        if (profile) profiles.push(profile);
      }
      setFriendProfiles(profiles);
    }
    load();
  }, [acceptedFriends, userId]);

  // Recalcular porcentajes iguales cuando cambian los participantes o el tipo de split
  useEffect(() => {
    if (splitType !== 'equal') return;
    const total = participants.length + 1; // +1 por el owner
    const percs = calcEqualPercentages(total);
    onOwnerPercentageChange(percs[0]);
    onParticipantsChange(
      participants.map((p, i) => ({ ...p, percentage: percs[i + 1] })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participants.length, splitType]);

  const toggleFriend = (profile: UserProfile) => {
    const exists = participants.find((p) => p.uid === profile.uid);
    if (exists) {
      onParticipantsChange(participants.filter((p) => p.uid !== profile.uid));
    } else {
      onParticipantsChange([
        ...participants,
        { uid: profile.uid, userName: profile.userName, displayName: profile.displayName, percentage: 0 },
      ]);
    }
  };

  const allParticipants: SharedParticipant[] = [
    { uid: userId, userName, displayName, percentage: ownerPercentage },
    ...participants,
  ];
  const totalPct = Math.round(ownerPercentage + participants.reduce((s, p) => s + p.percentage, 0));
  const isPctValid = totalPct === 100;

  return (
    <View style={styles.root}>

      {/* Toggle principal */}
      <View style={[styles.toggleRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <View style={styles.toggleLabel}>
          <Ionicons name="people-outline" size={20} color={colors.primary} />
          <Text style={[styles.toggleText, { color: colors.textPrimary }]}>
            {t('sharedExpense.toggle')}
          </Text>
        </View>
        <Switch
          value={isShared}
          onValueChange={onIsSharedChange}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.onPrimary}
        />
      </View>

      {isShared && (
        <>
          {/* Lista de amigos */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            {t('sharedExpense.withWho').toUpperCase()}
          </Text>

          {friendProfiles.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {t('sharedExpense.noFriends')}
            </Text>
          ) : (
            friendProfiles.map((profile) => {
              const selected = !!participants.find((p) => p.uid === profile.uid);
              return (
                <TouchableOpacity
                  key={profile.uid}
                  style={[
                    styles.friendRow,
                    {
                      backgroundColor: selected ? colors.primaryLight : colors.surface,
                      borderColor: selected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => toggleFriend(profile)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.friendDisplay, { color: colors.textPrimary }]}>
                    {profile.displayName}
                  </Text>
                  <Text style={[styles.friendUser, { color: colors.textSecondary }]}>
                    @{profile.userName}
                  </Text>
                  {selected && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })
          )}

          {participants.length > 0 && (
            <>
              {/* Tipo de split */}
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                {t('sharedExpense.splitType').toUpperCase()}
              </Text>
              <View style={styles.splitRow}>
                {(['equal', 'custom'] as SplitType[]).map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.splitBtn,
                      {
                        backgroundColor: splitType === s ? colors.primary : colors.surface,
                        borderColor: splitType === s ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setSplitType(s)}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.splitBtnText,
                      { color: splitType === s ? colors.onPrimary : colors.textSecondary },
                    ]}>
                      {t(s === 'equal' ? 'sharedExpense.equalParts' : 'sharedExpense.customParts')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Porcentajes personalizados */}
              {splitType === 'custom' && (
                <View style={styles.pctContainer}>
                  {allParticipants.map((p) => {
                    const isOwnerRow = p.uid === userId;
                    const inputVal = isOwnerRow
                      ? String(ownerPercentage)
                      : (customInputs[p.uid] ?? String(p.percentage));

                    return (
                      <View key={p.uid} style={styles.pctRow}>
                        <Text style={[styles.pctName, { color: colors.textPrimary }]}>
                          {isOwnerRow ? t('sharedExpense.you') : `@${p.userName}`}
                        </Text>
                        <View style={[styles.pctInput, { borderColor: !isPctValid ? colors.error : colors.border }]}>
                          <TextInput
                            value={inputVal}
                            onChangeText={(v) => {
                              const num = Math.min(100, parseInt(v.replace(/\D/g, ''), 10) || 0);
                              if (isOwnerRow) {
                                onOwnerPercentageChange(num);
                              } else {
                                setCustomInputs((prev) => ({ ...prev, [p.uid]: v }));
                                onParticipantsChange(
                                  participants.map((pp) =>
                                    pp.uid === p.uid ? { ...pp, percentage: num } : pp,
                                  ),
                                );
                              }
                            }}
                            keyboardType="number-pad"
                            maxLength={3}
                            style={[styles.pctTextInput, { color: colors.textPrimary }]}
                          />
                          <Text style={[styles.pctSymbol, { color: colors.textSecondary }]}>%</Text>
                        </View>
                      </View>
                    );
                  })}
                  {!isPctValid && (
                    <Text style={[styles.pctError, { color: colors.error }]}>
                      {t('sharedExpense.percentageError', { total: totalPct })}
                    </Text>
                  )}
                </View>
              )}

              {/* Preview */}
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                {t('sharedExpense.preview').toUpperCase()}
              </Text>
              <View style={[styles.previewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {allParticipants.map((p) => {
                  const isOwnerRow = p.uid === userId;
                  const monthly = calcSharedAmount(amount, interestRate, installmentCount, p.percentage);
                  const formatted = monthly.toLocaleString('es-CO');
                  return (
                    <View key={p.uid} style={styles.previewRow}>
                      <Text style={[styles.previewName, { color: colors.textPrimary }]}>
                        {isOwnerRow ? t('sharedExpense.you') : `@${p.userName}`}
                      </Text>
                      <Text style={[styles.previewAmt, { color: colors.primary }]}>
                        {installmentCount > 1
                          ? t('sharedExpense.previewInstallment', { amount: `$${formatted}`, n: installmentCount })
                          : `$${formatted}`}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginTop: 12 },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 16,
    borderWidth: StyleSheet.hairlineWidth, borderRadius: 14,
  },
  toggleLabel: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toggleText: { fontSize: 15, fontFamily: Fonts.medium },
  sectionLabel: {
    fontSize: 11, fontFamily: Fonts.bold, letterSpacing: 0.6,
    marginTop: 16, marginBottom: 8,
  },
  emptyText: { fontSize: 14, fontFamily: Fonts.regular, textAlign: 'center', paddingVertical: 8 },
  friendRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, marginBottom: 6,
  },
  friendDisplay: { fontSize: 14, fontFamily: Fonts.medium, flex: 1 },
  friendUser: { fontSize: 12, fontFamily: Fonts.regular },
  splitRow: { flexDirection: 'row', gap: 10 },
  splitBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth, alignItems: 'center',
  },
  splitBtnText: { fontSize: 13, fontFamily: Fonts.medium },
  pctContainer: { marginTop: 10, gap: 10 },
  pctRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pctName: { fontSize: 14, fontFamily: Fonts.regular, flex: 1 },
  pctInput: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, minWidth: 72,
  },
  pctTextInput: { fontSize: 15, fontFamily: Fonts.bold, textAlign: 'center', minWidth: 36 },
  pctSymbol: { fontSize: 15, fontFamily: Fonts.regular },
  pctError: { fontSize: 12, fontFamily: Fonts.regular, textAlign: 'center', marginTop: 2 },
  previewCard: {
    borderRadius: 14, padding: 14,
    borderWidth: StyleSheet.hairlineWidth, gap: 10,
  },
  previewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  previewName: { fontSize: 14, fontFamily: Fonts.regular },
  previewAmt: { fontSize: 14, fontFamily: Fonts.bold },
});
```

- [ ] **Step 2: Commit**

```bash
git add components/SharedExpenseSection.tsx
git commit -m "feat: agregar componente SharedExpenseSection"
```

---

### Task 6: Componente `SharedExpenseChip`

**Files:**
- Create: `components/SharedExpenseChip.tsx`

- [ ] **Step 1: Crear `components/SharedExpenseChip.tsx`**

```tsx
// components/SharedExpenseChip.tsx
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../config/fonts';
import { useTranslation } from 'react-i18next';
import type { SharedParticipant } from '../types/sharedTransaction';

interface Props {
  isOwner: boolean;
  ownerUserName?: string;
  participants?: SharedParticipant[];
  currentUid: string;
}

export default function SharedExpenseChip({ isOwner, ownerUserName, participants = [], currentUid }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  let label: string;
  if (isOwner) {
    const others = participants.filter((p) => p.uid !== currentUid);
    if (others.length === 0) {
      label = t('sharedExpense.chip.sharedWith', { name: '—' });
    } else if (others.length <= 2) {
      const names = others.map((o) => `@${o.userName}`).join(` ${t('common.and')} `);
      label = t('sharedExpense.chip.sharedWith', { name: names });
    } else {
      label = t('sharedExpense.chip.sharedWithMore', {
        name: `@${others[0].userName}`,
        count: others.length - 1,
      });
    }
  } else {
    label = t('sharedExpense.chip.sharedBy', { name: `@${ownerUserName ?? ''}` });
  }

  return (
    <View style={[styles.chip, { backgroundColor: colors.primaryLight }]}>
      <Text style={[styles.text, { color: colors.primary }]}>
        {`👥 ${label}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
  },
  text: { fontSize: 11, fontFamily: Fonts.regular },
});
```

- [ ] **Step 2: Agregar clave `common.and` en locales**

En `locales/es.json` agregar en el objeto raíz:
```json
"common": { "and": "y" }
```
En `locales/en.json`:
```json
"common": { "and": "and" }
```
En `locales/it.json`:
```json
"common": { "and": "e" }
```

- [ ] **Step 3: Commit**

```bash
git add components/SharedExpenseChip.tsx locales/es.json locales/en.json locales/it.json
git commit -m "feat: agregar SharedExpenseChip y clave common.and en locales"
```

---

### Task 7: Crear `app/add-transaction.tsx` — pantalla completa

**Files:**
- Create: `app/add-transaction.tsx`

Esta pantalla contiene **exactamente el mismo código lógico** que `components/AddTransactionModal.tsx` (todos los estados, useEffects, handlers, y JSX de los campos), con tres diferencias:

1. En lugar de `<Modal>` + `<Animated.View>` usa `<SafeAreaView>` + `<ScrollView>` (pantalla fija)
2. El cierre se hace con `router.back()` en lugar de llamar `onClose()`
3. Al final del ScrollView se agrega `<SharedExpenseSection>` y el `handleSave` incluye la rama de `createSharedTransaction`

- [ ] **Step 1: Crear imports y estado en `app/add-transaction.tsx`**

```tsx
// app/add-transaction.tsx
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView,
  TextInput, TouchableOpacity, ActivityIndicator, Platform,
  FlatList, Switch, InputAccessoryView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRef, useEffect, useState, useCallback, type ElementRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { addDoc, collection, Timestamp, writeBatch, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { Fonts } from '../config/fonts';
import { router } from 'expo-router';
import type { TransactionType } from '../types/transaction';
import type { SharedParticipant } from '../types/sharedTransaction';
import { categorizeLocal, categorizeWithGemini } from '../utils/categorize';
import { useCategories } from '../hooks/useCategories';
import { filterCategories } from '../constants/categories';
import { suggestEmojiLocal, suggestEmojiWithGemini } from '../utils/suggestEmoji';
import { EmojiPicker } from '../components/EmojiPicker';
import type { CategoryType } from '../types/category';
import * as Crypto from 'expo-crypto';
import { useCards } from '../hooks/useCards';
import { useTEARate } from '../hooks/useTEARate';
import { calculateInstallments, calculateInstallmentDates } from '../utils/installmentCalc';
import BankLogo from '../components/BankLogo';
import { useSharedTransactions } from '../hooks/useSharedTransactions';
import { getUserProfile } from '../hooks/useUserProfile';
import SharedExpenseSection from '../components/SharedExpenseSection';

const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
const QUICK_DESC_CATEGORY_IDS = ['food', 'transport', 'health', 'entertainment', 'shopping', 'home', 'salary'];
const AMOUNT_INPUT_ID = 'spendiapp-amount-input';

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function formatDisplayDate(date: Date): string {
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}
function isToday(date: Date): boolean {
  const now = new Date();
  return date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}
```

- [ ] **Step 2: Definir el componente con TODO el estado original del modal**

```tsx
export default function AddTransactionScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const { showToast } = useToast();
  const { categories: customCategories } = useCategories(user?.uid ?? '');
  const { createSharedTransaction } = useSharedTransactions();

  const scrollRef = useRef<ElementRef<typeof ScrollView>>(null);
  const catScrollRef = useRef<ElementRef<typeof ScrollView>>(null);
  const chipOffsets = useRef<Record<string, number>>({});

  // Estado del formulario — igual que AddTransactionModal
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [isFixed, setIsFixed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { cards } = useCards(user?.uid ?? '');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [installmentCount, setInstallmentCount] = useState(1);
  const [withInterest, setWithInterest] = useState(false);
  const [teaInput, setTeaInput] = useState('');
  const { tea: referenceTEA } = useTEARate();

  const [showNewCatForm, setShowNewCatForm] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('📌');
  const [newCatType, setNewCatType] = useState<CategoryType>('expense');
  const [newCatSaving, setNewCatSaving] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [catExpanded, setCatExpanded] = useState(false);
  const [emojiSuggesting, setEmojiSuggesting] = useState(false);
  const [userPickedEmoji, setUserPickedEmoji] = useState(false);
  const emojiDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [suggestedCategories, setSuggestedCategories] = useState<string[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<'day' | 'month'>('day');
  const [pickerYear, setPickerYear] = useState(today.getFullYear());
  const [pickerMonth, setPickerMonth] = useState(today.getMonth());
  const [pickerDay, setPickerDay] = useState(today.getDate());
  const MIN_YEAR = 2020;

  // Estado nuevo — gastos compartidos
  const [isShared, setIsShared] = useState(false);
  const [sharedParticipants, setSharedParticipants] = useState<SharedParticipant[]>([]);
  const [ownerPercentage, setOwnerPercentage] = useState(100);
  const [ownerUserName, setOwnerUserName] = useState('');

  // Cargar userName del usuario actual
  useEffect(() => {
    if (user?.uid) {
      getUserProfile(user.uid).then((p) => { if (p) setOwnerUserName(p.userName); });
    }
  }, [user?.uid]);
```

- [ ] **Step 3: Copiar TODOS los useEffects del modal original**

Copiar desde `components/AddTransactionModal.tsx` exactamente los siguientes useEffects (sin modificar):
- `useEffect` que sincroniza `selectedDate` con picker values (línea ~142)
- `useEffect` de auto-emoji para nueva categoría (línea ~148)
- `useEffect` de scroll al abrir date picker (línea ~164)
- `useEffect` de auto-scroll de chips de categoría (línea ~173)
- `useEffect` de auto-categorización de descripción (línea ~186)

- [ ] **Step 4: Copiar handlers del modal original**

Copiar exactamente desde `components/AddTransactionModal.tsx`:
- `resetForm()` — agregar al final: `setIsShared(false); setSharedParticipants([]); setOwnerPercentage(100);`
- `resetNewCatForm()`
- `handleSaveNewCategory()`
- `handleTypeChange()`
- `handleNavigateToCards()` — cambiar `animateOut(() => { resetForm(); onClose(); router.push(...)})` por simplemente `router.push('/(onboarding)/select-cards')`
- `prevMonth()` / `nextMonth()`
- Cálculos derivados: `daysInMonth`, `parsedAmount`, `formattedNumber`, `displayAmount`, `amountInputWidth`, `amountSelection`, `isSaveDisabled`, `selectedCard`, `isCredit`, `showInstallments`, `teaValue`, `teaValid`

- [ ] **Step 5: Implementar `handleSave` con lógica compartida**

```tsx
  // Validación de porcentajes compartidos
  const sharedPercentageValid = !isShared
    || sharedParticipants.length === 0
    || Math.round(ownerPercentage + sharedParticipants.reduce((s, p) => s + p.percentage, 0)) === 100;

  const isSaveDisabledFull = isSaveDisabled || !teaValid || !sharedPercentageValid;

  const handleSave = async () => {
    if (isSaveDisabledFull || !user) return;
    setLoading(true);
    setError('');

    try {
      const now = new Date();
      const isInstallment = isCredit && type === 'expense' && installmentCount > 1;
      const teaValueNum = teaInput !== '' ? parseFloat(teaInput) : null;

      if (isShared && sharedParticipants.length > 0) {
        const allParticipants: SharedParticipant[] = [
          { uid: user.uid, userName: ownerUserName, displayName: user.displayName ?? '', percentage: ownerPercentage },
          ...sharedParticipants,
        ];

        await createSharedTransaction({
          participants: allParticipants,
          ownerUid: user.uid,
          ownerUserName,
          baseDoc: {
            type,
            category,
            description: description.trim(),
            cardId: selectedCardId ?? undefined,
            isFixed: false,
          },
          amount: parsedAmount,
          installmentCount: isInstallment ? installmentCount : 1,
          withInterest: isInstallment ? withInterest : false,
          teaValue: isInstallment ? teaValueNum : null,
          selectedDate,
        });
      } else {
        // Transacción normal — mismo código que AddTransactionModal.handleSave
        const baseDoc = {
          userId: user.uid,
          type,
          category,
          description: description.trim(),
          createdAt: Timestamp.fromDate(now),
          isFixed,
          ...(selectedCardId ? { cardId: selectedCardId } : {}),
        };

        if (isInstallment) {
          const amounts = calculateInstallments(parsedAmount, installmentCount, withInterest ? teaValueNum : null);
          const dates = calculateInstallmentDates(selectedDate, installmentCount);
          const groupId = Crypto.randomUUID();
          const batch = writeBatch(db);
          amounts.forEach((amt, i) => {
            const ref = doc(collection(db, 'transactions'));
            batch.set(ref, {
              ...baseDoc,
              amount: amt,
              date: Timestamp.fromDate(dates[i]),
              isFixed: false,
              installmentGroupId: groupId,
              installmentNumber: i + 1,
              installmentTotal: installmentCount,
              isInstallment: true,
            });
          });
          await batch.commit();
        } else {
          await addDoc(collection(db, 'transactions'), {
            ...baseDoc,
            amount: parsedAmount,
            date: Timestamp.fromDate(selectedDate),
          });
        }
      }

      showToast(t('home.transactionSaved'), 'success');
      router.back();
    } catch (err) {
      setError(t('addTransaction.errors.saveFailed'));
      setLoading(false);
    }
  };
```

- [ ] **Step 6: Copiar derivados del modal y cálculos**

Copiar exactamente desde `AddTransactionModal.tsx`:
- `activeCategories`
- `dateDisplayText`
- `nowForPicker`
- `isNextMonthDisabled`
- `handleAmountChange`

- [ ] **Step 7: Implementar el JSX de la pantalla completa**

```tsx
  return (
    <>
      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={AMOUNT_INPUT_ID}><View /></InputAccessoryView>
      )}
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>

        {/* Header fijo */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {t('addTransaction.title')}
          </Text>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            focusable={false}
            style={Platform.OS === 'web' ? { outline: 'none' } as any : undefined}
          >

            {/* =========================================================
                COPIAR AQUÍ TODO EL JSX INTERNO del AddTransactionModal:
                - Selector expense/income (tab tipo)
                - Campo de monto (amount input grande)
                - Campo de descripción
                - Strip horizontal de categorías con chips
                - Formulario de nueva categoría (inline)
                - Toggle fija/variable
                - Selector de tarjeta
                - Selector cuotas + tasa (solo si isCredit)
                - Selector de fecha (datePickerOpen)
                ========================================================= */}

            {/* Sección gastos compartidos — solo para expenses */}
            {type === 'expense' && (
              <SharedExpenseSection
                userId={user?.uid ?? ''}
                userName={ownerUserName}
                displayName={user?.displayName ?? ''}
                isShared={isShared}
                onIsSharedChange={setIsShared}
                participants={sharedParticipants}
                onParticipantsChange={setSharedParticipants}
                amount={parsedAmount}
                interestRate={withInterest && teaInput ? parseFloat(teaInput) : 0}
                installmentCount={installmentCount}
                ownerPercentage={ownerPercentage}
                onOwnerPercentageChange={setOwnerPercentage}
              />
            )}

            {error !== '' && (
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            )}

            {/* Botón guardar */}
            <TouchableOpacity
              style={[
                styles.saveBtn,
                { backgroundColor: isSaveDisabledFull ? colors.border : colors.primary },
              ]}
              onPress={handleSave}
              disabled={isSaveDisabledFull}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color={colors.onPrimary} />
                : <Text style={[styles.saveBtnText, { color: colors.onPrimary }]}>
                    {t('addTransaction.save')}
                  </Text>
              }
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}
```

- [ ] **Step 8: Agregar StyleSheet**

```tsx
const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    position: 'relative',
  },
  headerTitle: { fontSize: 17, fontFamily: Fonts.bold },
  closeBtn: {
    position: 'absolute',
    right: 20,
    top: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { padding: 20, paddingBottom: 48, gap: 16 },
  errorText: { fontSize: 13, fontFamily: Fonts.regular, textAlign: 'center' },
  saveBtn: {
    height: 56,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  saveBtnText: { fontSize: 17, fontFamily: Fonts.bold },
});
```

**Nota importante:** El JSX interno del formulario (monto, descripción, categorías, tarjeta, cuotas, fecha) debe copiarse literalmente desde `components/AddTransactionModal.tsx`. Buscar el bloque que va desde el selector de tipo (expense/income) hasta el date picker — todo ese JSX va adentro del `<ScrollView>`, antes del bloque de `SharedExpenseSection`.

- [ ] **Step 9: Commit**

```bash
git add app/add-transaction.tsx
git commit -m "feat: migrar formulario a pantalla completa app/add-transaction.tsx con gastos compartidos"
```

---

### Task 8: Actualizar FAB en `app/(tabs)/index.tsx`

**Files:**
- Modify: `app/(tabs)/index.tsx`

- [ ] **Step 1: Reemplazar modal con navegación a `/add-transaction`**

1. Eliminar import:
   ```tsx
   import { AddTransactionModal } from '../../components/AddTransactionModal';
   ```

2. Agregar si no existe:
   ```tsx
   import { router } from 'expo-router';
   ```

3. Eliminar estado:
   ```tsx
   const [showAddModal, setShowAddModal] = useState(false);
   ```

4. Cambiar `onPress` del FAB:
   ```tsx
   // Antes:
   onPress={() => setShowAddModal(true)}
   // Después:
   onPress={() => router.push('/add-transaction')}
   ```

5. Eliminar del JSX:
   ```tsx
   <AddTransactionModal
     visible={showAddModal}
     onClose={() => setShowAddModal(false)}
     onSaved={() => { setShowAddModal(false); setRefreshKey(k => k + 1); showToast(t('home.transactionSaved'), 'success'); }}
   />
   ```

6. El `refreshKey` ya no es necesario para el modal. El `onSnapshot` actualiza el home automáticamente cuando vuelve el foco. Mantenerlo si ya se usa para otros propósitos; si solo lo usaba el modal, eliminar también `setRefreshKey` y el prop `refreshKey` del `useTransactions`.

- [ ] **Step 2: Commit**

```bash
git add app/(tabs)/index.tsx
git commit -m "feat: FAB navega a pantalla completa /add-transaction"
```

---

### Task 9: Actualizar `app/(tabs)/history.tsx`

**Files:**
- Modify: `app/(tabs)/history.tsx`

- [ ] **Step 1: Agregar imports**

```tsx
import SharedExpenseChip from '../../components/SharedExpenseChip';
import { useSharedTransactions } from '../../hooks/useSharedTransactions';
import { getUserProfile } from '../../hooks/useUserProfile';
```

Si `useAuthStore` aún no está importado, agregarlo:
```tsx
import { useAuthStore } from '../../store/authStore';
```

- [ ] **Step 2: Inicializar hook y userName del usuario**

Al inicio del componente:
```tsx
const { user } = useAuthStore();
const { deleteSharedTransaction } = useSharedTransactions();
const [currentUserName, setCurrentUserName] = useState('');

useEffect(() => {
  if (user?.uid) {
    getUserProfile(user.uid).then((p) => { if (p) setCurrentUserName(p.userName); });
  }
}, [user?.uid]);
```

- [ ] **Step 3: Mostrar `SharedExpenseChip` bajo la descripción**

Localizar donde se renderiza `transaction.description` en el renderItem (línea ~665) y agregar debajo:

```tsx
{transaction.isShared && (
  <SharedExpenseChip
    isOwner={transaction.sharedOwnerUid === user?.uid}
    ownerUserName={transaction.sharedOwnerUserName}
    participants={transaction.sharedParticipants}
    currentUid={user?.uid ?? ''}
  />
)}
```

- [ ] **Step 4: Mostrar `sharedAmount` en lugar de `amount` en el historial**

Localizar donde se muestra el monto de la transacción (línea ~1054) y modificar:
```tsx
// Antes:
{isExpense ? `−${formatCurrency(item.amount)}` : `+${formatCurrency(item.amount)}`}

// Después:
{isExpense
  ? `−${formatCurrency(item.isShared && item.sharedAmount != null ? item.sharedAmount : item.amount)}`
  : `+${formatCurrency(item.amount)}`}
```

- [ ] **Step 5: Conectar delete de transacciones compartidas**

Localizar el handler de confirmación de eliminación. Cambiar el mensaje del dialog de confirmación si la transacción es compartida:

```tsx
// En el AppDialog de confirmación de delete, cambiar el campo description:
description={selectedTransaction?.isShared
  ? t('sharedExpense.deleteConfirm')
  : t('history.deleteConfirm')}
```

Y en el handler que ejecuta el delete (donde se llama `deleteDoc` o similar), agregar la rama compartida:

```tsx
if (transaction.isShared && transaction.sharedId) {
  await deleteSharedTransaction({
    sharedId: transaction.sharedId,
    currentUserUid: user?.uid ?? '',
    currentUserName,
    description: transaction.description,
  });
} else {
  // lógica de eliminación existente
}
```

- [ ] **Step 6: Commit**

```bash
git add app/(tabs)/history.tsx
git commit -m "feat: mostrar chip compartido y conectar delete en historial"
```

---

### Task 10: Agregar claves i18n

**Files:**
- Modify: `locales/es.json`
- Modify: `locales/en.json`
- Modify: `locales/it.json`

- [ ] **Step 1: Agregar claves en `locales/es.json`**

Agregar sección `sharedExpense` al objeto raíz (antes del `}` de cierre):

```json
"sharedExpense": {
  "toggle": "Compartir este gasto",
  "withWho": "Con quién",
  "noFriends": "Aún no tienes amigos en Spendia",
  "splitType": "División",
  "equalParts": "Partes iguales",
  "customParts": "Personalizar",
  "you": "Tú",
  "preview": "Resumen",
  "previewInstallment": "{{amount}}/mes × {{n}} cuotas",
  "percentageError": "Los porcentajes deben sumar 100% (actual: {{total}}%)",
  "deleteConfirm": "Este gasto compartido se eliminará para TODOS los participantes. ¿Continuar?",
  "chip": {
    "sharedWith": "Compartido con {{name}}",
    "sharedWithMore": "Compartido con {{name}} y {{count}} más",
    "sharedBy": "Compartido por {{name}}"
  }
}
```

Agregar en la sección `notifications` existente las nuevas claves:
```json
"shared_transaction_added": "{{fromDisplayName}} compartió un gasto contigo: {{description}}",
"shared_transaction_updated": "{{fromDisplayName}} actualizó un gasto compartido: {{description}}",
"shared_transaction_deleted": "{{fromDisplayName}} eliminó el gasto compartido: {{description}}"
```

- [ ] **Step 2: Agregar claves en `locales/en.json`**

```json
"sharedExpense": {
  "toggle": "Share this expense",
  "withWho": "With who",
  "noFriends": "You have no friends on Spendia yet",
  "splitType": "Split",
  "equalParts": "Equal parts",
  "customParts": "Customize",
  "you": "You",
  "preview": "Summary",
  "previewInstallment": "{{amount}}/mo × {{n}} installments",
  "percentageError": "Percentages must add up to 100% (current: {{total}}%)",
  "deleteConfirm": "This shared expense will be deleted for ALL participants. Continue?",
  "chip": {
    "sharedWith": "Shared with {{name}}",
    "sharedWithMore": "Shared with {{name}} and {{count}} more",
    "sharedBy": "Shared by {{name}}"
  }
}
```

- [ ] **Step 3: Agregar claves en `locales/it.json`**

```json
"sharedExpense": {
  "toggle": "Condividi questa spesa",
  "withWho": "Con chi",
  "noFriends": "Non hai ancora amici su Spendia",
  "splitType": "Divisione",
  "equalParts": "Parti uguali",
  "customParts": "Personalizza",
  "you": "Tu",
  "preview": "Riepilogo",
  "previewInstallment": "{{amount}}/mese × {{n}} rate",
  "percentageError": "Le percentuali devono sommare 100% (attuale: {{total}}%)",
  "deleteConfirm": "Questa spesa condivisa sarà eliminata per TUTTI i partecipanti. Continuare?",
  "chip": {
    "sharedWith": "Condiviso con {{name}}",
    "sharedWithMore": "Condiviso con {{name}} e altri {{count}}",
    "sharedBy": "Condiviso da {{name}}"
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add locales/es.json locales/en.json locales/it.json
git commit -m "feat: agregar claves i18n sharedExpense en es/en/it"
```

---

### Task 11: Reglas Firestore

**Files:**
- Modify: `firestore.rules`

- [ ] **Step 1: Agregar reglas para `sharedTransactions`**

Dentro del bloque `match /databases/{database}/documents { ... }` agregar:

```
match /sharedTransactions/{sharedId} {
  // Solo participantes pueden leer
  allow read: if request.auth != null
    && request.auth.uid in resource.data.participantUids;

  // Solo el owner puede crear
  allow create: if request.auth != null
    && request.auth.uid == request.resource.data.ownerUid;

  // Cualquier participante puede actualizar o eliminar
  allow update, delete: if request.auth != null
    && request.auth.uid in resource.data.participantUids;
}
```

- [ ] **Step 2: Commit**

```bash
git add firestore.rules
git commit -m "feat: reglas Firestore para colección sharedTransactions"
```

---

### Task 12: Verificación integral

- [ ] **Step 1: Build de desarrollo**

```bash
npx expo start --web
```

Verificar que no hay errores de TypeScript en consola al iniciar.

- [ ] **Step 2: Flujo de creación**

1. Abrir la app en el navegador
2. Tocar el FAB (botón +) → debe navegar a `/add-transaction` (pantalla completa con header y botón ✕)
3. Completar: monto `10000`, descripción `Cena`, categoría automática
4. Activar toggle "Compartir este gasto"
5. Verificar que aparece la lista de amigos
6. Seleccionar 1 amigo → preview debe mostrar `Tú: $5.000` y `@amigo: $5.000`
7. Guardar → toast "Transacción guardada" + vuelve al home
8. Verificar en Firestore console que existen 2 docs en `transactions` (uno por cada usuario) y 1 doc en `sharedTransactions`

- [ ] **Step 3: Flujo de historial**

1. Abrir historial → la transacción compartida debe mostrar el chip `👥 Compartido con @amigo`
2. El monto mostrado debe ser el `sharedAmount` calculado
3. Iniciar sesión con la cuenta del amigo → debe ver el gasto en su historial con chip `👥 Compartido por @tuUsuario`

- [ ] **Step 4: Flujo de eliminación**

1. Eliminar una transacción compartida desde el historial
2. Verificar que aparece el dialog con mensaje "se eliminará para TODOS los participantes"
3. Confirmar → el gasto desaparece del historial de ambos usuarios

- [ ] **Step 5: Bump versión**

En `app.json`, incrementar version minor (nueva feature):
```json
"version": "X.Y+1.0"
```

- [ ] **Step 6: Commit final**

```bash
git add app.json
git commit -m "chore: bump versión por feature gastos compartidos"
```
