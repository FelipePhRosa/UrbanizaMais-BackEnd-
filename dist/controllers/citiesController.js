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
const citiesService_1 = __importDefault(require("../services/citiesService"));
const reportService_1 = __importDefault(require("../services/reportService"));
class citiesControllers {
    constructor(citiesService = new citiesService_1.default(), reportService = new reportService_1.default()) {
        this.citiesService = citiesService;
        this.reportService = reportService;
    }
    createCity(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const userRole = (_a = req.user) === null || _a === void 0 ? void 0 : _a.role;
            const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.id;
            if (!userId) {
                res.status(500).json({
                    message: `userId invalid.`
                });
                return;
            }
            if (!userRole || userRole > 2) {
                res.status(403).json({
                    message: `You don't have permission for create city.`,
                    role: userRole
                });
                return;
            }
            try {
                const { name, state_id, population, latitude, longitude, created_by } = req.body;
                const user = req.user;
                const cityAlreadyExists = yield (0, connection_1.default)('cities').where({ name });
                if (!user) {
                    res.status(404).json({
                        error: `User not found.`
                    });
                    return;
                }
                if (cityAlreadyExists.length > 0) {
                    res.status(409).json({
                        message: `City Already Exists.`
                    });
                    return;
                }
                if (!name || !state_id || !population || !latitude || !longitude || !created_by) {
                    res.status(400).json({
                        message: `Please complete all required fields.`
                    });
                    return;
                }
                yield this.citiesService.createCity({
                    name,
                    state_id,
                    population,
                    latitude,
                    longitude,
                    created_by: userId
                });
                res.status(201).json({
                    message: `City created successfully. By - ${user.fullName}`
                });
            }
            catch (error) {
                res.status(500).json({
                    message: `Error to Create City.`,
                    details: error
                });
                return;
            }
        });
    }
    getCityById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { cityId } = req.body;
            try {
                const city = yield this.citiesService.getCityById(cityId);
                if (!city) {
                    res.status(404).json({
                        message: `City Not Found, verify CityID.`
                    });
                    return;
                }
                res.status(200).json({
                    message: `// ${city.name} - Informations.`,
                    cityInf: city
                });
                return;
            }
            catch (error) {
                res.status(500).json({
                    message: `Error to Search City.`,
                    details: error
                });
                return;
            }
        });
    }
    getAllCities(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const cities = yield (0, connection_1.default)('cities').select('id', 'name');
                res.json(cities);
                return;
            }
            catch (err) {
                console.error(err);
                res.status(500).json({ message: 'Erro ao buscar cidades' });
                return;
            }
        });
    }
    deleteCity(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = req.user;
            if (!user) {
                res.status(401).json({ message: "Token Invalid - Try sign-in again." });
                return;
            }
            const userId = Number(user.id);
            const userRole = Number(user.role);
            if (isNaN(userId)) {
                res.status(400).json({ error: "UserId must be a valid number." });
                return;
            }
            if (!userRole || userRole > 2) {
                res.status(403).json({ error: "You don't have permission to delete city." });
                return;
            }
            const cityId = Number(req.body.cityId);
            if (isNaN(cityId)) {
                res.status(400).json({ error: "CityId must be a valid number." });
                return;
            }
            try {
                const city = yield this.citiesService.getCityById(cityId);
                if (!city) {
                    res.status(404).json({ message: "City not found." });
                    return;
                }
                const usersInCity = yield (0, connection_1.default)('users')
                    .select('id', 'fullName', 'email', 'role')
                    .where({ city_id: cityId });
                if (usersInCity.length > 0) {
                    res.status(400).json({
                        message: "Cannot delete city: there are users assigned to this city.",
                        users: usersInCity
                    });
                    return;
                }
                yield this.citiesService.deleteCity(cityId);
                res.status(200).json({
                    message: `${city.name} was deleted successfully`,
                    deletecity: city
                });
                return;
            }
            catch (error) {
                console.error(error);
                res.status(500).json({
                    message: "Error to delete city.",
                    details: error
                });
                return;
            }
        });
    }
    dashboardByCity(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const prefeito = req.user;
            if (!prefeito) {
                res.status(404).json({
                    message: `User not found.`,
                });
                return;
            }
            if (Number(prefeito.role) !== 7) {
                res.status(403).json({
                    message: `Acesso negado. Apenas prefeitos podem acessar este recurso.`,
                });
                return;
            }
            if (!prefeito.city_id) {
                res.status(400).json({
                    message: `Prefeito não possui cidade associada.`,
                });
                return;
            }
            try {
                const city = yield this.citiesService.getCityById(prefeito.city_id);
                const totalReports = yield this.citiesService.getTotalReportsByCity(prefeito.city_id);
                const totalPopulationCity = yield this.citiesService.getPopulationCity(prefeito.city_id);
                const AllReports = yield this.citiesService.getAllReportsByCity(prefeito.city_id);
                res.status(200).json({
                    message: `Total de reports e População na cidade ${city.name}`,
                    TotalReports: totalReports,
                    AllReports: AllReports,
                    TotalPopulationCity: totalPopulationCity,
                });
                return;
            }
            catch (error) {
                res.status(500).json({
                    message: `Internal Server Error (500)`,
                    details: error,
                });
                return;
            }
        });
    }
}
exports.default = citiesControllers;
