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
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const connection_1 = __importDefault(require("../connection"));
class AuthService {
    constructor() {
        this.JWT_SECRET = process.env.JWT_SECRET || "chave-super-secreta";
        this.JWT_EXPIRES_IN = "24h";
    }
    generateToken(payload) {
        const options = {
            expiresIn: this.JWT_EXPIRES_IN,
        };
        return jsonwebtoken_1.default.sign(payload, this.JWT_SECRET, options);
    }
    verifyToken(token) {
        try {
            return jsonwebtoken_1.default.verify(token, this.JWT_SECRET);
        }
        catch (error) {
            throw new Error("Invalid Token or Expired.");
        }
    }
    login(credentials) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log("Login attempt:", credentials);
                const identifierClean = credentials.identifier.trim().toLowerCase();
                const user = yield (0, connection_1.default)("users")
                    .whereRaw("LOWER(TRIM(email)) = ?", [identifierClean])
                    .orWhereRaw("LOWER(TRIM(nameUser)) = ?", [identifierClean])
                    .first();
                console.log("User found:", user);
                if (!user) {
                    throw new Error("Invalid Credentials");
                }
                const isPasswordValid = yield bcryptjs_1.default.compare(credentials.password, user.password_hash);
                console.log("Password valid:", isPasswordValid);
                if (!isPasswordValid) {
                    throw new Error("Invalid Credentials");
                }
                const token = this.generateToken({
                    userId: user.id,
                    email: user.email,
                    fullName: user.fullName,
                    role: user.role,
                    avatar_url: user.avatar_url,
                    telefone: user.telefone,
                    city_id: user.city_id,
                    neighborhood_id: user.neighborhood_id
                });
                return {
                    userId: user.id,
                    name: user.nameUser,
                    fullName: user.fullName,
                    email: user.email,
                    telefone: user.telefone,
                    birth_date: user.birth_date,
                    role: user.role,
                    city_id: user.city_id,
                    neighborhood_id: user.neighborhood_id,
                    avatar_url: user.avatar_url,
                    token,
                    is_verified: user.is_verified,
                    isNewUser: false
                };
            }
            catch (error) {
                console.error("Login error:", error);
                throw error;
            }
        });
    }
    socialLogin(credentials) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log("Login Attemp: ", credentials);
                if (!credentials ||
                    !credentials.email ||
                    !credentials.avatar ||
                    !credentials.name ||
                    !credentials.provider ||
                    !credentials.providerId) {
                    console.log("Something is missing");
                    throw new Error("Missing required fields");
                }
                const emailClear = credentials.email.trim().toLowerCase();
                const fullName = credentials.fullName;
                const nameUser = (credentials.name || "").trim().split(" ")[0] || "Usuário";
                let user = yield (0, connection_1.default)("users").whereRaw("lower(trim(email)) = ?", [emailClear]).first();
                if (user) {
                    if (user.provider === "local") {
                        yield (0, connection_1.default)("users")
                            .where("id", user.id)
                            .update({
                            provider: credentials.provider,
                            provider_id: credentials.providerId,
                            nameUser: nameUser,
                            fullName: fullName,
                            avatar_url: credentials.avatar,
                        });
                        user = yield (0, connection_1.default)("users").where("id", user.id).first();
                        console.error(`User connection on with: ${credentials.provider}`);
                    }
                    else if (user.provider === credentials.provider) {
                        console.log("Existing social user login: ", user.provider);
                    }
                    else {
                        throw new Error(`Account already registered with provider '${user.provider}'. Please sign in using that provider or link accounts.`);
                    }
                }
                else {
                    const [newUserId] = yield (0, connection_1.default)("users").insert({
                        nameUser: nameUser,
                        fullName: fullName,
                        email: emailClear,
                        password_hash: "",
                        provider: credentials.provider,
                        provider_id: credentials.providerId,
                        avatar_url: credentials.avatar,
                        created_at: new Date(),
                        role: 5,
                        birth_date: new Date(), // Usa data atual como fallback quando Google não fornece
                    });
                    user = yield (0, connection_1.default)("users").where("id", newUserId).first();
                    if (!user) {
                        console.log("Error to create user: ", credentials.name);
                    }
                    else {
                        console.log("Created New User: ", user);
                    }
                }
                const token = this.generateToken({
                    userId: user.id,
                    email: user.email,
                    fullName: user.fullName,
                    role: user.role,
                    avatar_url: user.avatar_url,
                    telefone: user.telefone,
                    city_id: user.city_id,
                    neighborhood_id: user.neighborhood_id
                });
                return {
                    userId: user.id,
                    nameUser: user.nameUser,
                    fullName: credentials.fullName,
                    email: user.email,
                    role: user.role,
                    avatar_url: user.avatar_url,
                    telefone: user.telefone,
                    city_id: user.city_id,
                    neighborhood_id: user.neighborhood_id,
                    provider: user.provider,
                    token,
                    is_verified: user.is_verified, // ADICIONADO
                    needsVerification: user.is_verified === 0
                };
            }
            catch (err) {
                console.log("Error when logging in", err);
                throw err;
            }
        });
    }
    verifySocialToken(provider, token) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                switch (provider) {
                    case 'google':
                        const googleResponse = yield fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${token}`);
                        return googleResponse.ok;
                    //For now, we will only use Google Login, since we don’t have a secured domain.
                    case 'facebook':
                        const fbResponse = yield fetch(`https://graph.facebook.com/me?access_token=${token}`);
                        return fbResponse.ok;
                    default:
                        return false;
                }
            }
            catch (_a) {
                return false;
            }
        });
    }
}
exports.default = AuthService;
