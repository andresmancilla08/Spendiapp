#!/usr/bin/env python3
"""
v4 — la versión que va al código, con los tres ajustes pedidos:

  1. Se queda la ficha héroe con la BARRA FINA al borde inferior (refinamiento 5B).
  2. FUERA DM Mono: toda cifra en Montserrat con `fontVariant: ['tabular-nums']`,
     que es lo que la app usa de verdad (DM Mono está cargada en _layout pero no
     se usa en ningún componente — verificado con grep).
  3. Los casos sin cuotas ya no quedan vacíos: se rellenan con módulos de datos
     REALES, calculables con las transacciones del mes que la vista ya recibe:
        · CONTEXTO      — la frase con el dato comparativo
        · CATEGORÍA     — cuánto llevas en esa categoría este mes, con barra
        · OTROS         — los otros movimientos de la misma categoría (tocables)
        · PLAN/HISTORIAL— las 12 cuotas o los meses que lleva el fijo, en chips
"""
import pathlib

OUT = pathlib.Path(__file__).parent

CSS = """
.dark{
  --bg:#0D1A1C; --grad1:#0D1A1C; --grad2:#062830; --grad3:#003840;
  --surface:#162428; --surfaceEl:#1E3035;
  --primary:#00BCD4; --primaryInk:#00BCD4; --pillBg:#053a42; --pillInk:#4DD8E8;
  --secondary:#00A896; --tertiary:#D4E157;
  --expInk:#FF8E8E; --incInk:#31D0B4; --err:#F87171; --neutral:#93A6AB;
  --tP:#EEF6F8; --tS:#9EABAF; --tT:#93A6AB; --noteInk:#9EABAF;
  --border:#243438; --hair:#223236; --track:#123037;
  --ctaInk:#04191C; --dangerInk:#04191C; --lockBg:#0c272b; --chipOff:#1A2C30;
}
.light{
  --bg:#FFFFFF; --grad1:#FFFFFF; --grad2:#F5F9FA; --grad3:#E0F7FA;
  --surface:#FFFFFF; --surfaceEl:#F5F9FA;
  --primary:#00ACC1; --primaryInk:#006978; --pillBg:#E0F7FA; --pillInk:#006978;
  --secondary:#00897B; --tertiary:#C0CA33;
  --expInk:#C62828; --incInk:#00705F; --err:#D92D2D; --neutral:#5F6A6E;
  --tP:#1A2428; --tS:#6B7280; --tT:#6B7280; --noteInk:#5F6A6E;
  --border:#DDE8EA; --hair:#E6EEF0; --track:#D6EEF2;
  --ctaInk:#04191C; --dangerInk:#FFFFFF; --lockBg:#EAF7F9; --chipOff:#EEF4F5;
}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Montserrat',system-ui,sans-serif;background:#0a0f10;color:#e8eef0;
  padding:34px 28px 70px;-webkit-font-smoothing:antialiased}
h1{font-size:25px;font-weight:800;letter-spacing:-.6px}
h2{font-size:18px;font-weight:800;margin:0 0 5px}
h3{font-size:14.5px;font-weight:700}
.sub{color:#8b9a9e;font-size:13px;line-height:1.6;max-width:960px;margin-top:8px}
.thesis{color:#00BCD4;font-size:11.5px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:6px}
.meta{color:#7d8c90;font-size:12.5px;line-height:1.7;max-width:960px}
.meta b{color:#c9d6d9;font-weight:600}
.keep{margin-top:14px;padding:12px 14px;border-left:3px solid #00BCD4;background:#0f1a1c;
  border-radius:0 10px 10px 0;font-size:12px;color:#93a4a8;line-height:1.65;max-width:960px}
.keep b{color:#dbe6e8}
.row{display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start;margin-top:18px}
.cap{font-size:11px;color:#6c7b7f;font-weight:600;letter-spacing:.6px;text-transform:uppercase;margin-bottom:8px}
.topnav{position:sticky;top:0;z-index:50;background:rgba(10,15,16,.94);backdrop-filter:blur(12px);
  margin:-34px -28px 24px;padding:15px 28px;border-bottom:1px solid #1d2729;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.topnav a{padding:8px 12px;border-radius:50px;font-size:11.5px;font-weight:700;text-decoration:none;
  background:#141d1f;color:#9fb0b4;border:1px solid #223033;white-space:nowrap}
.topnav a:hover{border-color:#00BCD4;color:#dbe6e8}
.topnav .lg{font-size:12px;font-weight:800;color:#00BCD4;margin-right:6px}
section{scroll-margin-top:78px}
.block{margin:46px 0 0;border-top:1px solid #1d2729;padding-top:22px}
.case{margin-top:34px}
.caseh{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.flags{font-size:11px;color:#00BCD4;background:#0f1a1c;border:1px solid #1e2a2d;
  padding:3px 8px;border-radius:6px;font-variant-numeric:tabular-nums}
.note-txt{font-size:12px;color:#7d8c90;line-height:1.6;margin-top:6px;max-width:860px}
.note-txt b{color:#c9d6d9}

/* ── marco ───────────────────────────────────────────────────────────────── */
.frame{width:390px;height:844px;border-radius:38px;overflow:hidden;position:relative;
  background:linear-gradient(160deg,var(--grad1),var(--grad2) 55%,var(--grad3));
  color:var(--tP);font-size:14px;box-shadow:0 18px 50px rgba(0,0,0,.5);display:flex;flex-direction:column}
.frame.dark::before{content:'';position:absolute;inset:0;background:rgba(0,0,0,.7);pointer-events:none}
.frame > *{position:relative;z-index:1}
.statusbar{height:44px;display:flex;align-items:flex-end;justify-content:space-between;
  padding:0 22px 4px;font-size:12px;font-weight:700;opacity:.9;flex:0 0 auto}
.appbar{height:52px;display:flex;align-items:center;gap:10px;padding:0 16px;flex:0 0 auto}
.iconbtn{width:36px;height:36px;border-radius:18px;display:grid;place-items:center;
  background:color-mix(in srgb,var(--primary) 12%,transparent);color:var(--primaryInk);font-size:17px;font-weight:700}
.appbar .ttl{font-size:11px;font-weight:700;letter-spacing:1.6px;color:var(--tT)}
.body{flex:1 1 auto;overflow:hidden;padding:0 20px}
.ctabar{flex:0 0 auto;padding:15px 15px 35px;border-top:1px solid var(--hair);
  background:color-mix(in srgb,var(--bg) 80%,transparent);backdrop-filter:blur(14px)}
.ctarow{display:flex;gap:10px;align-items:center}
.btn{height:52px;border-radius:50px;display:flex;align-items:center;justify-content:center;gap:8px;
  font-size:14px;font-weight:700;flex:1;text-align:center}
.btn-primary{background:var(--primary);color:var(--ctaInk)}
.btn-secondary{background:var(--surface);border:1.5px solid var(--primary);color:var(--primaryInk)}
.btn-danger{background:var(--err);color:var(--dangerInk)}
.btn-ghost{background:var(--surface);border:1.5px solid var(--border);color:var(--tS)}
.btn-icon{width:52px;height:52px;flex:0 0 52px;border-radius:26px;color:var(--err);display:grid;
  place-items:center;font-size:19px;background:color-mix(in srgb,var(--err) 14%,transparent)}
.lockbox{border-radius:16px;padding:15px;background:var(--lockBg);display:flex;gap:10px;align-items:center}
.lockbox span{font-size:12px;font-weight:600;color:var(--primaryInk);line-height:1.45}

/* CIFRAS: Montserrat con tabular-nums (lo que ya usa la app). Cero DM Mono. */
.num{font-variant-numeric:tabular-nums;letter-spacing:-.2px}

/* ── sello (pieza aprobada) ──────────────────────────────────────────────── */
.stamp{border:2px solid var(--stampInk,var(--expInk));color:var(--stampInk,var(--expInk));border-radius:8px;
  padding:5px 9px;font-size:10.5px;font-weight:800;letter-spacing:.9px;line-height:1.2;text-align:center;
  transform:rotate(-9deg);display:inline-block}
.stampwrap{position:absolute;right:-4px;top:-16px;z-index:3}

/* ── ficha héroe con barra al borde (refinamiento 5B) ────────────────────── */
.herowrap{position:relative;margin-top:22px}
.hero{border-radius:20px;border:1px solid var(--border);background:var(--surfaceEl);
  padding:18px 16px 0;position:relative;overflow:hidden}
.hero.novis{padding-bottom:16px}
.kick{display:flex;align-items:center;gap:7px;font-size:10px;font-weight:700;letter-spacing:1.6px;
  text-transform:uppercase;color:var(--acc)}
.kick i{width:6px;height:6px;border-radius:3px;background:var(--acc)}
.amount{font-weight:800;letter-spacing:-1.8px;line-height:1;color:var(--acc);font-size:40px;margin-top:12px;
  font-variant-numeric:tabular-nums}
.subline{font-size:12.5px;color:var(--tS);margin-top:8px;line-height:1.45}
.subline b{color:var(--tP);font-weight:700}
.figs{display:flex;justify-content:space-between;gap:10px;margin-top:15px;padding:14px 0 16px;
  border-top:1px solid var(--hair)}
.figs .lbl{font-size:9px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:var(--tT)}
.figs .fv{font-size:14px;font-weight:700;margin-top:4px;font-variant-numeric:tabular-nums;letter-spacing:-.3px}
.progline{position:absolute;left:0;right:0;bottom:0;height:3px;background:var(--track)}
.progline i{display:block;height:3px;background:var(--primary)}

/* ── teselas ─────────────────────────────────────────────────────────────── */
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(0,1fr));gap:8px;margin-top:12px}
.tile{border-radius:16px;padding:12px;background:var(--surfaceEl);border:1px solid var(--border);min-width:0}
.tile .lbl{font-size:9px;font-weight:700;letter-spacing:1.3px;text-transform:uppercase;color:var(--tT)}
.tile .big{font-size:21px;font-weight:800;letter-spacing:-.8px;margin-top:5px;line-height:1;font-variant-numeric:tabular-nums}
.tile .ic{font-size:18px;margin-top:4px}
.tile .s{font-size:10px;color:var(--tS);margin-top:3px;line-height:1.35}
.minicard{height:26px;border-radius:6px;margin-top:5px;background:linear-gradient(120deg,var(--primary),var(--secondary))}

/* ── módulos anchos ──────────────────────────────────────────────────────── */
.wide{border-radius:18px;padding:14px;background:var(--surfaceEl);border:1px solid var(--border);margin-top:10px}
.wide .lbl{font-size:9.5px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--tT)}
.wide .txt{font-size:12.5px;line-height:1.55;color:var(--tS);margin-top:7px}
.wide .txt b{color:var(--tP);font-weight:700}
.avrow{display:flex;align-items:center;margin-top:9px}
.av{width:26px;height:26px;border-radius:13px;display:grid;place-items:center;font-size:11px;font-weight:700;
  color:#04191c;background:var(--primary);margin-left:-8px;border:2px solid var(--surfaceEl)}
.av:first-child{margin-left:0}
.avnames{margin-left:10px;font-size:12px;font-weight:600;min-width:0}
.pill{display:inline-flex;align-items:center;gap:5px;margin-top:9px;padding:5px 11px;border-radius:50px;
  background:var(--pillBg);color:var(--pillInk);font-size:11px;font-weight:700;font-variant-numeric:tabular-nums}
.desc{font-size:17px;font-weight:700;margin:16px 0 0}
.notecard{border-radius:18px;padding:13px 15px;margin-top:10px;
  border:1px solid color-mix(in srgb,var(--tertiary) 30%,transparent);
  background:color-mix(in srgb,var(--tertiary) 9%,transparent)}
.notecard .lbl{font-size:9.5px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--noteInk)}
.notecard p{font-size:12.5px;line-height:1.5;color:var(--noteInk);margin-top:6px}

/* barra de categoría */
.catbar{height:8px;border-radius:4px;background:var(--track);margin-top:10px;overflow:hidden}
.catbar i{display:block;height:8px;background:var(--acc2,var(--primary))}
.catrow{display:flex;justify-content:space-between;align-items:baseline;margin-top:8px}
.catrow .a{font-size:14px;font-weight:800;font-variant-numeric:tabular-nums;letter-spacing:-.3px}
.catrow .b{font-size:11px;color:var(--tS);font-variant-numeric:tabular-nums}

/* lista de otros movimientos */
.mv{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--hair)}
.mv:last-child{border-bottom:none;padding-bottom:2px}
.mv .ico{width:30px;height:30px;border-radius:10px;flex:0 0 30px;display:grid;place-items:center;font-size:15px;
  background:color-mix(in srgb,var(--acc) 12%,transparent)}
.mv .t{flex:1;min-width:0;font-size:12.5px;font-weight:600}
.mv .t span{display:block;font-size:10.5px;color:var(--tS);font-weight:500;margin-top:1px}
.mv .a{font-size:12.5px;font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:-.2px}
.seeall{display:block;text-align:center;font-size:11.5px;font-weight:700;color:var(--primaryInk);margin-top:11px}

/* chips de plan / historial */
.chips{display:flex;flex-wrap:wrap;gap:5px;margin-top:10px}
.chip{padding:5px 8px;border-radius:8px;background:var(--chipOff);color:var(--tS);font-size:10px;font-weight:700;
  letter-spacing:.3px}
.chip.on{background:color-mix(in srgb,var(--primary) 22%,transparent);color:var(--primaryInk)}
.chip.now{background:var(--primary);color:var(--ctaInk)}

/* ── estados del borrado ─────────────────────────────────────────────────── */
.scopewrap{border-radius:16px;padding:14px;background:var(--surfaceEl);border:1px solid var(--border)}
.scopeh{font-size:13px;font-weight:700;margin-bottom:10px}
.scopeopt{display:flex;gap:10px;align-items:flex-start;border:1.5px solid var(--border);border-radius:14px;
  padding:12px;margin-bottom:8px;background:var(--surface)}
.scopeopt.on{border-color:var(--primary);background:color-mix(in srgb,var(--primary) 8%,transparent)}
.radio{width:20px;height:20px;border-radius:10px;border:2px solid var(--tT);flex:0 0 20px;display:grid;
  place-items:center;margin-top:1px}
.scopeopt.on .radio{border-color:var(--primary)}
.radio i{width:9px;height:9px;border-radius:5px;background:var(--primary);display:none}
.scopeopt.on .radio i{display:block}
.scopeopt .t{font-size:13px;font-weight:700}
.scopeopt .d{font-size:11px;color:var(--tS);margin-top:2px;line-height:1.4}
.confirm{border-radius:16px;padding:16px;background:color-mix(in srgb,var(--err) 12%,transparent);
  border:1px solid color-mix(in srgb,var(--err) 32%,transparent)}
.confirm p{font-size:13px;font-weight:600;color:var(--err);line-height:1.5;text-align:center}
"""

