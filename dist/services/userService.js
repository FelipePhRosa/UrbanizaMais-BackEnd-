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
const connection_1 = __importDefault(require("../connection"));
class UserService {
    createUser(userData) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, connection_1.default)('users').insert(userData);
        });
    }
    getUserById(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, connection_1.default)('users').where({ id: userId }).select('*').first();
        });
    }
    getUserByName(fullName) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, connection_1.default)('users').where({ fullName: fullName }).select('*').first();
        });
    }
    getAllUsers() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, connection_1.default)('users').select('*');
        });
    }
    deleteUser(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, connection_1.default)('users').where({ id: userId }).delete();
        });
    }
    userLiked(userId, reportId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, connection_1.default)('likes').insert({ user_id: userId, report_id: reportId });
        });
    }
    userUnlike(userId, reportId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, connection_1.default)('likes').where({ user_id: userId, report_id: reportId }).delete();
        });
    }
    getUsersWithReportStats() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, connection_1.default)('users as u')
                .leftJoin('reports as r', 'u.id', 'r.user_id')
                .select('u.id', 'u.nameUser', 'u.email', connection_1.default.raw('COUNT(r.id) as totalReports'), connection_1.default.raw(`SUM(CASE WHEN r.status = 'aprovado' THEN 1 ELSE 0 END) as aprovados`), connection_1.default.raw(`SUM(CASE WHEN r.status = 'rejeitado' THEN 1 ELSE 0 END) as rejeitados`), connection_1.default.raw(`SUM(CASE WHEN r.status = 'pendente' THEN 1 ELSE 0 END) as pendentes`))
                .groupBy('u.id');
        });
    }
    updateRole(userId, newRole) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, connection_1.default)('users').where({ id: userId }).update({ role: newRole });
        });
    }
    updateUserInfo(userId, updateData) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, connection_1.default)('users').where({ id: userId }).update(updateData);
        });
    }
}
exports.default = UserService;
