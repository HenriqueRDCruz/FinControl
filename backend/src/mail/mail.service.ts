import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  private get frontendUrl(): string {
    return this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
  }

  async sendEmailVerification(email: string, token: string) {
    const link = `${this.frontendUrl}/verify-email?token=${token}`;
    if (this.config.get<string>('NODE_ENV') !== 'production') {
      this.logger.log(`[DEV] Link de verificacao de e-mail para ${email}: ${link}`);
      return;
    }
    this.logger.log(`Verificacao de e-mail enviada para ${email}`);
  }

  async sendPasswordReset(email: string, token: string) {
    const link = `${this.frontendUrl}/reset-password?token=${token}`;
    if (this.config.get<string>('NODE_ENV') !== 'production') {
      this.logger.log(`[DEV] Link de redefinicao de senha para ${email}: ${link}`);
      return;
    }
    this.logger.log(`E-mail de redefinicao de senha enviado para ${email}`);
  }
}
