import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'spendia_exchange_rates_v3';
const POLL_MS = 5 * 60 * 1000;
const CACHE_TTL_MS = 5 * 60 * 1000;

// Two independent APIs — si una falla, se intenta la otra
const APIS = [
  {
    url: 'https://open.er-api.com/v6/latest/USD',
    parse: (data: any) => {
      if (data.result !== 'success') throw new Error('api_error');
      const cop: number = data.rates?.COP ?? 0;
      const eur: number = data.rates?.EUR ?? 0;
      if (cop <= 0 || eur <= 0) throw new Error('invalid');
      return { usd: Math.round(cop), eur: Math.round(cop / eur) };
    },
  },
  {
    url: 'https://api.exchangerate-api.com/v4/latest/USD',
    parse: (data: any) => {
      const cop: number = data.rates?.COP ?? 0;
      const eur: number = data.rates?.EUR ?? 0;
      if (cop <= 0 || eur <= 0) throw new Error('invalid');
      return { usd: Math.round(cop), eur: Math.round(cop / eur) };
    },
  },
];

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
  let lastError: unknown;
  for (const api of APIS) {
    try {
      const res = await fetch(api.url);
      if (!res.ok) throw new Error(`http_${res.status}`);
      const data = await res.json();
      return api.parse(data);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
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
