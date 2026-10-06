import { Resend } from 'resend';
import connection from '../connection';

const FALLBACK_FROM_EMAIL = 'onboarding@resend.dev';

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }
  return new Resend(apiKey);
}

function getFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL?.trim() || FALLBACK_FROM_EMAIL;
}

function generateOTP(length: number = 6): string {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  return otp;
}

function buildOTPEmailHtml(otp: string, expirationMinutes: number): string {
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; background: #f7f9fc; padding: 24px;">
      <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border: 1px solid #dfe7f0; border-radius: 12px; padding: 32px;">
        <h1 style="margin: 0 0 4px; font-size: 20px; color: #142f52;">Urbaniza Mais</h1>
        <p style="margin: 0 0 24px; font-size: 13px; color: #71839a;">Código de acesso</p>

        <p style="margin: 0 0 16px; font-size: 15px; color: #142f52;">Olá! Use o código abaixo para continuar:</p>

        <div style="margin: 0 0 16px; padding: 16px; background: #f0ebff; border-radius: 8px; text-align: center;">
          <span style="font-size: 34px; font-weight: bold; letter-spacing: 8px; color: #6c2bd9;">${otp}</span>
        </div>

        <p style="margin: 0 0 8px; font-size: 14px; color: #142f52;">
          Este código é válido por <strong>${expirationMinutes} minutos</strong>.
        </p>
        <p style="margin: 0 0 24px; font-size: 14px; color: #142f52;">
          Ele serve para autenticação (login) ou recuperação de senha na sua conta Urbaniza Mais.
        </p>

        <p style="margin: 0; font-size: 12px; color: #71839a;">
          Se você não solicitou este código, ignore este e-mail. Não compartilhe o código com ninguém.
        </p>
      </div>
    </div>
  `;
}

function buildOTPEmailText(otp: string, expirationMinutes: number): string {
  return [
    'Urbaniza Mais - Código de acesso',
    '',
    `Seu código é: ${otp}`,
    '',
    `Este código é válido por ${expirationMinutes} minutos.`,
    'Ele serve para autenticação (login) ou recuperação de senha na sua conta Urbaniza Mais.',
    '',
    'Se você não solicitou este código, ignore este e-mail. Não compartilhe o código com ninguém.',
  ].join('\n');
}

export class OTPService {
  async sendOTPEmail(email: string, expirationMinutes: number = 5) {
    const resend = getResendClient();

    // Sem chave configurada: não altera OTPs existentes nem tenta enviar.
    if (!resend) {
      console.error('RESEND_API_KEY não configurada: envio de OTP abortado.');
      return { success: false, message: 'Serviço de e-mail indisponível no momento.' };
    }

    try {
      await connection('otps').where({ email }).delete();

      const otp = generateOTP(6);
      const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

      await connection('otps').insert({
        email,
        code: otp,
        expires_at: expiresAt,
      });

      const { data, error } = await resend.emails.send({
        from: getFromEmail(),
        to: email,
        subject: 'Seu código de acesso - Urbaniza Mais',
        html: buildOTPEmailHtml(otp, expirationMinutes),
        text: buildOTPEmailText(otp, expirationMinutes),
      });

      if (error) {
        console.error('Resend rejeitou o envio do OTP:', error.name, error.message);
        return { success: false, message: 'Falha ao enviar o e-mail com o código.' };
      }

      if (!data?.id) {
        console.error('Resend não confirmou o envio do OTP (resposta sem id).');
        return { success: false, message: 'Falha ao enviar o e-mail com o código.' };
      }

      return { success: true, message: 'OTP enviado com sucesso' };

    } catch (error) {
      console.error('Erro ao enviar OTP:', error instanceof Error ? error.message : 'erro desconhecido');
      return { success: false, message: 'Erro ao enviar email' };
    }
  }

  async verifyOTP(email: string, code: string, allowValidated: boolean = false) {
    try {
      // Busca OTP mais recente
      const otp = await connection('otps')
        .where({ email })
        .orderBy('created_at', 'desc')
        .first();

      if (!otp) {
        return { valid: false, message: 'Código não encontrado. Solicite um novo código.' };
      }

      if (otp.validated && !allowValidated) {
        return { valid: false, message: 'Código já foi utilizado. Solicite um novo código.' };
      }

      if (new Date() > new Date(otp.expires_at)) {
        await connection('otps').where({ id: otp.id }).delete();
        return { valid: false, message: 'Código expirado. Solicite um novo código.' };
      }

      if (otp.attempts >= 3) {
        await connection('otps').where({ id: otp.id }).delete();
        return { valid: false, message: 'Muitas tentativas inválidas. Solicite um novo código.' };
      }

      if (otp.code !== code) {
        await connection('otps').where({ id: otp.id }).increment('attempts', 1);
        return { valid: false, message: `Código inválido. ${3 - (otp.attempts + 1)} tentativas restantes.` };
      }

      // ✅ Código válido - marca OTP como validado
      if (!otp.validated) {
        await connection('otps').where({ id: otp.id }).update({ validated: true });
      }

      // ✅ Marca o usuário como verificado
      await connection('users').where({ email }).update({ is_verified: 1 });

      return { valid: true, message: 'Código verificado com sucesso' };
    } catch (error) {
      console.error('Erro ao verificar OTP:', error instanceof Error ? error.message : 'erro desconhecido');
      throw error;
    }
  }

  async cleanExpiredOTPs() {
    try {
      const result = await connection('otps')
        .where('expires_at', '<', connection.fn.now())
        .delete();

      console.log(`🧹 ${result} OTPs expirados removidos`);
      return result;
    } catch (error) {
      console.error('Erro ao limpar OTPs:', error instanceof Error ? error.message : 'erro desconhecido');
      throw error;
    }
  }
}

export default OTPService;
