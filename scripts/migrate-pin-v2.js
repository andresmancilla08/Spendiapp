#!/usr/bin/env node
/**
 * Migración al PIN de 6 dígitos.
 *
 * A CADA cuenta le pone el PIN por defecto y marca `pinV2: false`, que es lo que
 * hace que el gate de `app/_layout.tsx` la mande a crear su PIN antes de dejarla
 * entrar a ninguna pantalla.
 *
 * Afecta a las dos poblaciones por igual:
 *   - Cuentas de Google: no tenían contraseña. Se les crea el provider `password`
 *     conservando el UID, así que no se pierde ni un dato.
 *   - Cuentas con PIN de 4: su contraseña era `pin + '00'`, que ya no vale.
 *
 * ES IRREVERSIBLE: después de correrlo, NADIE puede entrar con su PIN anterior.
 * Hay que avisar a los usuarios ANTES.
 *
 * Credenciales — sin claves de service account (la organización las prohíbe):
 *     gcloud auth application-default login
 *     gcloud config set project <PROJECT_ID>
 *
 * Uso:
 *     node scripts/migrate-pin-v2.js --dry-run     # cuenta y no escribe nada
 *     node scripts/migrate-pin-v2.js --confirm     # ejecuta de verdad
 */

const admin = require('firebase-admin');

const DEFAULT_PIN = '123456';
const args = process.argv.slice(2);
const DRY_RUN = !args.includes('--confirm');

if (!args.includes('--confirm') && !args.includes('--dry-run')) {
  console.error('Falta --dry-run o --confirm. Ver la cabecera del archivo.');
  process.exit(1);
}

admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || undefined });
const auth = admin.auth();
const db = admin.firestore();

async function main() {
  console.log(DRY_RUN ? '— SIMULACRO: no se escribe nada —' : '— EJECUTANDO —');

  let pageToken;
  let total = 0, migrated = 0, skipped = 0, failed = 0;

  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const user of page.users) {
      total++;
      // Quien ya tenga pinV2 se queda como está: reejecutar el script no debe
      // volver a tirar del PIN a quien ya eligió el suyo.
      const snap = await db.collection('users').doc(user.uid).get();
      if (snap.exists && snap.data().pinV2 === true) { skipped++; continue; }

      if (DRY_RUN) { migrated++; continue; }

      try {
        await auth.updateUser(user.uid, { password: DEFAULT_PIN });
        await db.collection('users').doc(user.uid).set(
          { pinV2: false, pinMigratedAt: admin.firestore.FieldValue.serverTimestamp() },
          { merge: true },
        );
        migrated++;
      } catch (e) {
        failed++;
        console.error(`  ✖ ${user.uid} (${user.email ?? 'sin email'}): ${e.message}`);
      }
    }
    pageToken = page.pageToken;
  } while (pageToken);

  console.log(`\ncuentas: ${total} · migradas: ${migrated} · ya tenían PIN propio: ${skipped} · fallidas: ${failed}`);
  if (DRY_RUN) console.log('Nada se escribió. Repite con --confirm para aplicarlo.');
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
