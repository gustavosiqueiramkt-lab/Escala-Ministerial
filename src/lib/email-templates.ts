/**
 * Email templates for Cantivo
 * Compatible with Resend
 */

export function welcomeEmailHtml(userName: string, confirmUrl?: string): string {
  const baseUrl = 'https://cantivo.app.br';
  const appUrl = confirmUrl || `${baseUrl}/dashboard`;

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background: #f9fafb;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
    }
    .header {
      background: linear-gradient(135deg, #1e1458 0%, #2d1fa3 50%, #4F46E5 100%);
      padding: 32px 24px;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    .header::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -50%;
      width: 400px;
      height: 400px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 50%;
    }
    .header-content {
      position: relative;
      z-index: 1;
    }
    .logo {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 20px;
    }
    .logo-icon {
      width: 32px;
      height: 32px;
      background: #F59E0B;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      color: white;
      font-size: 18px;
    }
    .logo-text {
      color: white;
      font-weight: 700;
      font-size: 20px;
      letter-spacing: -0.5px;
    }
    .header h1 {
      color: white;
      font-size: 28px;
      font-weight: 700;
      margin: 0;
      padding: 0;
      line-height: 1.2;
    }
    .content {
      padding: 40px 32px;
    }
    .greeting {
      font-size: 16px;
      color: #374151;
      margin-bottom: 24px;
      line-height: 1.5;
    }
    .greeting strong {
      color: #1e1458;
      font-weight: 600;
    }
    .description {
      font-size: 15px;
      color: #6b7280;
      line-height: 1.6;
      margin-bottom: 32px;
    }
    .cta-button {
      display: inline-block;
      background: #F59E0B;
      color: #78350f;
      padding: 14px 32px;
      border-radius: 9999px;
      text-decoration: none;
      font-weight: 600;
      font-size: 16px;
      transition: background 0.3s;
      margin-bottom: 32px;
    }
    .cta-button:hover {
      background: #FBBF24;
    }
    .features {
      background: #f9fafb;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 32px;
    }
    .features-title {
      font-size: 14px;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 16px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .feature-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 12px;
      font-size: 14px;
      color: #6b7280;
    }
    .feature-item:last-child {
      margin-bottom: 0;
    }
    .check {
      color: #4F46E5;
      font-weight: bold;
      flex-shrink: 0;
      margin-top: 2px;
    }
    .footer {
      background: #f3f4f6;
      border-top: 1px solid #e5e7eb;
      padding: 32px;
      text-align: center;
      font-size: 13px;
      color: #9ca3af;
    }
    .footer-links {
      margin-bottom: 16px;
    }
    .footer-links a {
      color: #6b7280;
      text-decoration: none;
      margin: 0 12px;
    }
    .footer-links a:hover {
      color: #4F46E5;
    }
    .footer-bottom {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
    }
    @media (max-width: 600px) {
      .container {
        width: 100% !important;
      }
      .content {
        padding: 24px 20px !important;
      }
      .header {
        padding: 24px 20px !important;
      }
      .header h1 {
        font-size: 24px;
      }
    }
  </style>
</head>
<body>
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #f9fafb;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table cellpadding="0" cellspacing="0" border="0" width="600" class="container">
          <!-- Header -->
          <tr>
            <td class="header">
              <div class="header-content">
                <div class="logo">
                  <div class="logo-icon">✨</div>
                  <div class="logo-text">Cantivo</div>
                </div>
                <h1>Bem-vindo!</h1>
              </div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="content">
              <p class="greeting">
                Oi <strong>${userName}</strong>,
              </p>
              <p class="description">
                Sua conta no Cantivo foi criada com sucesso! 🎉
              </p>
              <p class="description">
                Agora você pode começar a organizar suas escalas, gerenciar sua equipe e deixar cada membro sabendo exatamente quando toca. Tudo em um só lugar, sem WhatsApp ou planilhas perdidas.
              </p>

              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 0 0 32px 0;">
                    <a href="${appUrl}" class="cta-button">Começar a usar</a>
                  </td>
                </tr>
              </table>

              <!-- Features -->
              <div class="features">
                <div class="features-title">O que você pode fazer:</div>
                <div class="feature-item">
                  <span class="check">✓</span>
                  <span>Criar cultos e definir o setlist com drag-and-drop</span>
                </div>
                <div class="feature-item">
                  <span class="check">✓</span>
                  <span>Escalar cada membro por habilidade e acompanhar confirmações</span>
                </div>
                <div class="feature-item">
                  <span class="check">✓</span>
                  <span>Controlar quando alguém está escalado demais</span>
                </div>
                <div class="feature-item">
                  <span class="check">✓</span>
                  <span>Cada músico recebe uma agenda pessoal atualizada</span>
                </div>
              </div>

              <p class="description" style="margin-bottom: 16px;">
                Comece com até 8 membros. Sem cartão de crédito necessário.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="footer">
              <div class="footer-links">
                <a href="${baseUrl}">Website</a>
                <a href="mailto:support@cantivo.app.br">Suporte</a>
              </div>
              <div class="footer-bottom">
                © 2026 Cantivo. Todos os direitos reservados.<br>
                <a href="${baseUrl}/privacy" style="color: #9ca3af; text-decoration: none;">Política de Privacidade</a> •
                <a href="${baseUrl}/terms" style="color: #9ca3af; text-decoration: none;">Termos de Serviço</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Export function for Resend
 * Usage with Resend:
 *
 * import { Resend } from 'resend';
 * import { welcomeEmailHtml } from '@/lib/email-templates';
 *
 * const resend = new Resend(process.env.RESEND_API_KEY);
 *
 * await resend.emails.send({
 *   from: 'Cantivo <onboarding@cantivo.app.br>',
 *   to: userEmail,
 *   subject: 'Bem-vindo ao Cantivo! 🎉',
 *   html: welcomeEmailHtml(userName),
 * });
 */
