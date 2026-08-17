/**
 * Cuerpo de los documentos legales (privacidad y términos) renderizado desde i18n.
 *
 * Antes era JSX en español incrustado en cada pantalla con un aviso de "traducción
 * pendiente" para el resto de idiomas: la ficha de las tiendas exige la política en
 * el idioma de la app. El texto vive ahora en `locales/*.json`
 * (`legal.privacySections`, `legal.termsSections`) como lista de secciones.
 *
 * El español es la versión que manda; en inglés e italiano la pantalla muestra el
 * aviso `legal.translationNotice` diciéndolo, que es la práctica habitual cuando la
 * ley aplicable es la del país del texto original.
 */
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { accentInk } from '../utils/contrast';
import { Fonts } from '../config/fonts';

export interface LegalBlock { type: 'p' | 'li'; text: string }
export interface LegalSection { title: string; blocks: LegalBlock[] }

export default function LegalBody({ i18nKey, vars }: {
  i18nKey: 'legal.privacySections' | 'legal.termsSections';
  vars: Record<string, string>;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const secciones = t(i18nKey, { returnObjects: true }) as unknown as LegalSection[];

  // Si el idioma activo se quedara sin el bloque, mejor no pintar nada que soltarle
  // al usuario el nombre de la clave en una pantalla legal.
  if (!Array.isArray(secciones)) return null;

  const bullet = accentInk(colors, 'primary', colors.background);

  return (
    <>
      {secciones.map((sec) => (
        <View key={sec.title} style={s.section}>
          <Text style={[s.title, { color: colors.textPrimary }]}>{sec.title}</Text>
          {sec.blocks.map((b, i) =>
            b.type === 'li' ? (
              <View key={i} style={s.item}>
                <Text style={[s.bullet, { color: bullet }]}>•</Text>
                <Text style={[s.itemText, { color: colors.textSecondary }]}>{fill(b.text, vars)}</Text>
              </View>
            ) : (
              <Text key={i} style={[s.paragraph, { color: colors.textSecondary }]}>{fill(b.text, vars)}</Text>
            ),
          )}
        </View>
      ))}
    </>
  );
}

/** Interpolación a mano: el texto viene de un array, no de `t()` con opciones. */
function fill(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}

const s = StyleSheet.create({
  section: { marginBottom: 24 },
  title: { fontFamily: Fonts.bold, fontSize: 16, marginBottom: 10 },
  paragraph: { fontFamily: Fonts.regular, fontSize: 14, lineHeight: 22, marginBottom: 10 },
  item: { flexDirection: 'row', marginBottom: 7, paddingLeft: 4 },
  bullet: { fontFamily: Fonts.bold, fontSize: 14, lineHeight: 22, marginRight: 8 },
  itemText: { flex: 1, fontFamily: Fonts.regular, fontSize: 14, lineHeight: 22 },
});