EXP, INC, NEU = 'var(--expInk)', 'var(--incInk)', 'var(--neutral)'

# ══════════════════════════════ piezas ═══════════════════════════════════════

def stamp(txt, ink=EXP):
    return f'<div class="stampwrap"><div class="stamp" style="--stampInk:{ink}">{txt}</div></div>' if txt else ''

def hero(acc, kicker, amount, subline, figs=None, prog=None, stamphtml=''):
    novis = '' if figs else ' novis'
    out = [f'<div class="herowrap">{stamphtml}<div class="hero{novis}" style="--acc:{acc}">',
           f'<div class="kick"><i></i>{kicker}</div>',
           f'<div class="amount">{amount}</div>',
           f'<div class="subline">{subline}</div>']
    if figs:
        out.append('<div class="figs">' + ''.join(
            f'<div><div class="lbl">{l}</div><div class="fv">{v}</div></div>' for l, v in figs) + '</div>')
    if prog is not None:
        out.append(f'<div class="progline"><i style="width:{prog}%"></i></div>')
    out.append('</div></div>')
    return ''.join(out)

def tiles(items):
    return '<div class="tiles">' + ''.join(items) + '</div>'

def t_fecha(day='22', rest='jul 2026 · 19:42'):
    return f'<div class="tile"><div class="lbl">Fecha</div><div class="big">{day}</div><div class="s">{rest}</div></div>'

