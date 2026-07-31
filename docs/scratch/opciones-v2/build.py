#!/usr/bin/env python3
"""
Genera las 5 opciones v2 del detalle de transacción.

Se conservan, casi idénticas, las TRES piezas que el usuario aprobó:
  · el sello rotado del estado      → .stamp
  · la ficha de cuotas con anillo   → .t-cuotas (anillo + resta)
  · la ficha de compartido          → .t-shared (pila de avatares + pill)
Lo que cambia entre opciones es el LAYOUT y quién es el héroe, no esas piezas.

Correcciones de contraste aplicadas sobre las piezas aprobadas (mismo look, tinta legible):
  · etiquetas de ficha en claro: #6B7280 (antes #6E737C, 4.50:1 justo en el límite)
  · texto del pill en claro:     #006978 (antes #00ACC1 = 2,5:1 → ahora 5,8:1)
  · monto en claro:              #C62828 (antes #FF6B6B = 2,78:1 → ahora 5,9:1)
"""
import pathlib, subprocess

OUT = pathlib.Path(__file__).parent

# ─────────────────────────────── tokens + piezas ──────────────────────────────
CSS = """
.dark{
  --bg:#0D1A1C; --grad1:#0D1A1C; --grad2:#062830; --grad3:#003840;
  --surface:#162428; --surfaceEl:#1E3035; --sheet:#15242A;
  --primary:#00BCD4; --primaryInk:#00BCD4; --pillBg:#053a42; --pillInk:#4DD8E8;
  --secondary:#00A896; --tertiary:#D4E157;
  --expInk:#FF8E8E; --err:#F87171; --stamp:#FF8E8E;
  --tP:#EEF6F8; --tS:#9EABAF; --tT:#93A6AB; --border:#243438; --hair:#223236;
  --ringTrack:#123037; --ctaInk:#04191C;
}
.light{
  --bg:#FFFFFF; --grad1:#FFFFFF; --grad2:#F5F9FA; --grad3:#E0F7FA;
  --surface:#FFFFFF; --surfaceEl:#F5F9FA; --sheet:#FFFFFF;
  --primary:#00ACC1; --primaryInk:#00838F; --pillBg:#E0F7FA; --pillInk:#006978;
  --secondary:#00897B; --tertiary:#C0CA33;
  --expInk:#C62828; --err:#EF4444; --stamp:#EF4444;
  --tP:#1A2428; --tS:#6B7280; --tT:#6B7280; --border:#DDE8EA; --hair:#E6EEF0;
  --ringTrack:#D6EEF2; --ctaInk:#04191C;
}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Montserrat',system-ui,sans-serif;background:#0a0f10;color:#e8eef0;
  padding:34px 28px 70px;-webkit-font-smoothing:antialiased}
h1{font-size:25px;font-weight:800;letter-spacing:-.6px}
h2{font-size:18px;font-weight:800;margin:0 0 5px}
.sub{color:#8b9a9e;font-size:13px;line-height:1.6;max-width:940px;margin-top:8px}
.thesis{color:#00BCD4;font-size:11.5px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:6px}
.meta{color:#7d8c90;font-size:12.5px;line-height:1.7;max-width:940px}
.meta b{color:#c9d6d9;font-weight:600}
.keep{margin-top:14px;padding:12px 14px;border-left:3px solid #00BCD4;background:#0f1a1c;border-radius:0 10px 10px 0;font-size:12px;color:#93a4a8;line-height:1.65;max-width:940px}
.keep b{color:#dbe6e8}
.row{display:flex;gap:26px;flex-wrap:wrap;align-items:flex-start;margin-top:22px}
.cap{font-size:11px;color:#6c7b7f;font-weight:600;letter-spacing:.6px;text-transform:uppercase;margin-bottom:8px}
.nav{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 24px;padding-bottom:18px;border-bottom:1px solid #1d2729}
.nav a{padding:9px 13px;border-radius:50px;font-size:12px;font-weight:700;text-decoration:none;
  background:#141d1f;color:#9fb0b4;border:1px solid #223033}
.nav a.on{background:#00BCD4;color:#04191c;border-color:#00BCD4}
.nav a.idx{background:transparent;color:#6c7b7f}

/* ── marco ───────────────────────────────────────────────────────────────── */
.frame{width:390px;height:844px;border-radius:38px;overflow:hidden;position:relative;
  background:linear-gradient(160deg,var(--grad1),var(--grad2) 55%,var(--grad3));
  color:var(--tP);font-size:14px;box-shadow:0 20px 60px rgba(0,0,0,.55);display:flex;flex-direction:column}
.frame.dark::before{content:'';position:absolute;inset:0;background:rgba(0,0,0,.7);pointer-events:none}
.frame > *{position:relative;z-index:1}
.statusbar{height:44px;display:flex;align-items:flex-end;justify-content:space-between;padding:0 22px 4px;font-size:12px;font-weight:700;opacity:.9;flex:0 0 auto}
.appbar{height:52px;display:flex;align-items:center;gap:10px;padding:0 16px;flex:0 0 auto}
.iconbtn{width:36px;height:36px;border-radius:18px;display:grid;place-items:center;
  background:color-mix(in srgb,var(--primary) 12%,transparent);color:var(--primaryInk);font-size:17px;font-weight:700}
.appbar .ttl{font-size:11px;font-weight:700;letter-spacing:1.6px;color:var(--tT)}
.body{flex:1 1 auto;overflow:hidden;padding:0 20px}
.ctabar{flex:0 0 auto;padding:15px 15px 35px;border-top:1px solid var(--hair);
  background:color-mix(in srgb,var(--bg) 80%,transparent);backdrop-filter:blur(14px)}
.ctarow{display:flex;gap:10px;align-items:center}
.btn{height:52px;border-radius:50px;display:flex;align-items:center;justify-content:center;gap:8px;font-size:14px;font-weight:700;flex:1}
.btn-primary{background:var(--primary);color:var(--ctaInk)}
.btn-secondary{background:var(--surface);border:1.5px solid var(--primary);color:var(--primaryInk)}
.btn-icon{width:52px;height:52px;flex:0 0 52px;border-radius:26px;color:var(--err);display:grid;place-items:center;font-size:19px;
  background:color-mix(in srgb,var(--err) 14%,transparent)}
.mono{font-family:'DM Mono',ui-monospace,monospace;font-variant-numeric:tabular-nums}

/* ── PIEZA 1 · sello rotado (aprobada) ───────────────────────────────────── */
.stamp{border:2px solid var(--stamp);color:var(--stamp);border-radius:8px;padding:5px 9px;
  font-size:10.5px;font-weight:800;letter-spacing:.9px;line-height:1.2;text-align:center;
  transform:rotate(-9deg);display:inline-block;flex:0 0 auto}
.stamp.abs{position:absolute;right:16px;top:16px}

/* ── PIEZA 2 · ficha de cuotas con anillo (aprobada) ─────────────────────── */
.tile{border-radius:18px;padding:14px;background:var(--surfaceEl);border:1px solid var(--border);position:relative}
.tile .lbl{font-size:9.5px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--tT)}
.tile .val{font-size:15px;font-weight:700;margin-top:8px}
.tile .sub2{font-size:11px;color:var(--tS);margin-top:3px;line-height:1.4}
.tile.wide{grid-column:1/-1}
.ringrow{display:flex;align-items:center;gap:10px;margin-top:10px;min-width:0}
.ringtxt{min-width:0}
.ring{width:48px;height:48px;border-radius:50%;flex:0 0 48px;display:grid;place-items:center;
  background:conic-gradient(var(--primary) 0 25%,var(--ringTrack) 25% 100%)}
.ring span{width:36px;height:36px;border-radius:50%;background:var(--surfaceEl);display:grid;place-items:center;
  font-size:10.5px;font-weight:800;letter-spacing:-.2px}
.ringtxt{font-size:11px;color:var(--tS);line-height:1.35}
.ringtxt b{display:block;font-size:11.5px;letter-spacing:-.3px;color:var(--tP);font-weight:700;font-family:'DM Mono',monospace}

/* ── PIEZA 3 · ficha de compartido (aprobada) ────────────────────────────── */
.avrow{display:flex;align-items:center;margin-top:9px}
.av{width:26px;height:26px;border-radius:13px;display:grid;place-items:center;font-size:11px;font-weight:700;
  color:#04191c;background:var(--primary);margin-left:-8px;border:2px solid var(--surfaceEl)}
.av:first-child{margin-left:0}
.avnames{margin-left:10px;font-size:12px;font-weight:600}
.pill{display:inline-flex;align-items:center;gap:5px;margin-top:9px;padding:5px 11px;border-radius:50px;
  background:var(--pillBg);color:var(--pillInk);font-size:11px;font-weight:700}

/* ── piezas comunes de apoyo ─────────────────────────────────────────────── */
.kick{display:flex;align-items:center;gap:7px;font-size:10px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:var(--expInk)}
.kick i{width:6px;height:6px;border-radius:3px;background:var(--expInk)}
.amount{font-weight:800;letter-spacing:-2.4px;line-height:1;color:var(--expInk)}
.share{font-size:12.5px;color:var(--tS);margin-top:9px}
.share b{color:var(--tP);font-weight:700}
.desc{font-size:17px;font-weight:700;margin-top:10px}
.minicard{height:36px;border-radius:8px;margin-top:8px;display:flex;align-items:flex-end;padding:6px 8px;
  font-size:9px;font-weight:800;letter-spacing:1px;color:#04191c;background:linear-gradient(120deg,var(--primary),var(--secondary))}
.bento{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.note{border-radius:18px;padding:13px 15px;border:1px solid color-mix(in srgb,var(--tertiary) 30%,transparent);
  background:color-mix(in srgb,var(--tertiary) 9%,transparent)}
.note .lbl{font-size:9.5px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--tS)}
.note p{font-size:12.5px;line-height:1.5;color:var(--tS);margin-top:6px}
.daybig{font-size:30px;font-weight:800;letter-spacing:-1.1px;line-height:1;margin-top:6px}
"""

