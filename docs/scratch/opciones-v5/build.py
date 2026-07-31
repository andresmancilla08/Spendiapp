#!/usr/bin/env python3
"""
v5 — cinco maneras de resolver la TESELA DE TARJETA (lo único que no gustó de la v4).

El problema del rectángulo con degradado cian: era una tarjeta FALSA. La app ya
tiene `components/BankLogo.tsx` con 17 logos reales en assets/banks/ y el color
de marca de cada banco en config/banks.ts (Bancolombia #FFD100, Nequi #7B2FBE,
Davivienda #E01A24…), y el modelo `Card` guarda bankId, bankName, type, nickname
y cutoffDay — el día de corte, que hoy no se muestra en ningún sitio del detalle.

Las cinco opciones se diferencian en algo más que el adorno: dos viven en la
tesela, una saca la tarjeta de la rejilla y otra la asciende a módulo ancho
porque le añade datos que hoy no se ven.
"""
import pathlib

OUT = pathlib.Path(__file__).parent
LOGO = '../../../assets/banks/bancolombia.png'   # logo real de la app
BANK_COLOR = '#FFD100'                           # color de marca (config/banks.ts)

CSS = """
.dark{
  --bg:#0D1A1C; --grad1:#0D1A1C; --grad2:#062830; --grad3:#003840;
  --surface:#162428; --surfaceEl:#1E3035;
  --primary:#00BCD4; --primaryInk:#00BCD4; --pillBg:#053a42; --pillInk:#4DD8E8;
  --secondary:#00A896; --tertiary:#D4E157;
  --expInk:#FF8E8E; --incInk:#31D0B4; --err:#F87171; --neutral:#93A6AB;
  --tP:#EEF6F8; --tS:#9EABAF; --tT:#93A6AB; --noteInk:#9EABAF;
  --border:#243438; --hair:#223236; --track:#123037;
  --ctaInk:#04191C; --dangerInk:#04191C; --logoBg:#F5F5F5;
}
.light{
  --bg:#FFFFFF; --grad1:#FFFFFF; --grad2:#F5F9FA; --grad3:#E0F7FA;
  --surface:#FFFFFF; --surfaceEl:#F5F9FA;
  --primary:#00ACC1; --primaryInk:#006978; --pillBg:#E0F7FA; --pillInk:#006978;
  --secondary:#00897B; --tertiary:#C0CA33;
  --expInk:#C62828; --incInk:#00705F; --err:#D92D2D; --neutral:#5F6A6E;
  --tP:#1A2428; --tS:#6B7280; --tT:#6B7280; --noteInk:#5F6A6E;
  --border:#DDE8EA; --hair:#E6EEF0; --track:#D6EEF2;
  --ctaInk:#04191C; --dangerInk:#FFFFFF; --logoBg:#FFFFFF;
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
.opt{margin-top:30px}
.opth{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.tagx{font-size:10.5px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;
  padding:3px 8px;border-radius:6px;background:#0f1a1c;border:1px solid #1e2a2d;color:#00BCD4}
.note-txt{font-size:12px;color:#7d8c90;line-height:1.6;margin-top:6px;max-width:880px}
.note-txt b{color:#c9d6d9}
.pro{color:#7ee0c0}.con{color:#ffa8a8}

/* zoom para comparar la pieza aislada */
.zoomwrap{display:flex;gap:22px;flex-wrap:wrap;margin-top:16px}
.zoombox{background:#0f1516;border:1px solid #1c2628;border-radius:16px;padding:20px;color:var(--tP)}
.zoombox.light{background:#141b1c}
.zoombox .zl{font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#6c7b7f;font-weight:700;margin-bottom:14px}
.zoom2{transform:scale(2);transform-origin:top left}
.zoomcanvas{width:250px;height:230px;overflow:hidden}
.zoomcanvas.tall{height:260px}
.zoomcanvas.wide{width:730px;height:340px}

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
  font-size:14px;font-weight:700;flex:1}
.btn-primary{background:var(--primary);color:var(--ctaInk)}
.btn-secondary{background:var(--surface);border:1.5px solid var(--primary);color:var(--primaryInk)}
.btn-icon{width:52px;height:52px;flex:0 0 52px;border-radius:26px;color:var(--err);display:grid;
  place-items:center;font-size:19px;background:color-mix(in srgb,var(--err) 14%,transparent)}
.num{font-variant-numeric:tabular-nums;letter-spacing:-.2px}

/* héroe + teselas (v4, sin cambios) */
.herowrap{position:relative;margin-top:22px}
.hero{border-radius:20px;border:1px solid var(--border);background:var(--surfaceEl);
  padding:18px 16px 16px;position:relative;overflow:hidden}
.kick{display:flex;align-items:center;gap:7px;font-size:10px;font-weight:700;letter-spacing:1.6px;
  text-transform:uppercase;color:var(--acc)}
.kick i{width:6px;height:6px;border-radius:3px;background:var(--acc)}
.amount{font-weight:800;letter-spacing:-1.8px;line-height:1;color:var(--acc);font-size:40px;margin-top:12px;
  font-variant-numeric:tabular-nums}
.subline{font-size:12.5px;color:var(--tS);margin-top:8px;line-height:1.45}
.subline b{color:var(--tP);font-weight:700}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(0,1fr));gap:8px;margin-top:12px}
.tile{border-radius:16px;padding:12px;background:var(--surfaceEl);border:1px solid var(--border);min-width:0;
  position:relative;overflow:hidden}
.tile .lbl{font-size:9px;font-weight:700;letter-spacing:1.3px;text-transform:uppercase;color:var(--tT)}
.tile .big{font-size:21px;font-weight:800;letter-spacing:-.8px;margin-top:5px;line-height:1;font-variant-numeric:tabular-nums}
.tile .ic{font-size:18px;margin-top:4px}
.tile .s{font-size:10px;color:var(--tS);margin-top:3px;line-height:1.35}
.wide{border-radius:18px;padding:14px;background:var(--surfaceEl);border:1px solid var(--border);margin-top:10px}
.wide .lbl{font-size:9.5px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--tT)}
.wide .txt{font-size:12.5px;line-height:1.55;color:var(--tS);margin-top:7px}
.wide .txt b{color:var(--tP);font-weight:700}
.desc{font-size:17px;font-weight:700;margin:16px 0 0}
.catbar{height:8px;border-radius:4px;background:var(--track);margin-top:10px;overflow:hidden}
.catbar i{display:block;height:8px;background:var(--acc2,var(--primary))}
.catrow{display:flex;justify-content:space-between;align-items:baseline;margin-top:8px}
.catrow .a{font-size:14px;font-weight:800;font-variant-numeric:tabular-nums;letter-spacing:-.3px}
.catrow .b{font-size:11px;color:var(--tS);font-variant-numeric:tabular-nums}
.notecard{border-radius:18px;padding:13px 15px;margin-top:10px;
  border:1px solid color-mix(in srgb,var(--tertiary) 30%,transparent);
  background:color-mix(in srgb,var(--tertiary) 9%,transparent)}
.notecard .lbl{font-size:9.5px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--noteInk)}
.notecard p{font-size:12.5px;line-height:1.5;color:var(--noteInk);margin-top:6px}

/* ═══════════ A · logo real + texto ═══════════ */
.cardA{margin-top:7px}
.logo{background:var(--logoBg);border-radius:9px;display:grid;place-items:center;flex:0 0 auto;
  border:1px solid var(--border);overflow:hidden}
.logo img{object-fit:contain}
.cardA .n{font-size:12px;font-weight:700;line-height:1.2;margin-top:6px}
.cardA .k{font-size:10px;color:var(--tS);margin-top:2px}

/* ═══════════ B · chip dentro del héroe ═══════════ */
.hchip{display:inline-flex;align-items:center;gap:7px;margin-top:12px;padding:5px 11px 5px 5px;
  border-radius:50px;background:color-mix(in srgb,var(--primary) 10%,transparent);
  font-size:11.5px;font-weight:700;color:var(--tP)}
.hchip .logo{border-radius:50%;width:22px;height:22px}
.hchip em{font-style:normal;color:var(--tS);font-weight:600}

/* ═══════════ C · franja de marca del banco ═══════════ */
.cardC{padding-left:16px}
.cardC .stripe{position:absolute;left:0;top:0;bottom:0;width:5px;background:var(--bank)}
.cardC .n{font-size:12px;font-weight:700;margin-top:6px;line-height:1.2}
.cardC .k{font-size:10px;color:var(--tS);margin-top:2px}
.cardC .logo{width:22px;height:22px;border-radius:6px;margin-top:7px}

/* ═══════════ D · mini-tarjeta con el color real del banco ═══════════ */
.plastic{margin-top:7px;border-radius:9px;padding:7px 8px;height:50px;position:relative;overflow:hidden;
  background:var(--bank);display:flex;flex-direction:column;justify-content:space-between}
.plastic::after{content:'';position:absolute;inset:0;
  background:linear-gradient(120deg,rgba(255,255,255,.42),transparent 46%)}
.plastic .pl{font-size:9.5px;font-weight:800;letter-spacing:1px;color:var(--bankInk);position:relative;z-index:1}
.plastic .pn{font-size:8.5px;font-weight:800;letter-spacing:.3px;color:var(--bankInk);position:relative;z-index:1}
.plastic .chip{width:14px;height:10px;border-radius:2px;background:rgba(0,0,0,.22);position:relative;z-index:1}

/* ═══════════ E · módulo ancho con los datos que hoy no se ven ═══════════ */
.cardE{display:flex;align-items:center;gap:12px;margin-top:10px}
.cardE .logo{width:40px;height:40px;border-radius:11px}
.cardE .n{font-size:13.5px;font-weight:700}
.cardE .k{font-size:11px;color:var(--tS);margin-top:2px}
.cardE .right{margin-left:auto;text-align:right}
.cardE .right .a{font-size:14px;font-weight:800;font-variant-numeric:tabular-nums;letter-spacing:-.3px}
.cardE .right .b{font-size:10px;color:var(--tS);margin-top:2px}
.cutrow{display:flex;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid var(--hair)}
.cutrow div{flex:1}
.cutrow .cl{font-size:9px;font-weight:700;letter-spacing:1.1px;text-transform:uppercase;color:var(--tT)}
.cutrow .cv{font-size:12.5px;font-weight:700;margin-top:3px;font-variant-numeric:tabular-nums}
"""

