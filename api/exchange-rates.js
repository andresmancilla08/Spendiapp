/**
 * GET + JSON con UN reintento.
 *
 * datos.gov.co (Socrata) devuelve 503 «Service unavailable» de forma
 * INTERMITENTE: la misma consulta falla y al repetirla va bien. Sin reintento,
 * `fetchTRM` se rendía en el primer 503 y el endpoint caía al fallback, o sea
 * los chips del Home mostraban una tasa que NO es la TRM oficial sin que nada
 * lo dijera. Un solo reintento corto tapa el caso normal; si el servicio está
 * de verdad caído, siguen estando las otras dos fuentes.
 */
async function fetchJson(url, { timeout = 6000, retries = 1 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(timeout) });
      if (!res.ok) throw new Error(`http_${res.status}`);
      return await res.json();
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  // 15 minutos en CDN de Vercel + revalidación en background
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=300');

  // ?days=N añade la serie histórica (mejor/peor del mes y sparkline de la
  // pantalla «Mi salario»). Va aparte del bloque de abajo para no cambiar en
  // nada la respuesta que ya consume `useExchangeRates`: si la serie falla, se
  // responde igual con las tasas de hoy y sin el campo `series`.
  const days = clampDays(req.query?.days);

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
        const body = { ...rates, fetchedAt: Date.now() };
        if (days) {
          // La serie es un extra: su fallo no puede tumbar la respuesta.
          try {
            const series = await fetchSeries(days);
            if (series.length) body.series = series;
          } catch {
            // sin serie; el cliente ya sabe vivir sin ella
          }
        }
        return res.status(200).json(body);
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
  const [trmData, eurData] = await Promise.all([
    fetchJson('https://www.datos.gov.co/resource/32sa-8pi3.json?$select=vigenciadesde,valor&$limit=1&$order=vigenciadesde%20DESC'),
    fetchJson('https://api.frankfurter.app/latest?base=USD&symbols=EUR'),
  ]);

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

/** `days` válido = entero entre 2 y 90. Cualquier otra cosa (ausente, 'abc',
 *  0, 500) desactiva la serie en vez de fallar: es un extra opcional. */
function clampDays(raw) {
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  if (!Number.isInteger(n) || n < 2) return 0;
  return Math.min(n, 90);
}

/**
 * Serie histórica de pesos por USD y por EUR.
 *
 * Los puntos son los últimos `days` valores PUBLICADOS de la TRM, no días
 * naturales: la TRM tiene una vigencia que cubre fines de semana y festivos, así
 * que 30 registros abarcan unas 6 semanas de calendario. Para «mejor y peor
 * tasa» eso es exactamente lo que se quiere — los días sin publicación no son
 * oportunidades distintas.
 *
 * El EUR no sale del Banco de la República (no publica EUR/COP), así que se
 * deriva igual que la tasa de hoy: TRM × EUR/USD del BCE. El BCE no publica
 * fines de semana, de modo que a cada fecha de la TRM se le aplica la última
 * tasa EUR/USD conocida en o antes de ese día. Sin eso, un sábado se quedaba
 * sin EUR y aparecían huecos en la sparkline.
 */
async function fetchSeries(days) {
  // Margen proporcional, no fijo: `days` son registros PUBLICADOS de la TRM y
  // cada uno cubre ~1,4 días naturales (fines de semana y festivos van en uno
  // solo). Con un margen fijo de 20 días, un `days=90` se quedaba sin EUR/USD
  // en los 20 registros más viejos porque abarcaban 127 días de calendario y el
  // rango pedido al BCE llegaba solo a 110.
  const from = new Date(Date.now() - (days * 1.6 + 14) * 86400000).toISOString().slice(0, 10);

  // El EUR es opcional: si el BCE falla, la serie sale solo con USD en vez de
  // no salir. `Promise.all` con un catch por rama, no un all-or-nothing.
  const [trmData, eurData] = await Promise.all([
    fetchJson(`https://www.datos.gov.co/resource/32sa-8pi3.json?$select=vigenciadesde,vigenciahasta,valor&$limit=${days}&$order=vigenciadesde%20DESC`),
    fetchJson(`https://api.frankfurter.app/${from}..?base=USD&symbols=EUR`).catch(() => null),
  ]);

  // Mapa fecha → EUR/USD, ordenado, para buscar «la última conocida».
  let eurByDate = [];
  if (eurData) {
    eurByDate = Object.entries(eurData?.rates ?? {})
      .map(([date, r]) => [date, r?.EUR ?? 0])
      .filter(([, r]) => r > 0)
      .sort((a, b) => (a[0] < b[0] ? -1 : 1));
  }

  const eurPerUsdAt = (date) => {
    let found = 0;
    for (const [d, r] of eurByDate) {
      if (d <= date) found = r;
      else break;
    }
    return found;
  };

  return (Array.isArray(trmData) ? trmData : [])
    .map((row) => {
      const date = String(row?.vigenciadesde ?? '').slice(0, 10);
      // `vigenciahasta` es INCLUSIVO y es lo que hace falta para saber qué tasa
      // rige HOY: la TRM del viernes vale también sábado, domingo y lunes, así
      // que el punto más reciente casi nunca lleva la fecha de hoy. Sin este
      // campo, la app etiquetaba la tasa vigente como «5 de sep.» un día 7 y
      // parecía que faltaban datos.
      const until = String(row?.vigenciahasta ?? '').slice(0, 10) || date;
      const copPerUsd = parseFloat(row?.valor ?? '0');
      if (!date || !(copPerUsd > 0)) return null;
      const eurPerUsd = eurPerUsdAt(date);
      return {
        date,
        until,
        usd: Math.round(copPerUsd),
        ...(eurPerUsd > 0 ? { eur: Math.round(copPerUsd / eurPerUsd) } : {}),
      };
    })
    .filter(Boolean)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}
