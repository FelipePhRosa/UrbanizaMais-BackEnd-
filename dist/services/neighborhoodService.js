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
class NeighborHoodService {
    createNeighborhood(neighborhoodData) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, connection_1.default)('neighborhoods').insert(neighborhoodData);
        });
    }
    ;
    getNeighborhoodById(neighborhood_id, city_id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, connection_1.default)('neighborhoods').where({ id: neighborhood_id, city_id: city_id }).select('*').first();
        });
    }
    getAllNeighborhood(city_id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, connection_1.default)('neighborhoods').where({ city_id: city_id }).select('*');
        });
    }
    getAllInfoNeighborhood(neighborhood_id, city_id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, connection_1.default)('neighborhoods').where({ id: neighborhood_id, city_id: city_id }).select('*');
        });
    }
    delNeighborhoodById(neighborhood_id, city_id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, connection_1.default)('neighborhoods').where({ id: neighborhood_id, city_id: city_id }).delete();
        });
    }
    TotalAccountInNeighborhood(neighborhood_id, city_id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, connection_1.default)('users').where({ neighborhood_id, city_id }).count('* as totalAccounts');
        });
    }
    getAllAccountsInNeighborhood(neighborhood_id, city_id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, connection_1.default)('users').where({ neighborhood_id, city_id }).select('*');
        });
    }
    getAllReportsByNeighborhood(neighborhood_id, city_id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, connection_1.default)('reports').where({ neighborhood_id, city_id }).orderBy('created_at', 'desc');
        });
    }
    getTotalReportsByNeighborhood(neighborhood_id, city_id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, connection_1.default)('reports').where({ neighborhood_id: neighborhood_id, city_id: city_id }).count('* as totalReport');
        });
    }
}
exports.default = NeighborHoodService;
