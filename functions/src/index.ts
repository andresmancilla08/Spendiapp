// functions/src/index.ts
import * as admin from 'firebase-admin';
import { randomInt } from 'crypto';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
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

  await admin.auth().updateUser(uid, { password: newPin + '00' });
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
    const tampered = sensitiveFields.filter((f) => before[f] !== after[f]);

    if (tampered.length > 0) {
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

      // Revertir los campos manipulados automáticamente
      const revert: Record<string, unknown> = {};
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