def logo(size=32, radius=9, cls=''):
    return (f'<div class="logo {cls}" style="width:{size}px;height:{size}px;border-radius:{radius}px">'
            f'<img src="{LOGO}" style="width:{int(size*0.76)}px;height:{int(size*0.76)}px" alt="Bancolombia"></div>')

# ── las cinco resoluciones ───────────────────────────────────────────────────

def tile_A():
    return ('<div class="tile"><div class="lbl">Tarjeta</div>'
            f'<div class="cardA">{logo(28, 8)}'
            '<div class="n">Bancolombia</div><div class="k">Crédito · Mercado</div></div></div>')

def tile_C():
    return ('<div class="tile cardC" style="--bank:' + BANK_COLOR + '">'
            f'<div class="stripe"></div>{logo(24, 7)}'
            '<div class="lbl">Tarjeta</div><div class="n">Bancolombia</div>'
            '<div class="k">Crédito · Mercado</div></div>')

def tile_D():
    return ('<div class="tile"><div class="lbl">Tarjeta</div>'
            f'<div class="plastic" style="--bank:{BANK_COLOR};--bankInk:#1A2428">'
            '<div class="pn">BANCOLOMBIA</div>'
            '<div class="pl">CRÉDITO</div></div>'
            '<div class="s">Mercado</div></div>')

