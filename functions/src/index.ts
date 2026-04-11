// functions/src/index.ts
import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';

admin.initializeApp();
const db = admin.firestore();

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
