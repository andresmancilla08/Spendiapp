import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'spendia_exchange_rates_v1';
const TTL_MS = 60 * 60 * 1000; // 60 min
const API_URL = 'https://open.er-api.com/v6/latest/USD';

interface CachedRates {
  usd: number;
  eur: number;
  fetchedAt: number;
}

export interface ExchangeRates {
  usd: number;
  eur: number;
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
    if (Date.now() - parsed.fetchedAt > TTL_MS) return null;
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

export function useExchangeRates(): ExchangeRates {
  const [usd, setUsd] = useState(0);
  const [eur, setEur] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [tick, setTick] = useState(0);

  const retry = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function fetch_() {
      setLoading(true);
      setError(false);

      const cached = await loadCache();
      if (cached) {
        if (!cancelled) {
          setUsd(cached.usd);
          setEur(cached.eur);
          setUpdatedAt(new Date(cached.fetchedAt));
          setLoading(false);
        }
        return;
      }

      try {
        const res = await fetch(API_URL, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) throw new Error('bad_response');
        const data = await res.json();
        if (data.result !== 'success') throw new Error('api_error');

        const copPerUsd: number = data.rates?.COP ?? 0;
        const eurPerUsd: number = data.rates?.EUR ?? 0;
        if (copPerUsd <= 0 || eurPerUsd <= 0) throw new Error('invalid_rates');

        const copPerEur = Math.round(copPerUsd / eurPerUsd);
        const now = Date.now();

        const rates: CachedRates = { usd: Math.round(copPerUsd), eur: copPerEur, fetchedAt: now };
        await saveCache(rates);

        if (!cancelled) {
          setUsd(rates.usd);
          setEur(rates.eur);
          setUpdatedAt(new Date(now));
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    }

    fetch_();
    return () => { cancelled = true; };
  }, [tick]);

  return { usd, eur, loading, error, updatedAt, retry };
}