def hero_chip_B():
    return f'<div class="hchip">{logo(22, 11, "logo")}Bancolombia <em>· crédito</em></div>'

def wide_E():
    return ('<div class="wide"><div class="lbl">Tarjeta</div>'
            f'<div class="cardE">{logo(40, 11)}'
            '<div><div class="n">Bancolombia · Mercado</div><div class="k">Crédito</div></div>'
            '<div class="right"><div class="a">$412.000</div><div class="b">en julio</div></div></div>'
            '<div class="cutrow">'
            '<div><div class="cl">Día de corte</div><div class="cv">15 de cada mes</div></div>'
            '<div><div class="cl">Movimientos</div><div class="cv">9 este mes</div></div>'
            '</div></div>')

# ── contexto: el caso «gasto simple» de la v4 ────────────────────────────────

def t_fecha():
    return '<div class="tile"><div class="lbl">Fecha</div><div class="big">22</div><div class="s">jul 2026 · 19:42</div></div>'
def t_cat():
    return '<div class="tile"><div class="lbl">Categoría</div><div class="ic">🍽️</div><div class="s">Comida · 11% del mes</div></div>'

HERO_BASE = ('<div class="herowrap"><div class="hero" style="--acc:var(--expInk)">'
             '<div class="kick"><i></i>Gasto · Comida</div>'
             '<div class="amount">−$54.300</div>'
             '<div class="subline">martes, 22 de julio de 2026 · 19:42</div>'
             '{CHIP}</div></div>')

