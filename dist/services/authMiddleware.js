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
exports.isOwner = exports.authenticate = void 0;
const authService_1 = __importDefault(require("./authService"));
const connection_1 = __importDefault(require("../connection"));
const authService = new authService_1.default();
// Middleware para verificar se o usuário está autenticado
const authenticate = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer")) {
            res.status(401).json({ error: "Invalid Token or Expired." });
            return;
        }
        const token = authHeader.split(" ")[1];
        const decoded = authService.verifyToken(token);
        const user = yield (0, connection_1.default)('users')
            .where({ id: decoded.userId })
            .first();
        if (!user) {
            res.status(401).json({ error: "User not found." });
            return;
        }
        req.user = {
            id: decoded.userId,
            email: decoded.email,
            fullName: decoded.fullName,
            role: decoded.role,
            avatar_url: decoded.avatar_url,
            telefone: decoded.telefone,
            city_id: decoded.city_id,
            neighborhood_id: decoded.neighborhood_id
        };
        next();
    }
    catch (error) {
        res.status(401).json({ error: "Invalid Token or Expired." });
        return;
    }
});
exports.authenticate = authenticate;
const isOwner = (//dia 26/09/25 nao lembro do propósito disso pq sempre usei o authenticate nas rotas, e no controller fazia a validação da role, então, nao sei pra que tem isso mas vou deixa pra caso eu lembre
req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const user = yield (0, connection_1.default)('users')
            .where({ id: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id })
            .first();
        if (!(user === null || user === void 0 ? void 0 : user.isOwner)) {
            return res.status(403).json({ error: "Acess Denied: You need been Owner." });
        }
        next();
    }
    catch (error) {
        return res.status(500).json({ error: "Error server to verify Owner." });
    }
});
exports.isOwner = isOwner;
