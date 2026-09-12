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
const dashboardService_1 = __importDefault(require("../services/dashboardService"));
const citiesService_1 = __importDefault(require("../services/citiesService"));
class DashboardController {
    constructor(dashboardService = new dashboardService_1.default(), citiesService = new citiesService_1.default()) {
        this.dashboardService = dashboardService;
        this.citiesService = citiesService;
    }
    // ─── ADMIN GLOBAL ────────────────────────────────────────────────
    dashboardAdmin(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const userRole = (_a = req.user) === null || _a === void 0 ? void 0 : _a.role;
            if (!userRole || userRole > 2) {
                res.status(403).json({
                    message: `You don't have permission to access admin dashboard.`,
                });
                return;
            }
            try {
                const [globalStats, reportsByStatus, topNeighborhoods] = yield Promise.all([
                    this.dashboardService.getGlobalStats(),
                    this.dashboardService.getReportsByStatus(),
                    this.dashboardService.getTopNeighborhoodsByReports(),
                ]);
                res.status(200).json({
                    message: `Admin Dashboard - Global Overview`,
                    globalStats,
                    reportsByStatus,
                    topNeighborhoods,
                });
            }
            catch (error) {
                res.status(500).json({
                    message: `Internal Server Error.`,
                    details: error,
                });
            }
        });
    }
    // ─── ADMIN POR CIDADE ─────────────────────────────────────────────
    dashboardAdminByCity(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const userRole = (_a = req.user) === null || _a === void 0 ? void 0 : _a.role;
            if (!userRole || userRole > 2) {
                res.status(403).json({
                    message: `You don't have permission to access this dashboard.`,
                });
                return;
            }
            const city_id = Number(req.params.cityId);
            if (isNaN(city_id)) {
                res.status(400).json({ message: `cityId must be a valid number.` });
                return;
            }
            try {
                const city = yield this.citiesService.getCityById(city_id);
                if (!city) {
                    res.status(404).json({ message: `City not found.` });
                    return;
                }
                const [cityStats, topNeighborhoods, recentReports] = yield Promise.all([
                    this.dashboardService.getCityStats(city_id),
                    this.dashboardService.getTopNeighborhoodsByCity(city_id),
                    this.dashboardService.getRecentReportsByCity(city_id),
                ]);
                res.status(200).json({
                    message: `Admin Dashboard - ${city.name}`,
                    cityStats,
                    topNeighborhoods,
                    recentReports,
                });
            }
            catch (error) {
                res.status(500).json({
                    message: `Internal Server Error.`,
                    details: error,
                });
            }
        });
    }
}
exports.default = DashboardController;
