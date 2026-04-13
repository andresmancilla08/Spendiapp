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
exports.goalsMonthlyReminder = exports.resetWhatsNew = void 0;
// functions/src/index.ts
const admin = __importStar(require("firebase-admin"));
const scheduler_1 = require("firebase-functions/v2/scheduler");
const https_1 = require("firebase-functions/v2/https");
admin.initializeApp();
const db = admin.firestore();
// Resetea whatsNewSeen=false para todos los usuarios.
// Llamar ANTES de cada deploy que actualice la pantalla de Novedades.
// Uso: curl -X POST -H "x-reset-secret: <SECRET>" https://<region>-spendiapp-159e7.cloudfunctions.net/resetWhatsNew
exports.resetWhatsNew = (0, https_1.onRequest)({ region: 'us-central1' }, async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    const secret = req.headers['x-reset-secret'];
    if (!secret || secret !== process.env.WHATS_NEW_RESET_SECRET) {
        res.status(401).send('Unauthorized');
        return;
    }
    const snapshot = await db.collection('users').get();
    if (snapshot.empty) {
        res.status(200).json({ reset: 0 });
        return;
    }
    const batch = db.batch();
    snapshot.forEach((docSnap) => {
        batch.update(docSnap.ref, { whatsNewSeen: false });
    });
    await batch.commit();
    res.status(200).json({ reset: snapshot.size });
});
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