# ─── piezas reutilizables como funciones (para no divergir entre opciones) ────
STAMP = '<div class="stamp">CUOTA<br>3 / 12</div>'

def tile_cuotas(cls=''):
    return f'''<div class="tile {cls}"><div class="lbl">Cuotas</div>
      <div class="ringrow"><div class="ring"><span>3/12</span></div>
        <div class="ringtxt">resta<b>$746.700</b></div></div></div>'''

def tile_shared(cls='wide'):
    return f'''<div class="tile {cls}"><div class="lbl">Compartido con</div>
      <div class="avrow"><div class="av">A</div><div class="av" style="background:var(--secondary);color:#fff">L</div>
        <div class="av" style="background:var(--tertiary)">D</div>
        <div class="avnames">Tú, Laura M. y Diego R.</div></div>
      <div class="pill">A partes iguales · $82.967 c/u</div></div>'''

def tile_fecha():
    return '''<div class="tile"><div class="lbl">Fecha</div><div class="daybig">22</div>
      <div class="sub2">jul 2026 · martes 19:42</div></div>'''

def tile_cat():
    return '''<div class="tile"><div class="lbl">Categoría</div><div class="val">🍽️ Comida</div>
      <div class="sub2">18% de tu julio</div></div>'''

def tile_card():
    return '''<div class="tile"><div class="lbl">Tarjeta</div><div class="minicard">BANCOLOMBIA</div>
      <div class="sub2">Crédito · Mercado</div></div>'''

