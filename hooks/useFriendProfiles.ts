import { useEffect, useMemo, useRef, useState } from 'react';
import { useFriends } from './useFriends';
import { getPublicProfile } from './useUserProfile';
import type { PublicProfile } from '../types/friend';

/**
 * Perfiles públicos de los amigos aceptados, listos para pintar en selectores
 * (compartir gasto / enviar ingreso).
 *
 * - Carga en PARALELO (no secuencial): una lectura lenta no bloquea al resto.
 * - Resiliente: si el publicProfile de un amigo falta o falla, NO se descarta ni
 *   se cuelga; se devuelve un placeholder para que el amigo siga siendo
 *   seleccionable (el trigger server-side `mirrorPublicProfile` rellena el nombre).
 * - Red de seguridad: `loading` nunca queda pegado.
 */
export function useFriendProfiles(userId: string) {
  const { acceptedFriends, loading: friendsLoading } = useFriends(userId);
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);

  const friendUids = useMemo(
    () => acceptedFriends.map((f) => (f.fromId === userId ? f.toId : f.fromId)),
    [acceptedFriends, userId],
  );
  // Clave estable: solo recargamos si cambia el conjunto de UIDs, no la referencia.
  const uidsKey = useMemo(() => [...friendUids].sort().join(','), [friendUids]);

  const requestId = useRef(0);

  useEffect(() => {
    if (friendsLoading) return;
    if (friendUids.length === 0) { setProfiles([]); setProfilesLoading(false); return; }

    const rid = ++requestId.current;
    setProfilesLoading(true);

    // ponytail: red de seguridad — si alguna lectura se cuelga (Firestore no
    // siempre rechaza offline), soltamos el spinner a los 8s igual que useFriends.
    const safety = setTimeout(() => { if (rid === requestId.current) setProfilesLoading(false); }, 8000);

    Promise.all(
      friendUids.map(async (uid): Promise<PublicProfile> => {
        const p = await getPublicProfile(uid).catch(() => null);
        return p ?? { uid, userName: '', displayName: '', photoURL: null };
      }),
    )
      .then((resolved) => { if (rid === requestId.current) setProfiles(resolved); })
      .finally(() => {
        clearTimeout(safety);
        if (rid === requestId.current) setProfilesLoading(false);
      });

    return () => clearTimeout(safety);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uidsKey, friendsLoading]);

  return { profiles, loading: friendsLoading || profilesLoading };
}
