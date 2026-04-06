# Bank Icons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar el logo oficial de cada banco (vía Clearbit) con fallback a círculo de iniciales con color corporativo, en todos los lugares donde aparecen tarjetas en la app.

**Architecture:** Añadir `logoUrl`, `color` e `initials` a `COLOMBIAN_BANKS`. Crear componente `BankLogo` que intenta cargar la imagen y cae al fallback. Actualizar 4 archivos que muestran bancos/tarjetas.

**Tech Stack:** React Native 0.83 + Expo SDK 55, TypeScript, Image de react-native

---

## Mapa de archivos

| Acción | Archivo |
|--------|---------|
| Modificar | `config/banks.ts` |
| Crear | `components/BankLogo.tsx` |
| Modificar | `app/(onboarding)/select-cards.tsx` |
| Modificar | `components/CardFormSheet.tsx` |
| Modificar | `app/(tabs)/profile.tsx` |
| Modificar | `components/AddTransactionModal.tsx` |

---

## Tarea 1 — Actualizar `config/banks.ts`

**Archivos:**
- Modificar: `config/banks.ts`

- [ ] **Paso 1: Reemplazar el contenido completo de `config/banks.ts`**

```ts
export interface Bank {
  id: string;
  name: string;
  category: 'traditional' | 'digital' | 'other';
  logoUrl: string | null;
  color: string;
  initials: string;
}

export const COLOMBIAN_BANKS: Bank[] = [
  { id: 'bancolombia', name: 'Bancolombia',          category: 'traditional', logoUrl: 'https://logo.clearbit.com/bancolombia.com',             color: '#FFD100', initials: 'BC' },
  { id: 'davivienda',  name: 'Davivienda',           category: 'traditional', logoUrl: 'https://logo.clearbit.com/davivienda.com',              color: '#E01A24', initials: 'DV' },
  { id: 'bbva',        name: 'BBVA',                 category: 'traditional', logoUrl: 'https://logo.clearbit.com/bbva.com.co',                 color: '#004B8D', initials: 'BB' },
  { id: 'bogota',      name: 'Banco de Bogotá',      category: 'traditional', logoUrl: 'https://logo.clearbit.com/bancodebogota.com',           color: '#0E3F7A', initials: 'BB' },
  { id: 'colpatria',   name: 'Scotiabank Colpatria', category: 'traditional', logoUrl: 'https://logo.clearbit.com/scotiabankcolpatria.com',     color: '#E31837', initials: 'SC' },
  { id: 'itau',        name: 'Itaú',                 category: 'traditional', logoUrl: 'https://logo.clearbit.com/itau.co',                    color: '#EC7000', initials: 'IT' },
  { id: 'occidente',   name: 'Banco de Occidente',   category: 'traditional', logoUrl: 'https://logo.clearbit.com/bancodeoccidente.com.co',    color: '#00518A', initials: 'OC' },
  { id: 'popular',     name: 'Banco Popular',        category: 'traditional', logoUrl: 'https://logo.clearbit.com/bancopopular.com.co',        color: '#003087', initials: 'BP' },
  { id: 'avvillas',    name: 'AV Villas',            category: 'traditional', logoUrl: 'https://logo.clearbit.com/avvillas.com.co',            color: '#00A650', initials: 'AV' },
  { id: 'cajasocial',  name: 'Banco Caja Social',    category: 'traditional', logoUrl: 'https://logo.clearbit.com/bancocajasocial.com.co',     color: '#1D3F8A', initials: 'CS' },
  { id: 'nequi',       name: 'Nequi',                category: 'digital',     logoUrl: 'https://logo.clearbit.com/nequi.com.co',               color: '#7B2FBE', initials: 'NQ' },
  { id: 'daviplata',   name: 'Daviplata',            category: 'digital',     logoUrl: 'https://logo.clearbit.com/daviplata.com',              color: '#FF6600', initials: 'DP' },
  { id: 'nubank',      name: 'Nubank',               category: 'digital',     logoUrl: 'https://logo.clearbit.com/nubank.com.co',              color: '#820AD1', initials: 'NU' },
  { id: 'lulo',        name: 'Lulo Bank',            category: 'digital',     logoUrl: 'https://logo.clearbit.com/lulobank.com.co',            color: '#F5A623', initials: 'LU' },
  { id: 'rappipay',    name: 'RappiPay',             category: 'digital',     logoUrl: 'https://logo.clearbit.com/rappipay.com',               color: '#FF441F', initials: 'RP' },
  { id: 'movii',       name: 'Movii',                category: 'digital',     logoUrl: 'https://logo.clearbit.com/movii.com.co',               color: '#00B4D8', initials: 'MV' },
  { id: 'efectivo',    name: 'Efectivo',             category: 'other',       logoUrl: null,                                                    color: '#4CAF50', initials: 'EF' },
];

export const BANK_CATEGORY_LABELS: Record<Bank['category'], string> = {
  traditional: 'Bancos tradicionales',
  digital: 'Billeteras digitales',
  other: 'Otros',
};
```

