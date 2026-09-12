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
class ReportService {
    createReport(reportData) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, connection_1.default)('reports').insert(reportData);
        });
    }
    getAllReports(userId, role) {
        return __awaiter(this, void 0, void 0, function* () {
            // Usuários comuns não veem rejeitados
            const statuses = role === '1'
                ? ['aprovado', 'resolvida', 'rejeitado'] // adm vê tudo
                : ['aprovado', 'resolvida']; // usuário comum vê só aprovadas e resolvidas
            const reports = yield (0, connection_1.default)('reports')
                .whereIn('status', statuses)
                .select('reports.*', (0, connection_1.default)('likes')
                .count('*')
                .whereRaw('likes.report_id = reports.id')
                .as('likes'), connection_1.default.raw(`(SELECT EXISTS (
            SELECT 1 FROM likes 
            WHERE likes.report_id = reports.id AND likes.user_id = ?
        )) as likedByCurrentUser`, [userId !== null && userId !== void 0 ? userId : 0]))
                .orderBy('created_at', 'desc');
            return reports;
        });
    }
    getReportById(reportId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const report = yield (0, connection_1.default)('reports')
                .where({ id: reportId })
                .select('reports.*', 
            // Total de likes
            (0, connection_1.default)('likes')
                .count('*')
                .whereRaw('likes.report_id = reports.id')
                .as('likes'), 
            // Se o usuário curtiu
            connection_1.default.raw(`(SELECT EXISTS (
                        SELECT 1 FROM likes 
                        WHERE likes.report_id = reports.id AND likes.user_id = ?
                    )) as likedByCurrentUser`, [userId !== null && userId !== void 0 ? userId : 0]))
                .first(); // retorna um único registro
            return report;
        });
    }
    getAllReportsPending() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, connection_1.default)('reports').where({ status: 'pendente' }).select('*');
        });
    }
    getAllReportsRejected() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, connection_1.default)('reports').where({ status: 'rejeitado' }).select('*');
        });
    }
    getAllReportsByCity(city_id, status) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = (0, connection_1.default)('reports').where({ city_id });
            if (status) {
                query.andWhere({ status });
            }
            return yield query.select('*');
        });
    }
    deleteReport(reportId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, connection_1.default)('reports').where({ id: reportId }).delete();
        });
    }
    getAllLikes(reportId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, connection_1.default)('likes').where({ report_id: reportId }).count('* as total');
        });
    }
    getMyReports(user_id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, connection_1.default)('reports').where({ user_id }).orderBy('created_at', 'desc');
        });
    }
    getReportsByCity(city_id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, connection_1.default)('reports').where({ city_id: city_id }).orderBy('created_at', 'desc');
        });
    }
}
exports.default = ReportService;