NOTE = '''<div class="note"><div class="lbl">Nota</div>
      <p>Incluye el mercado de la casa y los productos de aseo del mes.</p></div>'''

CTA = '''<div class="ctabar"><div class="ctarow">
      <div class="btn btn-primary">✎ Editar</div>
      <div class="btn btn-secondary">⧉ Duplicar</div>
      <div class="btn-icon">🗑</div></div></div>'''

def shell(inner, extra_css_class=''):
    return f'''<div class="statusbar"><span>10:08</span><span>▮▮▮ ᯤ 84</span></div>
    <div class="appbar"><div class="iconbtn">‹</div><div class="ttl">MOVIMIENTO</div></div>
    <div class="body {extra_css_class}">{inner}</div>
    {CTA}'''

# ══════════════════════════ las 5 direcciones ════════════════════════════════

def d1():  # TABLERO — bento puro, cifra grande en tinta de gasto, sello al lado
    return shell(f'''
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding-top:6px">
        <div style="flex:1;min-width:0">
          <div class="kick"><i></i>Gasto · Comida</div>
          <div class="amount mono" style="font-size:50px;margin-top:10px">−$82.967</div>
          <div class="share">tu parte de <b>$248.900</b> · entre 3</div>
        </div>
        <div style="padding-top:16px">{STAMP}</div>
      </div>
      <div class="desc" style="margin-bottom:16px">Mercado del mes</div>
      <div class="bento">
        {tile_fecha()}{tile_cat()}{tile_card()}{tile_cuotas()}
        {tile_shared()}
        <div class="tile wide" style="background:color-mix(in srgb,var(--tertiary) 9%,transparent);border-color:color-mix(in srgb,var(--tertiary) 30%,transparent)">
          <div class="lbl">Nota</div><div class="sub2" style="font-size:12.5px;line-height:1.5">Incluye el mercado de la casa y los productos de aseo del mes.</div></div>
      </div>''')

