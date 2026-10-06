import { Request, Response } from "express";
import connection from "../connection";
import ReportService from "../services/reportService";
import { AuthRequest } from "../types/express";
import CitiesService from "../services/citiesService";

export default class ReportControllers{
    constructor(
        private reportService = new ReportService(),
        private citiesService = new CitiesService()
    ){}

    async createReport(req: AuthRequest, res: Response) {
        const authenticatedUserId = Number(req.user?.id);
        const paramUserId = Number(req.params.userId);

        if (!authenticatedUserId) {
            res.status(401).json({ error: "User not authenticated." });
            return;
        }

        if (!isNaN(paramUserId) && paramUserId !== authenticatedUserId) {
            res.status(403).json({ error: "You can only create reports for yourself." });
            return;
        }

        const userId = authenticatedUserId;

        try{
            const { reportTitle, category_id, description, city_id, neighborhood_id, address, latitude, longitude } = req.body
            const image = req.file?.filename;
            const user = await connection('users').where({ id: userId }).first()

            if(!reportTitle || !category_id || !description || !city_id || !neighborhood_id || !address ){
                res.status(400).json({
                    message: `Please complete all fields.`
                });
                return;
            }
            if (!user){
                res.status(404).json({ error: `User not found.`});
                return;
            }

            const neighborhood = await connection('neighborhoods')
                .where({ id: neighborhood_id, city_id }).first();

                if (!neighborhood) {
                    res.status(400).json({
                        message: 'Invalid neighborhood for this city.'
                    });
                    return
                }

            await this.reportService.createReport({
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

        } catch(error){
            console.error("Error creating report:", error instanceof Error ? error.message : error);
            res.status(500).json({ 
                message: `Error to create Report.`})
            return;
        }
    }

    async approveReport(req: AuthRequest, res: Response){
        const reportId  = Number(req.params.reportId);
        const userId  = req.user?.id

        if (isNaN(reportId) || !userId) {
            return res.status(400).json({ error: "Invalid reportId or userId." });
        }

        try{
            const user = await connection('users').where({ id: userId }).first()
            
            if(!user){
                return res.status(404).json({
                    message: `Admin user not found.`
                })
            }

            if(Number(user.role) !== 2 && Number(user.role) !== 1) {
                return res.status(403).json({
                    error: `Only Owner / Admins can approve reports.`
                })
            }

            const report = await connection('reports').where({ id: reportId }).first()
            
            if(!report){
                return res.status(404).json({
                    message: `Report not found.`
                })
            }

            if(report.status === 'aprovado'){
                return res.status(400).json({
                    error: `Report already approved.`
                });
            }

            await connection('reports')
                .where({ id: reportId })
                .update({
                    status: 'aprovado',
                    approved_by: userId
            });

            return res.status(200).json({
                message: `Report ${reportId} approved by ${user.nameUser}.`,
            });

        } catch(error){
            console.error("Error approving report:", error instanceof Error ? error.message : error);
            res.status(500).json({
                message: `Internal Server Error.`
            });
        }
    }

    async declineReport(req: AuthRequest, res: Response){
        const reportId = Number(req.params.reportId)
        const userId = req.user?.id
        

        if(isNaN(reportId) || !userId){
            return res.status(400).json({
                error: `Invalid ReportID or UserId.`
            })
        }

        try{
            const user = await connection('users').where({ id: userId }).first()

            if(!user){
                return res.status(404).json({
                    error: `Admin not found.`
                })
            }

            if(Number(user.role) !== 2 && Number(user.role) !== 1){
                return res.status(403).json({
                    error: `Only Owner / Admin can decline reports.`
                })
            }

            const report = await connection('reports').where({ id: reportId }).first()

            if(!report){
                return res.status(404).json({
                    error: `Report not found.`
                })
            }   

            if(report.status === 'aprovado'){
                return res.status(400).json({
                    message: `Report already approved.`
                })
            }

            await connection('reports').where({ id: reportId }).update({ status: 'rejeitado' , approved_by: userId  });

            return res.status(200).json({
                message: `Report ${reportId} declined by ${user.nameUser}`
            })
        } catch(error){
            console.error("Error declining report:", error instanceof Error ? error.message : error);
            res.status(500).json({
                message: `Internal Server Error.`
            });
        }
    }

    async getAllReportsDecline(req: AuthRequest, res: Response){
        const userRole = Number(req.user?.role);

        if (!req.user || userRole > 2) {
            res.status(403).json({
                message: `You don't have permissions for that action.`
            });
            return;
        }

        try{
            const DeclineReports = await this.reportService.getAllReportsRejected();

            res.status(200).json({
                message: `All Reports Decline Informations: `,
                data: DeclineReports
            })
        } catch(error){
            console.error("Error listing declined reports:", error instanceof Error ? error.message : error);
            res.status(500).json({
                message: `Internal Server Error`
            })
        }
    }

    async getAllReportsPending(req: AuthRequest, res: Response){
        const userRole = Number(req.user?.role);

        if (!req.user || userRole > 2) {
            res.status(403).json({
                message: `You don't have permissions for that action.`
            });
            return;
        }

        try{
            const PendingReports = await this.reportService.getAllReportsPending();

            res.status(200).json({
                message: `All Reports Pending Informations: `,
                data: PendingReports
            });
        } catch(error){
            console.error("Error listing pending reports:", error instanceof Error ? error.message : error);
            res.status(500).json({
                message: `Internal Server Error.`
            });
        }
    }

    // Resolve a cidade-alvo das consultas de relatos conforme o papel autenticado:
    // roles 1/2 (admins da plataforma) escolhem qualquer cidade via query/body;
    // role 7 (prefeito) fica preso à cidade do próprio token.
    private resolveReportCityScope(
        req: AuthRequest
    ): { cityId: number } | { error: { status: number; message: string } } {
        const requester = req.user;

        if (!requester) {
            return { error: { status: 404, message: `Searcher not authenticated or not founded.` } };
        }

        const userRole = Number(requester.role);

        if (userRole === 7) {
            const tokenCity = Number(requester.city_id);
            if (!tokenCity || isNaN(tokenCity)) {
                return { error: { status: 400, message: `Prefeito não possui cidade associada.` } };
            }

            const requestedCity = req.query.city_id ?? req.body?.city_id;
            if (requestedCity !== undefined && Number(requestedCity) !== tokenCity) {
                return { error: { status: 403, message: `Prefeito só pode consultar relatórios da própria cidade.` } };
            }

            return { cityId: tokenCity };
        }

        if (userRole === 1 || userRole === 2) {
            const cityId = Number(req.query.city_id ?? req.body?.city_id);
            if (isNaN(cityId)) {
                return { error: { status: 400, message: `city_id must be a valid number.` } };
            }
            return { cityId };
        }

        return { error: { status: 403, message: `You don't have permissions for that action.` } };
    }

    async getAllReportsByCity(req: AuthRequest, res: Response){
        try{
            const resolved = this.resolveReportCityScope(req);
            if ('error' in resolved) {
                res.status(resolved.error.status).json({
                    message: resolved.error.message
                });
                return;
            }
            const city_id = resolved.cityId;

            const status = (req.query.status ?? req.body?.status) as string | undefined;
            const validStatuses = ['pendente', 'aprovado', 'rejeitado'];
            if (status !== undefined && !validStatuses.includes(status)) {
                res.status(400).json({
                    message: `Invalid status. Allowed values: ${validStatuses.join(', ')}.`
                });
                return;
            }

            const neighborhoodRaw = req.query.neighborhood_id ?? req.body?.neighborhood_id;
            let neighborhood_id: number | undefined;
            if (neighborhoodRaw !== undefined) {
                neighborhood_id = Number(neighborhoodRaw);
                if (!neighborhood_id || isNaN(neighborhood_id)) {
                    res.status(400).json({
                        message: `neighborhood_id must be a valid number.`
                    });
                    return;
                }

                const neighborhood = await connection('neighborhoods').where({ id: neighborhood_id, city_id }).first();
                if (!neighborhood) {
                    res.status(400).json({
                        message: `Invalid neighborhood for this city.`
                    });
                    return;
                }
            }

            const reports = await this.reportService.getAllReportsByCity(city_id, status, neighborhood_id);

            const city = await this.citiesService.getCityById(city_id)

            res.status(200).json({
                message: `// All Informations for ${city.name}`,
                data: reports
            });

            return;

        } catch ( error ){
            console.error("Error listing reports by city:", error instanceof Error ? error.message : error);
            res.status(500).json({
                message: `Internal Server Error - 500`
            });
            return;
        }
    }

    async getNeighborhoodReportsStats(req: AuthRequest, res: Response){
        try{
            const resolved = this.resolveReportCityScope(req);
            if ('error' in resolved) {
                res.status(resolved.error.status).json({
                    message: resolved.error.message
                });
                return;
            }
            const city_id = resolved.cityId;

            const stats = await this.reportService.getNeighborhoodReportStats(city_id);

            const city = await this.citiesService.getCityById(city_id)

            res.status(200).json({
                message: `// Neighborhood reports stats for ${city.name}`,
                data: stats.map((row) => ({
                    id: Number(row.id),
                    name: row.name,
                    pending: Number(row.pending),
                    approved: Number(row.approved),
                    rejected: Number(row.rejected),
                    total: Number(row.total)
                }))
            });

            return;

        } catch ( error ){
            console.error("Error listing neighborhood report stats:", error instanceof Error ? error.message : error);
            res.status(500).json({
                message: `Internal Server Error - 500`
            });
            return;
        }
    }

    async getAllReports(req: Request, res: Response) {
        try{
            const AllReports = await this.reportService.getAllReports();
            
            res.status(200).json({ 
                message: `All Reports Informations: `,
                data: AllReports
            });

            return;
        } catch(error){
            console.error("Error listing reports:", error instanceof Error ? error.message : error);
            res.status(500).json({ 
                message: `Internal Server Error. `});
            return;
        }
    }
    
    async getLikeStatus(req: AuthRequest, res: Response): Promise<void> {
        const reportId = Number(req.params.id);
        const userId = Number(req.user?.id);

        if (!reportId || isNaN(reportId)) {
            res.status(400).json({ message: 'Report ID inválido.' });
            return;
        }

        try {
            const report = await this.reportService.getReportById(reportId, userId);
            if (!report) {
                res.status(404).json({ message: 'Report não encontrado.' });
                return;
            }

            res.json({
                liked: Boolean(report.likedByCurrentUser),
                totalLikes: Number(report.likes)
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Erro interno.' });
        }
    }

    async getAllLikes(req: Request, res: Response): Promise<void> {
        const reportId = Number(req.params.reportId)

        if (!reportId || isNaN(reportId)) {
            res.status(400).json({ message: 'Report ID inválido.' });
            return;
        }

        try{
            const result = await this.reportService.getAllLikes(reportId)
            const totalLikes = result[0].total;

            res.json({ total: Number(totalLikes)});
        } catch(error){
            console.error('Error to search likes. ', error);
            res.status(500).json({
                message: `Error Internal Server.`
            });
        }
    }

    async getReportById(req: AuthRequest, res: Response) {
        const { id } = req.params;
        const requester = req.user;

        if (isNaN(Number(id))) {
            res.status(400).json({ error: "id must be a valid number." });
            return;
        }

        try {
            const report = await this.reportService.getReportById(Number(id));

            // Prefeito visualiza apenas relatórios da própria cidade.
            if (report && requester && Number(requester.role) === 7 && Number(report.city_id) !== Number(requester.city_id)) {
                res.status(403).json({ message: `Prefeito só pode visualizar relatórios da própria cidade.` });
                return;
            }

            res.status(200).json({ 
                message: `Informations for Report {${id}}`,
                reportInf: report 
            });
        } catch (error) {
            console.error("Error searching report:", error instanceof Error ? error.message : error);
            res.status(500).json({ 
                message: `Error Internal Server.`
            });
        }
    }

    async deleteReport(req: AuthRequest, res: Response) {
        try{
            const reportId = Number(req.body?.reportId);
            const requester = req.user;

            if (!requester) {
                res.status(401).json({ error: "User not authenticated." });
                return;
            }

            if (!req.body?.reportId || isNaN(reportId)) {
                res.status(400).json({ error: "reportId must be a valid number." });
                return;
            }
            const report = await this.reportService.getReportById(reportId);
            
            if(!report){
                res.status(404).json({ error: `Report not found.`});
                return;
            }

            const requesterRole = Number(requester.role);
            const isOwnerOfReport = Number(report.user_id) === Number(requester.id);
            const isModeration = requesterRole === 1 || requesterRole === 2;

            if (!isOwnerOfReport && !isModeration) {
                res.status(403).json({ error: `You can only delete your own reports.` });
                return;
            }

            await this.reportService.deleteReport(reportId);

            res.status(200).json({ 
                message: `${report.reportTitle} was deleted successfully!`,
                deletedReport: report });
            
            return;

        } catch(error){
            console.error("Error deleting report:", error instanceof Error ? error.message : error);
            res.status(500).json({ 
                message: `Error Internal Server.` });
            return;
        }
    }

    async getMyReports(req: AuthRequest, res: Response){
        const userId = req.user?.id;

        if (!userId){
            res.status(401).json({ error: 'User not found.' });
            return;
        }
    
        try{
            const userReports = await this.reportService.getMyReports(userId);

            res.status(200).json({
                message: `All reports created by ${req.user?.fullName} user.`,
                data: userReports,
            });
            return;
        } catch (error) {
            console.error("Error listing my reports:", error instanceof Error ? error.message : error);
            res.status(500).json({
                message: 'Internal Server Error (500)'
            });
            return;
        }
    }

    async getReportsByCity(req: Request, res: Response){
        const city_id = req.body

        if(!city_id){
            res.status(404).json({
                message: 'City not found.'
            });
            return;
        }

        try{
            const reportsFiltred = await this.reportService.getReportsByCity(city_id);
            res.status(200).json({
                message: `Todos reports da cidade ${city_id}`,
                details: reportsFiltred
            })
        } catch(error){
            console.error("Error listing reports by city:", error instanceof Error ? error.message : error);
            res.status(500).json({
                message: 'Internal Server Error (500)'
            })
        }
    }
}