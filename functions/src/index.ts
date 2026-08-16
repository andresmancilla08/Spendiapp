// functions/src/index.ts
import * as admin from 'firebase-admin';
import { randomInt } from 'crypto';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentUpdated, onDocumentWritten } from 'firebase-functions/v2/firestore';
import { defineSecret } from 'firebase-functions/params';
import { Resend } from 'resend';
import { getPaletteColors } from './paletteColors';
import { generateOtpEmail } from './emailTemplate';

admin.initializeApp();
const db = admin.firestore();
const resendApiKey = defineSecret('RESEND_API_KEY');

function generateOtp(): string {
  return randomInt(1000, 10000).toString();
}

// ── OTP PIN Reset ────────────────────────────────────────────────────────────

export const sendPinResetOtp = onCall({ secrets: [resendApiKey] }, async (request) => {
  const { email } = request.data as { email: string };
  if (!email) throw new HttpsError('invalid-argument', 'Email requerido');

  let userRecord: admin.auth.UserRecord;
  try {
    userRecord = await admin.auth().getUserByEmail(email.trim().toLowerCase());
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      // No revelar que el email no existe
      return { success: true, message: 'Si el email está registrado con PIN, recibirás un código.' };
    }
    throw error;
  }

  const hasPin = userRecord.providerData.some((p) => p.providerId === 'password');
  if (!hasPin) {
    // No revelar que la cuenta existe pero usa Google
    return { success: true, message: 'Si el email está registrado con PIN, recibirás un código.' };
  }

  const uid = userRecord.uid;

  // [M-4] Rate limit: mín. 60s entre envíos por cuenta para evitar
  // email bombing / abuso de cuota de Resend.
  const existing = await db.collection('pin_resets').doc(uid).get();
  if (existing.exists) {
    const prev = existing.data()!;
    const last = (prev.createdAt as admin.firestore.Timestamp | undefined)?.toMillis() ?? 0;
    if (Date.now() - last < 60 * 1000) {
      // Respuesta genérica: no revelar que hay una solicitud activa.
      return { success: true, message: 'Si el email está registrado con PIN, recibirás un código.' };
    }
  }

  const userDoc = await db.collection('users').doc(uid).get();
  const paletteId = (userDoc.data()?.colorPalette as string) || 'deepWater';
  const palette = getPaletteColors(paletteId);

  const otp = generateOtp();
  const expiresAt = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() + 10 * 60 * 1000)
  );

  await db.collection('pin_resets').doc(uid).set({
    otp,
    email: email.trim().toLowerCase(),
    expiresAt,
    verified: false,
    attempts: 0,
    createdAt: admin.firestore.Timestamp.now(),
  });

  const resend = new Resend(resendApiKey.value());
  try {
    const result = await resend.emails.send({
      from: 'Spendia <noreply@spendia.co>',
      to: email.trim(),
      subject: 'Tu código de verificación de Spendia',
      html: generateOtpEmail({ otpCode: otp, userEmail: email, ...palette }),
    });
    if (result.error) {
      console.error('Resend returned error:', JSON.stringify(result.error));
      throw new HttpsError('internal', `Resend error: ${result.error.message}`);
    }
    console.log('Resend sent OK, id:', (result.data as any)?.id);
  } catch (err: any) {
    if (err?.httpErrorCode) throw err; // re-throw HttpsError
    console.error('Resend exception:', err?.message ?? String(err));
    throw new HttpsError('internal', 'Error enviando email');
  }

  return { success: true };
});

export const verifyPinResetOtp = onCall(async (request) => {
  const { email, otp } = request.data as { email: string; otp: string };
  if (!email || !otp) throw new HttpsError('invalid-argument', 'Datos incompletos');

  let uid: string;
  try {
    const userRecord = await admin.auth().getUserByEmail(email.trim().toLowerCase());
    uid = userRecord.uid;
  } catch {
    throw new HttpsError('invalid-argument', 'Código inválido o expirado');
  }

  const resetRef = db.collection('pin_resets').doc(uid);
  const resetDoc = await resetRef.get();
  if (!resetDoc.exists) throw new HttpsError('invalid-argument', 'Código inválido o expirado');

  const data = resetDoc.data()!;

  if ((data.expiresAt as admin.firestore.Timestamp).toDate() < new Date()) {
    await resetRef.delete();
    throw new HttpsError('deadline-exceeded', 'Código expirado');
  }

  if ((data.attempts as number) >= 3) {
    throw new HttpsError('resource-exhausted', 'Demasiados intentos');
  }

  if (data.otp !== otp) {
    await resetRef.update({ attempts: admin.firestore.FieldValue.increment(1) });
    throw new HttpsError('invalid-argument', 'Código incorrecto');
  }

  await resetRef.update({ verified: true });
  return { success: true };
});

