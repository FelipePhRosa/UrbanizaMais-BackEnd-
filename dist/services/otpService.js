"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OTPService = void 0;
const resend_1 = require("resend");
const connection_1 = __importDefault(require("../connection"));
const resend = new resend_1.Resend(process.env.RESEND_API_KEY);
function generateOTP(length = 6) {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
        otp += digits[Math.floor(Math.random() * digits.length)];
    }
    return otp;
}
class OTPService {
    sendOTPEmail(email_1) {
        return __awaiter(this, arguments, void 0, function* (email, expirationMinutes = 5) {
            try {
                yield (0, connection_1.default)('otps').where({ email }).delete();
                const otp = generateOTP(6);
                const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);
                yield (0, connection_1.default)('otps').insert({
                    email,
                    code: otp,
                    expires_at: expiresAt,
                });
                yield resend.emails.send({
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
            }
            catch (error) {
                console.error('Erro ao enviar OTP:', error);
                return { success: false, message: 'Erro ao enviar email' };
            }
        });
    }
    verifyOTP(email_1, code_1) {
        return __awaiter(this, arguments, void 0, function* (email, code, allowValidated = false) {
            try {
                // Busca OTP mais recente
                const otp = yield (0, connection_1.default)('otps')
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
                    yield (0, connection_1.default)('otps').where({ id: otp.id }).delete();
                    return { valid: false, message: 'Código expirado. Solicite um novo código.' };
                }
                if (otp.attempts >= 3) {
                    yield (0, connection_1.default)('otps').where({ id: otp.id }).delete();
                    return { valid: false, message: 'Muitas tentativas inválidas. Solicite um novo código.' };
                }
                if (otp.code !== code) {
                    yield (0, connection_1.default)('otps').where({ id: otp.id }).increment('attempts', 1);
                    return { valid: false, message: `Código inválido. ${3 - (otp.attempts + 1)} tentativas restantes.` };
                }
                // ✅ Código válido - marca OTP como validado
                if (!otp.validated) {
                    yield (0, connection_1.default)('otps').where({ id: otp.id }).update({ validated: true });
                }
                // ✅ Marca o usuário como verificado
                yield (0, connection_1.default)('users').where({ email }).update({ is_verified: 1 });
                return { valid: true, message: 'Código verificado com sucesso' };
            }
            catch (error) {
                console.error('Erro ao verificar OTP:', error);
                throw error;
            }
        });
    }
    cleanExpiredOTPs() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield (0, connection_1.default)('otps')
                    .where('expires_at', '<', connection_1.default.fn.now())
                    .delete();
                console.log(`🧹 ${result} OTPs expirados removidos`);
                return result;
            }
            catch (error) {
                console.error('Erro ao limpar OTPs:', error);
                throw error;
            }
        });
    }
}
exports.OTPService = OTPService;
exports.default = OTPService;
