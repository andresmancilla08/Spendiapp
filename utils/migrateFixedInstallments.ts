/**
 * Repara los documentos que quedaron marcados a la vez como CUOTA y como GASTO FIJO.
 *
 * Pasaba al crear un gasto compartido a cuotas con el interruptor de "gasto fijo"
 * encendido: la rama propia forzaba `isFixed: false`, la compartida dejaba pasar el
 * valor del formulario. Un documento con los dos flags lo clonaba `useTransactions`
 * como fijo virtual TODOS los meses siguientes, indefinidamente y con el importe
 * equivocado, así que inflaba balance, categorías, presupuestos y tendencia.
 *
 * El origen ya está corregido; esto limpia lo que se escribió antes. Se ejecuta una
 * sola vez por dispositivo (marca en AsyncStorage) y es idempotente.
 */
import { collection, getDocs, query, where, writeBatch, doc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../config/firebase';

const DONE_KEY = '@spendiapp_migrated_fixed_installments_v1';

export async function migrateFixedInstallments(userId: string): Promise<number> {
  if (!userId) return 0;
  try {
    if (await AsyncStorage.getItem(DONE_KEY)) return 0;

    const snap = await getDocs(query(
      collection(db, 'transactions'),
      where('userId', '==', userId),
      where('isFixed', '==', true),
    ));

    const broken = snap.docs.filter((d) => d.data().isInstallment === true);
    if (broken.length === 0) {
      await AsyncStorage.setItem(DONE_KEY, '1');
      return 0;
    }

    // Firestore admite 500 escrituras por lote.
    for (let i = 0; i < broken.length; i += 400) {
      const batch = writeBatch(db);
      for (const d of broken.slice(i, i + 400)) {
        batch.update(doc(db, 'transactions', d.id), { isFixed: false });
      }
      await batch.commit();
    }

    await AsyncStorage.setItem(DONE_KEY, '1');
    return broken.length;
  } catch (err) {
    // No se marca como hecha: se reintenta en el próximo arranque.
    console.warn('[migrateFixedInstallments] no se pudo completar:', err);
    return 0;
  }
}