def t_cat(icon='🍽️', name='Comida', s='18% del mes'):
    return f'<div class="tile"><div class="lbl">Categoría</div><div class="ic">{icon}</div><div class="s">{name} · {s}</div></div>'

def t_card(bank='Bancolombia', kind='créd.'):
    return f'<div class="tile"><div class="lbl">Tarjeta</div><div class="minicard"></div><div class="s">{bank} · {kind}</div></div>'

def t_plain(lbl, val, s=''):
    return (f'<div class="tile"><div class="lbl">{lbl}</div>'
            f'<div style="font-size:14px;font-weight:700;margin-top:6px">{val}</div>'
            + (f'<div class="s">{s}</div>' if s else '') + '</div>')

def w_context(txt):
    return f'<div class="wide"><div class="lbl">Contexto</div><div class="txt">{txt}</div></div>'

def w_catbar(label, amount, pct, rest, acc='var(--primary)'):
    return (f'<div class="wide" style="--acc2:{acc}"><div class="lbl">{label}</div>'
            f'<div class="catbar"><i style="width:{pct}%"></i></div>'
            f'<div class="catrow"><div class="a">{amount}</div><div class="b">{rest}</div></div></div>')

def w_movs(label, acc, rows, seeall=None):
    body = ''.join(
        f'<div class="mv"><div class="ico">{i}</div><div class="t">{t}<span>{d}</span></div>'
        f'<div class="a">{a}</div></div>' for i, t, d, a in rows)
    tail = f'<div class="seeall">{seeall}</div>' if seeall else ''
    return f'<div class="wide" style="--acc:{acc}"><div class="lbl">{label}</div>{body}{tail}</div>'

