export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=300');

  // Primary: fawazahmed0/currency-api — free, daily updates, no key required
  // Fallback: open.er-api.com free tier
  const sources = [
    () => fetchFawaz(),
    () => fetchOpenER(),
  ];

  for (const source of sources) {
    try {
      const rates = await source();
      if (rates.usd > 0 && rates.eur > 0) {
        return res.status(200).json({ ...rates, fetchedAt: Date.now() });
      }
    } catch {
      // try next source
    }
  }

  res.status(500).json({ error: 'all_sources_failed' });
}

async function fetchFawaz() {
  const res = await fetch(
    'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.min.json',
    { signal: AbortSignal.timeout(8000) },
  );
  if (!res.ok) throw new Error(`fawaz_${res.status}`);
  const data = await res.json();
  const copPerUsd = data?.usd?.cop ?? 0;
  const eurPerUsd = data?.usd?.eur ?? 0;
  if (copPerUsd <= 0 || eurPerUsd <= 0) throw new Error('fawaz_invalid');
  return {
    usd: Math.round(copPerUsd),
    eur: Math.round(copPerUsd / eurPerUsd),
  };
}

async function fetchOpenER() {
  const res = await fetch(
    'https://open.er-api.com/v6/latest/USD',
    { signal: AbortSignal.timeout(8000) },
  );
  if (!res.ok) throw new Error(`oper_${res.status}`);
  const data = await res.json();
  if (data.result !== 'success') throw new Error('oper_error');
  const copPerUsd = data.rates?.COP ?? 0;
  const eurPerUsd = data.rates?.EUR ?? 0;
  if (copPerUsd <= 0 || eurPerUsd <= 0) throw new Error('oper_invalid');
  return {
    usd: Math.round(copPerUsd),
    eur: Math.round(copPerUsd / eurPerUsd),
  };
}
