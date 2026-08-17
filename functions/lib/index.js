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
exports.goalsMonthlyReminder = exports.detectPremiumTampering = exports.getSystemConfig = exports.adminBypass = exports.backfillPublicProfiles = exports.mirrorPublicProfile = exports.cleanupOrphanAccounts = exports.resetPinWithOtp = exports.verifyPinResetOtp = exports.sendPinResetOtp = void 0;
// functions/src/index.ts
const admin = __importStar(require("firebase-admin"));
const crypto_1 = require("crypto");
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
    return (0, crypto_1.randomInt)(1000, 10000).toString();
}
// [B-3] El código del correo NO se guarda en claro: `pin_resets` es invisible para
// el cliente (reglas: read/write false), pero cualquiera con consola o con un
// volcado de Firestore veía un código válido para tomar la cuenta. El uid entra en
// el hash para que dos usuarios con el mismo código no compartan huella.
function hashOtp(uid, otp) {
    return (0, crypto_1.createHash)('sha256').update(`${uid}:${otp}`).digest('hex');
}
function otpMatches(uid, otp, data) {
    // ponytail: la rama `data.otp` es compatibilidad con las solicitudes en vuelo al
    // desplegar esto. Caduca sola en 10 min; se puede borrar en el siguiente release.
    if (typeof data.otpHash !== 'string')
        return data.otp === otp;
    const a = Buffer.from(data.otpHash, 'hex');
    const b = Buffer.from(hashOtp(uid, otp), 'hex');
    return a.length === b.length && (0, crypto_1.timingSafeEqual)(a, b);
}
// ── OTP PIN Reset ────────────────────────────────────────────────────────────
exports.sendPinResetOtp = (0, https_1.onCall)({ secrets: [resendApiKey] }, async (request) => {
    var _a, _b, _c, _d, _e;
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
    // [M-4] Rate limit: mín. 60s entre envíos por cuenta para evitar
    // email bombing / abuso de cuota de Resend.
    const existing = await db.collection('pin_resets').doc(uid).get();
    if (existing.exists) {
        const prev = existing.data();
        const last = (_b = (_a = prev.createdAt) === null || _a === void 0 ? void 0 : _a.toMillis()) !== null && _b !== void 0 ? _b : 0;
        if (Date.now() - last < 60 * 1000) {
            // Respuesta genérica: no revelar que hay una solicitud activa.
            return { success: true, message: 'Si el email está registrado con PIN, recibirás un código.' };
        }
    }
    const userDoc = await db.collection('users').doc(uid).get();
    const paletteId = ((_c = userDoc.data()) === null || _c === void 0 ? void 0 : _c.colorPalette) || 'deepWater';
    const palette = (0, paletteColors_1.getPaletteColors)(paletteId);
    const otp = generateOtp();
    const expiresAt = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 10 * 60 * 1000));
    await db.collection('pin_resets').doc(uid).set({
        otpHash: hashOtp(uid, otp),
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
        console.log('Resend sent OK, id:', (_d = result.data) === null || _d === void 0 ? void 0 : _d.id);
    }
    catch (err) {
        if (err === null || err === void 0 ? void 0 : err.httpErrorCode)
            throw err; // re-throw HttpsError
        console.error('Resend exception:', (_e = err === null || err === void 0 ? void 0 : err.message) !== null && _e !== void 0 ? _e : String(err));
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
        throw new https_1.HttpsError('invalid-argument', 'Código inválido o expirado');
    }
    const resetRef = db.collection('pin_resets').doc(uid);
    const resetDoc = await resetRef.get();
    if (!resetDoc.exists)
        throw new https_1.HttpsError('invalid-argument', 'Código inválido o expirado');
    const data = resetDoc.data();
    if (data.expiresAt.toDate() < new Date()) {
        await resetRef.delete();
        throw new https_1.HttpsError('deadline-exceeded', 'Código expirado');
    }
    if (data.attempts >= 3) {
        throw new https_1.HttpsError('resource-exhausted', 'Demasiados intentos');
    }
    if (!otpMatches(uid, otp, data)) {
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
    // El cliente ya lo valida, pero esta función es una API pública: sin esto se
    // podría dejar la cuenta con un PIN de un dígito.
    if (!/^\d{6}$/.test(newPin))
        throw new https_1.HttpsError('invalid-argument', 'El PIN debe tener 6 dígitos');
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
    if (!otpMatches(uid, otp, data))
        throw new https_1.HttpsError('invalid-argument', 'Sesión inválida');
    if (data.expiresAt.toDate() < new Date()) {
        await resetRef.delete();
        throw new https_1.HttpsError('deadline-exceeded', 'Sesión expirada');
    }
    await admin.auth().updateUser(uid, { password: newPin });
    // Quien llega hasta aquí acaba de elegir un PIN suyo: no tiene sentido que el
    // gate se lo vuelva a pedir al entrar.
    await db.collection('users').doc(uid).set({ pinV2: true, pinSetAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
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
// ── Perfiles públicos (espejo de users) ────────────────────────────────────────
// Campos públicos legibles por otros usuarios. Mantenerlos sincronizados aquí,
// server-side, es la fuente de verdad: el cliente ya no depende de que el amigo
// inicie sesión para que su publicProfile exista.
function pickPublicFields(u) {
    var _a, _b, _c;
    return {
        userName: (_a = u.userName) !== null && _a !== void 0 ? _a : null,
        displayName: (_b = u.displayName) !== null && _b !== void 0 ? _b : null,
        photoURL: (_c = u.photoURL) !== null && _c !== void 0 ? _c : null,
    };
}
// Espeja users/{uid} → publicProfiles/{uid} en cada escritura del doc de usuario.
// Sin este trigger, un contacto que no vuelva a loguearse nunca aparece en la app.
exports.mirrorPublicProfile = (0, firestore_1.onDocumentWritten)('users/{userId}', async (event) => {
    var _a, _b, _c, _d, _e, _f, _g;
    const userId = event.params.userId;
    const after = (_b = (_a = event.data) === null || _a === void 0 ? void 0 : _a.after) === null || _b === void 0 ? void 0 : _b.data();
    const pubRef = db.collection('publicProfiles').doc(userId);
    // Usuario eliminado → limpiar el espejo.
    if (!after) {
        await pubRef.delete().catch(() => { });
        return;
    }
    const before = (_d = (_c = event.data) === null || _c === void 0 ? void 0 : _c.before) === null || _d === void 0 ? void 0 : _d.data();
    const nextPub = pickPublicFields(after);
    // Evitar escrituras redundantes si los campos públicos no cambiaron.
    if (before &&
        ((_e = before.userName) !== null && _e !== void 0 ? _e : null) === nextPub.userName &&
        ((_f = before.displayName) !== null && _f !== void 0 ? _f : null) === nextPub.displayName &&
        ((_g = before.photoURL) !== null && _g !== void 0 ? _g : null) === nextPub.photoURL) {
        return;
    }
    await pubRef.set(Object.assign({ uid: userId }, nextPub), { merge: true });
});
// Backfill one-time: rellena publicProfiles para todos los usuarios existentes.
// Solo admin. Ejecutar una vez tras desplegar; el trigger mantiene el resto.
exports.backfillPublicProfiles = (0, https_1.onCall)(async (request) => {
    var _a;
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Se requiere autenticación');
    const callerDoc = await db.collection('users').doc(request.auth.uid).get();
    if (!callerDoc.exists || !((_a = callerDoc.data()) === null || _a === void 0 ? void 0 : _a.isAdmin)) {
        throw new https_1.HttpsError('permission-denied', 'Solo administradores pueden ejecutar esta función');
    }
    const users = await db.collection('users').get();
    let written = 0;
    let batch = db.batch();
    let ops = 0;
    for (const d of users.docs) {
        const u = d.data();
        if (!u.userName && !u.displayName)
            continue; // doc sin identidad todavía
        batch.set(db.collection('publicProfiles').doc(d.id), Object.assign({ uid: d.id }, pickPublicFields(u)), { merge: true });
        written++;
        ops++;
        if (ops >= 400) {
            await batch.commit();
            batch = db.batch();
            ops = 0;
        }
    }
    if (ops > 0)
        await batch.commit();
    console.log(`backfillPublicProfiles: ${written}/${users.size} perfiles espejados`);
    return { written, total: users.size };
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
    var _a, _b, _c, _d;
    const before = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data();
    const after = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data();
    if (!before || !after)
        return;
    const sensitiveFields = ['isPremium', 'premiumExpiry', 'isBlocked', 'isAdmin'];
    // `premiumExpiry` es un Timestamp: comparar los objetos con !== siempre daba
    // distinto, así que CUALQUIER escritura en el documento (updateAppVersion en
    // cada arranque, por ejemplo) se marcaba como manipulación, se revertía, y la
    // reversión volvía a disparar el trigger — escrituras infinitas.
    const norm = (v) => {
        if (v && typeof v.toMillis === 'function') {
            return v.toMillis();
        }
        return v !== null && v !== void 0 ? v : null;
    };
    const tampered = sensitiveFields.filter((f) => norm(before[f]) !== norm(after[f]));
    if (tampered.length === 0)
        return;
    // Solo se revierte la ESCALADA de privilegios. Nadie se ataca a sí mismo
    // quitándose el premium o bloqueándose, y revertir esas bajadas hacía
    // imposible retirar el premium desde fuera de la app: la función lo volvía
    // a conceder, el cliente veía otra vez la transición free→premium y sacaba
    // la pantalla de bienvenida una y otra vez.
    const isDowngradeOnly = tampered.every((f) => f === 'isBlocked'
        ? after[f] === true // bloquear es restringir
        : !after[f] || norm(after[f]) === null);
    if (isDowngradeOnly)
        return;
    // Esta misma función acaba de revertir: no entrar en ping-pong.
    if (norm(after._honeypotRevertAt) !== norm(before._honeypotRevertAt))
        return;
    // Concesión legítima desde el panel de administración: se marca al escribir.
    if (after._srv === true) {
        await ((_c = event.data) === null || _c === void 0 ? void 0 : _c.after.ref.update({ _srv: admin.firestore.FieldValue.delete() }));
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
            before: tampered.reduce((acc, f) => (Object.assign(Object.assign({}, acc), { [f]: before[f] })), {}),
            after: tampered.reduce((acc, f) => (Object.assign(Object.assign({}, acc), { [f]: after[f] })), {}),
            severity: 'critical',
        });
        // Revertir los campos manipulados automáticamente. La marca corta la
        // recursión: la siguiente invocación la ve cambiada y sale.
        const revert = {
            _honeypotRevertAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        for (const field of tampered) {
            revert[field] = before[field];
        }
        await ((_d = event.data) === null || _d === void 0 ? void 0 : _d.after.ref.update(revert));
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