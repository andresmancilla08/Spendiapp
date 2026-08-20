# Simulador de compras — Análisis y diseño

> Estado: **propuesta**, sin implementar. 2026-08-20.
> Objetivo: responder *antes* de comprar «¿cuánto me cuesta de verdad y me cabe en el mes?».

---

## 1. Qué existe ya (y por qué esto es barato de construir)

La app **ya sabe hacer casi toda la matemática**. El simulador no es un motor nuevo,
es una vista *what-if* sobre el motor que ya escribe transacciones a cuotas.

| Pieza | Dónde | Qué aporta |
|---|---|---|
| Amortización francesa desde TEA | `utils/installmentCalc.ts` → `calculateInstallments(amount, n, tea)` | Cuota mes a mes, residuo de redondeo en la última |
| Fechas de cada cuota | `utils/installmentCalc.ts` → `calculateInstallmentDates` | Corrige 31-ene → 28-feb |
| Tasa de referencia | `hooks/useTEARate.ts` → 25,52 % EA (usura Q1-2026) | Valor por defecto del campo TEA |
| Tarjetas del usuario | `hooks/useCards.ts` + `types/card.ts` (`type`, `cutoffDay`) | Selector de tarjeta y fecha de primer pago |
| Regla de fecha de corte | `app/add-transaction.tsx:398-405` (inline) | Si el día de compra ≤ `cutoffDay` → la cuota 1 cae el 1 del mes siguiente |
| Cuotas ya registradas | `transactions` con `isInstallment`, `installmentNumber/Total`, `installmentGroupId` | Carga mensual ya comprometida |
| Ingreso/gasto típico | `hooks/useMonthlyTrend.ts` (6 meses), `hooks/useRecurring.ts` (`monthlyTotal`) | Base del veredicto de holgura |
| Presupuestos | `hooks/useBudgets.ts` | «esta cuota se come el X % de tu presupuesto de Ropa» |
| Importe propio real | `utils/sharedCalc.effectiveAmount` | Obligatorio para agregar dinero (compartidos) |

**Lo que NO existe y hay que crear:** el modo *simulación* (calcular sin escribir),
la tabla de amortización, la comparación de plazos, y el cruce contra el flujo de caja.

---

## 2. Alcance: qué es y qué no es

**Es** una calculadora de financiación *con contexto del usuario*: sabe qué tarjetas
tiene, cuánto ya debe en cuotas, cuánto ingresa y cuánto gasta fijo.

**No es** (fuera de alcance en esta propuesta):
- Crédito de libre inversión, hipoteca, leasing → otra fórmula, otros costos.
- Simulación multi-moneda: `utils/formatMoney.ts` fija COP a propósito.
- Consulta de tasas reales por banco (no hay integración bancaria).
- Asesoría financiera. El resultado es informativo y así se rotula.

---

## 3. Matemática, explícita

### 3.1 Conversión de tasas
```
TEA → mensual:   i = (1 + TEA/100)^(1/12) − 1
mensual → TEA:   TEA = ((1 + i)^12 − 1) × 100
```
Se aceptan **dos formas de entrada** porque el usuario lee las dos en la vida real:
la TEA en el extracto y el «2,1 % mensual» que le dice el cajero. Internamente todo
se normaliza a `i` mensual y se muestran siempre las dos.

### 3.2 Cuota (sistema francés, cuota fija)
```
capital financiado  P = precio − cuota inicial
i > 0:   PMT = P·i / (1 − (1+i)^−n)
i = 0:   PMT = P / n
```
**Regla dura:** el simulador NO recalcula la cuota por su cuenta. Llama a
`calculateInstallments(P, n, tea)` — el mismo array que se escribiría en Firestore —
y construye la tabla desde ahí. Si calcula el PMT aparte, el simulador y el
movimiento registrado se separan en pesos y el usuario ve dos cifras distintas
para la misma compra.

### 3.3 Tabla de amortización
Para cada cuota `k`, con `saldo₀ = P`:
```
interés_k = round(saldo_{k−1} · i)
abono_k   = cuota_k − interés_k
saldo_k   = saldo_{k−1} − abono_k
```
La última fila fuerza `saldo = 0` absorbiendo el residuo (coherente con que
`calculateInstallments` mete el residuo en la última cuota).

