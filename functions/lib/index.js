"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.goalsMonthlyReminder = exports.detectPremiumTampering = exports.getSystemConfig = exports.adminBypass = exports.cleanupOrphanAccounts = exports.resetPinWithOtp = exports.verifyPinResetOtp = exports.sendPinResetOtp = void 0;
// functions/src/index.ts
const admin = __importStar(require("firebase-admin"));
const scheduler_1 = require("firebase-functions/v2/scheduler");
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-functions/v2/firestore");
const params_1 = require("firebase-functions/params");
const resend_1 = require("resend");
const paletteColors_1 = require("./paletteColors");
const emailTemplate_1 = require("./emailTemplate");
admin.initializeApp();
const db = admin.firestore();
const resendApiKey = (0, params_1.defineSecret)('RESEND_API_KEY');
function generateOtp() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}
// ── OTP PIN Reset ────────────────────────────────────────────────────────────
exports.sendPinResetOtp = (0, https_1.onCall)({ secrets: [resendApiKey] }, async (request) => {
    var _a, _b, _c;
    const { email } = request.data;
    if (!email)
        throw new https_1.HttpsError('invalid-argument', 'Email requerido');
    let userRecord;
    try {
        userRecord = await admin.auth().getUserByEmail(email.trim().toLowerCase());
    }
    catch (error) {
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
    const paletteId = ((_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.colorPalette) || 'deepWater';
    const palette = (0, paletteColors_1.getPaletteColors)(paletteId);
    const otp = generateOtp();
    const expiresAt = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 10 * 60 * 1000));
    await db.collection('pin_resets').doc(uid).set({
        otp,
        email: email.trim().toLowerCase(),
        expiresAt,
        verified: false,
        attempts: 0,
        createdAt: admin.firestore.Timestamp.now(),
    });
    const resend = new resend_1.Resend(resendApiKey.value());
    try {
        const result = await resend.emails.send({
            from: 'Spendia <noreply@spendia.co>',
            to: email.trim(),
            subject: 'Tu código de verificación de Spendia',
            html: (0, emailTemplate_1.generateOtpEmail)(Object.assign({ otpCode: otp, userEmail: email }, palette)),
        });
        if (result.error) {
            console.error('Resend returned error:', JSON.stringify(result.error));
            throw new https_1.HttpsError('internal', `Resend error: ${result.error.message}`);
        }
        console.log('Resend sent OK, id:', (_b = result.data) === null || _b === void 0 ? void 0 : _b.id);
    }
    catch (err) {
        if (err === null || err === void 0 ? void 0 : err.httpErrorCode)
            throw err; // re-throw HttpsError
        console.error('Resend exception:', (_c = err === null || err === void 0 ? void 0 : err.message) !== null && _c !== void 0 ? _c : String(err));
        throw new https_1.HttpsError('internal', 'Error enviando email');
    }
    return { success: true };
});
exports.verifyPinResetOtp = (0, https_1.onCall)(async (request) => {
    const { email, otp } = request.data;
    if (!email || !otp)
        throw new https_1.HttpsError('invalid-argument', 'Datos incompletos');
    let uid;
    try {
        const userRecord = await admin.auth().getUserByEmail(email.trim().toLowerCase());
        uid = userRecord.uid;
    }
    catch (_a) {
        throw new https_1.HttpsError('not-found', 'Email no encontrado');
    }
    const resetRef = db.collection('pin_resets').doc(uid);
    const resetDoc = await resetRef.get();
    if (!resetDoc.exists)
        throw new https_1.HttpsError('not-found', 'Sin solicitud activa');
    const data = resetDoc.data();
    if (data.expiresAt.toDate() < new Date()) {
        await resetRef.delete();
        throw new https_1.HttpsError('deadline-exceeded', 'Código expirado');
    }
    if (data.attempts >= 3) {
        throw new https_1.HttpsError('resource-exhausted', 'Demasiados intentos');
    }
    if (data.otp !== otp) {
        await resetRef.update({ attempts: admin.firestore.FieldValue.increment(1) });
        throw new https_1.HttpsError('invalid-argument', 'Código incorrecto');
    }
    await resetRef.update({ verified: true });
    return { success: true };
});
exports.resetPinWithOtp = (0, https_1.onCall)(async (request) => {
    const { email, otp, newPin } = request.data;
    if (!email || !otp || !newPin)
        throw new https_1.HttpsError('invalid-argument', 'Datos incompletos');
    let uid;
    try {
        const userRecord = await admin.auth().getUserByEmail(email.trim().toLowerCase());
        uid = userRecord.uid;
    }
    catch (_a) {
        throw new https_1.HttpsError('not-found', 'Email no encontrado');
    }
    const resetRef = db.collection('pin_resets').doc(uid);
    const resetDoc = await resetRef.get();
    if (!resetDoc.exists)
        throw new https_1.HttpsError('not-found', 'Sin solicitud activa');
    const data = resetDoc.data();
    if (!data.verified)
        throw new https_1.HttpsError('permission-denied', 'OTP no verificado');
    if (data.otp !== otp)
        throw new https_1.HttpsError('invalid-argument', 'Sesión inválida');
    if (data.expiresAt.toDate() < new Date()) {
        await resetRef.delete();
        throw new https_1.HttpsError('deadline-exceeded', 'Sesión expirada');
    }
    await admin.auth().updateUser(uid, { password: newPin + '00' });
    await resetRef.delete();
    return { success: true };
});
// ── Cleanup Orphan Auth Accounts ─────────────────────────────────────────────
// Elimina cuentas de Firebase Auth que no tienen doc en Firestore (eliminadas desde admin sin limpiar Auth)
exports.cleanupOrphanAccounts = (0, https_1.onCall)(async (request) => {
    var _a;
    // Solo ejecutable por el admin principal
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Se requiere autenticación');
    const callerDoc = await admin.firestore().collection('users').doc(request.auth.uid).get();
    if (!callerDoc.exists || !((_a = callerDoc.data()) === null || _a === void 0 ? void 0 : _a.isAdmin)) {
        throw new https_1.HttpsError('permission-denied', 'Solo administradores pueden ejecutar esta función');
    }
    const allAuthUsers = [];
    let pageToken;
    do {
        const result = await admin.auth().listUsers(1000, pageToken);
        allAuthUsers.push(...result.users.map((u) => u.uid));
        pageToken = result.pageToken;
    } while (pageToken);
    const orphans = [];
    for (const uid of allAuthUsers) {
        const docSnap = await db.collection('users').doc(uid).get();
        if (!docSnap.exists)
            orphans.push(uid);
    }
    for (const uid of orphans) {
        try {
            await admin.auth().deleteUser(uid);
        }
        catch (err) {
            console.error(`Failed to delete orphan auth user ${uid}:`, err);
        }
    }
    console.log(`Cleanup complete: deleted ${orphans.length} orphan auth accounts`, orphans);
    return { deleted: orphans.length, uids: orphans };
});
// ── Honeypot Functions ────────────────────────────────────────────────────────
// HONEYPOT: Función que parece un bypass de admin pero registra al atacante
exports.adminBypass = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c, _d, _e, _f;
    const uid = (_b = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid) !== null && _b !== void 0 ? _b : 'unauthenticated';
    const email = (_e = (_d = (_c = request.auth) === null || _c === void 0 ? void 0 : _c.token) === null || _d === void 0 ? void 0 : _d.email) !== null && _e !== void 0 ? _e : 'unknown';
    await admin.firestore().collection('honeypotLogs').add({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        type: 'function-honeypot',
        trapName: 'adminBypass',
        uid,
        email,
        data: JSON.stringify((_f = request.data) !== null && _f !== void 0 ? _f : {}),
        severity: 'critical',
    });
    throw new https_1.HttpsError('not-found', 'Function not found');
});
// HONEYPOT: Trampa para quien intente leer colección admin directamente
exports.getSystemConfig = (0, https_1.onCall)(async (request) => {
    var _a, _b;
    const uid = (_b = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid) !== null && _b !== void 0 ? _b : 'unauthenticated';
    await admin.firestore().collection('honeypotLogs').add({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        type: 'function-honeypot',
        trapName: 'getSystemConfig',
        uid,
        severity: 'high',
    });
    throw new https_1.HttpsError('permission-denied', 'Access denied');
});
// HONEYPOT: Detectar modificación de campos premium via cliente
exports.detectPremiumTampering = (0, firestore_1.onDocumentUpdated)('users/{userId}', async (event) => {
    var _a, _b, _c;
    const before = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data();
    const after = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data();
    if (!before || !after)
        return;
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
            before: tampered.reduce((acc, f) => (Object.assign(Object.assign({}, acc), { [f]: before[f] })), {}),
            after: tampered.reduce((acc, f) => (Object.assign(Object.assign({}, acc), { [f]: after[f] })), {}),
            severity: 'critical',
        });
        // Revertir los campos manipulados automáticamente
        const revert = {};
        for (const field of tampered) {
            revert[field] = before[field];
        }
        await ((_c = event.data) === null || _c === void 0 ? void 0 : _c.after.ref.update(revert));
        console.warn(`[HONEYPOT] Premium tampering detected for user ${userId}. Fields: ${tampered.join(', ')}. Reverted.`);
    }
});
// ── Goals Monthly Reminder ────────────────────────────────────────────────────
// Día 3 de cada mes a las 9:00 AM hora Colombia
exports.goalsMonthlyReminder = (0, scheduler_1.onSchedule)({ schedule: '0 9 3 * *', timeZone: 'America/Bogota' }, async () => {
    var _a;
    const goalsSnap = await db
        .collection('goals')
        .where('status', '==', 'active')
        .get();
    if (goalsSnap.empty)
        return;
    // Agrupar metas por userId
    const countByUser = {};
    for (const docSnap of goalsSnap.docs) {
        const { userId } = docSnap.data();
        countByUser[userId] = ((_a = countByUser[userId]) !== null && _a !== void 0 ? _a : 0) + 1;
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
});
//# sourceMappingURL=index.js.map