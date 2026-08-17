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
 *     node scripts/migrate-pin-v2.js --dry-run              # cuenta y no escribe nada
 *     node scripts/migrate-pin-v2.js --confirm              # ejecuta de verdad
 *     node scripts/migrate-pin-v2.js --confirm --notify     # y avisa por correo
 *
 * `--notify` manda el aviso a cada cuenta migrada JUSTO DESPUÉS de cambiarle el
 * PIN, nunca antes: el correo afirma que el PIN anterior ya no funciona.
 * Necesita RESEND_API_KEY en el entorno.
 */

// firebase-admin y resend viven en functions/, no en la raíz: el proyecto no
// los necesita en el bundle de la app.
const path = require('path');
module.paths.unshift(path.join(__dirname, '..', 'functions', 'node_modules'));

const admin = require('firebase-admin');

const DEFAULT_PIN = '123456';
const args = process.argv.slice(2);
const DRY_RUN = !args.includes('--confirm');
const NOTIFY = args.includes('--notify');

if (!args.includes('--confirm') && !args.includes('--dry-run')) {
  console.error('Falta --dry-run o --confirm. Ver la cabecera del archivo.');
  process.exit(1);
}

// El proyecto sale del entorno o del .env de la app: con credenciales de
// aplicación (sin clave de service account) el SDK no puede deducirlo solo.
const PROJECT_ID =
  process.env.GCLOUD_PROJECT ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  (() => {
    const envPath = path.join(__dirname, '..', '.env');
    try {
      const m = require('fs').readFileSync(envPath, 'utf8')
        .match(/EXPO_PUBLIC_FIREBASE_PROJECT_ID\s*=\s*"?([\w-]+)"?/);
      return m && m[1];
    } catch { return null; }
  })();

if (!PROJECT_ID) {
  console.error('No se pudo determinar el proyecto. Exporta GCLOUD_PROJECT.');
  process.exit(1);
}

admin.initializeApp({ projectId: PROJECT_ID });
const auth = admin.auth();
const db = admin.firestore();

let sendNotice = null;
if (NOTIFY && !DRY_RUN) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('--notify necesita RESEND_API_KEY en el entorno.');
    process.exit(1);
  }
  const { Resend } = require('resend');
  const resend = new Resend(apiKey);
  // La plantilla vive compilada junto a las Functions.
  const { generatePinMigrationEmail } = require('../functions/lib/emailTemplate');
  const html = generatePinMigrationEmail({
    primary: '#00ACC1', primaryLight: '#E0F7FA', primaryDark: '#00838F',
    temporaryPin: DEFAULT_PIN,
  });
  sendNotice = (email) => resend.emails.send({
    from: 'Spendia <noreply@spendia.co>',
    to: email,
    subject: 'Tu PIN de Spendia ahora es de 6 dígitos',
    html,
  });
}

async function main() {
  console.log(DRY_RUN ? '— SIMULACRO: no se escribe nada —' : '— EJECUTANDO —');

  let pageToken;
  let total = 0, migrated = 0, skipped = 0, failed = 0, notified = 0, notifyFailed = 0;

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

        // El aviso va después del cambio, nunca antes. Que falle el correo no
        // revierte la migración: se anota y se sigue.
        if (sendNotice && user.email) {
          try {
            await sendNotice(user.email);
            notified++;
          } catch (e) {
            notifyFailed++;
            console.error(`  ✉ sin aviso ${user.email}: ${e.message}`);
          }
          // Resend limita a 2 envíos por segundo en el plan básico.
          await new Promise((r) => setTimeout(r, 550));
        }
      } catch (e) {
        failed++;
        console.error(`  ✖ ${user.uid} (${user.email ?? 'sin email'}): ${e.message}`);
      }
    }
    pageToken = page.pageToken;
  } while (pageToken);

  console.log(`\ncuentas: ${total} · migradas: ${migrated} · ya tenían PIN propio: ${skipped} · fallidas: ${failed}`);
  if (NOTIFY) console.log(`avisos enviados: ${notified} · avisos fallidos: ${notifyFailed}`);
  if (DRY_RUN) console.log('Nada se escribió. Repite con --confirm para aplicarlo.');
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
