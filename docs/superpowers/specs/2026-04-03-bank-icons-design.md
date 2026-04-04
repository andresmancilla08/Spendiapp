# Iconos de Bancos — Diseño

> **Para agentes:** Usar `superpowers:subagent-driven-development` para implementar este plan tarea por tarea.

**Objetivo:** Mostrar el logo oficial de cada banco colombiano en todos los lugares donde aparecen tarjetas. Fallback a círculo con iniciales y color corporativo cuando el logo no carga (offline o dominio no encontrado).

**Arquitectura:** Añadir metadatos visuales (`logoUrl`, `color`, `initials`) al array estático `COLOMBIAN_BANKS`. Componente `BankLogo` reutilizable que intenta cargar la imagen y cae al fallback. No hay nuevas pantallas ni rutas.

**Tech Stack:** React Native, expo-image (o Image de RN), TypeScript

---

## Modelo de datos — `config/banks.ts`

```ts
export interface Bank {
  id: string;
  name: string;
  category: 'traditional' | 'digital' | 'other';
  logoUrl: string | null;   // URL Clearbit — null para Efectivo
  color: string;            // Color corporativo hex
  initials: string;         // 2 letras fallback
}
```

### Array actualizado completo

```ts
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
```

---

## Componente `BankLogo`

### `components/BankLogo.tsx`

```tsx
import { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { COLOMBIAN_BANKS } from '../config/banks';

interface BankLogoProps {
  bankId: string;
  size?: number;       // default 40
  radius?: number;     // default 10
}

export default function BankLogo({ bankId, size = 40, radius = 10 }: BankLogoProps) {
  const bank = COLOMBIAN_BANKS.find((b) => b.id === bankId);
  const [logoFailed, setLogoFailed] = useState(false);

  const showLogo = bank?.logoUrl && !logoFailed;

  return (
    <View style={[
      styles.container,
      { width: size, height: size, borderRadius: radius, backgroundColor: showLogo ? '#f5f5f5' : (bank?.color ?? '#888') },
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

---

## Lugares donde se reemplaza la representación del banco

| Archivo | Cambio |
|---------|--------|
| `app/(onboarding)/select-cards.tsx` | Row de banco: añadir `<BankLogo bankId={bank.id} size={36} />` a la izquierda del nombre |
| `components/CardFormSheet.tsx` | Paso 1 lista de bancos: añadir `<BankLogo bankId={b.id} size={32} />` |
| `app/(tabs)/profile.tsx` | Sección "Mis tarjetas": reemplazar `card-outline` por `<BankLogo bankId={card.bankId} size={36} />` |
| `components/AddTransactionModal.tsx` | Chips de tarjeta: añadir `<BankLogo bankId={card.bankId} size={24} radius={6} />` dentro del chip |

---

## Lo que NO entra en este spec

- Cache local de logos (el OS de RN ya cachea imágenes por URL)
- Logos SVG propios — Clearbit es suficiente
- Logos en los chips de transacción en historial (el chip es muy pequeño, solo texto)
