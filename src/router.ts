import { RequestHandler } from 'express';
import { Router } from "express";
import ReportControllers from "./controllers/reportController";
import UserController from "./controllers/userController";
import AuthController from "./controllers/AuthController";
import CitiesControllers from './controllers/citiesController';
import DashboardController from './controllers/dashboardController';
import neighborhoodsControllers from './controllers/neighborhoodsController';
import { authenticate } from './services/authMiddleware';
import { uploadSingle } from './services/upload'

const router = Router();
const userController = new UserController();
const reportControllers = new ReportControllers();
const citiesControllers = new CitiesControllers();
const neighborHoodsControllers = new neighborhoodsControllers();
const dashboardController = new DashboardController();
const authController = new AuthController();

router.get('/', async (req, res) => {
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
        }
    );    
});

router.post('/login', authController.login.bind(authController) as unknown as RequestHandler);
router.post('/loginMidia', authController.socialLogin.bind(authController) as unknown as RequestHandler);
router.get("/auth/google/callback", authController.googleCallback.bind(authController) as unknown as RequestHandler); 
router.post('/register', userController.createUser.bind(userController));

router.post('/report/:userId', authenticate, uploadSingle('imagem'), reportControllers.createReport.bind(reportControllers) as RequestHandler);
router.post('/report/:reportId/like', authenticate, userController.userLiked.bind(userController))

router.post('/approveReport/:reportId', authenticate, reportControllers.approveReport.bind(reportControllers) as RequestHandler);
router.post('/declineReport/:reportId', authenticate, reportControllers.declineReport.bind(reportControllers) as RequestHandler);

router.post('/cr_city', authenticate, citiesControllers.createCity.bind(citiesControllers));
router.post('/cr_neighborhood', authenticate, neighborHoodsControllers.createNeighborhood.bind(neighborHoodsControllers));

router.post('/updateRole', authenticate, userController.updateRole.bind(userController));

router.put('/api/user/update', authenticate, uploadSingle("avatar"), userController.updateUserInfo.bind(userController) as RequestHandler);

router.post('/auth/login-otp', userController.verifyLoginOTP.bind(userController));
router.post('/auth/verify-otp', userController.verifyOTPOnly.bind(userController));
router.post('/auth/resend-otp', userController.resendOTP.bind(userController));
router.post('/resetpass', userController.resetPassword.bind(userController));

router.get('/admin', authenticate, dashboardController.dashboardAdmin.bind(dashboardController));
router.get('/admin/:cityId', authenticate, dashboardController.dashboardAdminByCity.bind(dashboardController));
router.get('/dashboard', authenticate, citiesControllers.dashboardByCity.bind(citiesControllers));
router.get('/dashboardNeighborhood', authenticate, neighborHoodsControllers.dashboardNeighborhood.bind(neighborHoodsControllers) as RequestHandler);

router.get('/userList', authenticate, userController.listAllUsers.bind(userController));
router.get('/userById', userController.listUserById.bind(userController));
router.get('/myreports', authenticate, reportControllers.getMyReports.bind(reportControllers));
router.get('/reportList', reportControllers.getAllReports.bind(reportControllers));
router.get('/neighborhoodById', authenticate, neighborHoodsControllers.getNeighborhoods.bind(neighborHoodsControllers));
router.get('/cityById', authenticate, citiesControllers.getCityById.bind(citiesControllers));
router.get('/allCities', citiesControllers.getAllCities.bind(citiesControllers));
router.get('/allNeighborhoods', neighborHoodsControllers.getAllNeighborhoods.bind(neighborHoodsControllers));
router.get('/neighborhood/:city_id', neighborHoodsControllers.getNeighborhoodsByCity.bind(neighborHoodsControllers) as unknown as RequestHandler);
router.get('/reportsByCity', authenticate, reportControllers.getAllReportsByCity.bind(reportControllers));
router.get('/report/:id', reportControllers.getReportById.bind(reportControllers));
router.get('/report/:id/like', authenticate, reportControllers.getLikeStatus.bind(reportControllers));
router.get('/report/:id/likes', reportControllers.getAllLikes.bind(reportControllers));
router.get('/reportPending', authenticate, reportControllers.getAllReportsPending.bind(reportControllers) as RequestHandler);
router.get('/reportDecline', authenticate, reportControllers.getAllReportsDecline.bind(reportControllers) as RequestHandler);
router.get('/likes/:reportId', reportControllers.getAllLikes.bind(reportControllers));

router.delete('/delUser', authenticate, userController.deleteUser.bind(userController) as RequestHandler);
router.delete('/delCity', authenticate, citiesControllers.deleteCity.bind(citiesControllers));
router.delete('/delNeighborhood', authenticate, neighborHoodsControllers.delNeighborhood.bind(neighborHoodsControllers));
router.delete('/delReport', authenticate, reportControllers.deleteReport.bind(reportControllers) as RequestHandler);

export default router;
    