def d2():  # HOJA — sheet que sube, sello cruzando el borde, anillo emparejado
    return f'''<div class="statusbar"><span>10:08</span><span>▮▮▮ ᯤ 84</span></div>
    <div class="appbar"><div class="iconbtn">‹</div><div class="ttl">MOVIMIENTO</div></div>
    <div class="body" style="padding:0 12px;display:flex;flex-direction:column">
      <div style="position:relative;flex:1;background:var(--sheet);border:1px solid var(--border);
                  border-bottom:none;border-radius:26px 26px 0 0;
                  padding:20px 18px 18px;box-shadow:0 -2px 30px rgba(0,0,0,.18)">
        <div style="width:38px;height:4px;border-radius:2px;background:var(--border);margin:0 auto 16px"></div>
        <div style="position:absolute;right:14px;top:52px">{STAMP}</div>
        <div style="display:flex;align-items:center;gap:12px">
          <div style="width:46px;height:46px;border-radius:14px;display:grid;place-items:center;font-size:22px;
                      background:color-mix(in srgb,var(--expInk) 12%,transparent)">🍽️</div>
          <div><div style="font-size:16px;font-weight:800">Mercado del mes</div>
            <div style="font-size:11.5px;color:var(--tS);margin-top:2px">Comida · 22 jul 2026 · 19:42</div></div>
        </div>
        <div style="height:1px;background:var(--hair);margin:16px -18px"></div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:14px">
          <div>
            <div class="lbl" style="font-size:9.5px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--tT)">Tu parte</div>
            <div class="amount mono" style="font-size:38px;margin-top:6px">−$82.967</div>
            <div class="share" style="margin-top:4px">de <b>$248.900</b></div>
          </div>
          <div class="ring" style="width:76px;height:76px;flex:0 0 76px"><span style="width:58px;height:58px;background:var(--sheet);font-size:13px">3/12</span></div>
        </div>
        <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">
          <div class="pill" style="margin:0">💳 Bancolombia · crédito</div>
        </div>
        <div style="height:1px;background:var(--hair);margin:16px -18px"></div>
        <div class="lbl" style="font-size:9.5px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--tT)">Compartido con</div>
        <div class="avrow"><div class="av" style="border-color:var(--sheet)">A</div>
          <div class="av" style="background:var(--secondary);color:#fff;border-color:var(--sheet)">L</div>
          <div class="av" style="background:var(--tertiary);border-color:var(--sheet)">D</div>
          <div class="avnames">Tú, Laura M. y Diego R.</div></div>
        <div class="pill">A partes iguales · $82.967 c/u</div>
        <div style="height:1px;background:var(--hair);margin:16px -18px"></div>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--tS)">
          <span>Resta de la compra</span><b class="mono" style="color:var(--tP)">$746.700</b></div>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--tS);margin-top:7px">
          <span>Próxima cuota</span><b class="mono" style="color:var(--tP)">22 ago 2026</b></div>
        <div style="height:1px;background:var(--hair);margin:16px -18px"></div>
        <div class="lbl" style="font-size:9.5px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--tT)">Nota</div>
        <div style="font-size:12.5px;line-height:1.5;color:var(--tS);margin-top:6px">Incluye el mercado de la casa y los productos de aseo del mes.</div>
      </div>
    </div>
    {CTA}'''

