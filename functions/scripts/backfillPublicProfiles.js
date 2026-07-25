/**
 * Backfill one-time de publicProfiles espejando users/{uid}.
 * Uso: node functions/scripts/backfillPublicProfiles.js
 * Requiere Application Default Credentials (gcloud/firebase login) con acceso al
 * proyecto. Alternativa server-side al onCall backfillPublicProfiles cuando el
 * proyecto está en plan Spark y no se pueden desplegar Cloud Functions.
 */
const admin = require('firebase-admin');

admin.initializeApp({ projectId: 'spendiapp-159e7' });
const db = admin.firestore();

function pickPublicFields(u) {
  return {
    userName: u.userName ?? null,
    displayName: u.displayName ?? null,
    photoURL: u.photoURL ?? null,
  };
}

(async () => {
  const users = await db.collection('users').get();
  let written = 0;
  let skipped = 0;
  let batch = db.batch();
  let ops = 0;

  for (const d of users.docs) {
    const u = d.data();
    if (!u.userName && !u.displayName) { skipped++; continue; }
    batch.set(
      db.collection('publicProfiles').doc(d.id),
      { uid: d.id, ...pickPublicFields(u) },
      { merge: true },
    );
    written++;
    ops++;
    if (ops >= 400) { await batch.commit(); batch = db.batch(); ops = 0; }
  }
  if (ops > 0) await batch.commit();

  console.log(`backfill OK → ${written} espejados, ${skipped} sin identidad, ${users.size} total`);
  process.exit(0);
})().catch((e) => {
  console.error('backfill FALLÓ:', e.message || e);
  process.exit(1);
});
