interface OtpEmailParams {
  otpCode: string;
  userEmail: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  expirationMinutes?: number;
}

export function generateOtpEmail({
  otpCode,
  primary,
  primaryLight,
  primaryDark,
  expirationMinutes = 10,
}: OtpEmailParams): string {
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

interface PinMigrationEmailParams {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  /** PIN temporal con el que entrarán una única vez. */
  temporaryPin: string;
  appUrl?: string;
}

/**
 * Aviso del cambio a PIN de 6 dígitos. Se manda ANTES de correr la migración:
 * después, el PIN anterior deja de funcionar y sin aviso previo el usuario lo
 * lee como que la app se rompió.
 */
export function generatePinMigrationEmail({
  primary,
  primaryLight,
  primaryDark,
  temporaryPin,
  appUrl = 'https://spendia.co',
}: PinMigrationEmailParams): string {
  const year = new Date().getFullYear();

  const shieldIconSvg = `
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="14" fill="${primaryLight}"/>
      <path d="M24 11L33 15V23C33 29 29 34 24 36C19 34 15 29 15 23V15L24 11Z" fill="${primary}" opacity="0.15"/>
      <path d="M24 11L33 15V23C33 29 29 34 24 36C19 34 15 29 15 23V15L24 11Z" stroke="${primary}" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M20.5 23.5L23 26L28 20.5" stroke="${primary}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `.trim();

  const pinCells = temporaryPin.split('').map((d) => `
    <td width="44" height="56" align="center" valign="middle"
        style="width:44px;height:56px;background:#ffffff;border:2px solid ${primary};border-radius:10px;font-size:26px;font-weight:700;color:${primaryDark};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;line-height:1;padding:0;">
      ${d}
    </td>
    <td width="8" style="width:8px;"></td>
  `).join('');

  return `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Tu PIN de Spendia cambia a 6 dígitos</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">

  <span style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
    Tu PIN pasa a 6 dígitos. Entra con ${temporaryPin} y elige el tuyo.
  </span>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:#f4f6f8;min-width:320px;">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
               style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- HEADER -->
          <tr>
            <td align="center" valign="middle" style="background-color:${primary};padding:28px 32px;">
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

              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr><td align="center" style="padding-bottom:24px;">${shieldIconSvg}</td></tr>
              </table>

              <p style="margin:0 0 12px;font-size:22px;font-weight:700;color:#1A2428;text-align:center;line-height:1.3;">
                Tu PIN ahora es de 6 dígitos
              </p>

              <p style="margin:0 0 32px;font-size:15px;font-weight:400;color:#6B7280;text-align:center;line-height:1.6;max-width:420px;">
                Hemos reforzado la seguridad de Spendia. Tu PIN anterior ya no funciona
                y el acceso con Google se ha retirado: ahora se entra siempre con tu
                correo y un PIN de seis dígitos.
              </p>

              <!-- PIN temporal -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
                     style="background-color:${primaryLight};border:2px solid ${primary};border-radius:16px;margin-bottom:28px;">
                <tr>
                  <td align="center" style="padding:26px 24px 22px;">
                    <p style="margin:0 0 18px;font-size:11px;font-weight:700;color:${primary};letter-spacing:2.5px;text-transform:uppercase;text-align:center;">
                      TU PIN TEMPORAL
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                      <tr>${pinCells}</tr>
                    </table>
                    <p style="margin:18px 0 0;font-size:13px;color:#6B7280;text-align:center;line-height:1.6;">
                      Entra con él y la app te pedirá crear el tuyo.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Aviso: es temporal de verdad -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
                     style="background-color:#FFF7ED;border-left:4px solid #EA580C;border-radius:8px;margin-bottom:32px;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0;font-size:13px;color:#7C2D12;text-align:left;line-height:1.6;">
                      <strong>Hazlo cuanto antes.</strong> Este PIN temporal es el mismo para
                      todas las cuentas, así que tu información solo vuelve a estar protegida
                      cuando elijas el tuyo.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 28px;">
                <tr>
                  <td align="center" style="background-color:${primary};border-radius:50px;">
                    <a href="${appUrl}"
                       style="display:inline-block;padding:15px 40px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
                      Entrar y crear mi PIN
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#9EABAF;text-align:center;line-height:1.7;max-width:420px;">
                Si el PIN temporal no te funciona, pulsa <strong style="color:#6B7280;">¿Olvidaste tu PIN?</strong>
                en la pantalla de acceso y te enviaremos un código a este mismo correo.
                Tus movimientos, categorías y grupos siguen intactos.
              </p>

            </td>
          </tr>

          <tr>
            <td style="padding:0 40px;"><div style="height:1px;background-color:#DDE8EA;"></div></td>
          </tr>

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

      </td>
    </tr>
  </table>

</body>
</html>`;
}
