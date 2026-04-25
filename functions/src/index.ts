// functions/src/index.ts
import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { Resend } from 'resend';
import { getPaletteColors } from './paletteColors';
import { generateOtpEmail } from './emailTemplate';

admin.initializeApp();
const db = admin.firestore();
const resendApiKey = defineSecret('RESEND_API_KEY');

function generateOtp(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// ── OTP PIN Reset ────────────────────────────────────────────────────────────

export const sendPinResetOtp = onCall({ secrets: [resendApiKey] }, async (request) => {
  const { email } = request.data as { email: string };
  if (!email) throw new HttpsError('invalid-argument', 'Email requerido');

  let userRecord: admin.auth.UserRecord;
  try {
    userRecord = await admin.auth().getUserByEmail(email.trim().toLowerCase());
  } catch {
    throw new HttpsError('not-found', 'Email no encontrado');
  }

  const hasPin = userRecord.providerData.some((p) => p.providerId === 'password');
  if (!hasPin) {
    throw new HttpsError('failed-precondition', 'Cuenta sin PIN');
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
    throw new HttpsError('not-found', 'Email no encontrado');
  }

  const resetRef = db.collection('pin_resets').doc(uid);
  const resetDoc = await resetRef.get();
  if (!resetDoc.exists) throw new HttpsError('not-found', 'Sin solicitud activa');

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
