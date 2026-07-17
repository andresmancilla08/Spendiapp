import { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Insight IA proactivo para "Tu mes en una frase".
// Server-side en Vercel (api/insight.js) → mantiene la API key fuera del cliente.
// Cachea por uid+mes+hash de agregados; si falla/offline devuelve null y el
// caller cae al template i18n existente (cero breakage aunque no haya API key).
const INSIGHT_URL = 'https://spendia.co/api/insight';

export interface AiInsightChip { label: string; tone: 'pos' | 'neg' | 'muted' }
export interface AiInsight { sentence: string; chip?: AiInsightChip }

export interface InsightInput {
  monthLabel: string;
  dayOfMonth: number;
  daysInMonth: number;
  income: number;
  expenses: number;
  balance: number;
  prevMonthExpenses: number | null;
  prevMonthToDateExpenses: number | null;
  savingsRate: number | null;
  topCategories: { label: string; amount: number }[];
}

// Hash estable sobre agregados redondeados a miles: micro-variaciones no re-piden a la IA.
function hashInput(a: InsightInput): string {
  const k = (n: number | null) => (n == null ? 'x' : Math.round(n / 1000));
  const s = [
    k(a.income), k(a.expenses), k(a.balance), k(a.prevMonthToDateExpenses),
    a.savingsRate ?? 'x', a.dayOfMonth,
    ...a.topCategories.map((c) => `${c.label}:${k(c.amount)}`),
  ].join('|');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return String(h >>> 0);
}

interface Params {
  enabled: boolean; // isPremium && isCurrentMonth && online
  uid?: string;
  year: number;
  month: number;
  input: InsightInput;
}

export function useAiInsight({ enabled, uid, year, month, input }: Params): AiInsight | null {
  const [insight, setInsight] = useState<AiInsight | null>(null);
  const inputRef = useRef(input);
  inputRef.current = input;

  const hasData = input.income !== 0 || input.expenses !== 0;
  const key = enabled && uid && hasData
    ? `@spendia_ai_insight_${uid}_${year}_${month}_${hashInput(input)}`
    : '';

  useEffect(() => {
    if (!key) { setInsight(null); return; }
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 13000);

    (async () => {
      try {
        const cached = await AsyncStorage.getItem(key);
        if (cached) { if (!cancelled) setInsight(JSON.parse(cached)); return; }
      } catch {}
      try {
        const r = await fetch(INSIGHT_URL, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(inputRef.current),
          signal: controller.signal,
        });
        if (!r.ok) throw new Error('bad');
        const data = await r.json();
        if (!data?.sentence) throw new Error('empty');
        const out: AiInsight = { sentence: data.sentence, chip: data.chip };
        if (!cancelled) setInsight(out);
        try { await AsyncStorage.setItem(key, JSON.stringify(out)); } catch {}
      } catch {
        if (!cancelled) setInsight(null); // caller usa el template
      }
    })();

    return () => { cancelled = true; clearTimeout(timer); controller.abort(); };
  }, [key]);

  return insight;
}