def w_chips(label, chips, foot=None):
    c = ''.join(f'<div class="chip {cls}">{txt}</div>' for txt, cls in chips)
    f = f'<div class="txt" style="margin-top:10px">{foot}</div>' if foot else ''
    return f'<div class="wide"><div class="lbl">{label}</div><div class="chips">{c}</div>{f}</div>'

def w_people(lbl, names, pill, avs=(('A', 'var(--primary)'), ('L', 'var(--secondary)'), ('D', 'var(--tertiary)'))):
    av = ''.join(f'<div class="av" style="background:{c};{"color:#fff" if c=="var(--secondary)" else ""}">{n}</div>'
                 for n, c in avs)
    return (f'<div class="wide"><div class="lbl">{lbl}</div>'
            f'<div class="avrow">{av}<div class="avnames">{names}</div></div>'
            f'<div class="pill">{pill}</div></div>')

NOTE = ('<div class="notecard"><div class="lbl">Nota</div>'
        '<p>Incluye el mercado de la casa y los productos de aseo del mes.</p></div>')

def cta(kind):
    if kind == 'normal':
        return ('<div class="ctarow"><div class="btn btn-primary">✎ Editar</div>'
                '<div class="btn btn-secondary">⧉ Duplicar</div><div class="btn-icon">🗑</div></div>')
    if kind == 'fijo':
        return ('<div class="ctarow"><div class="btn btn-primary">✎ Editar</div>'
                '<div class="btn btn-secondary">⧉ Duplicar</div><div class="btn-icon">⊘</div></div>')
    if kind == 'pedir':
        return '<div class="ctarow"><div class="btn btn-secondary">✉ Pedir que lo borren</div></div>'
    if kind == 'locked':
        return '<div class="lockbox">🔒<span>Este movimiento ya ocurrió y no puede modificarse.</span></div>'
    return ''

def frame(mode, body, cta_html):
    return (f'<div class="frame {mode}">'
            f'<div class="statusbar"><span>10:08</span><span>▮▮▮ ᯤ 84</span></div>'
            f'<div class="appbar"><div class="iconbtn">‹</div><div class="ttl">MOVIMIENTO</div></div>'
            f'<div class="body">{body}</div><div class="ctabar">{cta_html}</div></div>')

def pair(body, cta_html, tag=''):
    return '<div class="row">' + ''.join(
        f'<div><div class="cap">{tag}{m}</div>{frame(m, body, cta_html)}</div>'
        for m in ('dark', 'light')) + '</div>'