def d3():  # FRASE — titular editorial que lo dice todo, fichas como letra pequeña
    return shell(f'''
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;padding-top:10px">
        <div class="kick"><i></i>Gasto compartido</div>
        {STAMP}
      </div>
      <div style="font-size:26px;font-weight:800;letter-spacing:-.9px;line-height:1.28;margin-top:14px">
        Pagas <span class="mono" style="color:var(--expInk)">$82.967</span> de
        <span class="mono">$248.900</span> en <span style="white-space:nowrap">Mercado del mes</span>.
      </div>
      <div style="font-size:13px;color:var(--tS);line-height:1.6;margin-top:10px">
        Cuota <b style="color:var(--tP)">3 de 12</b> · entre <b style="color:var(--tP)">3 personas</b> ·
        con <b style="color:var(--tP)">Bancolombia crédito</b>
      </div>
      <div style="height:1px;background:var(--hair);margin:18px 0 16px"></div>
      <div class="bento">
        {tile_cuotas()}
        <div class="tile"><div class="lbl">Cuándo</div><div class="daybig">22</div><div class="sub2">jul 2026 · 19:42</div></div>
        {tile_shared()}
      </div>
      <div style="margin-top:10px">{NOTE}</div>''')

def d4():  # MÓDULOS — sin cards: etiquetas, hairlines y un rail de color
    def mod(label, content, pad='14px 0'):
        return f'''<div style="padding:{pad};border-bottom:1px solid var(--hair)">
          <div style="font-size:9.5px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--tT)">{label}</div>
          {content}</div>'''
    return shell(f'''
      <div style="position:relative;padding-left:16px">
        <div style="position:absolute;left:0;top:8px;bottom:8px;width:3px;border-radius:2px;
                    background:linear-gradient(var(--expInk) 0 62%,color-mix(in srgb,var(--expInk) 22%,transparent))"></div>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;padding-top:8px">
          <div>
            <div class="kick"><i></i>Gasto · Comida</div>
            <div class="amount mono" style="font-size:44px;margin-top:8px">−$82.967</div>
            <div class="share">tu parte de <b>$248.900</b></div>
            <div style="font-size:17px;font-weight:700;margin-top:10px">Mercado del mes</div>
          </div>
          <div style="padding-top:14px">{STAMP}</div>
        </div>
        <div style="height:1px;background:var(--hair);margin:16px 0 0"></div>
        {mod('Cuándo','<div style="font-size:14px;font-weight:600;margin-top:6px">martes, 22 de julio de 2026</div><div class="sub2" style="font-size:11.5px;color:var(--tS);margin-top:2px">19:42</div>')}
        {mod('Con qué','<div style="display:flex;align-items:center;gap:11px;margin-top:8px"><div style="width:46px;height:30px;border-radius:7px;flex:0 0 46px;background:linear-gradient(120deg,var(--primary),var(--secondary))"></div><div style="font-size:13.5px;font-weight:600;min-width:0">Bancolombia · Mercado<div class="sub2" style="font-size:11px;color:var(--tS);font-weight:500;margin-top:1px">Crédito</div></div></div>')}
        {mod('Cuotas',f'<div class="ringrow" style="margin-top:8px"><div class="ring" style="background:conic-gradient(var(--primary) 0 25%,var(--ringTrack) 25% 100%)"><span style="background:var(--bg)">3/12</span></div><div class="ringtxt">resta<b>$746.700</b><span style="display:block;margin-top:3px">próxima 22 ago</span></div></div>')}
        {mod('Compartido con','<div class="avrow"><div class="av" style="border-color:var(--bg)">A</div><div class="av" style="background:var(--secondary);color:#fff;border-color:var(--bg)">L</div><div class="av" style="background:var(--tertiary);border-color:var(--bg)">D</div><div class="avnames">Tú, Laura M. y Diego R.</div></div><div class="pill">A partes iguales · $82.967 c/u</div>')}
        {mod('Nota','<div style="font-size:12.5px;line-height:1.5;color:var(--tS);margin-top:6px">Incluye el mercado de la casa y los productos de aseo del mes.</div>','14px 0 0')}
      </div>''')

