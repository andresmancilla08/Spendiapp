"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOtpEmail = generateOtpEmail;
exports.generatePinMigrationEmail = generatePinMigrationEmail;
function generateOtpEmail({ otpCode, primary, primaryLight, primaryDark, expirationMinutes = 10, }) {
    const digits = otpCode.split('');
    const year = new Date().getFullYear();
    const lockIconSvg = `
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="14" fill="${primaryLight}"/>
      <path d="M17 22V18C17 14.134 20.134 11 24 11C27.866 11 31 14.134 31 18V22" stroke="${primary}" stroke-width="2.5" stroke-linecap="round"/>
      <rect x="13" y="22" width="22" height="15" rx="4" fill="${primary}" opacity="0.15"/>
      <rect x="13" y="22" width="22" height="15" rx="4" stroke="${primary}" stroke-width="2.5"/>
      <circle cx="24" cy="30" r="2.5" fill="${primary}"/>
      <line x1="24" y1="30" x2="24" y2="33.5" stroke="${primary}" stroke-width="2.5" stroke-linecap="round"/>
    </svg>
  `.trim();
    const digitCells = digits.map(d => `
    <td width="58" height="72" align="center" valign="middle"
        style="width:58px;height:72px;background:#ffffff;border:2px solid ${primary};border-radius:12px;font-size:36px;font-weight:700;color:${primaryDark};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;line-height:1;padding:0;">
      ${d}
    </td>
    <td width="10" style="width:10px;"></td>
  `).join('');
    return `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Tu código de verificación — Spendia</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">

  <!-- Preheader invisible -->
  <span style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
    Tu código Spendia: ${otpCode} · Válido ${expirationMinutes} minutos
  </span>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:#f4f6f8;min-width:320px;">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <!-- Contenedor principal -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
               style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- HEADER -->
          <tr>
            <td align="center" valign="middle"
                style="background-color:${primary};padding:28px 32px;">
              <span style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:26px;font-weight:800;color:#ffffff;letter-spacing:5px;text-transform:uppercase;display:block;">
                SPENDIA
              </span>
              <span style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;font-weight:400;color:rgba(255,255,255,0.80);letter-spacing:0.5px;display:block;margin-top:4px;">
                Tu dinero, siempre bajo control
              </span>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td align="center" style="padding:40px 40px 32px;">

              <!-- Ícono candado -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    ${lockIconSvg}
                  </td>
                </tr>
              </table>

              <!-- Título -->
              <p style="margin:0 0 12px;font-size:22px;font-weight:700;color:#1A2428;text-align:center;line-height:1.3;">
                Tu código de verificación
              </p>

              <!-- Subtítulo -->
              <p style="margin:0 0 36px;font-size:15px;font-weight:400;color:#6B7280;text-align:center;line-height:1.6;max-width:380px;">
                Usa este código para restablecer tu PIN en Spendia.
                Es válido por <strong style="color:#1A2428;">${expirationMinutes} minutos</strong>.
              </p>

              <!-- Bloque OTP -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
                     style="background-color:${primaryLight};border:2px solid ${primary};border-radius:16px;margin-bottom:32px;">
                <tr>
                  <td align="center" style="padding:28px 24px 20px;">

                    <!-- Label -->
                    <p style="margin:0 0 20px;font-size:11px;font-weight:700;color:${primary};letter-spacing:2.5px;text-transform:uppercase;text-align:center;">
                      CÓDIGO DE VERIFICACIÓN
                    </p>

                    <!-- Dígitos -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0"
                           aria-label="Código de verificación de 4 dígitos"
                           style="margin:0 auto;">
                      <tr>
                        ${digitCells}
                        <!-- remove last spacer -->
                      </tr>
                    </table>

                    <!-- Expiración -->
                    <p style="margin:20px 0 0;font-size:12px;color:#9CA3AF;text-align:center;">
                      ⏱ Expira en ${expirationMinutes} minutos
                    </p>

                  </td>
                </tr>
              </table>

              <!-- Aviso seguridad -->
              <p style="margin:0;font-size:13px;color:#9EABAF;text-align:center;line-height:1.7;max-width:380px;">
                Si no solicitaste este código, puedes ignorar este correo.
                Tu cuenta está segura.
              </p>

            </td>
          </tr>

          <!-- DIVIDER -->
          <tr>
            <td style="padding:0 40px;">
              <div style="height:1px;background-color:#DDE8EA;"></div>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td align="center" style="background-color:#F0F7F8;padding:24px 32px;border-radius:0 0 20px 20px;">
              <p style="margin:0 0 4px;font-size:12px;color:#9EABAF;text-align:center;line-height:1.6;">
                Este es un correo automático de Spendia. Por favor no respondas a este mensaje.
              </p>
              <p style="margin:0;font-size:11px;color:#C4CDD0;text-align:center;">
                © ${year} Spendia · Todos los derechos reservados
              </p>
            </td>
          </tr>

        </table>
        <!-- / Contenedor principal -->

      </td>
    </tr>
  </table>

</body>
</html>`;
}
/**
 * Aviso del cambio a PIN de 6 dígitos (dirección "paso a paso").
 *
 * Se manda JUSTO DESPUÉS de correr la migración, no antes: el texto afirma que
 * el PIN anterior ya no funciona, y mandarlo con un día de margen lo convertiría
 * en mentira durante ese día.
 */