# ═══════════════════════════ los 13 casos ════════════════════════════════════

CASES = []
def case(title, flags, why, body, cta_kind):
    CASES.append(dict(title=title, flags=flags, why=why, body=body, cta=cta_kind))

# 1 · gasto simple
case('Gasto simple', "type:'expense' · cardId",
     'Sin cuotas no hay sello, ni pie de cifras, ni barra. El vacío que quedaba se llena con tres módulos '
     'de datos <b>reales</b>: el contexto, cuánto llevas en la categoría este mes y los otros gastos de esa '
     'misma categoría — cada fila abre su propio detalle.',
     hero(EXP, 'Gasto · Comida', '−$54.300', 'martes, 22 de julio de 2026 · 19:42')
     + '<div class="desc">Almuerzo con el equipo</div>'
     + tiles([t_fecha(), t_cat(s='11% del mes'), t_card()])
     + w_catbar('Comida en julio', '$212.400', 18, 'de $1.180.000 · 18%', 'var(--expInk)')
     + w_movs('Otros gastos de Comida en julio', EXP, [
         ('🍽️', 'Mercado del mes', '22 jul · Bancolombia', '−$82.967'),
         ('🍽️', 'Cena con Laura', '15 jul · Nequi', '−$48.200'),
         ('🍽️', 'Domicilio sushi', '8 jul · Bancolombia', '−$26.900')], 'Ver los 6 →')
     + NOTE, 'normal')

# 2 · gasto mínimo
case('Gasto mínimo (sin tarjeta, sin nota)', "type:'expense'",
     'El caso más pobre en datos: dos teselas en vez de tres y ninguna ficha de gente. Aun así la pantalla '
     'queda llena, porque lo que la llena no es el movimiento sino <b>su lugar en tu mes</b>.',
     hero(EXP, 'Gasto · Transporte', '−$8.500', 'lunes, 21 de julio de 2026 · 07:15')
     + '<div class="desc">Taxi al aeropuerto</div>'
     + tiles([t_fecha(day='21', rest='jul 2026 · 07:15'), t_cat('🚗', 'Transporte', '3% del mes')])
     + w_context('Es tu <b>2.º gasto de Transporte</b> en julio y el <b>más barato</b> de los dos.')
     + w_catbar('Transporte en julio', '$38.500', 3, 'de $1.180.000 · 3%', 'var(--expInk)')
     + w_movs('Otros gastos de Transporte en julio', EXP, [
         ('🚗', 'Gasolina', '9 jul · Bancolombia', '−$30.000')], 'Ver la categoría →'), 'normal')

# 3 · a cuotas
case('Compra a cuotas', 'isInstallment · installmentNumber/Total',
     'Aquí la ficha héroe se despliega: sello, pie de tres cifras y la <b>barra fina al borde</b>. Debajo, '
     'el plan completo en chips — los meses pagados, el actual y los que faltan.',
     hero(EXP, 'Gasto · Compras', '−$149.900', 'Cuota <b>4 de 6</b> · lunes, 14 de julio de 2026',
          figs=[('Pagado', '$599.600'), ('Resta', '$299.800'), ('Próxima', '14 ago')],
          prog=66, stamphtml=stamp('CUOTA<br>4 / 6'))
     + '<div class="desc">Silla de escritorio</div>'
     + tiles([t_fecha(day='14', rest='jul 2026 · 11:02'), t_cat('🛍️', 'Compras', '19% del mes'), t_card()])
     + w_chips('Plan de cuotas', [('ABR', 'on'), ('MAY', 'on'), ('JUN', 'on'), ('JUL', 'now'),
                                  ('AGO', ''), ('SEP', '')],
               'Cuatro pagadas, dos por pagar. Termina en <b>septiembre de 2026</b>.')
     + w_catbar('Compras en julio', '$224.850', 19, 'de $1.180.000 · 19%', 'var(--expInk)'), 'normal')

# 4 · fijo
case('Gasto fijo mensual', 'isFixed (· isVirtualFixed en otros meses)',
     'El sello cambia de texto, nunca de forma. El pie cuenta la vida del fijo y los chips, su historial mes '
     'a mes: de un vistazo se ve si algún mes se saltó.',
     hero(EXP, 'Gasto fijo · Hogar', '−$120.000', 'miércoles, 1 de julio de 2026 · se repite cada mes',
          figs=[('Desde', 'ene 2026'), ('Meses', '7'), ('Próxima', '1 ago')],
          stamphtml=stamp('FIJO<br>MENSUAL', 'var(--primaryInk)'))
     + '<div class="desc">Arriendo del apartamento</div>'
     + tiles([t_fecha(day='1', rest='jul 2026'), t_cat('🏡', 'Hogar', '26% del mes'), t_plain('Repite', 'Cada mes', 'día 1')])
     + w_chips('Historial del fijo', [('ENE', 'on'), ('FEB', 'on'), ('MAR', 'on'), ('ABR', 'on'),
                                      ('MAY', 'on'), ('JUN', 'on'), ('JUL', 'now')],
               'Siete meses seguidos · <b>$840.000</b> en total.')
     + w_context('Es tu gasto fijo <b>más grande</b>: el <b>26%</b> de todo lo que gastas en el mes.'), 'fijo')

