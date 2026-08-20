/**
 * Tasa media de tarjeta de crédito POR BANCO y POR PLAZO.
 *
 * Fuente: Superintendencia Financiera vía datos.gov.co, dataset `w9zh-vetq`
 * («Tasas de interés activas por tipo de crédito – Histórico», API Socrata,
 * pública y sin clave).
 *
 * Qué es y qué NO es, porque la UI tiene que decirlo bien:
 *  · ES la tasa efectiva promedio que ese banco reportó para ese producto y ese
 *    plazo en el último corte publicado.
 *  · NO es la tasa del usuario. La suya depende de su producto y su perfil, y
 *    solo él la conoce — por eso la app deja guardarla a mano, y esa manda.
 *  · NO está «al día de hoy»: la SFC publica con varios meses de retraso. Por eso
 *    la fecha del corte viaja con el dato y la UI la muestra.
 *
 * El cliente NO puede consultar esto directo: el corte completo son ~50.000
 * filas. Aquí se pide ya agregado (~26 KB) y se reduce a lo que la app usa.
 *
 * La agregación en Socrata sobre esas 50.000 filas tarda entre 10 y 40 s, así
 * que el timeout es generoso a propósito. No es un problema: con `s-maxage` de
 * un día, esto se ejecuta de verdad una vez cada 24 h y el resto sale del CDN.
 */

/** Entidad de la SFC → id de banco de `config/banks.ts`. */
const ENTITY_TO_BANK = {
  'bancolombia': 'bancolombia',
  'bbva colombia': 'bbva',
  'banco de bogota': 'bogota',
  'av villas': 'avvillas',
  'banco falabella s.a.': 'falabella',
  'banco falabella': 'falabella',
  // DAVIbank es la nueva identidad de Scotiabank Colpatria tras la integración
  // con Davivienda (dic-2025). En el catálogo de la app sigue como `colpatria`.
  'banco davibank': 'colpatria',
  'davibank': 'colpatria',
};

/** Etiqueta de plazo de la SFC → [cuotas mínimas, cuotas máximas]. */
const TERM_BUCKETS = [
  ['consumos a un mes', 1, 1],
  ['consumos entre 2 y 6 meses', 2, 6],
  ['consumos entre 7 y 12 meses', 7, 12],
  ['consumos entre 13 y 18 meses', 13, 18],
  ['consumos entre 19 y 24 meses', 19, 24],
  ['consumos entre 25 y 36 meses', 25, 36],
  ['consumos a mas de 36 meses', 37, 120],
  // «Avances en efectivo» queda fuera: no es una compra a cuotas.
];

const DATASET = 'https://www.datos.gov.co/resource/w9zh-vetq.json';

const norm = (s) =>
  (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  // Un día en el CDN: el dato de origen cambia como mucho una vez al mes.
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');

  try {
    const corte = await latestCorte();
    const rows = await ratesForCorte(corte);

    const banks = {};
    for (const row of rows) {
      const bankId = ENTITY_TO_BANK[norm(row.nombre_entidad)];
      if (!bankId) continue;

      const bucket = TERM_BUCKETS.find(([label]) => norm(row.plazo_de_cr_dito) === label);
      if (!bucket) continue;

      const tea = Number(row.tasa);
      if (!Number.isFinite(tea)) continue;
      // Un 0 % es legítimo SOLO a una cuota (el diferido sin interés). Fuera de
      // ahí, cualquier cosa por debajo de 5 % o por encima de 60 % es ruido del
      // reporte, no una tasa de tarjeta.
      const [, min, max] = bucket;
      const sane = min === 1 ? tea >= 0 && tea <= 60 : tea >= 5 && tea <= 60;
      if (!sane) continue;

      (banks[bankId] = banks[bankId] || []).push({ min, max, tea: Math.round(tea * 100) / 100 });
    }

    for (const id of Object.keys(banks)) banks[id].sort((a, b) => a.min - b.min);
    if (Object.keys(banks).length === 0) throw new Error('no_banks_matched');

    res.status(200).json({
      source: 'sfc',
      corte: corte.slice(0, 10),
      banks,
      fetchedAt: Date.now(),
    });
  } catch (err) {
    // Sin dato es mejor que con dato inventado: la app cae a «—» y a la tasa
    // que el usuario haya guardado a mano.
    res.status(502).json({ error: String((err && err.message) || err) });
  }
}

async function latestCorte() {
  const url = DATASET + '?' + new URLSearchParams({ $select: 'max(fecha_corte)' });
  const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error('corte_' + r.status);
  const [row] = await r.json();
  const corte = row && row.max_fecha_corte;
  if (!corte) throw new Error('corte_vacio');
  return corte;
}

async function ratesForCorte(corte) {
  const url = DATASET + '?' + new URLSearchParams({
    $select: 'nombre_entidad,plazo_de_cr_dito,avg(tasa_efectiva_promedio) as tasa',
    $where: "fecha_corte='" + corte + "' and tipo_de_persona='Natural' and starts_with(producto_de_cr_dito,'Tarjeta')",
    $group: 'nombre_entidad,plazo_de_cr_dito',
    $limit: '1000',
  });
  const r = await fetch(url, { signal: AbortSignal.timeout(45000) });
  if (!r.ok) throw new Error('rates_' + r.status);
  return r.json();
}