### 3.4 Totales
```
total pagado    = Σ cuotas + (cargo fijo mensual × n) + cuota inicial
costo del crédito = total pagado − precio
sobrecosto %     = costo / precio × 100
```

### 3.5 Tasa efectiva real (TIR) — solo si hay cargos o cuota inicial
Con un cargo mensual fijo, la TEA nominal miente. Se resuelve `x` en:
```
P = Σ_{k=1..n} (cuota_k + cargo) / (1+x)^k
TEA_real = ((1+x)^12 − 1) × 100
```
Por **bisección** en `x ∈ [0, 1]`, 60 iteraciones. No Newton-Raphson: la bisección
no diverge y son diez líneas.

**Ejemplo trabajado** — $1.800.000 a 12 cuotas, TEA 25,52 %:
- `i` = 1,9122 % mensual → cuota ≈ **$169.291**
- total ≈ $2.031.492 · costo ≈ **$231.492** (12,9 % sobre el precio)
- Con cuota de manejo de $20.000/mes: total $2.271.492, costo $471.492, y la
  **TEA real sube a ≈ 56 %**. Ese salto es exactamente el dato que ninguna
  calculadora genérica enseña.

> Matiz honesto que va en la UI: la cuota de manejo se paga igual sin esta compra.
> Por eso el campo viene **apagado** por defecto y se rotula «cargo mensual
> atribuible a esta compra», no «cuota de manejo».

### 3.6 Fecha de la primera cuota
Se reutiliza la regla que ya aplica `add-transaction`:
```
si (día de compra ≤ card.cutoffDay) → primera cuota = día 1 del mes siguiente
si no                                → primera cuota = la fecha de compra
```
**Acción requerida:** extraer esa regla inline a
`utils/installmentCalc.effectivePurchaseDate(date, cutoffDay)` y que las dos
pantallas la llamen. Dos copias de esa condición garantizan que en algún momento
digan cosas distintas. Es una extracción pura → hay que verificar que
`add-transaction` se comporta idéntico (auditoría de impacto).

---

## 4. La parte que sólo Spendia puede hacer: impacto real

Una calculadora dice «tu cuota es $169.291». Spendia puede decir
«**y ya tienes $340.000/mes comprometidos hasta marzo; esto te deja el 31 % del
ingreso en cuotas**».

### 4.1 Insumos
| Dato | Fuente | Cálculo |
|---|---|---|
| Cuotas comprometidas por mes | `transactions` con `date > hoy` filtrando `isInstallment` en cliente | Σ `effectiveAmount(tx)` agrupado por mes |
| Ingreso típico | `useMonthlyTrend(uid, y, m, 6)` | **mediana** de `income` (mediana, no media: un aguinaldo distorsiona la media) |
| Gasto fijo típico | `useRecurring().monthlyTotal` + fijos | Suma mensual |
| Presupuesto de la categoría | `useBudgets` | `cuota / limitAmount × 100` |

> Sobre la consulta: **no** se crea índice nuevo. Se reutiliza el índice
> `userId + date` que ya usa `useRecurring` y se filtra `isInstallment` en cliente.
> El volumen es pequeño (cuotas futuras de un usuario).

### 4.2 Veredicto
```
carga[m]  = comprometido[m] + cuota nueva
%carga    = carga[m] / ingreso típico
≤ 20 %  → holgado
≤ 30 %  → ajustado
> 30 %  → riesgoso
carga > (ingreso − gasto fijo) → «no cabe» (bandera dura, gana sobre lo anterior)
```
**Regla del proyecto que aplica aquí:** *ninguna frase con un número se muestra
antes de tener el número* (`docs/contexto/errores-conocidos.md`). Sin historial de
ingresos, el bloque de impacto no se pinta — no se pinta con ceros.

**Regla de `feedback_llm_numbers_in_code`:** si más adelante se añade un texto de IA
sobre el veredicto, la IA **recibe** las cifras ya calculadas; nunca las calcula.

