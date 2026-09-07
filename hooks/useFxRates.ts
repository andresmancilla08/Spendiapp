import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, AppState } from 'react-native';
import type { FxRates, FxSeriesPoint, FxSeriesRow, FxCurrency } from '../utils/fxConvert';

/**
 * Tasas de hoy + serie histórica, en UNA petición.
 *
 * Aparte de `useExchangeRates` a propósito, aunque hablen con el mismo endpoint:
 * los chips del Home viven de un poll de 5 minutos y no quieren histórico. Aquí
 * el ritmo es OTRO — la TRM del Banco de la República se publica una vez al día,
 * así que un refresco por hora la recoge como muy tarde 60 minutos después de
 * publicarse, y pedirla más a menudo solo gastaría batería. Tocar
 * `useExchangeRates` para meter esto habría cambiado el comportamiento de un
 * componente que ya está en producción.
 *
 * `prev` es la publicación ANTERIOR de la TRM (el segundo punto de la serie), no
 * «el valor que tenía este hook hace un rato»: el banner de variación diaria
 * tiene que comparar contra ayer de verdad, no contra el último refresco.
 */
const CACHE_KEY = 'spendia_fx_rates_series_v1';
const POLL_MS = 60 * 60 * 1000;
const CACHE_TTL_MS = 60 * 60 * 1000;
const DAYS = 30;

const URL = `https://spendia.co/api/exchange-rates?days=${DAYS}`;

interface Payload {
  usd: number;
  eur: number;
  series: FxSeriesRow[];
  fetchedAt: number;
}

export interface FxRatesState {
  /** Tasas vigentes ahora. `null` mientras no haya ninguna, ni en caché. */
  rates: FxRates | null;
  /** Tasas de la publicación anterior, para la variación diaria. */
  prevRates: FxRates | null;
  /** Serie por moneda, de más reciente a más antigua. */
  seriesFor: (currency: FxCurrency) => FxSeriesPoint[];
  loading: boolean;
  /** Falló la red Y no había nada en caché: no hay ninguna cifra que mostrar. */
  error: boolean;
  /** Se está mostrando una tasa guardada porque la red falló. */
  stale: boolean;
  updatedAt: Date | null;
  retry: () => void;
}

async function loadCache(): Promise<{ data: Payload; fresh: boolean } | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Payload;
    if (!(parsed?.usd > 0) || !(parsed?.eur > 0)) return null;
    return { data: parsed, fresh: Date.now() - parsed.fetchedAt < CACHE_TTL_MS };
  } catch {
    return null;
  }
}

async function fetchPayload(): Promise<Payload> {
  const res = await fetch(URL);
  if (!res.ok) throw new Error(`http_${res.status}`);
  const data = await res.json();
  if (data?.error) throw new Error(String(data.error));
  if (!(data?.usd > 0) || !(data?.eur > 0)) throw new Error('invalid_response');
  return {
    usd: data.usd,
    eur: data.eur,
    series: Array.isArray(data.series) ? data.series : [],
    fetchedAt: Date.now(),
  };
}

export function useFxRates(): FxRatesState {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [stale, setStale] = useState(false);
  const [tick, setTick] = useState(0);

  const retry = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function load(fromCacheFirst: boolean) {
      if (fromCacheFirst) {
        const cached = await loadCache();
        if (cached && !cancelled) {
          setPayload(cached.data);
          setLoading(false);
          setStale(!cached.fresh);
          // Caché fresca: no se molesta a la red. La TRM no ha cambiado.
          if (cached.fresh) return;
        }
      }
      try {
        const fresh = await fetchPayload();
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(fresh)).catch(() => {});
        if (cancelled) return;
        setPayload(fresh);
        setError(false);
        setStale(false);
        setLoading(false);
      } catch {
        if (cancelled) return;
        // Con algo en pantalla, un fallo de red NO borra la cifra: la marca como
        // guardada. Sin nada, entonces sí es un error visible.
        setPayload((current) => {
          setError(current === null);
          setStale(current !== null);
          return current;
        });
        setLoading(false);
      }
    }

    load(true);
    const interval = setInterval(() => { if (!cancelled) load(false); }, POLL_MS);

    // Volver a la app es el momento en que más importa estar al día: puede haber
    // pasado la noche entera (y una publicación de la TRM) en segundo plano.
    let unsubscribe: (() => void) | undefined;
    if (Platform.OS === 'web') {
      const onVisible = () => { if (document.visibilityState === 'visible' && !cancelled) load(true); };
      document.addEventListener('visibilitychange', onVisible);
      unsubscribe = () => document.removeEventListener('visibilitychange', onVisible);
    } else {
      const sub = AppState.addEventListener('change', (s) => { if (s === 'active' && !cancelled) load(true); });
      unsubscribe = () => sub.remove();
    }

    return () => { cancelled = true; clearInterval(interval); unsubscribe?.(); };
  }, [tick]);

  const seriesFor = useCallback((currency: FxCurrency): FxSeriesPoint[] => {
    if (!payload || currency === 'COP') return [];
    return payload.series
      .map((row) => ({ date: row.date, rate: currency === 'EUR' ? row.eur : row.usd }))
      .filter((p): p is FxSeriesPoint => typeof p.rate === 'number' && p.rate > 0);
  }, [payload]);

  const rates: FxRates | null = payload ? { usd: payload.usd, eur: payload.eur } : null;

  // El segundo punto de la serie es la publicación anterior de la TRM. Sin
  // serie (o con un solo punto) no hay ayer con el que comparar y el banner de
  // variación simplemente no se pinta.
  const second = payload?.series?.[1];
  const prevRates: FxRates | null =
    second && (second.usd ?? 0) > 0 && (second.eur ?? 0) > 0
      ? { usd: second.usd as number, eur: second.eur as number }
      : null;

  return {
    rates,
    prevRates,
    seriesFor,
    loading,
    error,
    stale,
    updatedAt: payload ? new Date(payload.fetchedAt) : null,
    retry,
  };
}
