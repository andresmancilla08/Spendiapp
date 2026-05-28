export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');

  try {
    const response = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!response.ok) throw new Error(`upstream_${response.status}`);
    const data = await response.json();
    if (data.result !== 'success') throw new Error('api_error');

    const copPerUsd = data.rates?.COP ?? 0;
    const eurPerUsd = data.rates?.EUR ?? 0;
    if (copPerUsd <= 0 || eurPerUsd <= 0) throw new Error('invalid_rates');

    res.status(200).json({
      usd: Math.round(copPerUsd),
      eur: Math.round(copPerUsd / eurPerUsd),
      fetchedAt: Date.now(),
    });
  } catch (e) {
    res.status(500).json({ error: String(e?.message ?? e) });
  }
}