### 4.3 Vuelta de tuerca propia del producto
Spendia tiene Metas. El contrapeso natural de «financiar» es «ahorrar»:
> «Si en vez de financiar guardas $169.291 al mes, en 11 meses lo pagas de contado
> y te ahorras $231.492.» → CTA **Crear meta de ahorro** (`/goals` prellenada).

---

## 5. Diseño de pantalla

Ruta: `app/purchase-simulator.tsx`. Móvil primero, `maxWidth: 640`, `ScreenTransition`
como raíz, CTA fijo dentro de `FloatingActions`, iconos sólo Tabler vía `AppIcon`.

```
┌─────────────────────────────────────┐
│ AppHeader                           │
│ Simulador de compras                │
│ Antes de comprar, mira cuánto       │
│ te cuesta de verdad                 │
├─────────────────────────────────────┤
│ LA COMPRA                           │
│      $ 1.800.000                    │  ← input grande, patrón add-transaction
│  [ Zapatos            ] [ 👟 Ropa ] │  ← descripción + categoría (opcionales)
├─────────────────────────────────────┤
│ CÓMO LA PAGAS                       │
│  [Bancolombia] [Nu] [Contado]       │  ← BankLogo, sólo crédito + opción contado
│  Cuotas   ⊖  12  ⊕                  │
│  [1][3][6][12][24][36]              │  ← chips de acceso rápido
│  Con interés            [ ● ]       │
│    ( TEA | % mensual )  25,52  %    │  ← AppSegmentedControl
│  ▸ Más opciones                     │  ← colapsado: cuota inicial, cargo mensual
├─────────────────────────────────────┤
│ ★ CUOTA MENSUAL                     │
│      $ 169.291                      │
│  12 meses · terminas en ago 2027    │
│  Total     Costo      TEA real      │
│  $2.031.492  $231.492   25,5 %      │
├─────────────────────────────────────┤
│ ( Plan | Comparar | Impacto )       │  ← AppSegmentedControl
│                                     │
│ …contenido de la pestaña…           │
└─────────────────────────────────────┘
        [ Registrar esta compra ]        ← FloatingActions
```

### Pestaña **Plan** — tabla de amortización
| # | Fecha | Cuota | Interés | Capital | Saldo |
Se muestran 6 filas + «ver las 12». Fechas por `utils/dateLocale`, nunca arrays de meses.

### Pestaña **Comparar** — el plazo es la decisión real
| Plazo | Cuota | Total | Sobrecosto |
|---|---|---|---|
| Contado | — | $1.800.000 | — |
| 3 | $612.7xx | $1.838.xxx | +2,1 % |
| 6 | $316.xxx | $1.897.xxx | +5,4 % |
| **12** | **$169.291** | **$2.031.492** | **+12,9 %** |
| 24 | $95.xxx | $2.288.xxx | +27,2 % |
| 36 | $71.xxx | $2.556.xxx | +42,0 % |

Una sola pasada por `calculateInstallments`. Es la tabla que hace cambiar de opinión.

### Pestaña **Impacto**
- Barras de los próximos 12 meses: comprometido (gris) + cuota nueva (color primario),
  con la línea del ingreso típico. **Dibujadas con `View`, sin librería de gráficos**
  (el bundle web es único, ~3,1 MB).
- Chip de veredicto: holgado / ajustado / riesgoso.
- «La cuota es el 12 % de tu ingreso típico».
- Si hay presupuesto de la categoría: «se come el 34 % de tu presupuesto de Ropa».
- CTA secundario: **Crear meta de ahorro**.
- Pie: «Estimación informativa, no asesoría financiera».

---

## 6. Archivos a crear / tocar

**Nuevos**
```
utils/simulator.ts            lógica pura: tasas, tabla, TIR por bisección, veredicto
utils/simulator.test.ts       gate con npx tsx (convención del repo)
hooks/usePurchaseImpact.ts    cuotas futuras + ingreso típico + presupuesto
app/purchase-simulator.tsx    la pantalla
components/simulator/ScenarioTable.tsx
components/simulator/AmortizationTable.tsx
components/simulator/ImpactBars.tsx
```