def d5():  # MOSAICO — cifra y anillo son UN objeto; debajo teselas pequeñas
    return shell(f'''
      <div class="tile" style="padding:18px 16px 16px;margin-top:20px;overflow:visible">
        <div style="position:absolute;right:-4px;top:-15px">{STAMP}</div>
        <div class="kick"><i></i>Gasto compartido</div>
        <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-top:12px">
          <div>
            <div class="amount mono" style="font-size:40px">−$82.967</div>
            <div class="share" style="margin-top:6px">tu parte de <b>$248.900</b></div>
          </div>
          <div class="ring" style="width:82px;height:82px;flex:0 0 82px">
            <span style="width:62px;height:62px;font-size:14px">3/12</span></div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:16px;padding-top:14px;border-top:1px solid var(--hair)">
          <div><div class="lbl">Resta</div><div class="mono" style="font-size:14px;font-weight:700;margin-top:4px">$746.700</div></div>
          <div><div class="lbl">Próxima</div><div class="mono" style="font-size:14px;font-weight:700;margin-top:4px">22 ago</div></div>
          <div><div class="lbl">Pagado</div><div class="mono" style="font-size:14px;font-weight:700;margin-top:4px">$248.901</div></div>
        </div>
      </div>
      <div style="font-size:17px;font-weight:700;margin:16px 0 12px">Mercado del mes</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
        <div class="tile" style="padding:12px"><div class="lbl">Fecha</div><div style="font-size:22px;font-weight:800;margin-top:5px;letter-spacing:-.8px">22</div><div class="sub2" style="font-size:10px">jul · 19:42</div></div>
        <div class="tile" style="padding:12px"><div class="lbl">Categoría</div><div style="font-size:19px;margin-top:4px">🍽️</div><div class="sub2" style="font-size:10px">Comida · 18%</div></div>
        <div class="tile" style="padding:12px"><div class="lbl">Tarjeta</div><div style="font-size:19px;margin-top:4px">💳</div><div class="sub2" style="font-size:10px">Banco · créd.</div></div>
      </div>
      <div style="margin-top:10px">{tile_shared('')}</div>
      <div style="margin-top:10px">{NOTE}</div>''')

DIRS = [
  ('1-tablero','1 — TABLERO DE FICHAS',
   'Tesis: la cifra manda arriba, todo lo demás son fichas iguales',
   'Bento puro y ordenado: la cifra en tinta de gasto legible (#C62828 en claro, 5,9:1) con el <b>sello</b> a su '
   'derecha, y debajo seis fichas del mismo peso — fecha, categoría, tarjeta, <b>cuotas con anillo</b>, '
   '<b>compartido</b> y nota. <b>Ventaja:</b> escala sin pensar (una ficha por hecho; si no hay tarjeta, desaparece '
   'la ficha). <b>Riesgo:</b> seis cajas del mismo tamaño pueden leerse planas.',
   d1),
  ('2-hoja','2 — HOJA QUE SUBE',
   'Tesis: el detalle no es otra pantalla, es una hoja sobre el historial',
   'Una sola superficie con asa arriba, el <b>sello</b> cruzando su borde y dentro un ritmo de bloques separados por '
   'hairlines: identidad → <b>tu parte emparejada con el anillo grande</b> → chips de tarjeta/nota → compartido → '
   'dos líneas de cierre (resta, próxima cuota). <b>Ventaja:</b> se siente ligera y continúa el gesto de venir del '
   'historial; una sola caja en vez de ocho. <b>Riesgo:</b> menos "tablero", más lista.',
   d2),
  ('3-frase','3 — LA FRASE',
   'Tesis: una frase lo dice todo; las fichas son la letra pequeña',
   'Titular editorial de 26px que resuelve la pantalla en una lectura: «Pagas $82.967 de $248.900 en Mercado del '
   'mes», con las cifras en mono, el <b>sello</b> arriba a la derecha y una línea de apoyo con cuota, personas y '
   'tarjeta. Debajo solo tres fichas: <b>cuotas con anillo</b>, cuándo y <b>compartido</b>. <b>Ventaja:</b> es la que '
   'entiende alguien en 1 segundo. <b>Riesgo:</b> el titular depende del idioma (i18n con frases, no con etiquetas).',
   d3),
  ('4-modulos','4 — MÓDULOS ETIQUETADOS',
   'Tesis: sin cajas; etiquetas, aire y un rail de color',
   'Cero cards: rail vertical de 3px en el color del tipo, cifra grande con el <b>sello</b>, y módulos separados por '
   'hairlines con etiqueta en versalitas — CUÁNDO, CON QUÉ, CUOTAS (<b>anillo inline</b>), COMPARTIDO CON '
   '(<b>avatares + pill</b>), NOTA. <b>Ventaja:</b> la más silenciosa y la más densa sin agobiar; el fondo Aurora se '
   've de verdad. <b>Riesgo:</b> sin cajas hay menos jerarquía visual de la que da un borde.',
   d4),
  ('5-mosaico','5 — MOSAICO (cifra + anillo son un objeto)',
   'Tesis: el dinero y el progreso de la compra son una sola pieza',
   'Ficha héroe que fusiona las dos piezas que te gustaron: <b>cifra y anillo grandes lado a lado</b>, con el '
   '<b>sello</b> asomando por la esquina y un pie de tres cifras (resta, próxima, pagado). Debajo, tres teselas '
   'pequeñas de un vistazo y la ficha de <b>compartido</b> a lo ancho. <b>Ventaja:</b> un único punto de entrada '
   'fuerte y el resto se hojea. <b>Riesgo:</b> la ficha héroe es densa; con 5 participantes hay que cuidarla.',
   d5),
]


