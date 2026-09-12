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
const authService_1 = __importDefault(require("../services/authService"));
const otpService_1 = __importDefault(require("../services/otpService"));
const connection_1 = __importDefault(require("../connection"));
class AuthController {
    constructor() {
        this.authService = new authService_1.default();
        this.otpService = new otpService_1.default();
    }
    // Login tradicional
    login(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("Login Request Body:", req.body);
            const { identifier, password } = req.body;
            try {
                // Faz o login básico (valida credenciais)
                const loginResult = yield this.authService.login({ identifier, password });
                // Busca o usuário completo pelo ID
                const user = yield (0, connection_1.default)('users')
                    .where({ id: loginResult.userId })
                    .select('email', 'is_verified', 'nameUser', 'fullName')
                    .first();
                if (!user) {
                    return res.status(404).json({ error: "User not found" });
                }
                // SE NÃO VERIFICADO → envia OTP
                if (user.is_verified === 0) {
                    const otpResult = yield this.otpService.sendOTPEmail(user.email);
                    if (!otpResult.success) {
                        return res.status(500).json({ message: 'Error sending verification code.' });
                    }
                    return res.status(200).json({
                        message: 'Account not verified. Verification code sent to your email.',
                        requiresOTP: true,
                        email: user.email,
                        userId: loginResult.userId
                    });
                }
                // JÁ VERIFICADO → login direto com token
                return res.status(200).json(Object.assign(Object.assign({}, loginResult), { requiresOTP: false }));
            }
            catch (error) {
                console.error("Login error:", error);
                return res.status(401).json({ error: "Invalid credentials" });
            }
        });
    }
    // Login social
    socialLogin(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { email, name, fullName, avatar, providerId, provider } = req.body;
                const loginResult = yield this.authService.socialLogin({
                    email,
                    name,
                    fullName,
                    avatar,
                    provider: provider,
                    providerId,
                });
                return res.status(200).json(loginResult);
            }
            catch (error) {
                console.error('Social login error:', error);
                const errorMessage = error instanceof Error
                    ? error.message
                    : 'An unexpected error occurred during login with this provider';
                return res.status(401).json({ success: false, error: errorMessage });
            }
        });
    }
    // Google
    googleCallback(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const { code } = req.query;
                if (!code) {
                    return res.status(400).send('Missing code');
                }
                const tokenResp = yield fetch('https://oauth2.googleapis.com/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        code: String(code),
                        client_id: process.env.GOOGLE_CLIENT_ID || '',
                        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
                        redirect_uri: process.env.GOOGLE_REDIRECT_URI || '',
                        grant_type: 'authorization_code'
                    })
                });
                const tokenData = yield tokenResp.json();
                console.log('Google token response:', tokenData);
                if (!tokenResp.ok) {
                    return res.status(400).json({ error: 'Failed to exchange code with Google', details: tokenData });
                }
                const accessToken = tokenData.access_token;
                if (!accessToken)
                    return res.status(400).json({ error: 'No access token received' });
                const userResp = yield fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });
                const userInfo = yield userResp.json();
                console.log('Google userinfo:', userInfo);
                const payload = {
                    email: userInfo.email,
                    name: userInfo.given_name || userInfo.name || ((_a = userInfo.email) === null || _a === void 0 ? void 0 : _a.split('@')[0]),
                    fullName: userInfo.name || ((_b = userInfo.email) === null || _b === void 0 ? void 0 : _b.split('@')[0]),
                    avatar: userInfo.picture || '',
                    provider: 'google',
                    providerId: userInfo.id || userInfo.sub
                };
                const result = yield this.authService.socialLogin(payload);
                const frontendUrl = 'http://localhost:5173';
                const userParam = encodeURIComponent(JSON.stringify({
                    userId: result.userId,
                    nameUser: result.nameUser,
                    fullName: result.fullName,
                    email: result.email,
                    role: result.role,
                    avatar_url: result.avatar_url,
                    is_verified: result.is_verified
                }));
                const redirectUrl = `${frontendUrl}/auth/callback?token=${encodeURIComponent(result.token)}&user=${userParam}`;
                return res.redirect(redirectUrl);
            }
            catch (err) {
                console.error('Error in googleCallback:', err);
                return res.status(500).send('Internal server error');
            }
        });
    }
}
exports.default = AuthController;