export const resetPinWithOtp = onCall(async (request) => {
  const { email, otp, newPin } = request.data as { email: string; otp: string; newPin: string };
  if (!email || !otp || !newPin) throw new HttpsError('invalid-argument', 'Datos incompletos');
  // El cliente ya lo valida, pero esta función es una API pública: sin esto se
  // podría dejar la cuenta con un PIN de un dígito.
  if (!/^\d{6}$/.test(newPin)) throw new HttpsError('invalid-argument', 'El PIN debe tener 6 dígitos');

  let uid: string;
  try {
    const userRecord = await admin.auth().getUserByEmail(email.trim().toLowerCase());
    uid = userRecord.uid;
  } catch {
    throw new HttpsError('not-found', 'Email no encontrado');
  }

  const resetRef = db.collection('pin_resets').doc(uid);
  const resetDoc = await resetRef.get();
  if (!resetDoc.exists) throw new HttpsError('not-found', 'Sin solicitud activa');

  const data = resetDoc.data()!;

  if (!data.verified) throw new HttpsError('permission-denied', 'OTP no verificado');
  if (data.otp !== otp) throw new HttpsError('invalid-argument', 'Sesión inválida');
  if ((data.expiresAt as admin.firestore.Timestamp).toDate() < new Date()) {
    await resetRef.delete();
    throw new HttpsError('deadline-exceeded', 'Sesión expirada');
  }

  await admin.auth().updateUser(uid, { password: newPin });
  // Quien llega hasta aquí acaba de elegir un PIN suyo: no tiene sentido que el
  // gate se lo vuelva a pedir al entrar.
  await db.collection('users').doc(uid).set(
    { pinV2: true, pinSetAt: admin.firestore.FieldValue.serverTimestamp() },
    { merge: true },
  );
  await resetRef.delete();
  return { success: true };
});

// ── Cleanup Orphan Auth Accounts ─────────────────────────────────────────────
// Elimina cuentas de Firebase Auth que no tienen doc en Firestore (eliminadas desde admin sin limpiar Auth)

export const cleanupOrphanAccounts = onCall(async (request) => {
  // Solo ejecutable por el admin principal
  if (!request.auth) throw new HttpsError('unauthenticated', 'Se requiere autenticación');

  const callerDoc = await admin.firestore().collection('users').doc(request.auth.uid).get();
  if (!callerDoc.exists || !callerDoc.data()?.isAdmin) {
    throw new HttpsError('permission-denied', 'Solo administradores pueden ejecutar esta función');
  }

  const allAuthUsers: string[] = [];
  let pageToken: string | undefined;

  do {
    const result = await admin.auth().listUsers(1000, pageToken);
    allAuthUsers.push(...result.users.map((u) => u.uid));
    pageToken = result.pageToken;
  } while (pageToken);

  const orphans: string[] = [];
  for (const uid of allAuthUsers) {
    const docSnap = await db.collection('users').doc(uid).get();
    if (!docSnap.exists) orphans.push(uid);
  }

  for (const uid of orphans) {
    try {
      await admin.auth().deleteUser(uid);
    } catch (err) {
      console.error(`Failed to delete orphan auth user ${uid}:`, err);
    }
  }

  console.log(`Cleanup complete: deleted ${orphans.length} orphan auth accounts`, orphans);
  return { deleted: orphans.length, uids: orphans };
});

// ── Perfiles públicos (espejo de users) ────────────────────────────────────────

// Campos públicos legibles por otros usuarios. Mantenerlos sincronizados aquí,
// server-side, es la fuente de verdad: el cliente ya no depende de que el amigo
// inicie sesión para que su publicProfile exista.
function pickPublicFields(u: FirebaseFirestore.DocumentData) {
  return {
    userName: u.userName ?? null,
    displayName: u.displayName ?? null,
    photoURL: u.photoURL ?? null,
  };
}

// Espeja users/{uid} → publicProfiles/{uid} en cada escritura del doc de usuario.
// Sin este trigger, un contacto que no vuelva a loguearse nunca aparece en la app.
export const mirrorPublicProfile = onDocumentWritten('users/{userId}', async (event) => {
  const userId = event.params.userId;
  const after = event.data?.after?.data();
  const pubRef = db.collection('publicProfiles').doc(userId);

  // Usuario eliminado → limpiar el espejo.
  if (!after) {
    await pubRef.delete().catch(() => {});
    return;
  }

  const before = event.data?.before?.data();
  const nextPub = pickPublicFields(after);

  // Evitar escrituras redundantes si los campos públicos no cambiaron.
  if (
    before &&
    (before.userName ?? null) === nextPub.userName &&
    (before.displayName ?? null) === nextPub.displayName &&
    (before.photoURL ?? null) === nextPub.photoURL
  ) {
    return;
  }

  await pubRef.set({ uid: userId, ...nextPub }, { merge: true });
});