HEAD = """<!doctype html>
<html lang="es"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Spendia · Detalle de transacción — 5 opciones v2</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>%s%s</style></head><body>"""

EXTRA = """
.topnav{position:sticky;top:0;z-index:50;background:rgba(10,15,16,.94);backdrop-filter:blur(12px);
  margin:-34px -28px 26px;padding:16px 28px;border-bottom:1px solid #1d2729;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.topnav a{padding:8px 13px;border-radius:50px;font-size:12px;font-weight:700;text-decoration:none;
  background:#141d1f;color:#9fb0b4;border:1px solid #223033;white-space:nowrap}
.topnav a:hover{border-color:#00BCD4;color:#dbe6e8}
.topnav .lg{font-size:12px;font-weight:800;letter-spacing:.4px;color:#00BCD4;margin-right:6px}
section{scroll-margin-top:80px}
.dirhead{margin:52px 0 0;border-top:1px solid #1d2729;padding-top:24px}
section:first-of-type .dirhead{margin-top:8px;border-top:none;padding-top:0}
.num{display:inline-grid;place-items:center;width:26px;height:26px;border-radius:13px;background:#00BCD4;color:#04191c;
  font-size:13px;font-weight:800;margin-right:9px;vertical-align:middle}
"""

KEEPNOTE = ('<div class="keep"><b>Se conservan tal cual las tres piezas que aprobaste:</b> el sello rotado del '
  'estado, la ficha de cuotas con anillo + «resta», y la ficha de compartido con la pila de avatares y el pill. '
  'Solo se les corrigió la tinta para que se lean en modo claro: etiquetas <b>#6B7280</b>, pill <b>#006978</b> '
  '(era 2,5:1 → 5,8:1) y monto <b>#C62828</b> (era 2,78:1 → 5,9:1). El look es el mismo.</div>')

nav = '<div class="topnav"><span class="lg">5 OPCIONES</span>' + ''.join(
    f'<a href="#{slug}">{title.split("—")[0].strip()} · {title.split("—")[1].strip().title()}</a>'
    for slug, title, _, _, _ in DIRS) + '</div>'

secs = ''
for i, (slug, title, thesis, meta, fn) in enumerate(DIRS, 1):
    frames = ''.join(
        f'<div><div class="cap">{i} · {m}</div><div class="frame {m}">{fn()}</div></div>'
        for m in ('dark', 'light'))
    secs += (f'<section id="{slug}"><div class="dirhead"><div class="thesis">{thesis}</div>'
             f'<h2><span class="num">{i}</span>{title.split("—")[1].strip()}</h2>'
             f'<p class="meta">{meta}</p></div><div class="row">{frames}</div></section>')

doc = (HEAD % (CSS, EXTRA) + nav +
  '<h1>Spendia · Detalle de transacción — opciones v2</h1>'
  '<p class="sub">Cinco layouts nuevos construidos <b>alrededor de las tres piezas que aprobaste</b> '
  '(sello rotado, ficha de cuotas con anillo, ficha de compartido con avatares y pill). Lo que cambia en cada '
  'opción es el layout y quién es el héroe — las piezas no se tocan. Cada una en <b>dark y light</b>, 390×844, '
  'con el caso más denso que existe: compartido + cuotas + tarjeta + nota.</p>' + KEEPNOTE + secs +
  '</body></html>')

out = OUT / 'opciones-v2.html'
out.write_text(doc)
print('escrito:', out)