function generatePinMigrationEmail({ primary, primaryLight, primaryDark, temporaryPin, appUrl = 'https://spendia.co', }) {
    const year = new Date().getFullYear();
    return `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Tu PIN de Spendia cambia a 6 dígitos</title>
</head>
<body style="margin:0;padding:0;background-color:#EEF3F5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<span style="display:none;max-height:0;overflow:hidden;mso-hide:all;">Tres pasos y listo. Tu PIN pasa a 6 dígitos: entra con ${temporaryPin}.</span>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#EEF3F5;min-width:320px;">
<tr><td align="center" style="padding:32px 12px;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 6px 32px rgba(13,27,31,0.08);">

    <!-- Cinta superior fina: la marca no necesita un bloque entero -->
    <tr><td style="height:6px;background-color:${primary};line-height:6px;font-size:0;">&nbsp;</td></tr>

    <tr><td style="padding:32px 32px 0;">
      <span style="font-size:15px;font-weight:800;color:${primaryDark};letter-spacing:4px;text-transform:uppercase;">SPENDIA</span>
    </td></tr>

    <!-- Titular grande, una sola idea -->
    <tr><td style="padding:22px 32px 0;">
      <p style="margin:0;font-size:32px;line-height:1.2;font-weight:800;color:#0D1B1F;letter-spacing:-0.5px;">
        Tu PIN ahora<br />es de 6 dígitos
      </p>
      <p style="margin:16px 0 0;font-size:16px;line-height:1.65;color:#5B6B70;">
        Hemos reforzado la seguridad de tu cuenta. Tu PIN anterior ya no funciona
        y el acceso con Google se retiró: ahora entras siempre con tu correo y seis dígitos.
      </p>
    </td></tr>

    <!-- Tres pasos numerados -->
    <tr><td style="padding:30px 32px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">

        <tr>
          <td width="40" valign="top" style="padding-bottom:22px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
              <td width="30" height="30" align="center" valign="middle" style="width:30px;height:30px;background:${primaryLight};border-radius:15px;font-size:14px;font-weight:800;color:${primaryDark};">1</td>
            </tr></table>
          </td>
          <td valign="top" style="padding-bottom:22px;">
            <p style="margin:0;font-size:16px;font-weight:700;color:#0D1B1F;line-height:1.4;">Abre Spendia</p>
            <p style="margin:3px 0 0;font-size:14px;color:#7A8A90;line-height:1.55;">Con el mismo correo de siempre.</p>
          </td>
        </tr>

        <tr>
          <td width="40" valign="top" style="padding-bottom:22px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
              <td width="30" height="30" align="center" valign="middle" style="width:30px;height:30px;background:${primaryLight};border-radius:15px;font-size:14px;font-weight:800;color:${primaryDark};">2</td>
            </tr></table>
          </td>
          <td valign="top" style="padding-bottom:22px;">
            <p style="margin:0;font-size:16px;font-weight:700;color:#0D1B1F;line-height:1.4;">Escribe este PIN temporal</p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:10px;">
              <tr>
                <td height="46" align="center" valign="middle" style="height:46px;padding:0 18px;background:#0D1B1F;border-radius:10px;font-family:'SF Mono',Menlo,Consolas,monospace;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:10px;text-indent:10px;">${temporaryPin}</td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td width="40" valign="top">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
              <td width="30" height="30" align="center" valign="middle" style="width:30px;height:30px;background:${primary};border-radius:15px;font-size:14px;font-weight:800;color:#ffffff;">3</td>
            </tr></table>
          </td>
          <td valign="top">
            <p style="margin:0;font-size:16px;font-weight:700;color:#0D1B1F;line-height:1.4;">Elige el tuyo</p>
            <p style="margin:3px 0 0;font-size:14px;color:#7A8A90;line-height:1.55;">La app te lo pide nada más entrar. Son diez segundos.</p>
          </td>
        </tr>

      </table>
    </td></tr>

    <!-- CTA -->
    <tr><td style="padding:32px 32px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td align="center" style="background-color:${primary};border-radius:50px;">
          <a href="${appUrl}" style="display:block;padding:17px 24px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;">Entrar y crear mi PIN</a>
        </td></tr>
      </table>
    </td></tr>

    <!-- Nota de urgencia, sin alarmismo -->
    <tr><td style="padding:24px 32px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FFF8ED;border-radius:12px;">
        <tr><td style="padding:16px 18px;">
          <p style="margin:0;font-size:13.5px;color:#7A4B12;line-height:1.6;">
            <strong style="color:#5C3609;">Mejor hoy que mañana.</strong> El PIN temporal es el mismo
            para todo el mundo, así que tu cuenta vuelve a estar solo en tus manos cuando elijas el tuyo.
          </p>
        </td></tr>
      </table>
    </td></tr>

    <tr><td style="padding:22px 32px 0;">
      <p style="margin:0;font-size:13.5px;color:#8B9AA0;line-height:1.7;">
        ¿No te funciona? Pulsa <strong style="color:#5B6B70;">¿Olvidaste tu PIN?</strong> en la pantalla de acceso
        y te mandamos un código a este correo. Tus movimientos, categorías y grupos siguen exactamente donde estaban.
      </p>
    </td></tr>

    <tr><td style="padding:30px 32px 0;"><div style="height:1px;background-color:#E4EDEF;"></div></td></tr>

    <tr><td align="center" style="padding:20px 32px 30px;">
      <p style="margin:0 0 4px;font-size:12px;color:#A8B5BA;text-align:center;">Correo automático de Spendia · No respondas a este mensaje</p>
      <p style="margin:0;font-size:11px;color:#C4CDD0;text-align:center;">© ${year} Spendia</p>
    </td></tr>

  </table>

</td></tr>
</table>
</body>
</html>
`;
}
//# sourceMappingURL=emailTemplate.js.map