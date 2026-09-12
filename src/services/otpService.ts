import { Resend } from 'resend';
import connection from '../connection';

const resend = new Resend(process.env.RESEND_API_KEY);

function generateOTP(length: number = 6): string {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  return otp;
}

export class OTPService {
  async sendOTPEmail(email: string, expirationMinutes: number = 5) {
    try {
      await connection('otps').where({ email }).delete();

      const otp = generateOTP(6);

      const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

      await connection('otps').insert({
        email,
        code: otp,
        expires_at: expiresAt,
      });

      await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: email,
        subject: '🔐 Seu código de verificação - Reclamaí',
        html: `
          <div style="font-family: Arial; text-align:center;">
            <h2>Seu código</h2>
            <h1 style="font-size:40px">${otp}</h1>
            <p>Expira em ${expirationMinutes} minutos</p>
          </div>
        `,
      });

      return { success: true, message: 'OTP enviado com sucesso' };

    } catch (error) {
      console.error('Erro ao enviar OTP:', error);
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
    console.error('Erro ao verificar OTP:', error);
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
      console.error('Erro ao limpar OTPs:', error);
      throw error;
    }
  }
}

export default OTPService;