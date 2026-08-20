/**
 * npx tsx utils/simulator.test.ts
 */
import assert from 'node:assert';
import { calculateInstallments, isCutoffAdjusted, effectivePurchaseDate } from './installmentCalc';
import {
  simulate,
  compareTerms,
  impactVerdict,
  monthlyRateFromTea,
  teaFromMonthlyPct,
  irrMonthly,
  buildLoadTimeline,
  median,
  MAX_INSTALLMENTS,
} from './simulator';

// ── Conversión de tasas ─────────────────────────────────────────────────────
{
  const i = monthlyRateFromTea(25.52);
  assert.ok(Math.abs(i - 0.0191218) < 1e-6, `TEA 25,52 % → 1,912 % mensual (fue ${i})`);
  // Ida y vuelta
  assert.ok(Math.abs(teaFromMonthlyPct(i * 100) - 25.52) < 1e-6, 'mensual → TEA cierra el círculo');
  assert.strictEqual(monthlyRateFromTea(0), 0, 'sin interés = 0');
  assert.strictEqual(monthlyRateFromTea(null), 0, 'null = 0');
}

// ── La cuota sale de calculateInstallments, no de un PMT propio ──────────────
{
  const r = simulate({ price: 1_800_000, installments: 12, tea: 25.52, startDate: new Date(2026, 7, 20) });
  const raw = calculateInstallments(1_800_000, 12, 25.52);
  assert.deepStrictEqual(
    r.schedule.map((x) => x.installment),
    raw,
    'el plan usa EXACTAMENTE el array que se escribiría en Firestore',
  );
  assert.strictEqual(r.monthlyPayment, raw[0]);
  assert.ok(Math.abs(r.monthlyPayment - 169_291) <= 2, `cuota ≈ $169.291 (fue ${r.monthlyPayment})`);
  assert.ok(Math.abs(r.creditCost - 231_492) <= 24, `costo ≈ $231.492 (fue ${r.creditCost})`);
  assert.ok(Math.abs(r.overheadPct - 12.86) < 0.05, `sobrecosto ≈ 12,9 % (fue ${r.overheadPct})`);
}

// ── El plan cierra en cero y cuadra con los totales ──────────────────────────
{
  const r = simulate({ price: 1_800_000, installments: 12, tea: 25.52, startDate: new Date(2026, 7, 20) });
  assert.strictEqual(r.schedule[r.schedule.length - 1].balance, 0, 'la última cuota deja saldo 0');
  const capital = r.schedule.reduce((a, x) => a + x.principal, 0);
  assert.strictEqual(capital, 1_800_000, 'la suma de capital es el monto financiado');
  const pagos = r.schedule.reduce((a, x) => a + x.payment, 0);
  assert.strictEqual(pagos, r.totalPaid, 'sin cuota inicial, total pagado = suma de pagos');
  for (const row of r.schedule) {
    assert.strictEqual(row.principal + row.interest, row.installment, `fila ${row.number}: capital + interés = cuota`);
    assert.ok(row.interest >= 0, `fila ${row.number}: el interés nunca es negativo`);
  }
}

// ── Sin interés: la cuota es división pura ──────────────────────────────────
{
  const r = simulate({ price: 1_200_000, installments: 6, tea: null, startDate: new Date(2026, 0, 10) });
  assert.strictEqual(r.monthlyPayment, 200_000);
  assert.strictEqual(r.creditCost, 0, 'a 0 % financiar no cuesta nada');
  assert.strictEqual(r.effectiveTea, null, 'sin cargos no hay TEA real que mostrar');
  assert.ok(r.schedule.every((x) => x.interest === 0));
}

// ── Una sola cuota = pago único, sin interés ────────────────────────────────
{
  const r = simulate({ price: 500_000, installments: 1, tea: 25.52, startDate: new Date(2026, 3, 5) });
  assert.strictEqual(r.monthlyPayment, 500_000, 'a 1 cuota no se financia nada');
  assert.strictEqual(r.creditCost, 0);
}

// ── Cuota inicial ───────────────────────────────────────────────────────────
{
  const r = simulate({ price: 1_000_000, downPayment: 400_000, installments: 6, tea: null, startDate: new Date(2026, 2, 1) });
  assert.strictEqual(r.financed, 600_000, 'la inicial baja el capital financiado');
  assert.strictEqual(r.monthlyPayment, 100_000);
  assert.strictEqual(r.totalPaid, 1_000_000, 'la inicial cuenta dentro del total pagado');
  assert.strictEqual(r.creditCost, 0);
}
{
  const r = simulate({ price: 800_000, downPayment: 900_000, installments: 3, tea: null, startDate: new Date(2026, 2, 1) });
  assert.strictEqual(r.financed, 0, 'la inicial no puede superar el precio');
}

// ── Cargo fijo mensual: aparece la TEA real y es MAYOR que la nominal ───────
{
  const r = simulate({ price: 1_800_000, installments: 12, tea: 25.52, monthlyFee: 20_000, startDate: new Date(2026, 7, 20) });
  assert.strictEqual(r.monthlyPayment, r.schedule[0].installment + 20_000, 'el cargo va dentro del pago del mes');
  assert.ok(Math.abs(r.creditCost - 471_492) <= 24, `costo con cargo ≈ $471.492 (fue ${r.creditCost})`);
  assert.ok(r.effectiveTea !== null && r.effectiveTea > 50 && r.effectiveTea < 62,
    `la TEA real con cargo ronda el 56 % (fue ${r.effectiveTea})`);
}

