const KEYWORD_MAP: Record<string, string[]> = {
  food: [
    'almuerzo', 'desayuno', 'cena', 'comida', 'restaurante', 'mercado', 'supermercado',
    'panaderia', 'cafeteria', 'cafe', 'pizza', 'sushi', 'hamburguesa', 'pollo',
    'bandeja', 'arepa', 'empanada', 'fritanga', 'dominos', 'mcdonald', 'burger',
    'subway', 'frisby', 'kokoriko', 'crepes', 'helado', 'postre', 'fruteria',
    'verduras', 'carniceria', 'tienda', 'mini mercado', 'exito', 'jumbo', 'carulla',
    'colsubsidio', 'surtimax', 'snack', 'bebida', 'jugo', 'rappi food', 'domicilio',
    'lunch', 'brunch', 'tacos', 'sopa', 'sancocho', 'arepas', 'pandebono',
  ],
  transport: [
    'uber', 'taxi', 'cabify', 'indriver', 'beat', 'bus', 'metro', 'transmilenio',
    'sitp', 'mio', 'gasolina', 'combustible', 'parqueadero', 'peaje', 'autopista',
    'tiquete', 'pasaje', 'vuelo', 'aeropuerto', 'avianca', 'latam', 'wingo',
    'rappi moto', 'moto', 'bicicleta', 'patineta', 'mantenimiento carro', 'aceite',
    'lavadero', 'carro', 'autobus', 'intermunicipal', 'flota',
  ],
  health: [
    'farmacia', 'drogueria', 'medico', 'clinica', 'hospital', 'consulta',
    'cita medica', 'pastillas', 'medicamento', 'medicina', 'odontologo', 'dentista',
    'optometra', 'gafas', 'eps', 'medicina prepagada', 'seguro medico', 'vacuna',
    'examen', 'laboratorio', 'psicologo', 'terapia', 'gym', 'gimnasio', 'crossfit',
    'yoga', 'vitaminas', 'suplemento', 'proteina', 'enfermedad', 'salud',
  ],
  entertainment: [
    'netflix', 'spotify', 'disney', 'amazon prime', 'youtube premium', 'hbo', 'max',
    'cine', 'teatro', 'concierto', 'evento', 'entrada', 'bar', 'rumba', 'discoteca',
    'club', 'fiesta', 'trago', 'cerveza', 'aguardiente', 'ron', 'whisky', 'vino',
    'juego', 'videojuego', 'steam', 'playstation', 'xbox', 'nintendo', 'libro',
    'revista', 'streaming', 'suscripcion', 'paseo', 'viaje', 'hotel', 'hostal',
    'airbnb', 'vacaciones', 'parque', 'escape room', 'bolos', 'karaoke',
  ],
  shopping: [
    'ropa', 'zapatos', 'tenis', 'camisa', 'pantalon', 'vestido', 'falda', 'chaqueta',
    'bolso', 'maleta', 'amazon', 'mercado libre', 'shein', 'zara', 'adidas', 'nike',
    'studio f', 'armi', 'falabella', 'alkosto', 'ktronix', 'centro comercial',
    'accesorios', 'joyeria', 'reloj', 'maquillaje', 'cosmeticos', 'perfume', 'crema',
    'shampoo', 'cuidado personal', 'celular', 'laptop', 'computador', 'tablet',
    'electronico', 'auriculares', 'cable', 'funda', 'caso',
  ],
  home: [
    'arriendo', 'alquiler', 'administracion', 'luz', 'electricidad', 'agua', 'gas',
    'internet', 'tv cable', 'claro', 'movistar', 'tigo', 'etb', 'directv', 'aseo',
    'limpieza', 'detergente', 'jabon', 'papel higienico', 'mudanza', 'mueble', 'silla',
    'colchon', 'nevera', 'lavadora', 'estufa', 'microondas', 'reparacion', 'plomero',
    'electricista', 'pintura', 'cerradura', 'seguro hogar', 'hipoteca', 'cuota casa',
    'decoracion', 'cortinas', 'toallas',
  ],
  salary: [
    'nomina', 'salario', 'sueldo', 'quincena', 'honorarios', 'freelance', 'proyecto',
    'factura cobrada', 'cliente pago', 'consultoria', 'dividendos', 'arrendamiento cobrado',
    'bono', 'comision recibida', 'prima', 'cesantias', 'ingreso', 'transferencia recibida',
    'deposito', 'pago recibido',
  ],
  other: [
    'impuesto', 'multa', 'banco', 'comision banco', 'retiro', 'cajero', 'donacion',
    'regalo', 'mascota', 'veterinario', 'colegio', 'universidad', 'matricula',
    'utiles', 'papeleria', 'seguro', 'pension', 'credito', 'deuda', 'prestamo',
  ],
};

export function categorizeLocal(description: string): string[] {
  const normalize = (s: string): string =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const normalizedDesc = normalize(description);
  const matches: string[] = [];
  for (const [cat, keywords] of Object.entries(KEYWORD_MAP)) {
    for (const kw of keywords) {
      if (normalizedDesc.includes(normalize(kw))) {
        if (!matches.includes(cat)) matches.push(cat);
        break;
      }
    }
  }
  return matches;
}

export async function categorizeWithGemini(description: string, apiKey: string): Promise<string | null> {
  const VALID = ['food', 'transport', 'health', 'entertainment', 'shopping', 'home', 'salary', 'other'];
  const prompt = `Clasifica este gasto o ingreso en UNA de estas categorías exactas: food, transport, health, entertainment, shopping, home, salary, other. Responde ÚNICAMENTE con la palabra de la categoría en inglés, sin explicación ni puntuación. Gasto/ingreso: "${description}"`;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 10, temperature: 0 },
        }),
      }
    );
    const data: unknown = await res.json();
    const text = (data as { candidates?: [{ content?: { parts?: [{ text?: string }] } }] })
      ?.candidates?.[0]?.content?.parts?.[0]?.text
      ?.trim()
      .toLowerCase()
      .replace(/[^a-z]/g, '');
    return text !== undefined && VALID.includes(text) ? text : null;
  } catch {
    return null;
  }
}
