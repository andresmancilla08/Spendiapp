import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { updateSalarySim } from './useUserProfile';
import { DEFAULT_SCENARIO, sanitizeScenario, type SalarySimScenario } from '../utils/salarySim';

/** Espera tras la última edición antes de escribir: teclear un sueldo no puede
 *  ser una escritura a Firestore por cada dígito. */
const SAVE_DELAY_MS = 800;

/**
 * El escenario del Simulador de sueldo, guardado en `users/{uid}.salarySim`.
 *
 * Se lee UNA vez al entrar (`getDoc`, no `onSnapshot`): mientras el usuario
 * juega con los números, el estado local es la verdad, y un snapshot que llega
 * a mitad de una edición le pisaría lo que está escribiendo.
 */
export function useSalarySim(uid: string) {
  const [scenario, setScenarioState] = useState<SalarySimScenario>(DEFAULT_SCENARIO);
  const [loading, setLoading] = useState(true);
  /** `true` si el perfil ya traía un escenario guardado. */
  const [hadSaved, setHadSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<SalarySimScenario | null>(null);

  useEffect(() => {
    let alive = true;
    if (!uid) { setLoading(false); return; }
    getDoc(doc(db, 'users', uid))
      .then((snap) => {
        if (!alive) return;
        const raw = snap.data()?.salarySim;
        setHadSaved(raw != null);
        setScenarioState(sanitizeScenario(raw));
      })
      .catch(() => { /* sin perfil legible se arranca con el escenario por defecto */ })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [uid]);

  const flush = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    const next = pending.current;
    pending.current = null;
    if (next && uid) updateSalarySim(uid, next).catch(() => { /* se reintenta en la siguiente edición */ });
  }, [uid]);

  // Al salir de la pantalla se escribe lo que quedara pendiente: si no, la última
  // edición antes de volver atrás se perdía.
  useEffect(() => () => flush(), [flush]);

  /** Solo se guarda lo que editó el usuario: la carga inicial también cambia
   *  `scenario` y no debe escribir de vuelta lo que acaba de leer. */
  const dirty = useRef(false);

  // El actualizador de estado es puro; el guardado se programa aquí, con lo que
  // React ya confirmó. Programarlo DENTRO del actualizador podía guardar un
  // escenario que React descartara sin llegar a pintarlo.
  const setScenario = useCallback((update: (prev: SalarySimScenario) => SalarySimScenario) => {
    dirty.current = true;
    setScenarioState(update);
  }, []);

  useEffect(() => {
    if (!dirty.current) return;
    pending.current = scenario;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, SAVE_DELAY_MS);
  }, [scenario, flush]);

  return { scenario, setScenario, loading, hadSaved };
}