# 5 · fijo de mes cerrado
case('Gasto fijo de un mes cerrado', 'isFixed · isPastMonth',
     'Mismo layout; el sello se vuelve neutro y la botonera entera se sustituye por el aviso de bloqueo, que '
     'ocupa el ancho completo en vez de esconderse en una línea de 12px.',
     hero(NEU, 'Gasto fijo · Hogar', '−$120.000', 'domingo, 1 de marzo de 2026 · mes cerrado',
          figs=[('Desde', 'ene 2026'), ('Meses', '7'), ('Estado', 'Cerrado')],
          stamphtml=stamp('MES<br>CERRADO', 'var(--neutral)'))
     + '<div class="desc">Arriendo del apartamento</div>'
     + tiles([t_fecha(day='1', rest='mar 2026'), t_cat('🏡', 'Hogar', '25% de marzo'), t_plain('Repite', 'Cada mes', 'día 1')])
     + w_chips('Historial del fijo', [('ENE', 'on'), ('FEB', 'on'), ('MAR', 'now'), ('ABR', 'on'),
                                      ('MAY', 'on'), ('JUN', 'on'), ('JUL', 'on')],
               'Marzo ya está cerrado: se muestra como registro, no se puede tocar.'), 'locked')

# 6 · compartido, dueño
case('Gasto compartido — eres el dueño', "isShared · sharedType:'expense_share' · owner",
     'La cifra héroe es TU parte; la línea de apoyo dice de cuánto sale. La ficha de gente explica el reparto '
     'sin abrir nada, y el contexto aclara qué entra en tu balance.',
     hero(EXP, 'Gasto compartido', '−$82.967', 'tu parte de <b>$248.900</b> · entre 3 personas',
          stamphtml=stamp('ENTRE<br>3', 'var(--primaryInk)'))
     + '<div class="desc">Mercado del mes</div>'
     + tiles([t_fecha(), t_cat(), t_card()])
     + w_people('Compartido con', 'Tú, Laura M. y Diego R.', 'A partes iguales · $82.967 c/u')
     + w_context('En tu balance de julio entran <b>$82.967</b>, no los $248.900: lo demás es de Laura y Diego.')
     + NOTE, 'normal')

# 7 · compartido, invitado
case('Gasto compartido — te lo compartieron', 'isShared · NO owner',
     'No puedes editar ni duplicar lo que no es tuyo: una sola acción, pedirle al dueño que lo borre. La '
     'tesela de «creado por» sustituye a la de tarjeta, que aquí no te pertenece.',
     hero(EXP, 'Gasto compartido', '−$82.967', 'tu parte de <b>$248.900</b> · lo creó Laura M.',
          stamphtml=stamp('DE<br>LAURA', 'var(--primaryInk)'))
     + '<div class="desc">Mercado del mes</div>'
     + tiles([t_fecha(), t_cat(), t_plain('Creado por', 'Laura M.', 'Tú participas')])
     + w_people('Compartido por', 'Laura M. · contigo y Diego R.', 'A partes iguales · $82.967 c/u',
                avs=(('L', 'var(--secondary)'), ('A', 'var(--primary)'), ('D', 'var(--tertiary)')))
     + w_context('Solo Laura puede editarlo o borrarlo. Si le pides que lo borre, le llega una notificación.')
     + NOTE, 'pedir')

# 8 · compartido + cuotas
case('Compartido Y a cuotas (el más denso)', 'isShared · isInstallment',
     'Los dos estados a la vez: sello con la cuota, pie de tres cifras, barra al borde y ficha de reparto. '
     'Es el techo de densidad y entra sin scroll.',
     hero(EXP, 'Gasto compartido', '−$82.967', 'tu parte de <b>$248.900</b> · entre 3 personas',
          figs=[('Pagado', '$248.901'), ('Resta', '$746.700'), ('Próxima', '22 ago')],
          prog=25, stamphtml=stamp('CUOTA<br>3 / 12'))
     + '<div class="desc">Mercado del mes</div>'
     + tiles([t_fecha(), t_cat(), t_card()])
     + w_people('Compartido con', 'Tú, Laura M. y Diego R.', 'A partes iguales · $82.967 c/u')
     + NOTE, 'normal')

# 9 · te deben
case('Cobro compartido — te deben', "sharedType:'income_claim' · owner",
     'No es un gasto: es plata que va a entrar. Acento de ingreso, sello «TE DEBEN» y la ficha de gente '
     'convertida en quién debe cuánto y si ya pagó.',
     hero(INC, 'Te deben', '+$120.000', 'tu parte a cobrar de <b>$180.000</b> · entre 2 personas',
          stamphtml=stamp('TE<br>DEBEN', 'var(--incInk)'))
     + '<div class="desc">Cena de cumpleaños</div>'
     + tiles([t_fecha(day='18', rest='jul 2026 · 21:30'), t_cat('🎉', 'Ocio', 'no es gasto')])
     + w_people('Te deben', 'Laura M. y Diego R.', '$60.000 cada uno · sin pagar',
                avs=(('L', 'var(--secondary)'), ('D', 'var(--tertiary)')))
     + w_context('Cuando te paguen, tu balance de julio sube a <b>+$1.126.000</b>.')
     + w_movs('Otros cobros abiertos', INC, [
         ('🎉', 'Regalo de Ana', '2 jul · te debe Diego', '+$40.000')], 'Ver todos los cobros →'), 'normal')

