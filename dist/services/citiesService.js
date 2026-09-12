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
class CitiesService {
    createCity(citiesData) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, connection_1.default)('cities').insert(citiesData);
        });
    }
    getAllCities() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, connection_1.default)('cities').select('*');
        });
    }
    getCityById(cityId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, connection_1.default)('cities').where({ id: cityId }).select('*').first();
        });
    }
    deleteCity(cityId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, connection_1.default)('cities').where({ id: cityId }).delete();
        });
    }
    getPopulationCity(cityId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, connection_1.default)('users').where({ city_id: cityId }).count('* as total').first();
        });
    }
    getTotalReportsByCity(cityId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, connection_1.default)('reports').where({ city_id: cityId, status: 'aprovado' }).count('* as total').first();
        });
    }
    getAllReportsByCity(cityId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, connection_1.default)('reports').where({ city_id: cityId }).select();
        });
    }
}
exports.default = CitiesService;