**Modificados**
```
utils/installmentCalc.ts      + effectivePurchaseDate(); NO cambiar la firma de
                              calculateInstallments (la usa useSharedTransactions)
app/add-transaction.tsx       usa effectivePurchaseDate(); acepta params de prellenado
app/(tabs)/tools.tsx          nueva tesela en el grupo «Tu dinero»
hooks/useFeatureFlags.ts      + simulatorEnabled (y DEFAULT_FEATURE_FLAGS)
locales/{es,en,it}.json       bloque simulator.* en los TRES idiomas
```

`utils/simulator.ts` **no importa react-native ni hooks** — igual que
`premiumPreview.ts` y `formatMoney.ts` — para que su gate corra en Node.

---

## 7. Fases

**F1 — Calculadora (sin escribir en Firestore).**
`utils/simulator.ts` + test, pantalla con Plan y Comparar, tesela, flag, i18n×3.
Sin consultas nuevas. Es la mitad del valor con el 30 % del trabajo.

**F2 — Impacto y cierre del ciclo.**
`usePurchaseImpact`, pestaña Impacto, y **«Registrar esta compra»** → `/add-transaction`
prellenado (monto, tarjeta, cuotas, TEA, descripción, categoría). `add-transaction`
hoy sólo lee `year`/`month` de `useLocalSearchParams`; hay que ampliarlo.

**F3 — Refinamientos.**
- `Card.tea?: number` → cada tarjeta recuerda su tasa; prellena simulador **y**
  `add-transaction`. Cambio pequeño, beneficio doble.
- Guardar simulaciones (AsyncStorage primero; Firestore sólo si se pide sincronía).
- Entrada desde `add-transaction` («¿cuánto me cuesta esto a cuotas?») y desde tarjetas.
- Abonos extraordinarios / pago anticipado.

---

## 8. Riesgos y trampas conocidas

1. **Divergencia de cifras.** Si el simulador calcula PMT por su cuenta, el número
   simulado y el registrado difieren en pesos. Mitigación: una sola fuente,
   `calculateInstallments`.
2. **`calculateInstallments` es zona sensible.** La usa `useSharedTransactions`
   (compartidos a cuotas), el área con más errores del repo — en cuotas `amount`
   ES la cuota propia, no el total. No se cambia su firma ni su redondeo.
3. **Regla de corte duplicada.** Ver §3.6: extraer, no copiar. Verificar
   `add-transaction` tras la extracción.
4. **Agregados de dinero.** Toda suma sobre transacciones pasa por
   `effectiveAmount(tx)`; sumar `tx.amount` cuenta el total del grupo en compartidos.
5. **Una cuota nunca es un gasto fijo.** Si F2 prellena `add-transaction`, `isFixed`
   debe quedar apagado (ya lo fuerza el guardado, pero el prellenado no debe
   encenderlo).
6. **Tope de cuotas.** `add-transaction` limita a 36. El simulador se queda en 36
   también: simular 48 y no poder registrarlo es una promesa rota.
7. **i18n.** Toda clave nueva en es/en/it + `node scripts/check-i18n-keys.js`.
   Ojo con `count`: activa pluralización de i18next; si el número es sólo un dato,
   el marcador se llama `n`.
8. **Rendimiento.** Nada de `Animated.loop` decorativo ni `filter: blur()` animado.
   Las barras son `View`s estáticas.
9. **Deploy.** `npm run typecheck`, bump sincronizado `package.json` + `app.json`,
   entrada de WhatsNew **reemplazada** (no acumulada).

---

## 9. Decisiones abiertas

1. **¿Premium o gratis?** Propuesta: calculadora (F1) **gratis** — es gancho de
   captación y funciona sin datos; **Impacto** (F2) premium, igual que Presupuestos.
2. **¿Cuota de manejo dentro del cálculo?** Propuesta: campo opcional, apagado por
   defecto, rotulado como cargo *atribuible* (ver §3.5).
3. **¿Persistencia de simulaciones?** Propuesta: F1 sin persistencia, F3 en
   AsyncStorage. Firestore sólo si tiene que verse en otro dispositivo.