# 10 · le debes
case('Cobro compartido — le debes', "sharedType:'income_claim' · NO owner",
     'El espejo del anterior y el que más se equivocaba antes: para ti es un egreso aunque el dueño lo creó '
     'como cobro. Acento de gasto, sello «LE DEBES» y una sola acción.',
     hero(EXP, 'Le debes a Laura M.', '−$60.000', 'tu parte de <b>$180.000</b> · lo creó Laura M.',
          stamphtml=stamp('LE<br>DEBES', 'var(--expInk)'))
     + '<div class="desc">Cena de cumpleaños</div>'
     + tiles([t_fecha(day='18', rest='jul 2026 · 21:30'), t_cat('🎉', 'Ocio', '8% del mes')])
     + w_people('Le debes a', 'Laura M. · contigo y Diego R.', '$60.000 · pendiente de pago',
                avs=(('L', 'var(--secondary)'), ('A', 'var(--primary)'), ('D', 'var(--tertiary)')))
     + w_context('Ya cuenta como gasto en tu julio. Cuando le pagues, márcalo desde el reporte con Laura.')
     + w_catbar('Ocio en julio', '$94.500', 8, 'de $1.180.000 · 8%', 'var(--expInk)'), 'pedir')

# 11 · ingreso
case('Ingreso', "type:'income'",
     'La misma ficha en acento de ingreso y signo +. Sin sello, porque un ingreso normal no tiene estado que '
     'contar. Lo que llena la pantalla es el efecto del ingreso sobre el mes.',
     hero(INC, 'Ingreso · Salario', '+$4.200.000', 'jueves, 30 de julio de 2026')
     + '<div class="desc">Salario de julio</div>'
     + tiles([t_fecha(day='30', rest='jul 2026'), t_cat('💰', 'Salario', '87% de ingresos')])
     + w_catbar('Ingresos de julio', '$4.830.000', 87, 'este ingreso es el 87%', 'var(--incInk)')
     + w_context('Con este ingreso tu balance de julio queda en <b>+$1.006.000</b> y tu tasa de ahorro '
                 'en <b>24%</b>.')
     + w_movs('Otros ingresos de julio', INC, [
         ('📌', 'Freelance diseño', '12 jul', '+$430.000'),
         ('🎁', 'Parte del viaje', '20 jul · de Diego R.', '+$200.000')], 'Ver el historial →'), 'normal')

# 12 · ingreso recibido
case('Ingreso que te envió un amigo', 'isSentIncome · sentByName',
     'Lo creó otra persona, así que no lo editas: una sola acción. El sello dice «RECIBIDO» y la ficha de '
     'persona sustituye a la de compartido.',
     hero(INC, 'Ingreso recibido', '+$300.000', 'te lo envió <b>Diego R.</b> el 20 de julio de 2026',
          stamphtml=stamp('RECIBIDO', 'var(--incInk)'))
     + '<div class="desc">Parte del viaje</div>'
     + tiles([t_fecha(day='20', rest='jul 2026 · 16:40'), t_cat('📌', 'Otro', '6% de ingresos')])
     + w_people('Enviado por', 'Diego R.', 'Ya entró en tu balance de julio', avs=(('D', 'var(--tertiary)'),))
     + w_context('Lo registró Diego desde su cuenta. Si crees que está mal, pídele que lo borre: le llega '
                 'una notificación.')
     + w_movs('Otros movimientos con Diego R.', INC, [
         ('🎉', 'Cena de cumpleaños', '18 jul · te debe', '+$60.000')], 'Ver el reporte con Diego →'), 'pedir')

# 13 · envío a un amigo
case('Dinero que le enviaste a un amigo', 'sentIncomeTransactionId · sentIncomeToName',
     'Para ti es un gasto y para el otro un ingreso: el sello dice «ENVIADO» y el contexto avisa de que '
     'borrarlo también le toca el balance a la otra persona.',
     hero(EXP, 'Envío a un amigo', '−$300.000', 'se lo enviaste a <b>Diego R.</b> el 20 de julio de 2026',
          stamphtml=stamp('ENVIADO', 'var(--expInk)'))
     + '<div class="desc">Parte del viaje</div>'
     + tiles([t_fecha(day='20', rest='jul 2026 · 16:40'), t_cat('📌', 'Otro', '4% del mes'), t_card(kind='déb.')])
     + w_people('Enviado a', 'Diego R.', 'Entró en su balance de julio', avs=(('D', 'var(--tertiary)'),))
     + w_context('Si lo borras, también desaparece el ingreso de Diego y le llega una notificación.')
     + w_movs('Otros movimientos con Diego R.', EXP, [
         ('🎉', 'Cena de cumpleaños', '18 jul · te debe', '+$60.000')], 'Ver el reporte con Diego →'), 'normal')

# ═════════════════════════ estados del borrado ═══════════════════════════════

