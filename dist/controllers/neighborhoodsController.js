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
const citiesService_1 = __importDefault(require("../services/citiesService"));
const neighborhoodService_1 = __importDefault(require("../services/neighborhoodService"));
const connection_1 = __importDefault(require("../connection"));
class neighborhoodsControllers {
    constructor(citiesService = new citiesService_1.default(), neighborhoodService = new neighborhoodService_1.default()) {
        this.citiesService = citiesService;
        this.neighborhoodService = neighborhoodService;
    }
    createNeighborhood(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const userRole = (_a = req.user) === null || _a === void 0 ? void 0 : _a.role;
            const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.id;
            if (!userId) {
                res.status(500).json({
                    message: `userID invalid.`
                });
                return;
            }
            if (!userRole || userRole > 2) {
                res.status(403).json({
                    message: `You don't have permission for create neighboorhood.`,
                    role: userRole
                });
                return;
            }
            try {
                const { name, city_id, latitude, longitude, created_by } = req.body;
                const user = req.user;
                const city = yield this.citiesService.getCityById(city_id);
                const neighborhoodAlreadyExists = yield (0, connection_1.default)('neighborhoods').where({ name, city_id });
                if (!user) {
                    res.status(404).json({
                        error: `User not found.`
                    });
                    return;
                }
                ;
                if (!name || !city_id || !latitude || !longitude || created_by) {
                    res.status(400).json({
                        message: `Please complete all required fields.`
                    });
                    return;
                }
                ;
                if (neighborhoodAlreadyExists.length > 0) {
                    res.status(409).json({
                        message: `This neighborhood '${name}' already exists in ${city.name}`
                    });
                    return;
                }
                ;
                yield this.neighborhoodService.createNeighborhood({
                    name,
                    city_id,
                    latitude,
                    longitude,
                    created_by: userId
                });
                res.status(201).json({
                    message: `Neighborhood created successfully. By - ${user.fullName}`
                });
            }
            catch (error) {
                res.status(500).json({
                    message: `Error to create new NeighborHood.`,
                    details: error
                });
                return;
            }
        });
    }
    getNeighborhoods(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const userRole = (_a = req.user) === null || _a === void 0 ? void 0 : _a.role;
            const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.id;
            if (!userId) {
                res.status(500).json({
                    message: `userID invalid.`
                });
                return;
            }
            if (!userRole || userRole > 2) {
                res.status(403).json({
                    message: `You don't have permission for create neighboorhood.`,
                    role: userRole
                });
                return;
            }
            const { neighborhood_id, city_id } = req.body;
            try {
                const user = req.user;
                if (!user) {
                    res.status(404).json({
                        error: `User not found.`
                    });
                    return;
                }
                ;
                const neighborhood = yield this.neighborhoodService.getNeighborhoodById(neighborhood_id, city_id);
                if (!neighborhood) {
                    res.status(404).json({
                        message: `Neighborhood not found, verify NeighborhoodID.`
                    });
                    return;
                }
                if (!neighborhood_id || !city_id) {
                    res.status(400).json({
                        message: `Please complete all required fields.`
                    });
                    return;
                }
                res.status(200).json({
                    message: `/// ${neighborhood.name} - Informations.`,
                    neighborhoodInf: neighborhood
                });
                return;
            }
            catch (error) {
                res.status(500).json({
                    message: `Error to Search Neighborhood.`,
                    details: error,
                });
            }
        });
    }
    getAllNeighborhoods(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { city_id } = req.body;
            const city = yield this.citiesService.getCityById(city_id);
            if (!city) {
                res.status(404).json({
                    message: `City Not found, please check City_Id.`
                });
                return;
            }
            try {
                const neighborhoods = yield this.neighborhoodService.getAllNeighborhood(city_id);
                if (!neighborhoods) {
                    res.status(404).json({
                        message: `${city.name} don't have neighborhoods. Verify City_ID.`
                    });
                    return;
                }
                res.status(201).json({
                    message: `/// ${city.name} - Neighborhoods Informations. `,
                    InfNeighborhoods: neighborhoods
                });
                return;
            }
            catch (error) {
            }
        });
    }
    getNeighborhoodsByCity(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { city_id } = req.params;
            const city = yield this.citiesService.getCityById(Number(city_id));
            if (!city) {
                res.status(404).json({
                    message: `City Not found, please check City_Id.`
                });
                return;
            }
            try {
                const neighborhoods = yield this.neighborhoodService.getAllNeighborhood(Number(city_id));
                if (!neighborhoods) {
                    res.status(404).json({
                        message: `${city.name} don't have neighborhoods. Verify City_ID.`
                    });
                    return;
                }
                res.status(201).json({
                    message: `/// ${city.name} - Neighborhoods Informations. `,
                    InfNeighborhoods: neighborhoods
                });
                return;
            }
            catch (error) {
                res.status(500).json({
                    message: `Error to Search Neighborhoods by City.`,
                    details: error,
                });
            }
        });
    }
    delNeighborhood(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { neighborhood_id, city_id } = req.body;
            try {
                const city = yield this.citiesService.getCityById(city_id);
                const neighborhood = yield this.neighborhoodService.getNeighborhoodById(neighborhood_id, city_id);
                if (!neighborhood) {
                    res.status(404).json({
                        message: `Neighborhood not found, verify NeighborhoodID.`
                    });
                    return;
                }
                yield this.neighborhoodService.delNeighborhoodById(neighborhood_id, city_id);
                res.status(200).json({
                    message: `Neighborhood ${neighborhood.name} of city ${city.name} was deleted.`
                });
                return;
            }
            catch (error) {
                res.status(500).json({
                    message: `Error to delete Neighborhood.`,
                    details: error
                });
            }
        });
    }
    dashboardNeighborhood(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { city_id, neighborhood_id } = req.body;
            try {
                const city = yield this.citiesService.getCityById(city_id);
                const neighboorhood = yield this.neighborhoodService.getNeighborhoodById(neighborhood_id, city_id);
                const totalAccountInNeighborhood = yield this.neighborhoodService.TotalAccountInNeighborhood(neighborhood_id, city_id);
                const allReportsByNeighborhood = yield this.neighborhoodService.getAllReportsByNeighborhood(neighborhood_id, city_id);
                const totalReportsByNeighborhood = yield this.neighborhoodService.getTotalReportsByNeighborhood(neighborhood_id, city_id);
                res.status(200).json({
                    message: `Dashboard ${neighboorhood.name} - ${city.name}`,
                    Details: totalAccountInNeighborhood[0],
                    TotalReports: totalReportsByNeighborhood,
                    allReports: allReportsByNeighborhood
                });
            }
            catch (error) {
                res.status(500).json({
                    message: `Internal Server Error (500)`
                });
            }
        });
    }
}
exports.default = neighborhoodsControllers;
