const EMOJI_KEYWORDS: [string[], string][] = [
  // ── Comidas específicas ──────────────────────────────────────────
  [['hamburguesa','burger','hamburguer'], '🍔'],
  [['pizza','pizzeria'], '🍕'],
  [['sushi','japonesa','ramen','japones','wok'], '🍣'],
  [['pollo','chicken','asado','parrilla','bbq','brasa'], '🍗'],
  [['tacos','mexicana','burrito','quesadilla'], '🌮'],
  [['pasta','espagueti','italiana','lasagna'], '🍝'],
  [['ensalada','vegano','vegetariano','saludable','verdura'], '🥗'],
  [['sandwich','sub','wrap','perro caliente','hotdog'], '🥪'],
  [['arepa','bandeja','colombiana','sancocho','frijoles'], '🫕'],
  [['mariscos','camarones','pescado','langosta','ceviche'], '🦞'],
  [['helado','heladeria'], '🍦'],
  [['postre','dulce','torta','pastel','cake','brownie','galleta'], '🍰'],
  [['chocolate','choco'], '🍫'],
  [['fruta','fresas','mango','banano','jugos'], '🍓'],
  [['panaderia','pan','croissant','ponque'], '🥐'],
  [['cafe','cafeteria','espresso','latte','tinto'], '☕'],
  [['desayuno','brunch','huevos','avena'], '🍳'],
  [['pizza delivery','domicilio','rappi','ifood'], '🛵'],

  // ── Bebidas ──────────────────────────────────────────────────────
  [['cerveza','trago','licor','aguardiente','ron','whisky','discoteca','cantina'], '🍺'],
  [['vino','copa','maridaje'], '🍷'],
  [['coctel','mojito','margarita','limonada'], '🍹'],
  [['agua','jugo','gaseosa','bebida','hidratacion'], '🥤'],

  // ── Restaurante / General comida ─────────────────────────────────
  [['comida','restaurante','almuerzo','cena','mercado','cocina','rancho'], '🍽️'],

  // ── Transporte ───────────────────────────────────────────────────
  [['gasolina','combustible','nafta','tanqueo'], '⛽'],
  [['peaje','autopista','carretera'], '🛣️'],
  [['taxi','uber','didi','cabify','indriver'], '🚕'],
  [['bus','buseta','transmilenio','metro','mio','sitp'], '🚌'],
  [['avion','vuelo','aeropuerto','aerolinea','tiquete'], '✈️'],
  [['bici','bicicleta','ciclovía'], '🚲'],
  [['moto','motocicleta','scooter'], '🏍️'],
  [['parqueadero','parking','parqueo'], '🅿️'],
  [['transporte','carro','auto','vehiculo','conductor'], '🚗'],

  // ── Salud ────────────────────────────────────────────────────────
  [['farmacia','drogueria','medicamento','pastilla','droga'], '💊'],
  [['medico','doctor','consulta','clinica','hospital','urgencias'], '🏥'],
  [['gym','gimnasio','crossfit','pesas','entrenamiento','fitness'], '🏋️'],
  [['yoga','meditacion','pilates','bienestar'], '🧘'],
  [['optica','lentes','gafas'], '👓'],
  [['dental','odontologia','ortodoncista','braces'], '🦷'],
  [['psicologia','terapia','psiquiatria'], '🧠'],
  [['vitamina','suplemento','proteina','creatina'], '💪'],
  [['salud','eps','medicina'], '💊'],

  // ── Entretenimiento ──────────────────────────────────────────────
  [['netflix','hbo','disney','prime','streaming','suscripcion'], '📺'],
  [['spotify','apple music','deezer','musica'], '🎵'],
  [['cine','pelicula','teatro','obra'], '🎬'],
  [['videojuego','playstation','xbox','nintendo','steam'], '🎮'],
  [['concierto','evento','festival','show','boleta'], '🎤'],
  [['libro','audible','kindle','lectura'], '📖'],
  [['podcast','radio'], '🎙️'],
  [['ocio','entretenimiento','diversión','hobby'], '🎉'],
  [['fiesta','rumba','discoteca','clubbing'], '🪩'],
  [['karaoke'], '🎤'],
  [['escape room','bowling','billar','juegos'], '🎳'],

  // ── Compras / Ropa ───────────────────────────────────────────────
  [['ropa','camisa','pantalon','vestido','falda','pijama'], '👕'],
  [['zapatos','tenis','botas','sandalias','zapatillas'], '👟'],
  [['bolso','cartera','maleta','mochila'], '👜'],
  [['joyeria','aretes','collar','pulsera','anillo'], '💍'],
  [['amazon','mercadolibre','shein','aliexpress','online'], '📦'],
  [['supermercado','exito','carulla','jumbo','d1','ara','lidl'], '🛒'],
  [['tienda','boutique','moda','shopping','centro comercial'], '🛍️'],

  // ── Hogar ────────────────────────────────────────────────────────
  [['arriendo','alquiler','renta','hipoteca'], '🏠'],
  [['luz','energia','electrica','electricidad','epm'], '💡'],
  [['agua','acueducto','alcantarillado'], '🚿'],
  [['gas','naturgas','gasnaturales'], '🔥'],
  [['internet','wifi','fibra','movistar','claro','tigo'], '📡'],
  [['telefonia','celular','plan','minutos'], '📱'],
  [['mueble','sofa','cama','colchon','armario'], '🛋️'],
  [['decoracion','cuadro','lampara','alfombra','cortina'], '🪴'],
  [['limpieza','aseo','jabon','detergente','escoba'], '🧹'],
  [['ferreteria','herramienta','reparacion','plomeria'], '🔧'],
  [['electrodomestico','nevera','lavadora','microondas'], '🫙'],
  [['hogar','casa','vivienda','servicios'], '🏡'],

  // ── Ingresos / Finanzas ──────────────────────────────────────────
  [['salario','sueldo','nomina','quincena','pago mensual'], '💰'],
  [['freelance','honorarios','proyecto','cliente'], '💼'],
  [['inversion','dividendo','rendimiento','acciones','cripto'], '📈'],
  [['ahorro','alcancia','deposito'], '🐷'],
  [['prestamo','credito','deuda','cuota'], '🏦'],
  [['trabajo','empleo','negocio','empresa'], '💳'],
  [['transferencia','consignacion','remesa'], '💸'],
  [['bono','prima','comision','incentivo'], '🎯'],

  // ── Mascotas ─────────────────────────────────────────────────────
  [['perro','dogfood','paseador'], '🐶'],
  [['gato','arena','felino'], '🐱'],
  [['veterinario','vacuna pet','desparasitacion'], '🩺'],
  [['mascota','pet','animal'], '🐾'],

  // ── Viajes ───────────────────────────────────────────────────────
  [['hotel','hostal','airbnb','alojamiento'], '🏨'],
  [['turismo','tour','excursion','paseo'], '🗺️'],
  [['vacaciones','viaje','viaje de negocios'], '🧳'],
  [['visa','pasaporte','tramite viaje'], '🛂'],

  // ── Educación ────────────────────────────────────────────────────
  [['universidad','carrera','semestre','matricula'], '🎓'],
  [['colegio','escuela','primaria','bachillerato'], '🏫'],
  [['curso','udemy','coursera','platzi','capacitacion'], '💻'],
  [['libro','cuaderno','papeleria','lapiz'], '📚'],
  [['idioma','ingles','frances','clases'], '🌐'],

  // ── Tecnología ───────────────────────────────────────────────────
  [['celular','telefono','iphone','android','samsung'], '📱'],
  [['computador','laptop','macbook','pc','desktop'], '💻'],
  [['tablet','ipad'], '📲'],
  [['audifonos','airpods','earbuds'], '🎧'],
  [['smartwatch','reloj inteligente','apple watch'], '⌚'],
  [['camara','foto','fotografia'], '📷'],
  [['tv','television','smart tv'], '📺'],
  [['consola','gaming','ps5','xbox'], '🕹️'],
  [['tecnologia','electronico','gadget'], '🔌'],

  // ── Belleza / Cuidado personal ───────────────────────────────────
  [['peluqueria','corte','barberia','tinte'], '💈'],
  [['maquillaje','labial','base','sombra'], '💄'],
  [['spa','masaje','relajacion','facial'], '💆'],
  [['perfume','colonia','fragancia'], '🌸'],
  [['cosmeticos','crema','locion','serum'], '🧴'],
  [['manicure','pedicure','unas'], '💅'],
  [['belleza','estetica','cuidado personal'], '✨'],

  // ── Deporte ──────────────────────────────────────────────────────
  [['futbol','cancha','partido'], '⚽'],
  [['natacion','piscina','aqua'], '🏊'],
  [['correr','running','maraton','trail'], '🏃'],
  [['ciclismo','ruta','btt'], '🚴'],
  [['tenis','padel','squash'], '🎾'],
  [['basketball','baloncesto'], '🏀'],
  [['deporte','actividad fisica'], '🏅'],

  // ── Familia / Niños ──────────────────────────────────────────────
  [['bebe','recien nacido','panal','formula'], '🍼'],
  [['juguete','lego','muneca'], '🧸'],
  [['guarderia','jardin','colegio nino'], '🎒'],
  [['nino','hijo','familia'], '👨‍👩‍👧'],

  // ── Seguros / Legal ──────────────────────────────────────────────
  [['seguro','poliza','axa','sura','mapfre'], '🛡️'],
  [['abogado','notaria','juridico','legal'], '⚖️'],
  [['impuesto','dian','declaracion','iva','retefuente'], '📋'],
  [['multa','comparendo','sancion'], '🚨'],

  // ── Donaciones / Espiritual ──────────────────────────────────────
  [['iglesia','diezmo','ofrenda','misa'], '⛪'],
  [['donacion','caridad','ong','voluntariado'], '🤲'],

  // ── Otros ────────────────────────────────────────────────────────
  [['suscripcion','membresia','anualidad'], '🔄'],
  [['regalo','cumpleanos','navidad','obsequio','detalle'], '🎁'],
  [['emergencia','imprevisto','urgente'], '🚨'],
  [['trabajo remoto','home office','coworking'], '🏢'],
  [['fotografia','sesion','estudio foto'], '📸'],
  [['arte','pintura','manualidades'], '🎨'],
  [['jardineria','plantas','semillas'], '🌱'],
];

const normalize = (s: string): string =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export function suggestEmojiLocal(name: string): string | null {
  const n = normalize(name);
  for (const [keywords, emoji] of EMOJI_KEYWORDS) {
    if (keywords.some(kw => n.includes(normalize(kw)))) return emoji;
  }
  return null;
}

interface GeminiResponse {
  candidates?: {
    content?: {
      parts?: { text?: string }[];
    };
  }[];
}

export async function suggestEmojiWithGemini(name: string, apiKey: string): Promise<string | null> {
  if (!apiKey) return null;
  const prompt = `Sugiere UN único emoji que represente visualmente esta categoría financiera: "${name}". Responde ÚNICAMENTE con el emoji, sin texto ni explicación.`;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 5, temperature: 0.3 },
        }),
      }
    );
    const data = await res.json() as GeminiResponse;
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;
    if (text && text.length <= 8 && /\p{Emoji}/u.test(text)) return text;
    return null;
  } catch {
    return null;
  }
}
