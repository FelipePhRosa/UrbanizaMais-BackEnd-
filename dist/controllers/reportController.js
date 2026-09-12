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
const reportService_1 = __importDefault(require("../services/reportService"));
const citiesService_1 = __importDefault(require("../services/citiesService"));
class ReportControllers {
    constructor(reportService = new reportService_1.default(), citiesService = new citiesService_1.default()) {
        this.reportService = reportService;
        this.citiesService = citiesService;
    }
    createReport(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const userId = Number(req.params.userId);
            if (isNaN(userId)) {
                res.status(400).json({ error: "userID is not valid." });
                return;
            }
            try {
                const { reportTitle, category_id, description, city_id, neighborhood_id, address, latitude, longitude } = req.body;
                const image = (_a = req.file) === null || _a === void 0 ? void 0 : _a.filename;
                const user = yield (0, connection_1.default)('users').where({ id: userId }).first();
                if (!reportTitle || !category_id || !description || !city_id || !neighborhood_id || !address) {
                    res.status(400).json({
                        message: `Please complete all fields.`
                    });
                    return;
                }
                if (!user) {
                    res.status(404).json({ error: `User not found.` });
                    return;
                }
                const neighborhood = yield (0, connection_1.default)('neighborhoods')
                    .where({ id: neighborhood_id, city_id }).first();
                if (!neighborhood) {
                    res.status(400).json({
                        message: 'Invalid neighborhood for this city.'
                    });
                    return;
                }
                yield this.reportService.createReport({
                    reportTitle,
                    user_id: userId,
                    category_id,
                    city_id,
                    neighborhood_id,
                    description,
                    address,
                    latitude,
                    longitude,
                    image
                });
                res.status(201).json({ message: `${user.nameUser} create report: ${reportTitle}.` });
                return;
            }
            catch (error) {
                res.status(500).json({
                    message: `Error to create Report.`,
                    details: error
                });
                return;
            }
        });
    }
    approveReport(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const reportId = Number(req.params.reportId);
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            console.log("Report ID:", reportId);
            console.log("User ID from token:", userId);
            console.log("User Role: ", (_b = req.user) === null || _b === void 0 ? void 0 : _b.role);
            if (isNaN(reportId) || !userId) {
                return res.status(400).json({ error: "Invalid reportId or userId." });
            }
            try {
                const user = yield (0, connection_1.default)('users').where({ id: userId }).first();
                if (!user) {
                    return res.status(404).json({
                        message: `Admin user not found.`
                    });
                }
                if (Number(user.role) !== 2 && Number(user.role) !== 1) {
                    return res.status(403).json({
                        error: `Only Owner / Admins can approve reports.`
                    });
                }
                const report = yield (0, connection_1.default)('reports').where({ id: reportId }).first();
                if (!report) {
                    return res.status(404).json({
                        message: `Report not found.`
                    });
                }
                if (report.status === 'aprovado') {
                    return res.status(400).json({
                        error: `Report already approved.`
                    });
                }
                yield (0, connection_1.default)('reports')
                    .where({ id: reportId })
                    .update({
                    status: 'aprovado',
                    approved_by: userId
                });
                return res.status(200).json({
                    message: `Report ${reportId} approved by ${user.nameUser}.`,
                });
            }
            catch (error) {
                res.status(500).json({
                    message: `Internal Server Error.`,
                    details: error
                });
            }
        });
    }
    declineReport(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const reportId = Number(req.params.reportId);
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (isNaN(reportId) || !userId) {
                return res.status(400).json({
                    error: `Invalid ReportID or UserId.`
                });
            }
            try {
                const user = yield (0, connection_1.default)('users').where({ id: userId }).first();
                if (!user) {
                    return res.status(404).json({
                        error: `Admin not found.`
                    });
                }
                if (Number(user.role) !== 2 && Number(user.role) !== 1) {
                    return res.status(403).json({
                        error: `Only Owner / Admin can decline reports.`
                    });
                }
                const report = yield (0, connection_1.default)('reports').where({ id: reportId }).first();
                if (!report) {
                    return res.status(404).json({
                        error: `Report not found.`
                    });
                }
                if (report.status === 'aprovado') {
                    return res.status(400).json({
                        message: `Report already approved.`
                    });
                }
                yield (0, connection_1.default)('reports').where({ id: reportId }).update({ status: 'rejeitado', approved_by: userId });
                return res.status(200).json({
                    message: `Report ${reportId} declined by ${user.nome}`
                });
            }
            catch (error) {
                res.status(500).json({
                    message: `Internal Server Error.`,
                    details: error
                });
            }
        });
    }
    getAllReportsDecline(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const DeclineReports = yield this.reportService.getAllReportsRejected();
                res.status(200).json({
                    message: `All Reports Decline Informations: `,
                    data: DeclineReports
                });
            }
            catch (error) {
                res.status(500).json({
                    message: `Internal Server Error`,
                    details: error
                });
            }
        });
    }
    getAllReportsPending(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const PendingReports = yield this.reportService.getAllReportsPending();
                res.status(200).json({
                    message: `All Reports Pending Informations: `,
                    data: PendingReports
                });
            }
            catch (error) {
                res.status(500).json({
                    message: `Internal Server Error.`,
                    details: error
                });
            }
        });
    }
    getAllReportsByCity(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const user = Number((_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
            const userRole = Number((_b = req.user) === null || _b === void 0 ? void 0 : _b.role);
            try {
                const { city_id, status } = req.body;
                if (!user) {
                    res.status(404).json({
                        message: `Searcher not authenticated or not founded.`
                    });
                    return;
                }
                if (userRole > 2) {
                    res.status(403).json({
                        message: `You don't have permissions for that action.`
                    });
                    return;
                }
                const validStatuses = ['pendente', 'aprovado', 'rejeitado'];
                const statusFilter = status && validStatuses.includes(status) ? status : undefined;
                const reports = yield this.reportService.getAllReportsByCity(city_id, statusFilter);
                const city = yield this.citiesService.getCityById(city_id);
                res.status(200).json({
                    message: `// All Informations for ${city.name}`,
                    data: reports
                });
                return;
            }
            catch (error) {
                res.status(500).json({
                    message: `Internal Server Error - 500`,
                    details: error
                });
                return;
            }
        });
    }
    getAllReports(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const AllReports = yield this.reportService.getAllReports();
                res.status(200).json({
                    message: `All Reports Informations: `,
                    data: AllReports
                });
                return;
            }
            catch (error) {
                res.status(500).json({
                    message: `Internal Server Error. `,
                    details: error
                });
                return;
            }
        });
    }
    getLikeStatus(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const reportId = Number(req.params.id);
            const userId = Number((_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
            if (!reportId || isNaN(reportId)) {
                res.status(400).json({ message: 'Report ID inválido.' });
                return;
            }
            try {
                const report = yield this.reportService.getReportById(reportId, userId);
                if (!report) {
                    res.status(404).json({ message: 'Report não encontrado.' });
                    return;
                }
                res.json({
                    liked: Boolean(report.likedByCurrentUser),
                    totalLikes: Number(report.likes)
                });
            }
            catch (error) {
                console.error(error);
                res.status(500).json({ message: 'Erro interno.' });
            }
        });
    }
    getAllLikes(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const reportId = Number(req.params.reportId);
            if (!reportId || isNaN(reportId)) {
                res.status(400).json({ message: 'Report ID inválido.' });
                return;
            }
            try {
                const result = yield this.reportService.getAllLikes(reportId);
                const totalLikes = result[0].total;
                res.json({ total: Number(totalLikes) });
            }
            catch (error) {
                console.error('Error to search likes. ', error);
                res.status(500).json({
                    message: `Error Internal Server.`
                });
            }
        });
    }
    getReportById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const { id } = req.params; // <-- mudança aqui, pega de params ao invés de body
            const user = req.user;
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            console.log('=== DEBUG GET REPORT BY ID ===');
            console.log('Report ID:', id);
            console.log('User ID:', userId);
            if (isNaN(Number(id))) {
                res.status(400).json({ error: "id must be a valid number." });
                return;
            }
            try {
                const report = yield this.reportService.getReportById(Number(id));
                console.log('Report result:', {
                    id: report === null || report === void 0 ? void 0 : report.id,
                    likes: report === null || report === void 0 ? void 0 : report.likes,
                    likedByCurrentUser: report === null || report === void 0 ? void 0 : report.likedByCurrentUser
                });
                res.status(200).json({
                    message: `Informations for Report {${id}}`,
                    reportInf: report
                });
            }
            catch (error) {
                res.status(500).json({
                    message: `Error Internal Server.`,
                    details: error
                });
            }
        });
    }
    deleteReport(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { reportId } = req.body;
                if (isNaN(reportId)) {
                    res.status(400).json({ error: "reportId must be a valid number." });
                    return;
                }
                const report = yield this.reportService.getReportById(reportId);
                if (!report) {
                    res.status(404).json({ error: `Report not found.` });
                    return;
                }
                yield this.reportService.deleteReport(reportId);
                res.status(200).json({
                    message: `${report.reportTitle} was deleted successfully!`,
                    deletedReport: report
                });
                return;
            }
            catch (error) {
                res.status(500).json({
                    message: `Error Internal Server.`,
                    details: error
                });
                return;
            }
        });
    }
    getMyReports(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                res.status(401).json({ error: 'User not found.' });
                return;
            }
            try {
                const userReports = yield this.reportService.getMyReports(userId);
                res.status(200).json({
                    message: `All reports created by ${(_b = req.user) === null || _b === void 0 ? void 0 : _b.fullName} user.`,
                    data: userReports,
                });
                return;
            }
            catch (error) {
                res.status(500).json({
                    message: 'Internal Server Error (500)',
                    details: error
                });
                return;
            }
        });
    }
    getReportsByCity(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const city_id = req.body;
            if (!city_id) {
                res.status(404).json({
                    message: 'City not found.'
                });
                return;
            }
            try {
                const reportsFiltred = yield this.reportService.getReportsByCity(city_id);
                res.status(200).json({
                    message: `Todos reports da cidade ${city_id}`,
                    details: reportsFiltred
                });
            }
            catch (error) {
                res.status(500).json({
                    message: 'Internal Server Error (500)',
                    details: error
                });
            }
        });
    }
}
exports.default = ReportControllers;
