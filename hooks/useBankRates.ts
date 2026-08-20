import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'spendia_bank_card_rates_v1';
/** El origen se publica una vez al mes; refrescar a diario ya es generoso. */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const URL = 'https://spendia.co/api/card-rates';

interface Band { min: number; max: number; tea: number }

interface Payload {
  /** Fecha del corte publicado por la Superfinanciera (YYYY-MM-DD). */
  corte: string;
  /** bankId → tramos de plazo con su tasa media. */
  banks: Record<string, Band[]>;
  fetchedAt: number;
}

export interface BankRates {
  corte: string | null;
  /** Tasa media del banco para ese número de cuotas, o null si no hay dato. */
  rateFor: (bankId: string, installments: number) => number | null;
  loading: boolean;
}

const EMPTY: BankRates = { corte: null, rateFor: () => null, loading: false };

/**
 * Tasa media de tarjeta por banco, publicada por la Superfinanciera.
 *
 * Es una REFERENCIA del mercado, no la tasa del usuario: la suya depende de su
 * producto y su perfil. Por eso, donde se muestre, siempre pierde contra la
 * tasa que él haya guardado en su tarjeta, y siempre va con la fecha del corte
 * — que lleva meses de retraso y fingir lo contrario sería mentir.
 *
 * Solo seis bancos publican: Bancolombia, BBVA, Bogotá, AV Villas, Falabella y
 * DAVIbank. Para el resto no hay dato y la app lo dice; el usuario la guarda a
 * mano y esa es mejor que cualquier promedio.
 */
export function useBankRates(enabled = true): BankRates {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CACHE_KEY);
        if (raw) {
          const cached: Payload = JSON.parse(raw);
          if (Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
            if (!cancelled) setData(cached);
            return;
          }
        }
      } catch { /* caché ilegible: se pide de nuevo */ }

      if (cancelled) return;
      setLoading(true);
      try {
        const res = await fetch(URL, { signal: AbortSignal.timeout(12000) });
        if (!res.ok) throw new Error(String(res.status));
        const json = (await res.json()) as Payload;
        if (!json?.banks) throw new Error('sin_bancos');
        if (!cancelled) setData(json);
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify(json)).catch(() => {});
      } catch {
        // Sin referencia no se rompe nada: la tarjeta usa su tasa guardada, y
        // si no tiene, el campo se queda como estaba.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [enabled]);

  if (!enabled || !data) return { ...EMPTY, loading };

  return {
    corte: data.corte,
    loading,
    rateFor: (bankId, installments) => {
      const bands = data.banks[bankId];
      if (!bands) return null;
      const band = bands.find((b) => installments >= b.min && installments <= b.max);
      return band ? band.tea : null;
    },
  };
}
