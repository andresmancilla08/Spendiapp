# Tarjetas de Pago y Cuotas con Interés — Plan de Implementación

> **Para agentes:** REQUIRED SUB-SKILL: Usar `superpowers:subagent-driven-development` para implementar este plan tarea por tarea. Los pasos usan sintaxis `- [ ]` para seguimiento.

**Goal:** Permitir al usuario registrar tarjetas/cuentas colombianas, asociarlas a transacciones, y calcular automáticamente cuotas mensuales con o sin interés TEA, creando un documento Firestore real por cuota en el mes correspondiente.

**Architecture:** Colección Firestore `cards` (mismo patrón que `transactions`). Campos opcionales en `Transaction` para cuotas. Utilidad de cálculo financiero pura en `utils/installmentCalc.ts`. Onboarding post-registro en ruta `/(onboarding)/select-cards`. Sección "Mis tarjetas" en perfil. Campos condicionales en `AddTransactionModal`.

**Tech Stack:** React Native 0.83 + Expo SDK 55, Firebase Firestore, TypeScript, Zustand, expo-router, expo-crypto

---

## Mapa de archivos

| Acción | Archivo |
|--------|---------|
| Crear | `types/card.ts` |
| Modificar | `types/transaction.ts` |
| Crear | `config/banks.ts` |
| Crear | `utils/installmentCalc.ts` |
| Crear | `hooks/useCards.ts` |
| Crear | `app/(onboarding)/_layout.tsx` |
| Crear | `app/(onboarding)/select-cards.tsx` |
| Modificar | `app/(auth)/register.tsx` |
| Crear | `components/CardFormSheet.tsx` |
| Modificar | `app/(tabs)/profile.tsx` |
| Modificar | `components/AddTransactionModal.tsx` |
| Modificar | `app/(tabs)/index.tsx` |
| Modificar | `app/(tabs)/history.tsx` |

---

## Tarea 1 — Tipos: Card y Transaction

**Archivos:**
- Crear: `types/card.ts`
- Modificar: `types/transaction.ts`

- [ ] **Paso 1: Crear `types/card.ts`**

```ts
export type CardType = 'debit' | 'credit';

export interface Card {
  id: string;
  userId: string;
  bankId: string;
  bankName: string;
  type: CardType;
  lastFour: string; // exactamente 4 dígitos
  createdAt: Date;
}
```

- [ ] **Paso 2: Actualizar `types/transaction.ts`**

Reemplazar el contenido completo con:

```ts
export type TransactionType = 'expense' | 'income';

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: Date;
  createdAt: Date;
  isFixed?: boolean;
  isVirtualFixed?: boolean;
  // Tarjeta
  cardId?: string;
  // Cuotas
  installmentGroupId?: string;
  installmentNumber?: number;
  installmentTotal?: number;
  isInstallment?: boolean;
}
```

- [ ] **Paso 3: Commit**

```bash
cd ~/Documents/Github/Spendiapp
git add types/card.ts types/transaction.ts
git commit -m "feat: add Card type and installment fields to Transaction"
```

---

## Tarea 2 — Config de bancos y calculadora de cuotas

**Archivos:**
- Crear: `config/banks.ts`
- Crear: `utils/installmentCalc.ts`

- [ ] **Paso 1: Crear `config/banks.ts`**

```ts
export interface Bank {
  id: string;
  name: string;
  category: 'traditional' | 'digital' | 'other';
}

export const COLOMBIAN_BANKS: Bank[] = [
  { id: 'bancolombia',  name: 'Bancolombia',          category: 'traditional' },
  { id: 'davivienda',   name: 'Davivienda',           category: 'traditional' },
  { id: 'bbva',         name: 'BBVA',                 category: 'traditional' },
  { id: 'bogota',       name: 'Banco de Bogotá',      category: 'traditional' },
  { id: 'colpatria',    name: 'Scotiabank Colpatria',  category: 'traditional' },
  { id: 'itau',         name: 'Itaú',                 category: 'traditional' },
  { id: 'occidente',    name: 'Banco de Occidente',   category: 'traditional' },
  { id: 'popular',      name: 'Banco Popular',        category: 'traditional' },
  { id: 'avvillas',     name: 'AV Villas',            category: 'traditional' },
  { id: 'cajasocial',   name: 'Banco Caja Social',    category: 'traditional' },
  { id: 'nequi',        name: 'Nequi',                category: 'digital'     },
  { id: 'daviplata',    name: 'Daviplata',            category: 'digital'     },
  { id: 'nubank',       name: 'Nubank',               category: 'digital'     },
  { id: 'lulo',         name: 'Lulo Bank',            category: 'digital'     },
  { id: 'rappipay',     name: 'RappiPay',             category: 'digital'     },
  { id: 'movii',        name: 'Movii',                category: 'digital'     },
  { id: 'efectivo',     name: 'Efectivo',             category: 'other'       },
];

export const BANK_CATEGORY_LABELS: Record<Bank['category'], string> = {
  traditional: 'Bancos tradicionales',
  digital: 'Billeteras digitales',
  other: 'Otros',
};
```

- [ ] **Paso 2: Crear `utils/installmentCalc.ts`**

```ts
/**
 * Retorna un array de n montos enteros (pesos colombianos).
 * La diferencia de redondeo se absorbe en la última cuota.
 *
 * @param amount  Monto total de la compra (entero, pesos COP)
 * @param n       Número de cuotas (≥ 1)
 * @param tea     Tasa Efectiva Anual en % (ej: 26.4) — null = sin interés
 */
export function calculateInstallments(
  amount: number,
  n: number,
  tea: number | null,
): number[] {
  if (n <= 1) return [amount];

  if (!tea || tea === 0) {
    // Sin interés: división exacta, residuo en última cuota
    const base = Math.floor(amount / n);
    const last = amount - base * (n - 1);
    return [...Array(n - 1).fill(base), last];
  }

  // Con interés: amortización francesa (PMT fijo)
  // r = tasa mensual equivalente a TEA
  const r = Math.pow(1 + tea / 100, 1 / 12) - 1;
  // PMT = PV * r / (1 - (1+r)^-n)
  const pmt = (amount * r) / (1 - Math.pow(1 + r, -n));
  const rounded = Math.round(pmt);
  // Primeras (n-1) cuotas = PMT redondeado
  // Última cuota absorbe residuo acumulado de redondeo
  const installments = Array(n - 1).fill(rounded);
  const lastInstallment = Math.round(pmt * n) - rounded * (n - 1);
  installments.push(lastInstallment);
  return installments;
}

/**
 * Calcula la fecha de cada cuota a partir de una fecha inicial.
 * Si el día no existe en el mes destino (ej: 31 ene → feb), ajusta al último día.
 */
export function calculateInstallmentDates(startDate: Date, n: number): Date[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(startDate.getFullYear(), startDate.getMonth() + i, startDate.getDate());
    // Si el mes se desbordó (ej: 31 ene + 1 = 3 mar), retroceder al último día del mes
    if (d.getDate() !== startDate.getDate()) {
      d.setDate(0);
    }
    return d;
  });
}
```

