import { useRef, type ReactNode } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../config/fonts';
import ScreenTransition, { ScreenTransitionRef } from '../components/ScreenTransition';
import ScreenBackground from '../components/ScreenBackground';

const LAST_UPDATED = '29 de abril de 2026';
const CONTACT_EMAIL = 'andres.mancilla@ikualo.com';
const CONTACT_PHONE = '+57 320 749 2444';
const WEBSITE = 'https://spendia.co';

function Section({ title, children }: { title: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
      {children}
    </View>
  );
}

function P({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return <Text style={[styles.paragraph, { color: colors.textSecondary }]}>{children}</Text>;
}

function Li({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.listItem}>
      <Text style={[styles.bullet, { color: colors.primary }]}>•</Text>
      <Text style={[styles.listText, { color: colors.textSecondary }]}>{children}</Text>
    </View>
  );
}

export default function PrivacyScreen() {
  const { colors } = useTheme();
  const transitionRef = useRef<ScreenTransitionRef>(null);

  const handleBack = () => {
    const go = () => router.canGoBack() ? router.back() : router.replace('/(auth)/login' as any);
    if (transitionRef.current) {
      transitionRef.current.animateOut(go);
    } else {
      router.back();
    }
  };

  return (
    <ScreenTransition ref={transitionRef}>
      <SafeAreaView style={styles.safe}>
        <ScreenBackground>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
                <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            <View style={styles.headerTitles}>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Política de Privacidad</Text>
              <Text style={[styles.headerSub, { color: colors.textTertiary }]}>Spendia · Última actualización: {LAST_UPDATED}</Text>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <Section title="1. Responsable del Tratamiento">
              <P>
                El responsable del tratamiento de sus datos personales es Andrés Mancilla (en adelante "Spendia" o "el Responsable"),
                identificado con domicilio en Colombia, accesible en {WEBSITE}, correo electrónico {CONTACT_EMAIL}
                y teléfono/WhatsApp {CONTACT_PHONE}.
              </P>
            </Section>

            <Section title="2. Marco Legal Aplicable">
              <P>
                Esta política se rige por la legislación colombiana vigente en materia de protección de datos personales, en especial:
              </P>
              <Li>Ley 1581 de 2012 — Régimen General de Protección de Datos Personales.</Li>
              <Li>Decreto 1377 de 2013 — Reglamentación parcial de la Ley 1581 de 2012.</Li>
              <Li>Ley 1266 de 2008 — Disposiciones generales de Habeas Data.</Li>
              <Li>Ley 527 de 1999 — Mensajes de datos y comercio electrónico.</Li>
              <P>
                La entidad de supervisión competente es la Superintendencia de Industria y Comercio (SIC)
                de la República de Colombia.
              </P>
            </Section>

            <Section title="3. Datos Personales Recopilados">
              <P>Spendia recopila los siguientes datos personales:</P>
              <Li>Datos de identificación: nombre completo y dirección de correo electrónico (obtenidos mediante autenticación Google o registro directo).</Li>
              <Li>Datos financieros personales: registros de ingresos y gastos, categorías, montos, fechas y descripciones ingresadas por el usuario.</Li>
              <Li>Datos de grupos de gastos: información sobre miembros de grupos y deudas compartidas cuando el usuario utiliza esta funcionalidad.</Li>
              <Li>Datos de configuración: preferencias de idioma, tema visual y paleta de color seleccionada.</Li>
              <Li>Datos técnicos: versión de la aplicación, plataforma del dispositivo (Android/iOS/web) y marca de tiempo de último acceso.</Li>
              <P>
                Spendia NO recopila datos de geolocalización, datos biométricos con fines de identificación, ni información
                de tarjetas de crédito o débito. La aplicación no accede a cuentas bancarias reales.
              </P>
            </Section>

            <Section title="4. Finalidad del Tratamiento">
              <P>Los datos personales recopilados son tratados para las siguientes finalidades:</P>
              <Li>Prestación del servicio: autenticación del usuario y sincronización de sus registros financieros personales.</Li>
              <Li>Personalización: adaptar la interfaz visual y el idioma según las preferencias del usuario.</Li>
              <Li>Seguridad: verificación de identidad, recuperación de PIN y detección de accesos no autorizados.</Li>
              <Li>Soporte técnico: atención de solicitudes, preguntas y reportes de errores.</Li>
              <Li>Mejora del servicio: análisis agregado y anónimo del uso de funcionalidades para mejorar la aplicación.</Li>
              <Li>Comunicaciones transaccionales: envío de correos relacionados exclusivamente con el funcionamiento de la cuenta (recuperación de PIN, notificaciones de seguridad).</Li>
            </Section>

            <Section title="5. Base Legal del Tratamiento">
              <P>
                El tratamiento de sus datos se fundamenta en el consentimiento libre, previo, expreso e informado del titular,
                otorgado en el momento del registro y/o inicio de sesión en la aplicación Spendia, de conformidad con el
                artículo 9 de la Ley 1581 de 2012. Algunos tratamientos adicionales se fundamentan en la ejecución del
                contrato de prestación del servicio o en obligaciones legales aplicables.
              </P>
            </Section>

            <Section title="6. Derechos del Titular">
              <P>Como titular de datos personales, usted tiene derecho a:</P>
              <Li>Conocer, actualizar y rectificar sus datos personales.</Li>
              <Li>Solicitar prueba de la autorización otorgada para el tratamiento.</Li>
              <Li>Ser informado sobre el uso dado a sus datos personales.</Li>
              <Li>Presentar quejas ante la Superintendencia de Industria y Comercio (SIC) por infracciones a la Ley 1581 de 2012.</Li>
              <Li>Revocar la autorización y/o solicitar la supresión de sus datos, salvo que exista deber legal de conservarlos.</Li>
              <Li>Acceder gratuitamente a sus datos personales tratados.</Li>
              <P>
                Para ejercer estos derechos, puede contactarnos en {CONTACT_EMAIL} o a través de WhatsApp al {CONTACT_PHONE}.
                Respondemos en un máximo de 15 días hábiles para consultas y 15 días hábiles para reclamos, prorrogables
                según la ley.
              </P>
            </Section>

            <Section title="7. Transferencia Internacional de Datos">
              <P>
                Los datos personales son almacenados en la infraestructura de Google Firebase (Google LLC), con servidores
                ubicados principalmente en Estados Unidos. Esta transferencia se realiza bajo las garantías de privacidad
                establecidas por Google LLC, que ha adoptado mecanismos de cumplimiento reconocidos internacionalmente,
                incluyendo cláusulas contractuales estándar aprobadas por autoridades de protección de datos.
              </P>
              <P>
                Adicionalmente, el servicio de envío de correos electrónicos es prestado por Resend Inc., con servidores
                en Estados Unidos. No se transfieren datos a otras jurisdicciones distintas a las indicadas.
              </P>
            </Section>

            <Section title="8. Conservación de los Datos">
              <P>
                Sus datos personales se conservarán mientras mantenga una cuenta activa en Spendia. Una vez solicite la
                eliminación de su cuenta, procederemos a eliminar sus datos en un plazo máximo de 30 días calendario,
                salvo que exista una obligación legal de conservarlos por un período mayor.
              </P>
              <P>
                Los registros de transacciones y configuraciones son eliminados de forma permanente e irrecuperable tras
                la eliminación de cuenta. Los respaldos en sistemas de Google Firebase pueden tardar hasta 90 días
                adicionales en purgar por completo.
              </P>
            </Section>

            <Section title="9. Seguridad de la Información">
              <P>
                Spendia implementa medidas técnicas y organizativas para proteger sus datos personales contra acceso no
                autorizado, pérdida, alteración o destrucción, incluyendo:
              </P>
              <Li>Autenticación segura mediante Firebase Authentication con soporte de proveedores OAuth 2.0.</Li>
              <Li>Transmisión cifrada de datos mediante HTTPS/TLS.</Li>
              <Li>Reglas de seguridad de Firestore que restringen el acceso exclusivamente al propietario de cada registro.</Li>
              <Li>PIN de acceso adicional almacenado de forma cifrada en el dispositivo del usuario.</Li>
              <Li>Códigos OTP de un solo uso para recuperación de PIN, con expiración de 10 minutos.</Li>
            </Section>

            <Section title="10. Menores de Edad">
              <P>
                Spendia no está dirigida a menores de 18 años y no recopila deliberadamente datos de personas menores de edad.
                Si usted es padre, madre o tutor y tiene conocimiento de que su hijo/a menor ha proporcionado datos
                personales, contáctenos para proceder a su eliminación inmediata.
              </P>
            </Section>

            <Section title="11. Modificaciones a esta Política">
              <P>
                Spendia se reserva el derecho de modificar esta Política de Privacidad en cualquier momento. Los cambios
                sustanciales serán notificados mediante la aplicación o por correo electrónico con al menos 15 días de
                anticipación. El uso continuado de la aplicación tras la vigencia de los cambios implica aceptación de
                la nueva política.
              </P>
            </Section>

            <Section title="12. Contacto">
              <P>Para cualquier consulta, solicitud o reclamo relacionado con el tratamiento de sus datos personales:</P>
              <Li>Correo electrónico: {CONTACT_EMAIL}</Li>
              <Li>WhatsApp: {CONTACT_PHONE}</Li>
              <Li>Sitio web: {WEBSITE}</Li>
              <P>
                También puede presentar una petición, queja o recurso directamente ante la
                Superintendencia de Industria y Comercio de Colombia en www.sic.gov.co.
              </P>
            </Section>

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.textTertiary }]}>
                © 2026 Spendia. Todos los derechos reservados.{'\n'}Esta política fue actualizada el {LAST_UPDATED}.
              </Text>
            </View>
          </ScrollView>
        </ScreenBackground>
      </SafeAreaView>
    </ScreenTransition>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitles: { flex: 1 },
  headerTitle: { fontSize: 17, fontFamily: Fonts.bold },
  headerSub: { fontSize: 12, fontFamily: Fonts.regular, marginTop: 2 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxWidth: 720,
    alignSelf: 'center',
    width: '100%',
  },
  section: { marginBottom: 28 },
  sectionTitle: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    marginBottom: 10,
  },
  paragraph: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    lineHeight: 22,
    marginBottom: 8,
  },
  listItem: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
    paddingLeft: 4,
  },
  bullet: { fontSize: 14, fontFamily: Fonts.bold, marginTop: 1 },
  listText: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.regular,
    lineHeight: 21,
  },
  footer: {
    marginTop: 16,
    paddingTop: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 18,
  },
});
