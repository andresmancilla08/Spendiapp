/**
 * reset-whats-new.js
 *
 * Pone whatsNewSeen = false para todos los usuarios en Firestore,
 * de modo que la próxima vez que inicien sesión vean la pantalla de novedades.
 *
 * Uso:
 *   1. Descarga tu service account desde Firebase Console:
 *      https://console.firebase.google.com/project/spendiapp-159e7/settings/serviceaccounts/adminsdk
 *      Guárdalo como scripts/serviceAccount.json (NO lo commitees)
 *
 *   2. Instala firebase-admin si no está instalado:
 *      npm install --save-dev firebase-admin
 *
 *   3. Ejecuta:
 *      node scripts/reset-whats-new.js
 *
 *   4. Despliega normalmente.
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'serviceAccount.json');

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error('❌  No se encontró scripts/serviceAccount.json');
  console.error('   Descárgalo desde Firebase Console → Configuración → Cuentas de servicio');
  process.exit(1);
}

const serviceAccount = require(SERVICE_ACCOUNT_PATH);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function resetWhatsNew() {
  console.log('🔄  Obteniendo usuarios...');
  const snapshot = await db.collection('users').get();

  if (snapshot.empty) {
    console.log('⚠️   No hay usuarios en la colección.');
    return;
  }

  const batch = db.batch();
  let count = 0;

  snapshot.forEach((docSnap) => {
    batch.update(docSnap.ref, { whatsNewSeen: false });
    count++;
  });

  await batch.commit();
  console.log(`✅  whatsNewSeen = false aplicado a ${count} usuario(s).`);
  console.log('   Ya puedes desplegar la nueva versión.');
}

resetWhatsNew().catch((err) => {
  console.error('❌  Error:', err);
  process.exit(1);
});
