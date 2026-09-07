# Glosario y Entidades

## Términos del dominio (finanzas personales)
- **Transacción / Gasto / Ingreso** — movimiento de dinero. **Categoría** — clasificación.
- **Banks** — entidades bancarias (`assets/banks`). **WhatsNew** — modal de novedades por versión.
- **TEA** — Tasa Efectiva Anual (% E.A.). Referencia por defecto: la tasa de usura certificada por la Superfinanciera (`hooks/useTEARate.ts`, 25,52 % en Q1-2026). **Tasa mensual** — su equivalente: `(1+TEA/100)^(1/12) − 1`.
- **Cuota** — pago mensual de una compra financiada, calculado por sistema francés (cuota fija) en `utils/installmentCalc.calculateInstallments`. El residuo de redondeo va SIEMPRE en la última.
- **Sobrecosto** — lo que se paga de más sobre el precio por financiar, en % (`creditCost / price`). **TEA real** — la TIR del flujo de caja anualizada; sólo difiere de la TEA cuando hay cargos fijos mensuales.
- **TRM** — Tasa Representativa del Mercado: el peso por dólar que certifica el Banco de la República. Se publica **una vez al día** y su registro trae `vigenciadesde`/`vigenciahasta`, así que un valor puede cubrir varios días naturales (fin de semana, festivos). Es una tasa de REFERENCIA: no es la que aplica un banco al consignar. Fuente: `datos.gov.co` dataset `32sa-8pi3`, vía `api/exchange-rates.js`.
- **EUR/COP** — no lo publica el Banco de la República: se deriva como TRM × (EUR/USD del BCE, vía Frankfurter). El BCE no cotiza fines de semana, así que a cada fecha se le aplica la última cotización conocida en o antes de ese día.
- **Ingreso en moneda extranjera (`FxIncome`)** — declaración de «me pagan X en esta moneda», guardada en `users/{uid}.fxIncomes[]`. NO es un movimiento: no entra en el balance ni en el histórico.
- **Carga de cuotas** — suma de cuotas comprometidas en un mes. El simulador la compara contra el ingreso típico (mediana de 6 meses cerrados) para su veredicto: ≤20 % holgado, ≤30 % ajustado, >30 % riesgoso, y «no cabe» si supera ingreso − gasto fijo.

## Entidades principales
- **Usuario** — auth Firebase + biometría. **Cuenta / Wallet**, **Transacción**, **Categoría**, **Presupuesto**.
- TODO: definir campos y relaciones exactas desde `types/` y `store/`.

## Siglas / nombres internos
- **Spendia** = nombre de producto. Export PDF vía jspdf. `(tabs)/(onboarding)/(auth)` = grupos de rutas.
