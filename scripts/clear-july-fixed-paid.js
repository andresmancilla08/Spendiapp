/**
 * One-time migration: elimina '2026_6' (julio 2026) de fixedPaidMonths
 * en TODAS las transacciones fijas de Firestore.
 *
 * Uso:
 *   cd Spendiapp
 *   node scripts/clear-july-fixed-paid.js
 *
 * Requiere autenticación ADC (Application Default Credentials):
 *   firebase login  →  gcloud auth application-default login
 *   O exportar GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
 */

const admin = require('../functions/node_modules/firebase-admin');

admin.initializeApp({ projectId: 'spendiapp-159e7' });
const db = admin.firestore();
// Limpiar julio 2026 (2026_6) en adelante
const FROM_YEAR = 2026;
const FROM_MONTH = 6; // julio, 0-indexed

function isFutureOrCurrent(key) {
  const [y, m] = key.split('_').map(Number);
  return y > FROM_YEAR || (y === FROM_YEAR && m >= FROM_MONTH);
}

async function run() {
  const snap = await db.collection('transactions')
    .where('isFixed', '==', true)
    .get();

  if (snap.empty) {
    console.log('No hay transacciones fijas.');
    return;
  }

  const batch = db.batch();
  let count = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const paidMonths = data.fixedPaidMonths ?? [];
    const toRemove = paidMonths.filter(isFutureOrCurrent);
    if (toRemove.length > 0) {
      batch.update(docSnap.ref, {
        fixedPaidMonths: admin.firestore.FieldValue.arrayRemove(...toRemove),
      });
      count++;
      console.log(`  doc ${docSnap.id}: removiendo ${toRemove.join(', ')}`);
    }
  }

  if (count === 0) {
    console.log('Ninguna transacción fija tiene meses pagados desde julio 2026. Nada que limpiar.');
    return;
  }

  await batch.commit();
  console.log(`\n✓ ${count} transacciones actualizadas.`);
}

run().catch(console.error);