SCOPE = ('<div class="scopewrap"><div class="scopeh">¿Qué movimientos quieres borrar?</div>'
         '<div class="scopeopt"><div class="radio"><i></i></div><div><div class="t">Solo este mes</div>'
         '<div class="d">Julio no lo cuenta; los demás meses siguen igual.</div></div></div>'
         '<div class="scopeopt on"><div class="radio"><i></i></div><div><div class="t">Desde este mes</div>'
         '<div class="d">Se cancela de julio en adelante; el historial anterior no se toca.</div></div></div>'
         '<div class="scopeopt"><div class="radio"><i></i></div><div><div class="t">Todos</div>'
         '<div class="d">Desaparece de todos los meses, incluidos los pasados.</div></div></div>'
         '<div class="ctarow" style="margin-top:12px"><div class="btn btn-danger">Continuar</div>'
         '<div class="btn btn-ghost">Cancelar</div></div></div>')

CONFIRM = ('<div class="confirm"><p>Esto cancelará el gasto fijo de julio en adelante.<br>No se puede deshacer.</p>'
           '<div class="ctarow" style="margin-top:14px"><div class="btn btn-danger">Sí, cancelar</div>'
           '<div class="btn btn-ghost">Volver</div></div></div>')

# ══════════════════════════════ documento ════════════════════════════════════

HEAD = """<!doctype html>
<html lang="es"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Spendia · Detalle v4 — Montserrat y sin huecos</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>%s</style></head><body>"""

nav = ('<div class="topnav"><span class="lg">V4</span>'
       '<a href="#tipos">Los 13 tipos</a><a href="#estados">Estados del borrado</a></div>')

doc = [HEAD % CSS, nav,
  '<h1>Spendia · Detalle de transacción — v4</h1>',
  '<p class="sub">Los tres ajustes que pediste: se queda la <b>barra fina al borde</b> de la ficha héroe, '
  '<b>fuera DM Mono</b> (todas las cifras en Montserrat con numeración tabular, que es lo que la app usa de '
  'verdad — DM Mono está cargada pero no se usa en ningún componente), y los casos sin cuotas <b>ya no se '
  'ven vacíos</b>.</p>',
  '<div class="keep"><b>Cómo se llena el vacío sin inventar relleno:</b> tres módulos de datos que ya se '
  'pueden calcular con las transacciones del mes que la vista recibe — <b>CONTEXTO</b> (la frase con el dato), '
  '<b>categoría en el mes</b> (cuánto llevas, con barra) y <b>otros movimientos</b> de esa categoría o con esa '
  'persona, donde cada fila abre su propio detalle. En cuotas y fijos, además, el <b>plan / historial en chips</b>. '
  'Nada de cajas decorativas: si el dato no existe, el módulo no aparece.</div>']

doc.append('<section id="tipos"><div class="block"><div class="thesis">Cobertura completa</div>'
           '<h2>Los 13 tipos de movimiento</h2>'
           '<p class="meta">Regla de composición: <b>un módulo por hecho que existe</b>. Sin cuotas no hay '
           'sello, ni pie de cifras, ni barra; sin tarjeta las teselas se reparten el ancho; sin gente no hay '
           'ficha de reparto. Lo que nunca falta es el contexto, porque siempre hay mes que comparar.</p></div>')
for i, c in enumerate(CASES, 1):
    doc.append(f'<div class="case"><div class="caseh"><h3>{i}. {c["title"]}</h3>'
               f'<span class="flags">{c["flags"]}</span></div>'
               f'<p class="note-txt">{c["why"]}</p>{pair(c["body"], cta(c["cta"]), f"{i} · ")}</div>')
doc.append('</section>')

doc.append('<section id="estados"><div class="block"><div class="thesis">Lo que hoy está apretado</div>'
           '<h2>Estados del borrado</h2>'
           '<p class="meta">Hoy el selector de alcance y la confirmación viven dentro de la barra inferior con '
           'texto de 12px y botones de 8px de alto — por debajo del objetivo táctil de 44px. Aquí ocupan el ancho '
           'completo, con radios de 20px y botones de 52px.</p></div>')
doc.append('<div class="case"><div class="caseh"><h3>Selector de alcance (fijos y cuotas)</h3></div>'
           + pair(CASES[3]['body'], SCOPE, 'alcance · ') + '</div>')
doc.append('<div class="case"><div class="caseh"><h3>Confirmación destructiva</h3></div>'
           + pair(CASES[3]['body'], CONFIRM, 'confirmar · ') + '</div>')
doc.append('</section>')

doc.append("""<script>
/* ?case=N aísla un caso (solo para revisar/renderizar) */
addEventListener('DOMContentLoaded',function(){
  var c=new URLSearchParams(location.search).get('case'); if(!c) return;
  document.querySelectorAll('.case').forEach(function(e,i){ if(i!=c-1) e.remove(); });
  document.querySelectorAll('h1,.sub,.keep,.topnav,.block').forEach(function(e){ e.remove(); });
  document.body.style.padding='20px';
});
</script>
</body></html>""")

(OUT / 'opciones-v4.html').write_text('\n'.join(doc))
print('escrito opciones-v4.html ·', len(CASES), 'tipos + 2 estados')
