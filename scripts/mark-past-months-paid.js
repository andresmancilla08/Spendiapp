/**
 * One-time migration: marca como PAGADOS todos los movimientos de meses ya completos
 * (hasta mayo 2026 inclusive) para TODOS los usuarios.
 *
 * - No-fijos: isPaid = true si date < junio 2026
 * - Fijos: añade month keys al array fixedPaidMonths desde su mes de inicio hasta mayo 2026
 *
 * Uso:
 *   node scripts/mark-past-months-paid.js
 */

const admin = require('../functions/node_modules/firebase-admin');

admin.initializeApp({ projectId: 'spendiapp-159e7' });
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

// Mes actual: junio 2026 → meses completos son hasta mayo 2026
const CURRENT_YEAR = 2026;
const CURRENT_MONTH = 5; // junio (0-indexed)

/** Genera array de month keys desde [startYear,startMonth] hasta [endYear,endMonth] inclusive */
function generateMonthKeys(startYear, startMonth, endYear, endMonth) {
  const keys = [];
  let y = startYear, m = startMonth;
  while (y < endYear || (y === endYear && m <= endMonth)) {
    keys.push(`${y}_${m}`);
    m++;
    if (m > 11) { m = 0; y++; }
  }
  return keys;
}

/** Mes anterior al actual = último mes completo */
const LAST_COMPLETE_YEAR = CURRENT_MONTH === 0 ? CURRENT_YEAR - 1 : CURRENT_YEAR;
const LAST_COMPLETE_MONTH = CURRENT_MONTH === 0 ? 11 : CURRENT_MONTH - 1;

/** Commit batches respetando límite de 500 ops de Firestore */
async function commitBatches(operations) {
  const BATCH_SIZE = 400;
  for (let i = 0; i < operations.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = operations.slice(i, i + BATCH_SIZE);
    for (const op of chunk) {
      batch.update(op.ref, op.data);
    }
    await batch.commit();
    console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${chunk.length} docs actualizados`);
  }
}

async function run() {
  console.log(`Marcando meses completos hasta ${LAST_COMPLETE_YEAR}_${LAST_COMPLETE_MONTH} (mayo 2026)...\n`);

  const cutoff = new Date(CURRENT_YEAR, CURRENT_MONTH, 1); // 2026-06-01

  const snap = await db.collection('transactions').get();
  console.log(`Total documentos: ${snap.size}`);

  const operations = [];
  let skipped = 0;

  for (const docSnap of snap.docs) {
    const d = docSnap.data();
    const date = d.date?.toDate?.() ?? null;
    if (!date) { skipped++; continue; }

    if (d.isFixed) {
      // Calcular month keys desde el mes de creación hasta mayo 2026
      const startYear = date.getFullYear();
      const startMonth = date.getMonth();

      // Si la transacción empieza después del mes de corte, skip
      if (startYear > CURRENT_YEAR || (startYear === CURRENT_YEAR && startMonth >= CURRENT_MONTH)) {
        skipped++;
        continue;
      }

      const allKeys = generateMonthKeys(startYear, startMonth, LAST_COMPLETE_YEAR, LAST_COMPLETE_MONTH);

      // Excluir meses saltados
      const skipMonths = d.fixedSkipMonths ?? [];
      // Excluir meses después de cancelación
      const cancelledFrom = d.fixedCancelledFrom?.toDate?.() ?? null;

      const keysToMark = allKeys.filter(key => {
        if (skipMonths.includes(key)) return false;
        if (cancelledFrom) {
          const [y, m] = key.split('_').map(Number);
          if (new Date(y, m, 1) >= cancelledFrom) return false;
        }
        return true;
      });

      if (keysToMark.length === 0) { skipped++; continue; }

      operations.push({
        ref: docSnap.ref,
        data: { fixedPaidMonths: FieldValue.arrayUnion(...keysToMark) },
      });

    } else {
      // Transacción normal: marcar si está en mes pasado completo
      if (date >= cutoff) { skipped++; continue; }
      if (d.isPaid === true) { skipped++; continue; } // ya pagado

      operations.push({
        ref: docSnap.ref,
        data: { isPaid: true },
      });
    }
  }

  console.log(`Documentos a actualizar: ${operations.length}`);
  console.log(`Documentos sin cambio: ${skipped}\n`);

  if (operations.length === 0) {
    console.log('Nada que actualizar.');
    return;
  }

  await commitBatches(operations);
  console.log(`\n✓ Migración completa. ${operations.length} transacciones marcadas como pagadas.`);
}

run().catch(console.error);