CATBAR = ('<div class="wide" style="--acc2:var(--expInk)"><div class="lbl">Comida en julio</div>'
          '<div class="catbar"><i style="width:18%"></i></div>'
          '<div class="catrow"><div class="a">$212.400</div><div class="b">de $1.180.000 · 18%</div></div></div>')

NOTE = ('<div class="notecard"><div class="lbl">Nota</div>'
        '<p>Incluye el mercado de la casa y los productos de aseo del mes.</p></div>')

CTA = ('<div class="ctarow"><div class="btn btn-primary">✎ Editar</div>'
       '<div class="btn btn-secondary">⧉ Duplicar</div><div class="btn-icon">🗑</div></div>')

def screen(card_tile=None, hero_chip='', wide_extra=''):
    return (HERO_BASE.replace('{CHIP}', hero_chip)
            + '<div class="desc">Almuerzo con el equipo</div>'
            + '<div class="tiles">' + t_fecha() + t_cat() + (card_tile or '') + '</div>'
            + wide_extra + CATBAR + NOTE)

def frame(mode, body):
    return (f'<div class="frame {mode}">'
            f'<div class="statusbar"><span>10:08</span><span>▮▮▮ ᯤ 84</span></div>'
            f'<div class="appbar"><div class="iconbtn">‹</div><div class="ttl">MOVIMIENTO</div></div>'
            f'<div class="body">{body}</div><div class="ctabar">{CTA}</div></div>')

OPTIONS = [
 ('A', 'Logo real + texto', 'en la tesela',
  'Exactamente lo que la app ya sabe hacer: <code>BankLogo</code> con el PNG real del banco (17 bancos en '
  '<b>assets/banks/</b>) y de fallback las iniciales sobre el color de marca. Cero invención.',
  '<span class="pro">A favor:</span> reconocimiento inmediato, es el mismo logo que ves al elegir tarjeta. '
  '<span class="con">Contra:</span> es la más sobria; no aporta ningún dato nuevo.',
  dict(tile=tile_A, chip='', wide=''), 'tall'),

 ('B', 'Chip dentro del héroe', 'fuera de la rejilla',
  'La tarjeta deja de ser una ficha y se convierte en un chip dentro de la ficha héroe, junto a la fecha. '
  'La rejilla baja a dos teselas y respira.',
  '<span class="pro">A favor:</span> menos cajas y el dato queda junto al monto, que es donde importa saber '
  'con qué pagaste. <span class="con">Contra:</span> pierde jerarquía; con nombres largos el chip se estira.',
  dict(tile=None, chip=hero_chip_B, wide=''), 'wide'),

 ('C', 'Franja del color del banco', 'en la tesela',
  'Tesela normal con una franja de 5px del color de marca del banco (<b>#FFD100</b> Bancolombia, '
  '<b>#7B2FBE</b> Nequi, <b>#E01A24</b> Davivienda…) y el logo pequeño en la esquina.',
  '<span class="pro">A favor:</span> el color identifica la tarjeta de un vistazo cuando tienes varias, sin '
  'dibujar una tarjeta falsa. <span class="con">Contra:</span> introduce un color ajeno a la paleta en la rejilla.',
  dict(tile=tile_C, chip='', wide=''), 'tall'),

 ('D', 'Mini-tarjeta con el color real', 'en la tesela',
  'La idea original, pero honesta: el plástico se pinta con el <b>color de marca del banco</b> y su nombre, '
  'no con un degradado cian genérico. Tinta oscura o clara según el color del banco.',
  '<span class="pro">A favor:</span> es la más reconocible como «tarjeta» y la más rica visualmente. '
  '<span class="con">Contra:</span> 17 bancos = 17 combinaciones de contraste que hay que medir una por una.',
  dict(tile=tile_D, chip='', wide=''), 'tall'),

 ('E', 'Módulo ancho con datos nuevos', 'ascendida a módulo',
  'Si la tarjeta merece espacio, que lo pague con datos: logo grande, cuánto llevas gastado <b>en esa tarjeta</b> '
  'este mes, cuántos movimientos y el <b>día de corte</b> — que existe en el modelo (<code>cutoffDay</code>) y '
  'hoy no se muestra en ninguna parte del detalle.',
  '<span class="pro">A favor:</span> deja de ser adorno y pasa a ser información útil de crédito. '
  '<span class="con">Contra:</span> ocupa el ancho completo; en la rejilla quedan dos teselas.',
  dict(tile=None, chip='', wide=wide_E), 'wide'),
]

