import { Response } from "express";
import { AuthRequest } from "../types/express";
import DashboardService from "../services/dashboardService";
import CitiesService from "../services/citiesService";

export default class DashboardController {
    constructor(
        private dashboardService = new DashboardService(),
        private citiesService = new CitiesService()
    ) {}

    // ─── ADMIN GLOBAL ────────────────────────────────────────────────

    async dashboardAdmin(req: AuthRequest, res: Response) {
        const userRole = req.user?.role;

        if (!userRole || userRole > 2) {
            res.status(403).json({
                message: `You don't have permission to access admin dashboard.`,
            });
            return;
        }

        try {
            const [globalStats, reportsByStatus, topNeighborhoods] = await Promise.all([
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
        } catch (error) {
            console.error("Error in admin dashboard:", error instanceof Error ? error.message : error);
            res.status(500).json({
                message: `Internal Server Error.`,
            });
        }
    }

    // ─── ADMIN POR CIDADE ─────────────────────────────────────────────

    async dashboardAdminByCity(req: AuthRequest, res: Response) {
        const userRole = req.user?.role;

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
            const city = await this.citiesService.getCityById(city_id);

            if (!city) {
                res.status(404).json({ message: `City not found.` });
                return;
            }

            const [cityStats, topNeighborhoods, recentReports] = await Promise.all([
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
        } catch (error) {
            console.error("Error in city admin dashboard:", error instanceof Error ? error.message : error);
            res.status(500).json({
                message: `Internal Server Error.`,
            });
        }
    }
}