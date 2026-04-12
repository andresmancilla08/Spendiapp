// functions/src/index.ts
import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onRequest } from 'firebase-functions/v2/https';
admin.initializeApp();
const db = admin.firestore();

// Resetea whatsNewSeen=false para todos los usuarios.
// Llamar ANTES de cada deploy que actualice la pantalla de Novedades.
// Uso: curl -X POST -H "x-reset-secret: <SECRET>" https://<region>-spendiapp-159e7.cloudfunctions.net/resetWhatsNew
export const resetWhatsNew = onRequest(
  { region: 'us-central1' },
  async (req, res) => {
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
  },
);

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