- [ ] **Paso 2: Commit**

```bash
cd ~/Documents/Github/Spendiapp
git add config/banks.ts
git commit -m "feat: add logoUrl, color and initials to Colombian banks"
```

---

## Tarea 2 — Crear `components/BankLogo.tsx`

**Archivos:**
- Crear: `components/BankLogo.tsx`

- [ ] **Paso 1: Crear el archivo**

```tsx
import { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { COLOMBIAN_BANKS } from '../config/banks';

interface BankLogoProps {
  bankId: string;
  size?: number;
  radius?: number;
}

export default function BankLogo({ bankId, size = 40, radius = 10 }: BankLogoProps) {
  const bank = COLOMBIAN_BANKS.find((b) => b.id === bankId);
  const [logoFailed, setLogoFailed] = useState(false);

  const showLogo = !!bank?.logoUrl && !logoFailed;

  return (
    <View style={[
      styles.container,
      {
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: showLogo ? '#F5F5F5' : (bank?.color ?? '#888888'),
      },
    ]}>
      {showLogo ? (
        <Image
          source={{ uri: bank!.logoUrl! }}
          style={{ width: size * 0.75, height: size * 0.75 }}
          resizeMode="contain"
          onError={() => setLogoFailed(true)}
        />
      ) : (
        <Text style={[styles.initials, { fontSize: size * 0.3 }]}>
          {bank?.initials ?? '??'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  initials: { color: '#FFFFFF', fontWeight: '800' },
});
```

- [ ] **Paso 2: Commit**

```bash
git add components/BankLogo.tsx
git commit -m "feat: add BankLogo component with Clearbit + initials fallback"
```

---

## Tarea 3 — Actualizar `app/(onboarding)/select-cards.tsx`

**Archivos:**
- Modificar: `app/(onboarding)/select-cards.tsx`

**Contexto:** La fila del banco actualmente muestra `{bank.name}` + ícono de flecha/chevron. Hay que agregar `<BankLogo>` a la izquierda del nombre. El estilo `bankNameRow` ya es `flexDirection: 'row'`.

- [ ] **Paso 1: Agregar import de `BankLogo`**

Después de los imports existentes, agregar:

```tsx
import BankLogo from '../../components/BankLogo';
```

- [ ] **Paso 2: Actualizar el row del banco en el JSX**

Localizar el bloque (dentro del `map` de bancos):

```tsx
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
```

Reemplazarlo con:

```tsx
                        <TouchableOpacity
                          style={styles.bankNameRow}
                          onPress={() => handleToggleBank(bank.id)}
                          activeOpacity={0.7}
                        >
                          <BankLogo bankId={bank.id} size={36} radius={10} />
                          <Text style={[styles.bankName, { color: colors.textPrimary }]}>{bank.name}</Text>
                          <Ionicons
                            name={isExpanded ? 'chevron-up' : 'add-circle-outline'}
                            size={20}
                            color={isExpanded ? colors.primary : colors.textTertiary}
                          />
                        </TouchableOpacity>
```

- [ ] **Paso 3: Ajustar estilo `bankNameRow` para acomodar el logo**

En `StyleSheet.create`, localizar:

```tsx
  bankNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
```

Reemplazar con:

```tsx
  bankNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
  bankName: { fontSize: 15, fontFamily: Fonts.medium, flex: 1 },
```

**Nota:** Si `bankName` ya existe en los estilos (sin `flex: 1`), actualízalo en lugar de duplicarlo.

- [ ] **Paso 4: Commit**

```bash
git add "app/(onboarding)/select-cards.tsx"
git commit -m "feat: add BankLogo to select-cards bank list"
```

---

## Tarea 4 — Actualizar `components/CardFormSheet.tsx`

**Archivos:**
- Modificar: `components/CardFormSheet.tsx`

**Contexto:** El paso 1 del sheet es una `FlatList` de bancos. Cada item tiene nombre + chevron. Hay que añadir `<BankLogo>` a la izquierda del nombre.

- [ ] **Paso 1: Agregar import de `BankLogo`**

```tsx
import BankLogo from './BankLogo';
```

