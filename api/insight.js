// Insight IA proactivo para "Tu mes en una frase".
// Recibe SOLO agregados numéricos + labels de categoría (nunca PII) y devuelve
// { sentence, chip? } via Gemini Flash (tier gratuito de Google AI Studio).
// La API key vive en el server (Vercel env), nunca en el cliente. El cliente
// cachea por mes+hash y cae al template si esto falla.

import { generate, jsonFrom } from './_gemini.js';

const MAX_SENTENCE = 140;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'not_configured' });

  // Validación en el borde: solo aceptamos el shape esperado, todo numérico.
  const a = sanitize(req.body);
  if (!a) return res.status(400).json({ error: 'invalid_body' });

  const out = await generate({
    apiKey,
    label: 'insight',
    system: SYSTEM,
    parts: [{ text: JSON.stringify(derive(a)) }],
    generationConfig: { temperature: 0.6, responseMimeType: 'application/json' },
    timeoutMs: 15000, // el modelo que razona tarda más; si se pasa, cae al -lite del segundo intento
    parse: parseInsight,
    reasoningFirst: true, // proyecta y compara cifras: -lite sacaba conclusiones que se contradicen
  });

  if (!out.ok) return res.status(out.status === 429 ? 429 : 502).json({ error: 'insight_failed', reason: out.reason });
  // 5 min CDN: los agregados de un mes cambian poco entre cargas.
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  return res.status(200).json(out.data);
}

const SYSTEM = `Eres el asistente financiero de Spendia (app de finanzas personales, moneda COP).
Recibes SOLO agregados numéricos del mes del usuario. Devuelve EXCLUSIVAMENTE un JSON válido:
{"sentence": string, "chip": {"label": string, "tone": "pos"|"neg"|"muted"}}

NO calcules nada: las proyecciones vienen ya hechas. Qué es cada cifra:
- "expenses" es lo GASTADO hasta hoy; "projectedExpenses", lo que habrá gastado al cerrar el mes.
- "balance" es lo que le queda hoy (income - expenses); "projectedBalance", lo que le quedará al cierre.
  Si "projectedBalance" es NEGATIVO es un DÉFICIT: se le va a acabar el dinero, jamás lo llames
  "saldo a favor" ni "ahorro". Solo un número positivo es saldo a favor.
- "vsPrevToDatePct" compara el gasto de hoy con el del mes anterior a la misma altura:
  negativo = está gastando menos que el mes pasado (buena señal).
- Llamar "saldo" o "ahorro" a una cifra de gasto es el error más grave que puedes cometer.

Reglas:
- "sentence": UNA frase en español, máx 140 caracteres, proactiva y accionable.
  Prioriza en este orden: proyección de fin de mes (usa dayOfMonth/daysInMonth y el ritmo de gasto),
  sobre-gasto vs mes anterior, categoría dominante, tasa de ahorro. Habla en segunda persona ("vas", "cierras").
- "chip": el MISMO dato del que habla la frase, resumido. No otro.
  Si la frase habla del gasto proyectado, el chip lleva esa cifra; si habla del saldo, la del saldo.
  Nunca den cifras distintas sin decir de qué es cada una.
  tone "pos" si es buena señal (ahorro, gasto a la baja), "neg" si es alerta (déficit,
  gasto al alza), "muted" si es neutro/sin datos.
  "label": MÁXIMO 16 caracteres, se recorta sin piedad. Cifra abreviada y de qué es
  ("gasto $7,2M", "queda $1,8M", "-18% vs mes ant.", "82% ahorrado"); no metas la palabra "proyección".
  "monthLabel" es el mes EN CURSO: no tienes el nombre del anterior, así que al comparar
  escribe "vs mes ant.", nunca el nombre de un mes.
- Nunca inventes cifras que no estén en los datos. Nada de markdown, nada fuera del JSON.
- Si no hay datos suficientes (todo 0 o null), sentence motivacional breve y chip tone "muted".`;

// Las cifras derivadas las hace JS, no el modelo: pedirle la proyección de cierre le
// salía con el signo cambiado y anunciaba "saldo a favor" lo que en realidad era un
// déficit. El modelo solo redacta.
function derive(a) {
  const proyectable = a.dayOfMonth > 0 && a.daysInMonth > 0 && a.expenses > 0;
  const projectedExpenses = proyectable
    ? Math.round((a.expenses / a.dayOfMonth) * a.daysInMonth)
    : null;
  return {
    ...a,
    projectedExpenses,
    projectedBalance: projectedExpenses !== null && a.income > 0 ? a.income - projectedExpenses : null,
    vsPrevToDatePct: a.prevMonthToDateExpenses > 0
      ? Math.round((a.expenses / a.prevMonthToDateExpenses - 1) * 100)
      : null,
  };
}

// Solo campos esperados, coaccionados a número finito o null. Bloquea cualquier extra.
function sanitize(body) {
  let b = body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { return null; } }
  if (!b || typeof b !== 'object') return null;
  const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  const cats = Array.isArray(b.topCategories)
    ? b.topCategories.slice(0, 3).map((c) => ({
        label: String(c?.label ?? '').slice(0, 40),
        amount: num(c?.amount) ?? 0,
      }))
    : [];
  return {
    monthLabel: String(b.monthLabel ?? '').slice(0, 20),
    dayOfMonth: num(b.dayOfMonth),
    daysInMonth: num(b.daysInMonth),
    income: num(b.income) ?? 0,
    expenses: num(b.expenses) ?? 0,
    balance: num(b.balance) ?? 0,
    prevMonthExpenses: num(b.prevMonthExpenses),
    prevMonthToDateExpenses: num(b.prevMonthToDateExpenses),
    savingsRate: num(b.savingsRate),
    topCategories: cats,
  };
}

function parseInsight(text) {
  const obj = jsonFrom(text); // tolerante: objeto pelado o envuelto en prosa
  if (!obj || typeof obj.sentence !== 'string') return null;
  const sentence = obj.sentence.trim().slice(0, MAX_SENTENCE);
  if (!sentence) return null;
  let chip;
  if (obj.chip && typeof obj.chip.label === 'string') {
    const tone = ['pos', 'neg', 'muted'].includes(obj.chip.tone) ? obj.chip.tone : 'muted';
    chip = { label: obj.chip.label.slice(0, 16), tone };
  }
  return { sentence, chip };
}
