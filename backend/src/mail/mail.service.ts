import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Envio por API HTTPS (Brevo). SMTP (portas 25/465/587) é bloqueado nos planos gratuitos de hospedagem como o Render.
const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';
const REQUEST_TIMEOUT_MS = 10_000;

interface Message {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Aceita a chave como a Brevo a entrega. Algumas telas mostram o valor embrulhado em base64
 * ({"api_key":"xkeysib-..."}); a API só reconhece a parte interna, então desembrulhamos aqui.
 */
export function normalizeApiKey(raw: string): string {
  const key = raw.trim().replace(/^["']|["']$/g, '');
  if (key.startsWith('eyJ')) {
    try {
      const decoded = JSON.parse(Buffer.from(key, 'base64').toString('utf8')) as { api_key?: string };
      if (decoded.api_key) return decoded.api_key.trim();
    } catch {
      // não era base64 de JSON: usa o valor como veio
    }
  }
  return key;
}

function maskEmail(email: string) {
  const [user = '', domain = ''] = email.split('@');
  return `${user.slice(0, 1)}***@${domain}`;
}

function renderEmail(opts: { title: string; intro: string; button: string; link: string; footer: string }) {
  const html = `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:24px;background:#F6F7FB;font-family:Arial,Helvetica,sans-serif;color:#161A47;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #DDE0EE;border-radius:12px;padding:32px;">
      <p style="margin:0 0 20px;font-size:18px;font-weight:bold;color:#232C8A;">FinControl</p>
      <h1 style="margin:0 0 12px;font-size:22px;line-height:1.25;">${opts.title}</h1>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:#474E7A;">${opts.intro}</p>
      <p style="margin:0 0 24px;">
        <a href="${opts.link}" style="display:inline-block;background:#3643D6;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 22px;border-radius:8px;">${opts.button}</a>
      </p>
      <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#5D6491;">Se o botão não funcionar, copie este endereço no navegador:</p>
      <p style="margin:0 0 24px;font-size:12px;line-height:1.5;word-break:break-all;color:#3643D6;">${opts.link}</p>
      <p style="margin:0;font-size:12px;line-height:1.5;color:#5D6491;">${opts.footer}</p>
    </div>
  </body>
</html>`;
  const text = `${opts.title}\n\n${opts.intro}\n\n${opts.button}: ${opts.link}\n\n${opts.footer}`;
  return { html, text };
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  private get frontendUrl(): string {
    return (this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000').replace(/\/+$/, '');
  }

  private get isConfigured(): boolean {
    return !!this.config.get<string>('BREVO_API_KEY') && !!this.config.get<string>('MAIL_FROM');
  }

  async sendEmailVerification(email: string, token: string) {
    const link = `${this.frontendUrl}/verify-email?token=${token}`;
    const body = renderEmail({
      title: 'Confirme seu e-mail',
      intro: 'Falta só um passo para ativar sua conta no FinControl. Confirme que este e-mail é seu.',
      button: 'Confirmar e-mail',
      link,
      footer: 'O link vale por 24 horas. Se você não criou uma conta, ignore esta mensagem.',
    });
    await this.send({ to: email, subject: 'Confirme seu e-mail - FinControl', ...body }, link);
  }

  async sendPasswordReset(email: string, token: string) {
    const link = `${this.frontendUrl}/reset-password?token=${token}`;
    const body = renderEmail({
      title: 'Redefinir sua senha',
      intro: 'Recebemos um pedido para redefinir a senha da sua conta. Clique no botão para escolher uma nova senha.',
      button: 'Redefinir senha',
      link,
      footer: 'O link vale por 30 minutos e só pode ser usado uma vez. Se não foi você, ignore esta mensagem: sua senha continua a mesma.',
    });
    await this.send({ to: email, subject: 'Redefinição de senha - FinControl', ...body }, link);
  }

  /** Nunca lança erro: uma falha de e-mail não pode derrubar o cadastro nem revelar se uma conta existe. */
  private async send(message: Message, devLink: string): Promise<void> {
    if (!this.isConfigured) {
      if (this.config.get<string>('NODE_ENV') !== 'production') {
        // Sem provedor configurado, em desenvolvimento o link aparece aqui no terminal.
        this.logger.log(`[DEV] "${message.subject}" para ${message.to}: ${devLink}`);
      } else {
        this.logger.warn(`E-mail para ${maskEmail(message.to)} NAO enviado: configure BREVO_API_KEY e MAIL_FROM.`);
      }
      return;
    }

    const apiKey = normalizeApiKey(this.config.get<string>('BREVO_API_KEY') ?? '');

    try {
      const response = await fetch(BREVO_URL, {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: this.config.get<string>('MAIL_FROM_NAME') ?? 'FinControl',
            email: this.config.get<string>('MAIL_FROM'),
          },
          to: [{ email: message.to }],
          subject: message.subject,
          htmlContent: message.html,
          textContent: message.text,
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        const detail = (await response.text()).slice(0, 300);
        this.logger.error(`Brevo recusou o envio para ${maskEmail(message.to)} (${response.status}): ${detail}`);
        if (response.status === 401) {
          this.logger.error(
            apiKey.toLowerCase().startsWith('xsmtp')
              ? 'BREVO_API_KEY parece ser uma chave de SMTP. Use uma chave de API (SMTP & API > aba "API Keys").'
              : 'Chave de API não reconhecida. Gere uma nova em SMTP & API > "API Keys", copie o valor inteiro e reinicie o backend (o .env só é lido ao iniciar).',
          );
        }
        return;
      }
      this.logger.log(`E-mail "${message.subject}" enviado para ${maskEmail(message.to)}`);
    } catch (error) {
      this.logger.error(`Falha ao enviar e-mail para ${maskEmail(message.to)}: ${(error as Error).message}`);
    }
  }
}