// Backfill one-time: rellena publicProfiles para todos los usuarios existentes.
// Solo admin. Ejecutar una vez tras desplegar; el trigger mantiene el resto.
export const backfillPublicProfiles = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Se requiere autenticación');

  const callerDoc = await db.collection('users').doc(request.auth.uid).get();
  if (!callerDoc.exists || !callerDoc.data()?.isAdmin) {
    throw new HttpsError('permission-denied', 'Solo administradores pueden ejecutar esta función');
  }

  const users = await db.collection('users').get();
  let written = 0;
  let batch = db.batch();
  let ops = 0;

  for (const d of users.docs) {
    const u = d.data();
    if (!u.userName && !u.displayName) continue; // doc sin identidad todavía
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

  console.log(`backfillPublicProfiles: ${written}/${users.size} perfiles espejados`);
  return { written, total: users.size };
});

// ── Honeypot Functions ────────────────────────────────────────────────────────

// HONEYPOT: Función que parece un bypass de admin pero registra al atacante
export const adminBypass = onCall(async (request) => {
  const uid = request.auth?.uid ?? 'unauthenticated';
  const email = request.auth?.token?.email ?? 'unknown';

  await admin.firestore().collection('honeypotLogs').add({
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    type: 'function-honeypot',
    trapName: 'adminBypass',
    uid,
    email,
    data: JSON.stringify(request.data ?? {}),
    severity: 'critical',
  });

  throw new HttpsError('not-found', 'Function not found');
});

// HONEYPOT: Trampa para quien intente leer colección admin directamente
export const getSystemConfig = onCall(async (request) => {
  const uid = request.auth?.uid ?? 'unauthenticated';

  await admin.firestore().collection('honeypotLogs').add({
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    type: 'function-honeypot',
    trapName: 'getSystemConfig',
    uid,
    severity: 'high',
  });

  throw new HttpsError('permission-denied', 'Access denied');
});

// HONEYPOT: Detectar modificación de campos premium via cliente
export const detectPremiumTampering = onDocumentUpdated(
  'users/{userId}',
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    const sensitiveFields = ['isPremium', 'premiumExpiry', 'isBlocked', 'isAdmin'];

    // `premiumExpiry` es un Timestamp: comparar los objetos con !== siempre daba
    // distinto, así que CUALQUIER escritura en el documento (updateAppVersion en
    // cada arranque, por ejemplo) se marcaba como manipulación, se revertía, y la
    // reversión volvía a disparar el trigger — escrituras infinitas.
    const norm = (v: unknown): unknown => {
      if (v && typeof (v as { toMillis?: () => number }).toMillis === 'function') {
        return (v as { toMillis: () => number }).toMillis();
      }
      return v ?? null;
    };
    const tampered = sensitiveFields.filter((f) => norm(before[f]) !== norm(after[f]));
    if (tampered.length === 0) return;

    // Esta misma función acaba de revertir: no entrar en ping-pong.
    if (norm(after._honeypotRevertAt) !== norm(before._honeypotRevertAt)) return;

    // Concesión legítima desde el panel de administración: se marca al escribir.
    if (after._srv === true) {
      await event.data?.after.ref.update({ _srv: admin.firestore.FieldValue.delete() });
      return;
    }

    {
      const userId = event.params.userId;

      await admin.firestore().collection('honeypotLogs').add({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        type: 'firestore-field-tampering',
        trapName: 'premium-field-modification',
        userId,
        tampered,
        before: tampered.reduce((acc, f) => ({ ...acc, [f]: before[f] }), {}),
        after: tampered.reduce((acc, f) => ({ ...acc, [f]: after[f] }), {}),
        severity: 'critical',
      });

      // Revertir los campos manipulados automáticamente. La marca corta la
      // recursión: la siguiente invocación la ve cambiada y sale.
      const revert: Record<string, unknown> = {
        _honeypotRevertAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      for (const field of tampered) {
        revert[field] = before[field];
      }
      await event.data?.after.ref.update(revert);

      console.warn(
        `[HONEYPOT] Premium tampering detected for user ${userId}. Fields: ${tampered.join(', ')}. Reverted.`
      );
    }
  }
);

// ── Goals Monthly Reminder ────────────────────────────────────────────────────

// Día 3 de cada mes a las 9:00 AM hora Colombia
export const goalsMonthlyReminder = onSchedule(
  { schedule: '0 9 3 * *', timeZone: 'America/Bogota' },
  async () => {
    const goalsSnap = await db
      .collection('goals')
      .where('status', '==', 'active')
      .get();

    if (goalsSnap.empty) return;

    // Agrupar metas por userId
    const countByUser: Record<string, number> = {};
    for (const docSnap of goalsSnap.docs) {
      const { userId } = docSnap.data();
      countByUser[userId] = (countByUser[userId] ?? 0) + 1;
    }

    // Escribir una notificación por usuario
    const batch = db.batch();
    for (const [userId, count] of Object.entries(countByUser)) {
      const notifRef = db.collection('notifications').doc();
      batch.set(notifRef, {
        toUserId: userId,
        type: 'goal_monthly_reminder',
        read: false,
        createdAt: admin.firestore.Timestamp.now(),
        data: { count },
      });
    }
    await batch.commit();
  },
);