HEAD = """<!doctype html>
<html lang="es"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Spendia · La tesela de tarjeta — 5 opciones</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>%s</style></head><body>"""

nav = ('<div class="topnav"><span class="lg">V5</span><a href="#zoom">Comparación al 200%</a>'
       '<a href="#contexto">En la pantalla completa</a></div>')

doc = [HEAD % CSS, nav,
  '<h1>Spendia · La tesela de tarjeta</h1>',
  '<p class="sub">Lo que no funcionaba: era una <b>tarjeta falsa</b> — un rectángulo con un degradado cian que '
  'no corresponde a ningún banco. Y la app ya tiene <b>17 logos reales</b> en <code>assets/banks/</code> con su '
  'color de marca (<code>components/BankLogo.tsx</code> + <code>config/banks.ts</code>), además de un dato que '
  'nunca se muestra en el detalle: el <b>día de corte</b> de la tarjeta de crédito.</p>',
  '<div class="keep">Las cinco no son cinco adornos: <b>A, C y D</b> viven en la tesela, <b>B</b> saca la tarjeta '
  'de la rejilla y la mete en el héroe, y <b>E</b> la asciende a módulo ancho porque le añade datos reales. '
  'Todo lo demás de la pantalla se queda como en la v4.</div>']

# bloque 1 — comparación aislada al 200%
doc.append('<section id="zoom"><div class="block"><div class="thesis">Bloque 1 · la pieza sola, al 200%</div>'
           '<h2>Comparación directa</h2><p class="meta">Cada opción aislada y ampliada al doble, en oscuro y '
           'claro, con el logo real de Bancolombia y su color de marca #FFD100.</p></div>')
for code, name, where, what, prosc, parts, box in OPTIONS:
    piece = (parts['tile']() if parts['tile'] else
             (parts['chip']() if parts['chip'] else parts['wide']()))
    holder = ('<div style="width:111px">' if parts['tile'] else
              ('<div style="width:170px">' if parts['chip'] else '<div style="width:350px">'))
    zooms = ''.join(
        f'<div class="zoombox {m}"><div class="zl">{code} · {m}</div>'
        f'<div class="zoomcanvas {box}"><div class="zoom2">{holder}{piece}</div></div></div></div>'
        for m in ('dark', 'light'))
    doc.append(f'<div class="opt"><div class="opth"><h3>{code} · {name}</h3>'
               f'<span class="tagx">{where}</span></div>'
               f'<p class="note-txt">{what}</p><p class="note-txt">{prosc}</p>'
               f'<div class="zoomwrap">{zooms}</div></div>')
doc.append('</section>')

# bloque 2 — en contexto
doc.append('<section id="contexto"><div class="block"><div class="thesis">Bloque 2 · dentro de la pantalla</div>'
           '<h2>Las cinco en contexto</h2><p class="meta">El mismo movimiento (gasto simple con tarjeta y nota) '
           'con cada resolución, para ver el efecto sobre la rejilla y el ritmo de la pantalla.</p></div>')
for code, name, where, what, prosc, parts, box in OPTIONS:
    body = screen(parts['tile']() if parts['tile'] else None,
                  parts['chip']() if parts['chip'] else '',
                  parts['wide']() if parts['wide'] else '')
    frames = ''.join(f'<div><div class="cap">{code} · {m}</div>{frame(m, body)}</div>' for m in ('dark', 'light'))
    doc.append(f'<div class="opt"><div class="opth"><h3>{code} · {name}</h3>'
               f'<span class="tagx">{where}</span></div><div class="row">{frames}</div></div>')
doc.append('</section>')

doc.append("""<script>
/* ?opt=N aísla una opción (solo para revisar/renderizar) */
addEventListener('DOMContentLoaded',function(){
  var o=new URLSearchParams(location.search).get('opt'); if(!o) return;
  document.querySelectorAll('.opt').forEach(function(e,i){ if(i!=o-1) e.remove(); });
  document.querySelectorAll('h1,.sub,.keep,.topnav,.block').forEach(function(e){ e.remove(); });
  document.body.style.padding='20px';
});
</script>
</body></html>""")

(OUT / 'opciones-v5.html').write_text('\n'.join(doc))
print('escrito opciones-v5.html ·', len(OPTIONS), 'resoluciones de la tesela')
