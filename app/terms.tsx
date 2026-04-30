import { useRef, type ReactNode } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
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

export default function TermsScreen() {
  const { colors } = useTheme();
  const transitionRef = useRef<ScreenTransitionRef>(null);

  const handleBack = () => {
    if (transitionRef.current) {
      transitionRef.current.animateOut(() => router.back());
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
            {router.canGoBack() && (
              <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
                <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            )}
            <View style={styles.headerTitles}>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Términos y Condiciones</Text>
              <Text style={[styles.headerSub, { color: colors.textTertiary }]}>Spendia · Última actualización: {LAST_UPDATED}</Text>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <Section title="1. Partes y Aceptación">
              <P>
                Los presentes Términos y Condiciones de Uso (en adelante "Términos") regulan la relación contractual
                entre Andrés Mancilla, desarrollador de Spendia (en adelante "Spendia", "nosotros" o "el Prestador"),
                domiciliado en Colombia, y usted como usuario de la aplicación (en adelante "el Usuario" o "usted").
              </P>
              <P>
                Al registrarse, iniciar sesión o utilizar la aplicación Spendia de cualquier forma, usted declara
                haber leído, entendido y aceptado en su totalidad estos Términos. Si no está de acuerdo con alguno
                de ellos, deberá abstenerse de usar el servicio.
              </P>
            </Section>

            <Section title="2. Descripción del Servicio">
              <P>
                Spendia es una aplicación de control y gestión de finanzas personales que permite a los usuarios:
              </P>
              <Li>Registrar y categorizar ingresos y gastos personales.</Li>
              <Li>Visualizar reportes y estadísticas de hábitos financieros.</Li>
              <Li>Gestionar grupos de gastos compartidos entre personas conocidas.</Li>
              <Li>Establecer metas de ahorro y presupuestos personales.</Li>
              <Li>Organizar tarjetas y cuentas personales de forma referencial (sin acceso real a cuentas bancarias).</Li>
              <P>
                Spendia es una herramienta de registro informativo. No está vinculada a ninguna entidad financiera,
                banco, cooperativa o plataforma de pagos, y no realiza transacciones de dinero reales.
              </P>
            </Section>

            <Section title="3. Registro y Cuenta de Usuario">
              <P>
                Para acceder al servicio, el Usuario debe crear una cuenta mediante autenticación con Google o
                mediante correo electrónico y contraseña. El Usuario es responsable de:
              </P>
              <Li>Proporcionar información veraz y actualizada durante el registro.</Li>
              <Li>Mantener la confidencialidad de su PIN y credenciales de acceso.</Li>
              <Li>Notificar inmediatamente a Spendia de cualquier uso no autorizado de su cuenta.</Li>
              <Li>Todos los actos realizados bajo su cuenta, independientemente de quién los ejecute.</Li>
              <P>
                Cada usuario podrá tener únicamente una cuenta activa. La creación de múltiples cuentas con fines
                fraudulentos está expresamente prohibida y podrá dar lugar a la suspensión del servicio.
              </P>
            </Section>

            <Section title="4. Uso Aceptable">
              <P>El Usuario se compromete a utilizar Spendia únicamente para fines lícitos y personales. Queda expresamente prohibido:</P>
              <Li>Usar la aplicación para actividades ilegales, fraudulentas o que violen derechos de terceros.</Li>
              <Li>Intentar acceder a datos de otros usuarios sin autorización.</Li>
              <Li>Realizar ingeniería inversa, descompilar o intentar extraer el código fuente de la aplicación.</Li>
              <Li>Introducir virus, malware o cualquier elemento dañino en la plataforma.</Li>
              <Li>Revender, sublicenciar o comercializar el acceso al servicio sin autorización expresa.</Li>
              <Li>Usar scripts automatizados o bots para interactuar con la aplicación.</Li>
              <P>
                El incumplimiento de estas prohibiciones faculta a Spendia para suspender o eliminar la cuenta
                del Usuario sin previo aviso y sin responsabilidad alguna.
              </P>
            </Section>

            <Section title="5. Funciones Premium">
              <P>
                Spendia ofrece funcionalidades adicionales bajo una modalidad de suscripción Premium. El acceso
                a estas funciones requiere el pago de una tarifa periódica establecida en la aplicación.
              </P>
              <P>
                Los pagos se realizan a través de medios de pago disponibles en Colombia (Nequi, Daviplata u otros
                habilitados), directamente al desarrollador. Spendia no utiliza plataformas de pago internacionales
                automatizadas. Una vez acreditado el pago, el acceso Premium es habilitado manualmente en un plazo
                máximo de 24 horas hábiles.
              </P>
              <P>
                Las tarifas están sujetas a cambios con previo aviso de al menos 30 días. Los períodos ya pagados
                no son reembolsables salvo falla técnica atribuible exclusivamente a Spendia. Spendia se reserva
                el derecho de modificar, suspender o discontinuar funciones Premium en cualquier momento, notificando
                al Usuario con al menos 15 días de anticipación.
              </P>
            </Section>

            <Section title="6. Propiedad Intelectual">
              <P>
                Todos los derechos de propiedad intelectual sobre Spendia, incluyendo pero no limitándose a: software,
                código fuente, diseño gráfico, logotipo, textos, iconos y funcionalidades, son propiedad exclusiva
                de Andrés Mancilla y están protegidos por la Ley 23 de 1982 (Derechos de Autor en Colombia) y
                convenios internacionales aplicables.
              </P>
              <P>
                Se otorga al Usuario una licencia personal, intransferible, no exclusiva y revocable para usar
                la aplicación exclusivamente conforme a estos Términos. Esta licencia no implica cesión de
                derechos de propiedad intelectual de ningún tipo.
              </P>
            </Section>

            <Section title="7. Privacidad y Protección de Datos">
              <P>
                El tratamiento de datos personales se rige por la Política de Privacidad de Spendia, disponible en
                {WEBSITE}/privacy, que forma parte integral de estos Términos. Al aceptar los presentes Términos,
                el Usuario también acepta la Política de Privacidad.
              </P>
              <P>
                Los datos financieros ingresados en Spendia son de carácter exclusivamente personal y referencial.
                Spendia no comparte, vende ni utiliza estos datos con fines publicitarios o de perfilamiento
                comercial.
              </P>
            </Section>

            <Section title="8. Disponibilidad y Modificaciones del Servicio">
              <P>
                Spendia no garantiza disponibilidad ininterrumpida del servicio. Pueden existir interrupciones
                por mantenimiento, actualizaciones o causas de fuerza mayor. Se realizarán esfuerzos razonables
                para notificar mantenimientos programados con antelación.
              </P>
              <P>
                Spendia se reserva el derecho de modificar, actualizar, suspender o discontinuar total o
                parcialmente el servicio en cualquier momento, con notificación previa cuando sea posible.
                Las actualizaciones de la aplicación podrán requerir versiones mínimas del sistema operativo
                del dispositivo.
              </P>
            </Section>

            <Section title="9. Limitación de Responsabilidad">
              <P>
                En la máxima medida permitida por la ley colombiana, Spendia no será responsable por:
              </P>
              <Li>Decisiones financieras tomadas por el Usuario basadas en la información registrada en la aplicación.</Li>
              <Li>Pérdida de datos por causas ajenas a Spendia, incluyendo fallas del dispositivo del Usuario o eliminación voluntaria.</Li>
              <Li>Daños indirectos, incidentales, especiales o consecuentes derivados del uso o imposibilidad de uso del servicio.</Li>
              <Li>Interrupciones del servicio causadas por terceros (proveedores de infraestructura, operadores de internet, etc.).</Li>
              <Li>Accesos no autorizados a la cuenta del Usuario derivados de negligencia en la custodia de sus credenciales.</Li>
              <P>
                La responsabilidad total de Spendia frente al Usuario, por cualquier causa, no podrá exceder el
                monto pagado por el Usuario en los últimos tres (3) meses por concepto de suscripción Premium, o
                cero (0) pesos si el Usuario usa el plan gratuito.
              </P>
            </Section>

            <Section title="10. Modificaciones a los Términos">
              <P>
                Spendia podrá modificar los presentes Términos en cualquier momento. Los cambios sustanciales
                serán notificados mediante la aplicación o por correo electrónico con al menos 15 días de
                anticipación a su entrada en vigor. El uso continuado del servicio tras la vigencia de los cambios
                implica aceptación de los nuevos Términos.
              </P>
              <P>
                Si el Usuario no está de acuerdo con las modificaciones, deberá dejar de utilizar el servicio y
                podrá solicitar la eliminación de su cuenta antes de la fecha de entrada en vigor de los cambios.
              </P>
            </Section>

            <Section title="11. Terminación">
              <P>
                El Usuario puede terminar su relación con Spendia en cualquier momento eliminando su cuenta desde
                la configuración de la aplicación o solicitándolo al equipo de soporte.
              </P>
              <P>
                Spendia podrá suspender o terminar la cuenta del Usuario de forma unilateral si:
              </P>
              <Li>El Usuario incumple cualquiera de las disposiciones de estos Términos.</Li>
              <Li>La cuenta presenta actividad sospechosa o fraudulenta.</Li>
              <Li>Se requiere por orden de autoridad competente.</Li>
              <Li>Spendia decide discontinuar el servicio de forma general.</Li>
            </Section>

            <Section title="12. Ley Aplicable y Jurisdicción">
              <P>
                Los presentes Términos se rigen por las leyes de la República de Colombia. Para la resolución
                de cualquier controversia derivada de la interpretación o ejecución de estos Términos, las
                partes se someten a la jurisdicción de los jueces y tribunales competentes de Colombia,
                renunciando a cualquier otro fuero que pudiera corresponderles.
              </P>
              <P>
                En caso de controversias de menor cuantía o de carácter técnico, las partes procurarán
                resolverlas de manera amigable mediante comunicación directa antes de acudir a instancias judiciales.
              </P>
            </Section>

            <Section title="13. Contacto">
              <P>Para cualquier duda, solicitud o notificación relacionada con estos Términos:</P>
              <Li>Correo electrónico: {CONTACT_EMAIL}</Li>
              <Li>WhatsApp: {CONTACT_PHONE}</Li>
              <Li>Sitio web: {WEBSITE}</Li>
            </Section>

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.textTertiary }]}>
                © 2026 Spendia. Todos los derechos reservados.{'\n'}Estos términos fueron actualizados el {LAST_UPDATED}.
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
