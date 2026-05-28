import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'spendia_exchange_rates_v2';
const POLL_MS = 5 * 60 * 1000; // 5 min — real-time polling
const CACHE_TTL_MS = 5 * 60 * 1000;
const API_URL = 'https://open.er-api.com/v6/latest/USD';

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

    async function fetch_(force = false) {
      if (!force) setLoading(true);
      setError(false);

      if (!force) {
        const cached = await loadCache();
        if (cached) {
          if (!cancelled) {
            setPrevUsd(currentUsd.current);
            setPrevEur(currentEur.current);
            currentUsd.current = cached.usd;
            currentEur.current = cached.eur;
            setUsd(cached.usd);
            setEur(cached.eur);
            setUpdatedAt(new Date(cached.fetchedAt));
            setLoading(false);
          }
          return;
        }
      }

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(API_URL, { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) throw new Error('bad_response');
        const data = await res.json();
        if (data.result !== 'success') throw new Error('api_error');

        const copPerUsd: number = data.rates?.COP ?? 0;
        const eurPerUsd: number = data.rates?.EUR ?? 0;
        if (copPerUsd <= 0 || eurPerUsd <= 0) throw new Error('invalid_rates');

        const newUsd = Math.round(copPerUsd);
        const newEur = Math.round(copPerUsd / eurPerUsd);
        const now = Date.now();

        await saveCache({ usd: newUsd, eur: newEur, fetchedAt: now });

        if (!cancelled) {
          setPrevUsd(currentUsd.current);
          setPrevEur(currentEur.current);
          currentUsd.current = newUsd;
          currentEur.current = newEur;
          setUsd(newUsd);
          setEur(newEur);
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

    const interval = setInterval(() => {
      if (!cancelled) fetch_(true);
    }, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [tick]);

  return { usd, eur, prevUsd, prevEur, loading, error, updatedAt, retry };
}
