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
class DashboardService {
    // ─── ADMIN GLOBAL ────────────────────────────────────────────────
    getGlobalStats() {
        return __awaiter(this, void 0, void 0, function* () {
            const [totalCities] = yield (0, connection_1.default)('cities').count('* as total');
            const [totalNeighborhoods] = yield (0, connection_1.default)('neighborhoods').count('* as total');
            const [totalUsers] = yield (0, connection_1.default)('users').count('* as total');
            const [totalReports] = yield (0, connection_1.default)('reports').count('* as total');
            return {
                totalCities: Number(totalCities.total),
                totalNeighborhoods: Number(totalNeighborhoods.total),
                totalUsers: Number(totalUsers.total),
                totalReports: Number(totalReports.total),
            };
        });
    }
    getReportsByStatus() {
        return __awaiter(this, void 0, void 0, function* () {
            const statuses = ['pendente', 'aprovado', 'resolvida', 'rejeitado'];
            const results = yield Promise.all(statuses.map((status) => __awaiter(this, void 0, void 0, function* () {
                const [row] = yield (0, connection_1.default)('reports').where({ status }).count('* as total');
                return { status, total: Number(row.total) };
            })));
            return results;
        });
    }
    getTopNeighborhoodsByReports() {
        return __awaiter(this, arguments, void 0, function* (limit = 5) {
            return yield (0, connection_1.default)('reports')
                .join('neighborhoods', 'reports.neighborhood_id', 'neighborhoods.id')
                .join('cities', 'reports.city_id', 'cities.id')
                .select('neighborhoods.id as neighborhood_id', 'neighborhoods.name as neighborhood', 'cities.name as city')
                .count('reports.id as totalReports')
                .groupBy('reports.neighborhood_id', 'reports.city_id', 'neighborhoods.name', 'cities.name')
                .orderBy('totalReports', 'desc')
                .limit(limit);
        });
    }
    // ─── ADMIN POR CIDADE ─────────────────────────────────────────────
    getCityStats(city_id) {
        return __awaiter(this, void 0, void 0, function* () {
            const city = yield (0, connection_1.default)('cities').where({ id: city_id }).first();
            const [totalUsers] = yield (0, connection_1.default)('users').where({ city_id }).count('* as total');
            const [totalReports] = yield (0, connection_1.default)('reports').where({ city_id }).count('* as total');
            const [totalNeighborhoods] = yield (0, connection_1.default)('neighborhoods').where({ city_id }).count('* as total');
            const reportsByStatus = yield (0, connection_1.default)('reports')
                .where({ city_id })
                .select('status')
                .count('* as total')
                .groupBy('status');
            return {
                city,
                totalUsers: Number(totalUsers.total),
                totalReports: Number(totalReports.total),
                totalNeighborhoods: Number(totalNeighborhoods.total),
                reportsByStatus,
            };
        });
    }
    getTopNeighborhoodsByCity(city_id_1) {
        return __awaiter(this, arguments, void 0, function* (city_id, limit = 5) {
            return yield (0, connection_1.default)('reports')
                .join('neighborhoods', 'reports.neighborhood_id', 'neighborhoods.id')
                .where({ 'reports.city_id': city_id })
                .select('neighborhoods.id as neighborhood_id', 'neighborhoods.name as neighborhood')
                .count('reports.id as totalReports')
                .groupBy('reports.neighborhood_id', 'neighborhoods.name')
                .orderBy('totalReports', 'desc')
                .limit(limit);
        });
    }
    getRecentReportsByCity(city_id_1) {
        return __awaiter(this, arguments, void 0, function* (city_id, limit = 10) {
            return yield (0, connection_1.default)('reports')
                .where({ city_id })
                .orderBy('created_at', 'desc')
                .limit(limit)
                .select('*');
        });
    }
    getMonthlyTrend() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, connection_1.default)('reports')
                .select(connection_1.default.raw("DATE_FORMAT(created_at, '%b') as mes"))
                .count('* as recebidos')
                .whereRaw("created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)")
                .groupByRaw("DATE_FORMAT(created_at, '%Y-%m')")
                .orderByRaw("MIN(created_at)");
        });
    }
}
exports.default = DashboardService;
