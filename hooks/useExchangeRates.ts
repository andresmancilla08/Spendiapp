import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'spendia_exchange_rates_v5';
const POLL_MS = 5 * 60 * 1000;
const CACHE_TTL_MS = 5 * 60 * 1000;

// Proxy server-side en Vercel — evita CORS/CSP/bloqueos de red del cliente
const PROXY_URL = 'https://spendia.co/api/exchange-rates';

interface CachedRates {
  usd: number;
  eur: number;
  fetchedAt: number;
}

export interface ExchangeRates {
  usd: number;
  eur: number;
  prevUsd: number;
  prevEur: number;
  loading: boolean;
  error: boolean;
  updatedAt: Date | null;
  retry: () => void;
}

async function loadCache(): Promise<CachedRates | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: CachedRates = JSON.parse(raw);
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function saveCache(rates: CachedRates): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(rates));
  } catch {}
}

async function fetchRates(): Promise<{ usd: number; eur: number }> {
  const res = await fetch(PROXY_URL);
  if (!res.ok) throw new Error(`http_${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  if (!data.usd || !data.eur) throw new Error('invalid_response');
  return { usd: data.usd, eur: data.eur };
}

export function useExchangeRates(): ExchangeRates {
  const [usd, setUsd] = useState(0);
  const [eur, setEur] = useState(0);
  const [prevUsd, setPrevUsd] = useState(0);
  const [prevEur, setPrevEur] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [tick, setTick] = useState(0);
  const currentUsd = useRef(0);
  const currentEur = useRef(0);

  const retry = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function load(force = false) {
      if (!force) {
        setLoading(true);
        setError(false);
        const cached = await loadCache();
        if (cached && !cancelled) {
          setPrevUsd(currentUsd.current);
          setPrevEur(currentEur.current);
          currentUsd.current = cached.usd;
          currentEur.current = cached.eur;
          setUsd(cached.usd);
          setEur(cached.eur);
          setUpdatedAt(new Date(cached.fetchedAt));
          setLoading(false);
          return;
        }
      }

      try {
        const rates = await fetchRates();
        const now = Date.now();
        await saveCache({ ...rates, fetchedAt: now });
        if (!cancelled) {
          setPrevUsd(currentUsd.current);
          setPrevEur(currentEur.current);
          currentUsd.current = rates.usd;
          currentEur.current = rates.eur;
          setUsd(rates.usd);
          setEur(rates.eur);
          setUpdatedAt(new Date(now));
          setLoading(false);
          setError(false);
        }
      } catch {
        if (!cancelled && !force) {
          setError(true);
          setLoading(false);
        }
      }
    }

    load();
    const interval = setInterval(() => { if (!cancelled) load(true); }, POLL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [tick]);

  return { usd, eur, prevUsd, prevEur, loading, error, updatedAt, retry };
}
