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
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const reportController_1 = __importDefault(require("./controllers/reportController"));
const userController_1 = __importDefault(require("./controllers/userController"));
const AuthController_1 = __importDefault(require("./controllers/AuthController"));
const citiesController_1 = __importDefault(require("./controllers/citiesController"));
const dashboardController_1 = __importDefault(require("./controllers/dashboardController"));
const neighborhoodsController_1 = __importDefault(require("./controllers/neighborhoodsController"));
const authMiddleware_1 = require("./services/authMiddleware");
const upload_1 = __importDefault(require("./services/upload"));
const router = (0, express_1.Router)();
const userController = new userController_1.default();
const reportControllers = new reportController_1.default();
const citiesControllers = new citiesController_1.default();
const neighborHoodsControllers = new neighborhoodsController_1.default();
const dashboardController = new dashboardController_1.default();
const authController = new AuthController_1.default();
const uploadtemp = (0, multer_1.default)({ dest: 'uploads/' });
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.json({
        message: "Welcome to the LocalTED API!",
        routes: {
            users: {
                create: "POST /user",
                list: "GET /userList",
                byId: "GET /userById",
                delete: "DELETE /delUser (auth required)"
            },
            reports: {
                create: "POST /report/:userId",
                list: "GET /reportList",
                byId: "GET /reportById",
                delete: "DELETE /delReport"
            },
            auth: {
                login: "POST /login"
            },
        }
    });
}));
router.post('/login', authController.login.bind(authController));
router.post('/loginMidia', authController.socialLogin.bind(authController));
router.get("/auth/google/callback", authController.googleCallback.bind(authController));
router.post('/register', userController.createUser.bind(userController));
router.post('/report/:userId', authMiddleware_1.authenticate, uploadtemp.single('imagem'), reportControllers.createReport.bind(reportControllers));
router.post('/report/:reportId/like', authMiddleware_1.authenticate, userController.userLiked.bind(userController));
router.post('/approveReport/:reportId', authMiddleware_1.authenticate, reportControllers.approveReport.bind(reportControllers));
router.post('/declineReport/:reportId', authMiddleware_1.authenticate, reportControllers.declineReport.bind(reportControllers));
router.post('/cr_city', authMiddleware_1.authenticate, citiesControllers.createCity.bind(citiesControllers));
router.post('/cr_neighborhood', authMiddleware_1.authenticate, neighborHoodsControllers.createNeighborhood.bind(neighborHoodsControllers));
router.post('/updateRole', authMiddleware_1.authenticate, userController.updateRole.bind(userController));
router.put('/api/user/update', authMiddleware_1.authenticate, upload_1.default.single("avatar"), userController.updateUserInfo.bind(userController));
router.post('/auth/login-otp', userController.verifyLoginOTP.bind(userController));
router.post('/auth/verify-otp', userController.verifyOTPOnly.bind(userController));
router.post('/auth/resend-otp', userController.resendOTP.bind(userController));
router.post('/resetpass', userController.resetPassword.bind(userController));
router.get('/admin', authMiddleware_1.authenticate, dashboardController.dashboardAdmin.bind(dashboardController));
router.get('/admin/:cityId', authMiddleware_1.authenticate, dashboardController.dashboardAdminByCity.bind(dashboardController));
router.get('/dashboard', authMiddleware_1.authenticate, citiesControllers.dashboardByCity.bind(citiesControllers));
router.get('/dashboardNeighbordoor', neighborHoodsControllers.dashboardNeighborhood.bind(neighborHoodsControllers));
router.get('/userList', userController.listAllUsers.bind(userController));
router.get('/userById', userController.listUserById.bind(userController));
router.get('/myreports', authMiddleware_1.authenticate, reportControllers.getMyReports.bind(reportControllers));
router.get('/reportList', reportControllers.getAllReports.bind(reportControllers));
router.get('/neighborhoodById', authMiddleware_1.authenticate, neighborHoodsControllers.getNeighborhoods.bind(neighborHoodsControllers));
router.get('/cityById', authMiddleware_1.authenticate, citiesControllers.getCityById.bind(citiesControllers));
router.get('/allCities', citiesControllers.getAllCities.bind(citiesControllers));
router.get('/allNeighborhoods', neighborHoodsControllers.getAllNeighborhoods.bind(neighborHoodsControllers));
router.get('/neighborhood/:city_id', neighborHoodsControllers.getNeighborhoodsByCity.bind(neighborHoodsControllers));
router.get('/reportsByCity', authMiddleware_1.authenticate, reportControllers.getAllReportsByCity.bind(reportControllers));
router.get('/report/:id', reportControllers.getReportById.bind(reportControllers));
router.get('/report/:id/like', authMiddleware_1.authenticate, reportControllers.getLikeStatus.bind(reportControllers));
router.get('/report/:id/likes', reportControllers.getAllLikes.bind(reportControllers));
router.get('/reportPending', reportControllers.getAllReportsPending.bind(reportControllers));
router.get('/reportDecline', reportControllers.getAllReportsDecline.bind(reportControllers));
router.get('/likes/:reportId', reportControllers.getAllLikes.bind(reportControllers));
router.delete('/delUser', userController.deleteUser.bind(userController));
router.delete('/delCity', authMiddleware_1.authenticate, citiesControllers.deleteCity.bind(citiesControllers));
router.delete('/delNeighborhood', authMiddleware_1.authenticate, neighborHoodsControllers.delNeighborhood.bind(neighborHoodsControllers));
router.delete('/delReport', reportControllers.deleteReport.bind(reportControllers));
exports.default = router;