// ── TIR ─────────────────────────────────────────────────────────────────────
{
  // 12 pagos de 100.000 sobre un capital de 1.200.000 → tasa 0
  assert.strictEqual(irrMonthly(1_200_000, Array(12).fill(100_000)), 0, 'sin sobrecosto, tasa 0');
  // Capital 1.000.000, 12 pagos de 100.000 → hay interés
  const x = irrMonthly(1_000_000, Array(12).fill(100_000));
  assert.ok(x > 0.02 && x < 0.04, `tasa mensual esperada ~2,9 % (fue ${x})`);
}

// ── Tope de cuotas ──────────────────────────────────────────────────────────
{
  const r = simulate({ price: 1_000_000, installments: 999, tea: null, startDate: new Date(2026, 0, 1) });
  assert.strictEqual(r.schedule.length, MAX_INSTALLMENTS, 'se recorta al tope, no explota');
  const z = simulate({ price: 1_000_000, installments: 0, tea: null, startDate: new Date(2026, 0, 1) });
  assert.strictEqual(z.schedule.length, 1, '0 cuotas no existe: mínimo 1');
}

// ── Comparación de plazos: a más plazo, menos cuota y más sobrecosto ────────
{
  const rows = compareTerms({ price: 1_800_000, tea: 25.52, startDate: new Date(2026, 7, 20) });
  for (let i = 1; i < rows.length; i++) {
    assert.ok(rows[i].monthlyPayment < rows[i - 1].monthlyPayment, `la cuota baja al alargar (${rows[i].installments})`);
    assert.ok(rows[i].creditCost > rows[i - 1].creditCost, `el sobrecosto sube al alargar (${rows[i].installments})`);
  }
  assert.strictEqual(rows[0].creditCost, 0, 'a 1 cuota no hay sobrecosto');
}

// ── Veredicto de impacto ────────────────────────────────────────────────────
{
  assert.strictEqual(impactVerdict(200_000, 0, 0), null, 'sin ingreso no se opina');
  assert.strictEqual(impactVerdict(300_000, 3_000_000, 1_000_000)!.level, 'comfortable', '10 % = holgado');
  assert.strictEqual(impactVerdict(750_000, 3_000_000, 1_000_000)!.level, 'tight', '25 % = ajustado');
  assert.strictEqual(impactVerdict(1_200_000, 3_000_000, 1_000_000)!.level, 'risky', '40 % = riesgoso');
  // La bandera dura gana sobre el porcentaje: 20 % del ingreso pero no cabe
  const over = impactVerdict(500_000, 3_000_000, 2_800_000)!;
  assert.strictEqual(over.level, 'overflow', 'si no cabe, no cabe aunque el % sea bajo');
  assert.strictEqual(over.leftover, -300_000);
}

// ── Línea de tiempo de carga ────────────────────────────────────────────────
{
  const r = simulate({ price: 600_000, installments: 3, tea: null, startDate: new Date(2026, 7, 15) });
  const timeline = buildLoadTimeline({ '2026_8': 150_000 }, r.schedule, new Date(2026, 7, 1), 6);
  assert.strictEqual(timeline.length, 6);
  assert.strictEqual(timeline[0].simulated, 200_000, 'ago: primera cuota');
  assert.strictEqual(timeline[1].simulated, 200_000);
  assert.strictEqual(timeline[1].committed, 150_000, 'sep: lo ya comprometido');
  assert.strictEqual(timeline[1].total, 350_000);
  assert.strictEqual(timeline[3].total, 0, 'nov: la compra ya terminó');
}

// ── Mediana ─────────────────────────────────────────────────────────────────
{
  assert.strictEqual(median([]), 0, 'serie vacía = 0');
  assert.strictEqual(median([3_000_000, 3_100_000, 12_000_000]), 3_100_000, 'el aguinaldo no mueve la mediana');
  assert.strictEqual(median([100, 200]), 150, 'par: promedio de los del medio');
}

// ── Fecha de corte (regla compartida con add-transaction) ───────────────────
{
  const card = 15;
  assert.strictEqual(isCutoffAdjusted(new Date(2026, 7, 5), card), true, 'día 5 ≤ corte 15 → se pasa');
  assert.strictEqual(isCutoffAdjusted(new Date(2026, 7, 20), card), false, 'día 20 > corte 15 → se queda');
  assert.strictEqual(isCutoffAdjusted(new Date(2026, 7, 5), undefined), false, 'sin corte no se ajusta nada');
  const moved = effectivePurchaseDate(new Date(2026, 7, 5), card);
  assert.strictEqual(moved.getMonth(), 8);
  assert.strictEqual(moved.getDate(), 1, 'se pasa al 1 del mes siguiente');
  const kept = effectivePurchaseDate(new Date(2026, 7, 20), card);
  assert.strictEqual(kept.getDate(), 20, 'sin ajuste, la fecha no se toca');
  const dec = effectivePurchaseDate(new Date(2026, 11, 3), card);
  assert.strictEqual(dec.getFullYear(), 2027);
  assert.strictEqual(dec.getMonth(), 0, 'diciembre cruza de año');
}

console.log('✓ simulator: todos los gates pasan');
