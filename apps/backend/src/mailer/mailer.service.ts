import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    const isEmailDisabled =
      this.configService.get<string>('EMAIL_DISABLED') === 'true';
    if (isEmailDisabled) {
      this.logger.log('Envio de e-mails desativado. Modo simulação ativo.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST') || 'smtp.gmail.com',
      port: Number(this.configService.get<string>('SMTP_PORT')) || 587,
      secure: false,
      auth: {
        user: this.configService.get<string>('SMTP_USER') || 'test@gmail.com',
        pass: this.configService.get<string>('SMTP_PASS') || 'password',
      },
    });
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:4200';
    const resetLink = `${frontendUrl}/auth/reset-password?token=${token}`;
    const from = '"Monorepo UEG" <noreply@ueg.br>';
    const subject = 'Recuperação de Senha';
    const text = `Para redefinir sua senha, clique no link: ${resetLink}`;
    const html = `<p>Para redefinir sua senha, clique no link: <a href="${resetLink}">${resetLink}</a></p>`;

    const isEmailDisabled =
      this.configService.get<string>('EMAIL_DISABLED') === 'true';

    if (isEmailDisabled) {
      await this.simulateEmail(to, from, subject, text, html, resetLink);
    } else {
      await this.sendRealEmail(to, from, subject, text, html);
    }
  }

  private async simulateEmail(
    to: string,
    from: string,
    subject: string,
    text: string,
    html: string,
    resetLink: string,
  ): Promise<void> {
    const simulationFile =
      this.configService.get<string>('EMAIL_SIMULATION_FILE') ||
      'simulated_emails.log';
    const timestamp = new Date().toISOString();
    const simulatedContent = `
========================================
[SIMULAÇÃO DE ENVIO DE E-MAIL]
Data/Hora: ${timestamp}
Remetente: ${from}
Destinatário: ${to}
Assunto: ${subject}
----------------------------------------
Texto:
${text}
----------------------------------------
HTML:
${html}
========================================
`;
    this.logger.log(
      `[SIMULAÇÃO] Escrevendo e-mail de recuperação para ${to} no arquivo ${simulationFile}`,
    );

    await fs.promises.appendFile(simulationFile, simulatedContent, 'utf8');

    this.logger.log(`[SIMULAÇÃO] Link de recuperação: ${resetLink}`);
  }

  private async sendRealEmail(
    to: string,
    from: string,
    subject: string,
    text: string,
    html: string,
  ): Promise<void> {
    if (!this.transporter) {
      this.logger.error(
        'Erro: Transporter do nodemailer não foi inicializado.',
      );
      return;
    }

    await this.transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });
    this.logger.log(
      `E-mail de recuperação de senha enviado com sucesso para ${to}`,
    );
  }
}