- [ ] **Paso 3: Verificar manualmente la lógica**

Abre Metro/terminal y prueba mentalmente:
- `calculateInstallments(300000, 3, null)` → `[100000, 100000, 100000]`
- `calculateInstallments(100001, 3, null)` → `[33333, 33333, 33335]`
- `calculateInstallments(1000000, 6, 26.4)` → cada cuota ≈ $182.xxx (TEA 26.4% → ~1.98% mensual, PMT ≈ $182.xxx)
- `calculateInstallmentDates(new Date(2026,0,31), 3)` → [31 ene, 28 feb, 31 mar]

- [ ] **Paso 4: Commit**

```bash
git add config/banks.ts utils/installmentCalc.ts
git commit -m "feat: add Colombian banks config and installment calculator"
```

---

## Tarea 3 — Hook de tarjetas

**Archivos:**
- Crear: `hooks/useCards.ts`

- [ ] **Paso 1: Crear `hooks/useCards.ts`**

```ts
import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Card, CardType } from '../types/card';

interface UseCardsResult {
  cards: Card[];
  loading: boolean;
  error: string | null;
}

export function useCards(userId: string): UseCardsResult {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    const q = query(
      collection(db, 'cards'),
      where('userId', '==', userId),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data: Card[] = snap.docs.map((d) => {
          const v = d.data();
          return {
            id: d.id,
            userId: v.userId,
            bankId: v.bankId,
            bankName: v.bankName,
            type: v.type as CardType,
            lastFour: v.lastFour,
            createdAt: (v.createdAt as Timestamp).toDate(),
          };
        });
        // Sort client-side: más reciente primero
        data.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setCards(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.warn('useCards error:', err.code);
        setError(err.code);
        setLoading(false);
      },
    );

    return unsub;
  }, [userId]);

  return { cards, loading, error };
}

export async function addCard(
  userId: string,
  bankId: string,
  bankName: string,
  type: CardType,
  lastFour: string,
): Promise<string> {
  const ref = await addDoc(collection(db, 'cards'), {
    userId,
    bankId,
    bankName,
    type,
    lastFour,
    createdAt: Timestamp.fromDate(new Date()),
  });
  return ref.id;
}

export async function deleteCard(cardId: string): Promise<void> {
  await deleteDoc(doc(db, 'cards', cardId));
}
```

- [ ] **Paso 2: Commit**

```bash
git add hooks/useCards.ts
git commit -m "feat: add useCards hook with Firestore CRUD"
```

---

## Tarea 4 — Onboarding: layout y pantalla de selección de tarjetas

**Archivos:**
- Crear: `app/(onboarding)/_layout.tsx`
- Crear: `app/(onboarding)/select-cards.tsx`

**Contexto:** Esta pantalla aparece después del registro exitoso (antes de llegar al home). El usuario puede agregar sus tarjetas o saltársela. La variable `justRegistered` del authStore permanece `true` durante el onboarding para evitar que `_layout.tsx` redirija automáticamente. Se pone en `false` al salir del onboarding.

- [ ] **Paso 1: Crear `app/(onboarding)/_layout.tsx`**

```tsx
import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Paso 2: Crear `app/(onboarding)/select-cards.tsx`**

```tsx
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import { Fonts } from '../../config/fonts';
import { COLOMBIAN_BANKS, BANK_CATEGORY_LABELS, Bank } from '../../config/banks';
import { addCard, deleteCard, useCards } from '../../hooks/useCards';
import type { CardType } from '../../types/card';

const CATEGORIES: Bank['category'][] = ['traditional', 'digital', 'other'];

