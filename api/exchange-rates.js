export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  // 15 minutos en CDN de Vercel + revalidación en background
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=300');

  // Fuentes en orden de prioridad:
  // 1. TRM oficial Banco de la República (datos.gov.co) + BCE para EUR/USD
  // 2. fawazahmed0/currency-api (diario, sin key)
  // 3. open.er-api.com (fallback de último recurso)
  const sources = [
    () => fetchTRM(),
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
      // probar siguiente fuente
    }
  }

  res.status(500).json({ error: 'all_sources_failed' });
}

// TRM oficial: USD/COP del Banco de la República (datos.gov.co - Socrata API)
// EUR/COP derivado: TRM × tasa BCE EUR/USD (Frankfurter)
async function fetchTRM() {
  const [trmRes, eurRes] = await Promise.all([
    fetch(
      'https://www.datos.gov.co/resource/32sa-8pi3.json?$limit=1&$order=vigenciadesde DESC',
      { signal: AbortSignal.timeout(8000) },
    ),
    fetch(
      'https://api.frankfurter.app/latest?base=USD&symbols=EUR',
      { signal: AbortSignal.timeout(8000) },
    ),
  ]);

  if (!trmRes.ok) throw new Error(`trm_${trmRes.status}`);
  if (!eurRes.ok) throw new Error(`eur_${eurRes.status}`);

  const [trmData, eurData] = await Promise.all([trmRes.json(), eurRes.json()]);

  const copPerUsd = parseFloat(trmData?.[0]?.valor ?? '0');
  const eurPerUsd = eurData?.rates?.EUR ?? 0;

  if (copPerUsd <= 0 || eurPerUsd <= 0) throw new Error('trm_invalid');

  return {
    usd: Math.round(copPerUsd),
    eur: Math.round(copPerUsd / eurPerUsd),
  };
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
