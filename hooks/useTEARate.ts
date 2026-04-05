import { useState } from 'react';

// Tasa de Usura certificada por la Superfinanciera para Consumo y Ordinario.
// Este es el techo legal de interés para tarjetas de crédito y créditos de consumo.
// Fuente: https://www.superfinanciera.gov.co/publicaciones/10097710
// Actualizar cada trimestre cuando la Superfinanciera certifique el nuevo valor.
// Q1 2026 (enero–marzo 2026): 25.52% EA
const REFERENCE_TEA = 25.52;

export function useTEARate() {
  const [tea] = useState<number>(REFERENCE_TEA);

  return { tea, loading: false };
}