- [ ] **Paso 2: Actualizar el `renderItem` de la FlatList**

Localizar:

```tsx
              <TouchableOpacity
                style={[styles.bankItem, { borderBottomColor: colors.border }]}
                onPress={() => handleSelectBank(item)}
                activeOpacity={0.7}
              >
                <Text style={[styles.bankItemText, { color: colors.textPrimary }]}>{item.name}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
```

Reemplazar con:

```tsx
              <TouchableOpacity
                style={[styles.bankItem, { borderBottomColor: colors.border }]}
                onPress={() => handleSelectBank(item)}
                activeOpacity={0.7}
              >
                <BankLogo bankId={item.id} size={32} radius={8} />
                <Text style={[styles.bankItemText, { color: colors.textPrimary }]}>{item.name}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
```

- [ ] **Paso 3: Actualizar estilo `bankItem`**

Localizar:

```tsx
  bankItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
```

Reemplazar con:

```tsx
  bankItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1 },
  bankItemText: { flex: 1, fontSize: 15, fontFamily: Fonts.medium },
```

**Nota:** Si `bankItemText` ya existe en los estilos, actualízalo con `flex: 1` en lugar de duplicarlo.

- [ ] **Paso 4: Commit**

```bash
git add components/CardFormSheet.tsx
git commit -m "feat: add BankLogo to CardFormSheet bank list"
```

---

## Tarea 5 — Actualizar sección "Mis tarjetas" en `app/(tabs)/profile.tsx`

**Archivos:**
- Modificar: `app/(tabs)/profile.tsx`

**Contexto:** Cada tarjeta en la lista de "Mis tarjetas" tiene un `optionIconWrap` con `Ionicons name="card-outline"`. Reemplazar por `<BankLogo>`.

- [ ] **Paso 1: Agregar import de `BankLogo`**

```tsx
import BankLogo from '../../components/BankLogo';
```

- [ ] **Paso 2: Reemplazar el ícono genérico por `BankLogo`**

Localizar dentro del `cards.map(...)`:

```tsx
        <View style={[styles.optionIconWrap, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="card-outline" size={18} color={colors.primary} />
        </View>
```

Reemplazar con:

```tsx
        <BankLogo bankId={card.bankId} size={40} radius={10} />
```

- [ ] **Paso 3: Commit**

```bash
git add "app/(tabs)/profile.tsx"
git commit -m "feat: show BankLogo in profile Mis Tarjetas section"
```

---

## Tarea 6 — Actualizar chips de tarjeta en `components/AddTransactionModal.tsx`

**Archivos:**
- Modificar: `components/AddTransactionModal.tsx`

**Contexto:** Los chips de selección de tarjeta en el modal muestran `{card.bankName} ••{card.lastFour}` + un dot de color. Añadir `<BankLogo>` a la izquierda del texto.

- [ ] **Paso 1: Agregar import de `BankLogo`**

```tsx
import BankLogo from './BankLogo';
```

- [ ] **Paso 2: Actualizar los chips de tarjeta en el JSX**

Localizar el `cards.map((card: Card) => (` y dentro de él el `TouchableOpacity` de chip. El interior actual tiene:

```tsx
            <Text style={[styles.cardChipText, { color: selectedCardId === card.id ? '#FFFFFF' : colors.textSecondary }]} numberOfLines={1}>
              {`${card.bankName} ••${card.lastFour}`}
            </Text>
            <View style={[
              styles.cardTypeDot,
              { backgroundColor: card.type === 'credit' ? (selectedCardId === card.id ? 'rgba(255,255,255,0.6)' : colors.error) : (selectedCardId === card.id ? 'rgba(255,255,255,0.6)' : colors.primary) },
            ]} />
```

Reemplazar con:

```tsx
            <BankLogo bankId={card.bankId} size={20} radius={5} />
            <Text style={[styles.cardChipText, { color: selectedCardId === card.id ? '#FFFFFF' : colors.textSecondary }]} numberOfLines={1}>
              {`${card.bankName} ••${card.lastFour}`}
            </Text>
            <View style={[
              styles.cardTypeDot,
              { backgroundColor: card.type === 'credit' ? (selectedCardId === card.id ? 'rgba(255,255,255,0.6)' : colors.error) : (selectedCardId === card.id ? 'rgba(255,255,255,0.6)' : colors.primary) },
            ]} />
```

- [ ] **Paso 3: Commit**

```bash
git add components/AddTransactionModal.tsx
git commit -m "feat: add BankLogo to card selection chips in transaction modal"
```