export default function SelectCardsScreen() {
  const { colors, isDark } = useTheme();
  const { user, setJustRegistered } = useAuthStore();
  const { cards } = useCards(user?.uid ?? '');

  const [expandedBankId, setExpandedBankId] = useState<string | null>(null);
  const [formType, setFormType] = useState<CardType>('debit');
  const [formLastFour, setFormLastFour] = useState('');
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const gradientColors: [string, string, string] = isDark
    ? ['#0D1A1C', '#062830', '#003840']
    : ['#FFFFFF', '#F5F9FA', '#E0F7FA'];

  const handleToggleBank = (bankId: string) => {
    if (expandedBankId === bankId) {
      setExpandedBankId(null);
      setFormLastFour('');
      setFormType('debit');
      setFormError('');
    } else {
      setExpandedBankId(bankId);
      setFormLastFour('');
      setFormType('debit');
      setFormError('');
    }
  };

  const handleAddCard = async (bank: Bank) => {
    if (!user) return;
    if (formLastFour.length !== 4) { setFormError('Ingresa exactamente 4 dígitos'); return; }
    setFormError('');
    setFormSaving(true);
    try {
      await addCard(user.uid, bank.id, bank.name, formType, formLastFour);
      setFormLastFour('');
      setFormType('debit');
      setExpandedBankId(null);
    } catch {
      setFormError('No se pudo agregar la tarjeta');
    } finally {
      setFormSaving(false);
    }
  };

  const handleFinish = () => {
    setJustRegistered(false);
    router.replace('/(tabs)/');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: gradientColors[0] }]}>
      <LinearGradient colors={gradientColors} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.gradient}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>¿Qué tarjetas tienes?</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Selecciona tus tarjetas para llevar un mejor control de tus gastos.
          </Text>
        </View>

        {/* Lista de bancos */}
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {CATEGORIES.map((cat) => {
            const banksInCat = COLOMBIAN_BANKS.filter((b) => b.category === cat);
            return (
              <View key={cat} style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
                  {BANK_CATEGORY_LABELS[cat].toUpperCase()}
                </Text>

                <View style={[styles.bankGroup, { backgroundColor: colors.surface }]}>
                  {banksInCat.map((bank, idx) => {
                    const isExpanded = expandedBankId === bank.id;
                    const cardsForBank = cards.filter((c) => c.bankId === bank.id);
                    const isLast = idx === banksInCat.length - 1;

                    return (
                      <View
                        key={bank.id}
                        style={[
                          styles.bankRow,
                          !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border },
                        ]}
                      >
                        {/* Bank name row */}
                        <TouchableOpacity
                          style={styles.bankNameRow}
                          onPress={() => handleToggleBank(bank.id)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.bankName, { color: colors.textPrimary }]}>{bank.name}</Text>
                          <Ionicons
                            name={isExpanded ? 'chevron-up' : 'add-circle-outline'}
                            size={20}
                            color={isExpanded ? colors.primary : colors.textTertiary}
                          />
                        </TouchableOpacity>

                        {/* Tarjetas ya agregadas para este banco */}
                        {cardsForBank.length > 0 && (
                          <View style={styles.addedCards}>
                            {cardsForBank.map((card) => (
                              <View key={card.id} style={[styles.addedChip, { backgroundColor: colors.primaryLight }]}>
                                <Text style={[styles.addedChipText, { color: colors.primary }]}>
                                  {`•••• ${card.lastFour} · ${card.type === 'credit' ? 'Crédito' : 'Débito'}`}
                                </Text>
                                <TouchableOpacity onPress={() => deleteCard(card.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                  <Ionicons name="close-circle" size={16} color={colors.primary} />
                                </TouchableOpacity>
                              </View>
                            ))}
                          </View>
                        )}

                        {/* Formulario expandido */}
                        {isExpanded && (
                          <View style={[styles.expandedForm, { backgroundColor: colors.backgroundSecondary }]}>
                            {/* Chips débito / crédito */}
                            <View style={styles.typeRow}>
                              {(['debit', 'credit'] as CardType[]).map((t) => (
                                <TouchableOpacity
                                  key={t}
                                  style={[
                                    styles.typeChip,
                                    { borderColor: colors.border, backgroundColor: colors.surface },
                                    formType === t && { backgroundColor: colors.primary, borderColor: colors.primary },
                                  ]}
                                  onPress={() => setFormType(t)}
                                  activeOpacity={0.8}
                                >
                                  <Text style={[
                                    styles.typeChipText,
                                    { color: colors.textSecondary },
                                    formType === t && { color: '#FFFFFF' },
                                  ]}>
                                    {t === 'debit' ? 'Débito' : 'Crédito'}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>

                            {/* Últimos 4 dígitos */}
                            <TextInput
                              style={[styles.lastFourInput, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surface }]}
                              placeholder="Últimos 4 dígitos"
                              placeholderTextColor={colors.textTertiary}
                              keyboardType="numeric"
                              maxLength={4}
                              value={formLastFour}
                              onChangeText={(t) => {
                                setFormError('');
                                setFormLastFour(t.replace(/\D/g, '').slice(0, 4));
                              }}
                            />

                            {formError !== '' && (
                              <Text style={[styles.formError, { color: colors.error }]}>{formError}</Text>
                            )}

                            {/* Botón agregar */}
                            <TouchableOpacity
                              style={[
                                styles.addBtn,
                                { backgroundColor: colors.primary },
                                (formLastFour.length !== 4 || formSaving) && { opacity: 0.4 },
                              ]}
                              onPress={() => handleAddCard(bank)}
                              disabled={formLastFour.length !== 4 || formSaving}
                              activeOpacity={0.85}
                            >
                              {formSaving
                                ? <ActivityIndicator color="#FFFFFF" size="small" />
                                : <Text style={styles.addBtnText}>Agregar tarjeta</Text>
                              }
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}
          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TouchableOpacity style={styles.skipBtn} onPress={handleFinish} activeOpacity={0.7}>
            <Text style={[styles.skipText, { color: colors.textSecondary }]}>Omitir por ahora</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.doneBtn, { backgroundColor: colors.primary }]}
            onPress={handleFinish}
            activeOpacity={0.85}
          >
            <Text style={[styles.doneBtnText, { color: '#FFFFFF' }]}>
              {cards.length > 0 ? `Listo (${cards.length})` : 'Listo'}
            </Text>
          </TouchableOpacity>
        </View>

      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  gradient: { flex: 1 },
  header: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 },
  title: { fontSize: 28, fontFamily: Fonts.bold, marginBottom: 8 },
  subtitle: { fontSize: 15, fontFamily: Fonts.regular, lineHeight: 22 },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 20 },
  section: { marginBottom: 24 },
  sectionLabel: { fontSize: 11, fontFamily: Fonts.bold, letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 },
  bankGroup: { borderRadius: 16, overflow: 'hidden' },
  bankRow: { paddingVertical: 4 },
  bankNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  bankName: { fontSize: 15, fontFamily: Fonts.medium },
  addedCards: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  addedChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  addedChipText: { fontSize: 12, fontFamily: Fonts.semiBold },
  expandedForm: { marginHorizontal: 12, marginBottom: 12, padding: 16, borderRadius: 12, gap: 12 },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeChip: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, alignItems: 'center' },
  typeChipText: { fontSize: 14, fontFamily: Fonts.semiBold },
  lastFourInput: { height: 48, borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 14, fontSize: 18, fontFamily: Fonts.bold, letterSpacing: 4 },
  formError: { fontSize: 12, fontFamily: Fonts.regular },
  addBtn: { height: 46, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { fontSize: 15, fontFamily: Fonts.bold, color: '#FFFFFF' },
  footer: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16, gap: 12, borderTopWidth: 1 },
  skipBtn: { flex: 1, height: 52, alignItems: 'center', justifyContent: 'center' },
  skipText: { fontSize: 15, fontFamily: Fonts.medium },
  doneBtn: { flex: 2, height: 52, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  doneBtnText: { fontSize: 16, fontFamily: Fonts.bold },
});
```

- [ ] **Paso 3: Commit**

```bash
git add "app/(onboarding)/_layout.tsx" "app/(onboarding)/select-cards.tsx"
git commit -m "feat: add onboarding screen for initial card selection"
```

---

## Tarea 5 — Redirección post-registro al onboarding

**Archivos:**
- Modificar: `app/(auth)/register.tsx` — solo la función `handleGoHome`

**Contexto:** Actualmente `handleGoHome` llama `setJustRegistered(false)` y va a `/(tabs)/`. El cambio: ir a `/(onboarding)/select-cards` sin desactivar `justRegistered` todavía (lo desactivará el onboarding al terminar, evitando que `_layout.tsx` redirija automáticamente durante el onboarding).

- [ ] **Paso 1: Modificar `handleGoHome` en `app/(auth)/register.tsx`**

Ubicar la función `handleGoHome` (alrededor de la línea 68) y reemplazarla:

```tsx
const handleGoHome = () => {
  // NO llamar setJustRegistered(false) aquí.
  // select-cards.tsx lo llamará al terminar, evitando
  // que _layout.tsx redirija mientras dure el onboarding.
  router.replace('/(onboarding)/select-cards');
};
```

- [ ] **Paso 2: Commit**

```bash
git add "app/(auth)/register.tsx"
git commit -m "feat: redirect new users to card onboarding after registration"
```

---

## Tarea 6 — Componente CardFormSheet (para perfil)

**Archivos:**
- Crear: `components/CardFormSheet.tsx`

**Contexto:** Un bottom sheet de 2 pasos usado desde el perfil para agregar tarjetas. Paso 1: seleccionar banco. Paso 2: elegir tipo y últimos 4 dígitos.

- [ ] **Paso 1: Crear `components/CardFormSheet.tsx`**

```tsx
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Modal,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../config/fonts';
import { COLOMBIAN_BANKS, Bank } from '../config/banks';
import { addCard } from '../hooks/useCards';
import type { CardType } from '../types/card';

interface CardFormSheetProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
}

export default function CardFormSheet({ visible, onClose, userId }: CardFormSheetProps) {
  const { colors } = useTheme();

  const [step, setStep] = useState<'bank' | 'details'>('bank');
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [cardType, setCardType] = useState<CardType>('debit');
  const [lastFour, setLastFour] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setStep('bank');
    setSelectedBank(null);
    setCardType('debit');
    setLastFour('');
    setSaving(false);
    setError('');
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSelectBank = (bank: Bank) => {
    setSelectedBank(bank);
    setStep('details');
  };

  const handleSave = async () => {
    if (!selectedBank) return;
    if (lastFour.length !== 4) { setError('Ingresa exactamente 4 dígitos'); return; }
    setError('');
    setSaving(true);
    try {
      await addCard(userId, selectedBank.id, selectedBank.name, cardType, lastFour);
      handleClose();
    } catch {
      setError('No se pudo guardar la tarjeta. Intenta de nuevo.');
      setSaving(false);
    }
  };

  const canSave = lastFour.length === 4 && !saving;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]} />
      </TouchableWithoutFeedback>

      <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
        {/* Handle */}
        <View style={styles.handleRow}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
        </View>

        {/* Header */}
        <View style={styles.headerRow}>
          {step === 'details' && (
            <TouchableOpacity onPress={() => setStep('bank')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          )}
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {step === 'bank' ? 'Selecciona el banco' : selectedBank?.name ?? ''}
          </Text>
          <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Paso 1: Lista de bancos */}
        {step === 'bank' && (
          <FlatList
            data={COLOMBIAN_BANKS}
            keyExtractor={(b) => b.id}
            style={styles.bankList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.bankItem, { borderBottomColor: colors.border }]}
                onPress={() => handleSelectBank(item)}
                activeOpacity={0.7}
              >
                <Text style={[styles.bankItemText, { color: colors.textPrimary }]}>{item.name}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          />
        )}

        {/* Paso 2: Tipo + últimos 4 */}
        {step === 'details' && (
          <View style={styles.detailsForm}>
            {/* Chips tipo */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Tipo de tarjeta</Text>
            <View style={styles.typeRow}>
              {(['debit', 'credit'] as CardType[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.typeChip,
                    { borderColor: colors.border, backgroundColor: colors.backgroundSecondary },
                    cardType === t && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => setCardType(t)}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.typeChipText,
                    { color: colors.textSecondary },
                    cardType === t && { color: '#FFFFFF' },
                  ]}>
                    {t === 'debit' ? 'Débito' : 'Crédito'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Últimos 4 dígitos */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Últimos 4 dígitos</Text>
            <TextInput
              style={[styles.lastFourInput, { borderColor: error ? colors.error : colors.border, color: colors.textPrimary, backgroundColor: colors.backgroundSecondary }]}
              placeholder="0000"
              placeholderTextColor={colors.textTertiary}
              keyboardType="numeric"
              maxLength={4}
              value={lastFour}
              onChangeText={(v) => { setError(''); setLastFour(v.replace(/\D/g, '').slice(0, 4)); }}
            />
            {error !== '' && <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>}

            {/* Botón guardar */}
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }, !canSave && { opacity: 0.4 }]}
              onPress={handleSave}
              disabled={!canSave}
              activeOpacity={0.85}
            >
              {saving
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={styles.saveBtnText}>Agregar tarjeta</Text>
              }
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 40,
  },
  handleRow: { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
  handle: { width: 36, height: 4, borderRadius: 2 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle: { fontSize: 17, fontFamily: Fonts.bold, flex: 1, textAlign: 'center' },
  bankList: { maxHeight: 380 },
  bankItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  bankItemText: { fontSize: 15, fontFamily: Fonts.medium },
  detailsForm: { paddingHorizontal: 20, paddingTop: 8, gap: 12 },
  fieldLabel: { fontSize: 13, fontFamily: Fonts.semiBold },
  typeRow: { flexDirection: 'row', gap: 12 },
  typeChip: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, alignItems: 'center' },
  typeChipText: { fontSize: 14, fontFamily: Fonts.semiBold },
  lastFourInput: { height: 56, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 16, fontSize: 22, fontFamily: Fonts.bold, letterSpacing: 6, textAlign: 'center' },
  errorText: { fontSize: 12, fontFamily: Fonts.regular },
  saveBtn: { height: 52, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  saveBtnText: { fontSize: 16, fontFamily: Fonts.bold, color: '#FFFFFF' },
});
```

- [ ] **Paso 2: Commit**

```bash
git add components/CardFormSheet.tsx
git commit -m "feat: add CardFormSheet component for adding payment cards"
```

---

## Tarea 7 — Sección "Mis tarjetas" en el Perfil

**Archivos:**
- Modificar: `app/(tabs)/profile.tsx`

**Contexto:** Agregar sección entre el bloque "SOPORTE" y el botón de cerrar sesión. Usa `useCards`, `deleteCard` del hook, y `CardFormSheet` para agregar. El botón eliminar abre un `AppDialog` de confirmación tipo `'warning'`.

- [ ] **Paso 1: Agregar imports en `profile.tsx`**

Después de las importaciones existentes agregar:

```tsx
import { useCards, deleteCard } from '../../hooks/useCards';
import CardFormSheet from '../../components/CardFormSheet';
import type { Card } from '../../types/card';
```

- [ ] **Paso 2: Agregar estado en el componente `ProfileScreen`**

Dentro del componente, después de las declaraciones de estado existentes:

```tsx
const { cards } = useCards(user?.uid ?? '');
const [cardFormVisible, setCardFormVisible] = useState(false);
const [cardToDelete, setCardToDelete] = useState<Card | null>(null);
```

- [ ] **Paso 3: Agregar handler de eliminación de tarjeta**

Después de `handleSignOut`:

```tsx
const handleDeleteCard = (card: Card) => {
  setCardToDelete(card);
  setDialog({
    visible: true,
    type: 'warning',
    title: 'Eliminar tarjeta',
    description: `¿Eliminar ${card.bankName} •••• ${card.lastFour}? Esta acción no se puede deshacer.`,
    primaryLabel: 'Eliminar',
    secondaryLabel: t('common.cancel'),
    onPrimary: async () => {
      closeDialog();
      try {
        await deleteCard(card.id);
        setCardToDelete(null);
      } catch {
        showError('Error', 'No se pudo eliminar la tarjeta.');
      }
    },
    onSecondary: () => { closeDialog(); setCardToDelete(null); },
  });
};
```

- [ ] **Paso 4: Agregar sección "Mis tarjetas" en el JSX**

Ubicar el bloque `{/* SOPORTE */}` y agregar justo antes del botón `signOutButton`:

```tsx
{/* MIS TARJETAS */}
<SectionTitle label="Mis tarjetas" />
<View style={[styles.optionCard, { backgroundColor: colors.surface }]}>
  {cards.length === 0 ? (
    <View style={{ paddingHorizontal: 16, paddingVertical: 18 }}>
      <Text style={[styles.optionLabel, { color: colors.textTertiary, fontFamily: Fonts.regular }]}>
        No tienes tarjetas registradas
      </Text>
    </View>
  ) : (
    cards.map((card, idx) => (
      <View
        key={card.id}
        style={[
          styles.optionRow,
          idx < cards.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
        ]}
      >
        <View style={[styles.optionIconWrap, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="card-outline" size={18} color={colors.primary} />
        </View>
        <View style={styles.optionMeta}>
          <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>
            {`${card.bankName} •••• ${card.lastFour}`}
          </Text>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
            <View style={[styles.cardTypeBadge, { backgroundColor: card.type === 'credit' ? colors.errorLight : colors.primaryLight }]}>
              <Text style={[styles.cardTypeBadgeText, { color: card.type === 'credit' ? colors.error : colors.primary }]}>
                {card.type === 'credit' ? 'Crédito' : 'Débito'}
              </Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => handleDeleteCard(card)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={18} color={colors.error} />
        </TouchableOpacity>
      </View>
    ))
  )}

  {/* Botón agregar */}
  <TouchableOpacity
    style={[styles.optionRow, { borderTopWidth: cards.length > 0 ? 1 : 0, borderTopColor: colors.border }]}
    onPress={() => setCardFormVisible(true)}
    activeOpacity={0.7}
  >
    <View style={[styles.optionIconWrap, { backgroundColor: colors.backgroundSecondary }]}>
      <Ionicons name="add" size={18} color={colors.textSecondary} />
    </View>
    <Text style={[styles.optionLabel, { color: colors.primary }]}>Agregar tarjeta</Text>
  </TouchableOpacity>
</View>
```

- [ ] **Paso 5: Agregar estilos nuevos en `StyleSheet.create`**

Dentro del objeto de estilos existente, agregar:

```tsx
cardTypeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
cardTypeBadgeText: { fontSize: 11, fontFamily: Fonts.semiBold },
```

- [ ] **Paso 6: Renderizar `CardFormSheet` en el JSX**

Antes del cierre `</SafeAreaView>`, junto a los otros modales:

```tsx
<CardFormSheet
  visible={cardFormVisible}
  onClose={() => setCardFormVisible(false)}
  userId={user?.uid ?? ''}
/>
```

- [ ] **Paso 7: Commit**

```bash
git add "app/(tabs)/profile.tsx"
git commit -m "feat: add Mis Tarjetas section to profile"
```

---

## Tarea 8 — AddTransactionModal: selector de tarjeta y campos de cuotas

**Archivos:**
- Modificar: `components/AddTransactionModal.tsx`

**Contexto:** El modal ya tiene: tipo, monto, descripción, gasto fijo, categorías, fecha picker, botón guardar. Hay que agregar DESPUÉS del date picker (línea ~886, cierre `</View>` del date card) y ANTES del save button (línea ~888): selector de tarjeta + campos de cuotas condicionales. También hay que modificar `handleSave` para crear múltiples documentos atómicamente cuando hay cuotas, e importar los nuevos módulos.

- [ ] **Paso 1: Agregar imports en `AddTransactionModal.tsx`**

La línea existente de firebase/firestore ya tiene `addDoc, collection, Timestamp`. Agregar `writeBatch` y `doc` a esa misma línea:

```tsx
import { addDoc, collection, Timestamp, writeBatch, doc } from 'firebase/firestore';
```

Agregar también estas nuevas líneas de import:

```tsx
import * as Crypto from 'expo-crypto';
import { useCards } from '../hooks/useCards';
import { calculateInstallments, calculateInstallmentDates } from '../utils/installmentCalc';
import type { Card } from '../types/card';
```

- [ ] **Paso 2: Agregar estado nuevo en el componente**

Después de las declaraciones de estado existentes (después del bloque de date picker state ~línea 118):

```tsx
// Tarjeta y cuotas
const { cards } = useCards(user?.uid ?? '');
const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
const [installmentCount, setInstallmentCount] = useState(1);
const [withInterest, setWithInterest] = useState(false);
const [teaInput, setTeaInput] = useState('');
```

- [ ] **Paso 3: Actualizar `resetForm` para limpiar los nuevos campos**

Localizar la función `resetForm` y agregar al final del cuerpo:

```tsx
setSelectedCardId(null);
setInstallmentCount(1);
setWithInterest(false);
setTeaInput('');
```

- [ ] **Paso 4: Agregar lógica derivada para validación**

Después de `const isSaveDisabled = ...` (línea ~338), agregar:

```tsx
const selectedCard = cards.find((c) => c.id === selectedCardId) ?? null;
const isCredit = selectedCard?.type === 'credit';
const showInstallments = isCredit && installmentCount > 1;
const teaValue = teaInput !== '' ? parseFloat(teaInput) : null;
const teaValid = !showInstallments || !withInterest || (teaValue !== null && teaValue > 0 && teaValue <= 200);
const isSaveDisabledFull = isSaveDisabled || !teaValid;
```

- [ ] **Paso 5: Agregar UI del selector de tarjeta + cuotas en el ScrollView**

Ubicar el comentario `{/* Save button */}` (línea ~888) e insertar JUSTO ANTES:

```tsx
{/* Método de pago */}
{cards.length > 0 && (
  <View style={[styles.fixedRow, { borderColor: colors.border, flexDirection: 'column', alignItems: 'stretch', gap: 0, paddingVertical: 12, paddingHorizontal: 16 }]}>
    <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginBottom: 10 }]}>Método de pago</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {/* Opción "Sin tarjeta" */}
        <TouchableOpacity
          style={[
            styles.cardChip,
            { borderColor: colors.border, backgroundColor: colors.backgroundSecondary },
            selectedCardId === null && { backgroundColor: colors.primary, borderColor: colors.primary },
          ]}
          onPress={() => { setSelectedCardId(null); setInstallmentCount(1); setWithInterest(false); setTeaInput(''); }}
          activeOpacity={0.8}
        >
          <Text style={[styles.cardChipText, { color: selectedCardId === null ? '#FFFFFF' : colors.textSecondary }]}>
            Sin tarjeta
          </Text>
        </TouchableOpacity>

        {cards.map((card: Card) => (
          <TouchableOpacity
            key={card.id}
            style={[
              styles.cardChip,
              { borderColor: colors.border, backgroundColor: colors.backgroundSecondary },
              selectedCardId === card.id && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => { setSelectedCardId(card.id); setInstallmentCount(1); setWithInterest(false); setTeaInput(''); }}
            activeOpacity={0.8}
          >
            <Text style={[styles.cardChipText, { color: selectedCardId === card.id ? '#FFFFFF' : colors.textSecondary }]} numberOfLines={1}>
              {`${card.bankName} ••${card.lastFour}`}
            </Text>
            <View style={[
              styles.cardTypeDot,
              { backgroundColor: card.type === 'credit' ? (selectedCardId === card.id ? 'rgba(255,255,255,0.6)' : colors.error) : (selectedCardId === card.id ? 'rgba(255,255,255,0.6)' : colors.primary) },
            ]} />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  </View>
)}

{/* Cuotas — solo si tarjeta crédito seleccionada */}
{isCredit && type === 'expense' && (
  <View style={[styles.fixedRow, { borderColor: colors.border, flexDirection: 'column', alignItems: 'stretch', gap: 0, paddingVertical: 12, paddingHorizontal: 16 }]}>
    <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginBottom: 10 }]}>Cuotas</Text>

    {/* Picker numérico de cuotas */}
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
      <TouchableOpacity
        onPress={() => setInstallmentCount((v) => Math.max(1, v - 1))}
        style={[styles.qtyBtn, { borderColor: colors.border }]}
        activeOpacity={0.8}
      >
        <Ionicons name="remove" size={18} color={colors.textPrimary} />
      </TouchableOpacity>
      <Text style={[styles.qtyValue, { color: colors.textPrimary }]}>{installmentCount}</Text>
      <TouchableOpacity
        onPress={() => setInstallmentCount((v) => Math.min(36, v + 1))}
        style={[styles.qtyBtn, { borderColor: colors.border }]}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={18} color={colors.textPrimary} />
      </TouchableOpacity>
      <Text style={[styles.fixedHint, { color: colors.textTertiary, flex: 1 }]}>
        {installmentCount === 1 ? 'cuota (pago único)' : `cuotas`}
      </Text>
    </View>

    {/* Toggle con interés — solo si > 1 cuota */}
    {installmentCount > 1 && (
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: withInterest ? 12 : 0 }}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.fixedLabel, { color: colors.textPrimary }]}>¿Con interés?</Text>
          <Text style={[styles.fixedHint, { color: colors.textTertiary }]}>Activa si aplica TEA</Text>
        </View>
        <Switch
          value={withInterest}
          onValueChange={(v) => { setWithInterest(v); setTeaInput(''); }}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#fff"
        />
      </View>
    )}

    {/* Campo TEA — solo si toggle ON */}
    {installmentCount > 1 && withInterest && (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <TextInput
          style={[styles.teaInput, { borderColor: teaValid ? colors.border : colors.error, color: colors.textPrimary, backgroundColor: colors.backgroundSecondary }]}
          placeholder="Ej: 26.4"
          placeholderTextColor={colors.textTertiary}
          keyboardType="decimal-pad"
          value={teaInput}
          onChangeText={setTeaInput}
          returnKeyType="done"
        />
        <Text style={[styles.fixedLabel, { color: colors.textSecondary }]}>% TEA anual</Text>
      </View>
    )}

    {/* Preview de cuotas */}
    {installmentCount > 1 && isAmountValid && teaValid && (
      <View style={{ marginTop: 10, padding: 10, borderRadius: 10, backgroundColor: colors.primaryLight }}>
        <Text style={[styles.fixedHint, { color: colors.primary }]}>
          {(() => {
            const amounts = calculateInstallments(parsedAmount, installmentCount, withInterest ? teaValue : null);
            const first = amounts[0];
            const last = amounts[amounts.length - 1];
            const same = first === last;
            return same
              ? `${installmentCount} cuotas de $${first.toLocaleString('es-CO')}`
              : `${installmentCount - 1} cuotas de $${first.toLocaleString('es-CO')} + última de $${last.toLocaleString('es-CO')}`;
          })()}
        </Text>
      </View>
    )}
  </View>
)}
```

- [ ] **Paso 6: Agregar estilos nuevos en `StyleSheet.create`**

Al final del objeto de estilos existente agregar:

```tsx
cardChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
cardChipText: { fontSize: 13, fontFamily: Fonts.semiBold, maxWidth: 140 },
cardTypeDot: { width: 6, height: 6, borderRadius: 3 },
qtyBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
qtyValue: { fontSize: 18, fontFamily: Fonts.bold, minWidth: 32, textAlign: 'center' },
teaInput: { height: 46, width: 100, borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, fontSize: 16, fontFamily: Fonts.semiBold },
```

- [ ] **Paso 7: Actualizar el botón guardar para usar `isSaveDisabledFull`**

Localizar `isSaveDisabled && styles.saveButtonDisabled` y `disabled={isSaveDisabled}` (~línea 893–896) y reemplazar ambas referencias con `isSaveDisabledFull`.

- [ ] **Paso 8: Reemplazar `handleSave` completo**

Localizar la función `handleSave` (línea ~340) y reemplazarla completamente:

```tsx
const handleSave = async () => {
  if (isSaveDisabledFull || !user) return;
  setLoading(true);
  setError('');

  try {
    const now = new Date();
    const baseDoc = {
      userId: user.uid,
      type,
      category,
      description: description.trim(),
      createdAt: Timestamp.fromDate(now),
      isFixed,
      ...(selectedCardId ? { cardId: selectedCardId } : {}),
    };

    if (isCredit && type === 'expense' && installmentCount > 1) {
      // Compra a cuotas: crear n documentos atómicamente con writeBatch
      const amounts = calculateInstallments(
        parsedAmount,
        installmentCount,
        withInterest ? teaValue : null,
      );
      const dates = calculateInstallmentDates(selectedDate, installmentCount);
      const groupId = Crypto.randomUUID();

      const batch = writeBatch(db);
      amounts.forEach((amt, i) => {
        const ref = doc(collection(db, 'transactions'));
        batch.set(ref, {
          ...baseDoc,
          amount: amt,
          date: Timestamp.fromDate(dates[i]),
          isFixed: false, // cuotas nunca son fijos
          installmentGroupId: groupId,
          installmentNumber: i + 1,
          installmentTotal: installmentCount,
          isInstallment: true,
        });
      });
      await batch.commit();
    } else {
      // Transacción normal (1 cuota o débito)
      await addDoc(collection(db, 'transactions'), {
        ...baseDoc,
        amount: parsedAmount,
        date: Timestamp.fromDate(selectedDate),
      });
    }

    onSaved();
    animateOut(() => { resetForm(); });
  } catch (err: unknown) {
    setError(t('addTransaction.errors.saveFailed'));
    setLoading(false);
  }
};
```

- [ ] **Paso 9: Commit**

```bash
git add components/AddTransactionModal.tsx
git commit -m "feat: add card selector and installment fields to transaction modal"
```

---

## Tarea 9 — Display: mostrar tarjeta y cuota en TransactionRow

**Archivos:**
- Modificar: `app/(tabs)/index.tsx` — función `TransactionRow` (línea 60–83)
- Modificar: `app/(tabs)/history.tsx` — función `TransactionRow` (línea 502–539)

**Contexto:** Ambas pantallas tienen su propia `TransactionRow`. Las transacciones con `isInstallment: true` deben mostrar "(Cuota X/N)" en la descripción. Las transacciones con `cardId` deben mostrar un pequeño chip con el nombre del banco y últimos 4 dígitos debajo de la descripción. Necesitamos el listado de tarjetas del usuario para mapear `cardId → bankName + lastFour`.

### `app/(tabs)/index.tsx`

- [ ] **Paso 1: Agregar import de `useCards` en `index.tsx`**

```tsx
import { useCards } from '../../hooks/useCards';
```

- [ ] **Paso 2: Modificar `HomeScreen` para obtener las tarjetas**

Dentro de `HomeScreen`, después de `const { user }`, agregar:

```tsx
const { cards } = useCards(user?.uid ?? '');
const cardsMap = Object.fromEntries(cards.map((c) => [c.id, c]));
```

- [ ] **Paso 3: Pasar `cardsMap` a `TransactionRow` en `index.tsx`**

Cambiar el tipo de `TransactionRow` y su uso:

```tsx
// Nuevo signature:
function TransactionRow({ item, isLast, cardsMap }: {
  item: Transaction;
  isLast: boolean;
  cardsMap: Record<string, { bankName: string; lastFour: string; type: string }>;
}) {
  const { colors, isDark } = useTheme();
  const cat = CATEGORY_META[item.category] ?? CATEGORY_META.other;
  const isExpense = item.type === 'expense';
  const card = item.cardId ? cardsMap[item.cardId] : null;
  const descLabel = item.isInstallment
    ? `${item.description} (Cuota ${item.installmentNumber}/${item.installmentTotal})`
    : item.description;

  return (
    <View style={[
      styles.txRow,
      !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border },
    ]}>
      <View style={[styles.txIconWrap, { backgroundColor: isDark ? cat.darkBg : cat.bg }]}>
        <Text style={styles.txIconText}>{cat.icon}</Text>
      </View>
      <View style={styles.txMeta}>
        <Text style={[styles.txTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {descLabel}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Text style={[styles.txTime, { color: colors.textTertiary }]}>{timeAgo(item.date)}</Text>
          {card && (
            <View style={[styles.txCardChip, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.txCardChipText, { color: colors.primary }]}>
                {`${card.bankName} ••${card.lastFour}`}
              </Text>
            </View>
          )}
        </View>
      </View>
      <Text style={[styles.txAmount, { color: isExpense ? colors.error : colors.secondary }]}>
        {isExpense ? `−${formatCurrency(item.amount)}` : `+${formatCurrency(item.amount)}`}
      </Text>
    </View>
  );
}
```

- [ ] **Paso 4: Actualizar el uso de `TransactionRow` en el JSX de `HomeScreen`**

Localizar `<TransactionRow key={tx.id} item={tx} isLast={i === recent.length - 1} />` y reemplazar con:

```tsx
<TransactionRow key={tx.id} item={tx} isLast={i === recent.length - 1} cardsMap={cardsMap} />
```

- [ ] **Paso 5: Agregar estilos `txCardChip` y `txCardChipText` en `index.tsx`**

En el `StyleSheet.create` del archivo:

```tsx
txCardChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
txCardChipText: { fontSize: 10, fontFamily: Fonts.semiBold },
```

### `app/(tabs)/history.tsx`

- [ ] **Paso 6: Agregar import de `useCards` en `history.tsx`**

```tsx
import { useCards } from '../../hooks/useCards';
```

- [ ] **Paso 7: Obtener tarjetas en `HistoryScreen` y pasar `cardsMap`**

Dentro de `HistoryScreen`, después de `const { user }`:

```tsx
const { cards } = useCards(user?.uid ?? '');
const cardsMap = Object.fromEntries(cards.map((c) => [c.id, c]));
```

- [ ] **Paso 8: Modificar `TransactionRow` en `history.tsx`**

Cambiar el interface y la función:

```tsx
interface TransactionRowProps {
  item: Transaction;
  isLast: boolean;
  onLongPress: (tx: Transaction) => void;
  cardsMap: Record<string, { bankName: string; lastFour: string; type: string }>;
}

function TransactionRow({ item, isLast, onLongPress, cardsMap }: TransactionRowProps) {
  const { colors } = useTheme();
  const cat = CATEGORY_META[item.category] ?? CATEGORY_META.other;
  const isExpense = item.type === 'expense';
  const card = item.cardId ? cardsMap[item.cardId] : null;
  const descLabel = item.isInstallment
    ? `${item.description} (Cuota ${item.installmentNumber}/${item.installmentTotal})`
    : item.description;

  return (
    <TouchableOpacity
      onLongPress={() => onLongPress(item)}
      delayLongPress={350}
      activeOpacity={0.7}
      style={[
        styles.txRow,
        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border },
      ]}
    >
      <View style={[styles.txIconWrap, { backgroundColor: colors.backgroundSecondary }]}>
        <Text style={styles.txIconText}>{cat.icon}</Text>
      </View>
      <View style={styles.txMeta}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Text style={[styles.txTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {descLabel}
          </Text>
          {item.isFixed && (
            <View style={[styles.fixedBadge, { backgroundColor: colors.primaryLight ?? `${colors.primary}22` }]}>
              <Text style={[styles.fixedBadgeText, { color: colors.primary }]}>Fijo</Text>
            </View>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
          <Text style={[styles.txTime, { color: colors.textTertiary }]}>
            {CATEGORY_LABELS[item.category] ?? item.category}
          </Text>
          {card && (
            <View style={[styles.txCardChip, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.txCardChipText, { color: colors.primary }]}>
                {`${card.bankName} ••${card.lastFour}`}
              </Text>
            </View>
          )}
        </View>
      </View>
      <Text style={[styles.txAmount, { color: isExpense ? colors.error : colors.secondary }]}>
        {isExpense ? `−${formatCurrency(item.amount)}` : `+${formatCurrency(item.amount)}`}
      </Text>
    </TouchableOpacity>
  );
}
```

- [ ] **Paso 9: Actualizar el uso de `TransactionRow` en el JSX de `HistoryScreen`**

Localizar `<TransactionRow` en el JSX de `HistoryScreen` y agregar la prop `cardsMap={cardsMap}`.

- [ ] **Paso 10: Agregar estilos `txCardChip` y `txCardChipText` en `history.tsx`**

```tsx
txCardChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
txCardChipText: { fontSize: 10, fontFamily: Fonts.semiBold },
```

- [ ] **Paso 11: Commit final**

```bash
git add "app/(tabs)/index.tsx" "app/(tabs)/history.tsx"
git commit -m "feat: show card chip and installment label in transaction rows"
```

---

## Verificación end-to-end

Ejecutar la app con `npx expo run:ios` y probar:

1. **Registro nuevo** → dialog éxito → "Continuar" → llega a pantalla `select-cards`
2. **Onboarding** → seleccionar Bancolombia → Débito → 1234 → Agregar → aparece chip → "Listo" → llega al home
3. **Home** → FAB → nueva transacción → tipo Gasto → en selector de tarjeta aparece "Bancolombia ••1234" → seleccionarla → no aparecen cuotas (débito)
4. **Crédito**: agregar tarjeta de crédito desde perfil → nueva transacción → seleccionar crédito → aparece picker cuotas → poner 6 → toggle interés ON → TEA 26.4 → preview muestra valor por cuota → guardar → en historial de abril aparece "Cuota 1/6", en mayo "Cuota 2/6", etc.
5. **Perfil** → "Mis tarjetas" → botón + → flujo 2 pasos → tarjeta guardada → botón trash → confirmación → eliminada
6. **Débito sin tarjeta**: crear transacción normal sin seleccionar tarjeta → guarda como siempre → no muestra chip en historial
