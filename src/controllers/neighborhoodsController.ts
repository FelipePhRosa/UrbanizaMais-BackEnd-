import { Response } from "express";
import CitiesService from "../services/citiesService";
import NeighborHoodService from "../services/neighborhoodService";
import { AuthRequest } from "../types/express";
import connection from "../connection";

export default class neighborhoodsControllers{
    constructor(
        private citiesService = new CitiesService(),
        private neighborhoodService = new NeighborHoodService()
    ){}

    // Resolve a cidade-alvo conforme o papel do usuário autenticado:
    // roles 1/2 (admins da plataforma) escolhem qualquer cidade via body;
    // role 7 (prefeito) fica preso à cidade do próprio token.
    private resolveManagedCity(
        req: AuthRequest
    ): { cityId: number } | { error: { status: number; message: string } } {
        const requester = req.user!;

        if (Number(requester.role) === 7) {
            const tokenCity = Number(requester.city_id);
            if (!tokenCity || isNaN(tokenCity)) {
                return { error: { status: 400, message: `Prefeito não possui cidade associada.` } };
            }

            const bodyCity = req.body?.city_id;
            if (bodyCity !== undefined && Number(bodyCity) !== tokenCity) {
                return {
                    error: {
                        status: 403,
                        message: `Prefeito só pode gerenciar bairros da própria cidade.`
                    }
                };
            }

            return { cityId: tokenCity };
        }

        const cityId = Number(req.body?.city_id);
        if (!cityId || isNaN(cityId)) {
            return { error: { status: 400, message: `city_id must be a valid number.` } };
        }
        return { cityId };
    }

    private parseCoordinate(
        value: unknown
    ): { provided: boolean; number: number | null; valid: boolean } {
        if (value === undefined) {
            return { provided: false, number: null, valid: true };
        }
        if (value === null || value === "") {
            return { provided: true, number: null, valid: true };
        }
        const num = Number(value);
        if (Number.isNaN(num)) {
            return { provided: true, number: null, valid: false };
        }
        return { provided: true, number: num, valid: true };
    }

    async createNeighborhood(req: AuthRequest, res: Response){
        const requester = req.user;

        if (!requester) {
            res.status(401).json({ message: `User not authenticated.` });
            return;
        }

        const userRole = Number(requester.role);
        if (![1, 2, 7].includes(userRole)) {
            res.status(403).json({
                message: `You don't have permission to create neighborhood.`,
                role: userRole
            });
            return;
        }

        const resolved = this.resolveManagedCity(req);
        if ('error' in resolved) {
            res.status(resolved.error.status).json({ message: resolved.error.message });
            return;
        }
        const city_id = resolved.cityId;

        const name = String(req.body?.name ?? "").trim();
        if (!name) {
            res.status(400).json({
                message: `Please provide a valid neighborhood name.`
            });
            return;
        }

        const lat = this.parseCoordinate(req.body?.latitude);
        const lng = this.parseCoordinate(req.body?.longitude);
        if (!lat.valid || !lng.valid) {
            res.status(400).json({
                message: `latitude and longitude must be valid numbers.`
            });
            return;
        }

        try{
            const city = await this.citiesService.getCityById(city_id);
            if (!city) {
                res.status(404).json({
                    message: `City not found, verify City_Id.`
                });
                return;
            }

            const neighborhoodAlreadyExists = await connection('neighborhoods').where({ name, city_id });

            if(neighborhoodAlreadyExists.length > 0){
                res.status(409).json({
                    message: `This neighborhood '${name}' already exists in ${city.name}`
                });
                return;
            }

            await this.neighborhoodService.createNeighborhood({
                name,
                city_id,
                latitude: lat.number,
                longitude: lng.number,
                created_by: requester.id
            });
            res.status(201).json({
                message: `Neighborhood '${name}' created successfully in ${city.name}. By - ${requester.fullName}`
            });
            return;

        } catch(error){
            console.error("Error creating neighborhood:", error instanceof Error ? error.message : error);
            res.status(500).json({
                message: `Error to create new NeighborHood.`
            });
            return;
        }
    }

    async updateNeighborhood(req: AuthRequest, res: Response){
        const requester = req.user;

        if (!requester) {
            res.status(401).json({ message: `User not authenticated.` });
            return;
        }

        const userRole = Number(requester.role);
        if (![1, 2, 7].includes(userRole)) {
            res.status(403).json({
                message: `You don't have permission to update neighborhood.`,
                role: userRole
            });
            return;
        }

        const resolved = this.resolveManagedCity(req);
        if ('error' in resolved) {
            res.status(resolved.error.status).json({ message: resolved.error.message });
            return;
        }
        const city_id = resolved.cityId;

        const neighborhood_id = Number(req.body?.neighborhood_id);
        if (!neighborhood_id || isNaN(neighborhood_id)) {
            res.status(400).json({
                message: `neighborhood_id must be a valid number.`
            });
            return;
        }

        const name = String(req.body?.name ?? "").trim();
        if (!name) {
            res.status(400).json({
                message: `Please provide a valid neighborhood name.`
            });
            return;
        }

        const lat = this.parseCoordinate(req.body?.latitude);
        const lng = this.parseCoordinate(req.body?.longitude);
        if (!lat.valid || !lng.valid) {
            res.status(400).json({
                message: `latitude and longitude must be valid numbers.`
            });
            return;
        }

        try{
            const neighborhood = await this.neighborhoodService.getNeighborhoodById(neighborhood_id, city_id);
            if (!neighborhood) {
                res.status(404).json({
                    message: `Neighborhood not found, verify NeighborhoodID.`
                });
                return;
            }

            const duplicate = await connection('neighborhoods')
                .where({ name, city_id })
                .whereNot({ id: neighborhood_id })
                .first();
            if (duplicate) {
                res.status(409).json({
                    message: `This neighborhood '${name}' already exists in this city.`
                });
                return;
            }

            const updateData: { name: string; latitude?: number | null; longitude?: number | null } = { name };
            if (lat.provided) updateData.latitude = lat.number;
            if (lng.provided) updateData.longitude = lng.number;

            await this.neighborhoodService.updateNeighborhood(neighborhood_id, city_id, updateData);
            res.status(200).json({
                message: `Neighborhood '${neighborhood.name}' updated to '${name}'.`
            });
            return;

        } catch(error){
            console.error("Error updating neighborhood:", error instanceof Error ? error.message : error);
            res.status(500).json({
                message: `Error to update Neighborhood.`
            });
            return;
        }
    }

    async getNeighborhoods(req: AuthRequest, res: Response){
        const userRole = req.user?.role
        const userId = req.user?.id

        if(!userId){
            res.status(500).json({
                message: `userID invalid.`
            });
            return;
        }

        if(!userRole || userRole > 2){
            res.status(403).json({
                message: `You don't have permission for create neighboorhood.`,
                role: userRole
            });
            return;
        }
        // Query params têm prioridade; body mantido como fallback de compatibilidade
        const neighborhood_id = Number(req.query.neighborhood_id ?? req.body?.neighborhood_id);
        const city_id = Number(req.query.city_id ?? req.body?.city_id);

        try{
            const user = req.user
                if(!user){
                    res.status(404).json({
                        error: `User not found.`
                    });
                    return;
                };

            if(isNaN(neighborhood_id) || isNaN(city_id)){
                res.status(400).json({
                    message: `Please complete all required fields.`
                });
                return;
            }

            const neighborhood = await this.neighborhoodService.getNeighborhoodById(neighborhood_id, city_id)
            if(!neighborhood){
                res.status(404).json({
                    message: `Neighborhood not found, verify NeighborhoodID.`
                });
                return;
            }

            res.status(200).json({
                message: `/// ${neighborhood.name} - Informations.`,
                neighborhoodInf: neighborhood
            });
            return;
        } catch(error){
            console.error("Error searching neighborhood:", error instanceof Error ? error.message : error);
            res.status(500).json({
                message: `Error to Search Neighborhood.`,
            });
        }
    }

    async getAllNeighborhoods(req: AuthRequest, res: Response){
        // Query params têm prioridade; body mantido como fallback de compatibilidade
        const city_id = Number(req.query.city_id ?? req.body?.city_id)

        if (isNaN(city_id)) {
            res.status(400).json({
                message: `city_id must be a valid number.`
            });
            return;
        }

        try{
            const city = await this.citiesService.getCityById(city_id)
            if(!city){
                res.status(404).json({
                    message: `City Not found, please check City_Id.`
                });
                return;
            }

            const neighborhoods = await this.neighborhoodService.getAllNeighborhood(city_id)
                
            if(!neighborhoods){
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
        } catch(error) {
            console.error("Error listing neighborhoods:", error instanceof Error ? error.message : error);
            res.status(500).json({
                message: `Internal Server Error (500)`
            });
            return;
        }
    }
    
    async getNeighborhoodsByCity(req: AuthRequest, res: Response){
        const { city_id } = req.params
        const city = await this.citiesService.getCityById(Number(city_id))
            if(!city){
                res.status(404).json({
                    message: `City Not found, please check City_Id.`
                });
                return;
            }
        try{
            const neighborhoods = await this.neighborhoodService.getAllNeighborhood(Number(city_id))
                if(!neighborhoods){
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
        catch(error) {
            console.error("Error searching neighborhoods by city:", error instanceof Error ? error.message : error);
            res.status(500).json({
                message: `Error to Search Neighborhoods by City.`,
            });
        }
    }

    async delNeighborhood(req: AuthRequest, res: Response){
        const requester = req.user;

        if (!requester) {
            res.status(401).json({ message: `User not authenticated.` });
            return;
        }

        const userRole = Number(requester.role);
        if (![1, 2, 7].includes(userRole)) {
            res.status(403).json({
                message: `You don't have permission to delete neighborhood.`
            });
            return;
        }

        const resolved = this.resolveManagedCity(req);
        if ('error' in resolved) {
            res.status(resolved.error.status).json({ message: resolved.error.message });
            return;
        }
        const city_id = resolved.cityId;

        const neighborhood_id = Number(req.body?.neighborhood_id);
        if (!neighborhood_id || isNaN(neighborhood_id)) {
            res.status(400).json({
                message: `neighborhood_id must be a valid number.`
            });
            return;
        }

        try{
            const city = await this.citiesService.getCityById(city_id);
            if (!city) {
                res.status(404).json({
                    message: `City not found, verify City_Id.`
                });
                return;
            }

            const neighborhood = await this.neighborhoodService.getNeighborhoodById(neighborhood_id, city_id);
            if(!neighborhood){
                res.status(404).json({
                    message: `Neighborhood not found, verify NeighborhoodID.`
                });
                return;
            }

            // users -> neighborhoods é NO ACTION e reports -> neighborhoods é CASCADE:
            // bloquear a exclusão evita erro de FK e perda silenciosa de reportes.
            const usersCount = await connection('users').where({ neighborhood_id }).count('* as total').first();
            const reportsCount = await connection('reports').where({ neighborhood_id }).count('* as total').first();
            const totalUsers = Number(usersCount?.total ?? 0);
            const totalReports = Number(reportsCount?.total ?? 0);

            if (totalUsers > 0 || totalReports > 0) {
                res.status(400).json({
                    message: `Cannot delete neighborhood: there are users or reports assigned to it.`,
                    users: totalUsers,
                    reports: totalReports
                });
                return;
            }

            await this.neighborhoodService.delNeighborhoodById(neighborhood_id, city_id)
            res.status(200).json({
                message: `Neighborhood ${neighborhood.name} of city ${city.name} was deleted.`
            });
            return;
        } catch(error){
            console.error("Error deleting neighborhood:", error instanceof Error ? error.message : error);
            res.status(500).json({
                message: `Error to delete Neighborhood.`
            });
        }
    }

    
    async dashboardNeighborhood(req: AuthRequest, res: Response){
        // Query params têm prioridade; body mantido como fallback de compatibilidade
        const city_id = Number(req.query.city_id ?? req.body?.city_id);
        const neighborhood_id = Number(req.query.neighborhood_id ?? req.body?.neighborhood_id);
        const requester = req.user;
        const userRole = Number(requester?.role);

        if (!requester) {
            res.status(401).json({ message: `User not authenticated.` });
            return;
        }

        const isAdmin = userRole === 1 || userRole === 2;
        const isPrefeito = userRole === 7;

        if (!isAdmin && !isPrefeito) {
            res.status(403).json({
                message: `You don't have permission to access this dashboard.`
            });
            return;
        }

        // Prefeito só pode consultar a própria cidade associada ao token
        if (isPrefeito && Number(requester.city_id) !== city_id) {
            res.status(403).json({
                message: `Prefeito can only access the dashboard of their own city.`
            });
            return;
        }

        if (isNaN(city_id) || isNaN(neighborhood_id)) {
            res.status(400).json({
                message: `city_id and neighborhood_id must be valid numbers.`
            });
            return;
        }

        try{
            const city = await this.citiesService.getCityById(city_id);
            const neighboorhood = await this.neighborhoodService.getNeighborhoodById(neighborhood_id, city_id)

            if(!city || !neighboorhood){
                res.status(404).json({
                    message: `City or Neighborhood not found.`
                });
                return;
            }

            const totalAccountInNeighborhood = await this.neighborhoodService.TotalAccountInNeighborhood(neighborhood_id, city_id);
            const allReportsByNeighborhood = await this.neighborhoodService.getAllReportsByNeighborhood(neighborhood_id, city_id);
            const totalReportsByNeighborhood = await this.neighborhoodService.getTotalReportsByNeighborhood(neighborhood_id, city_id);

            res.status(200).json({
                message: `Dashboard ${neighboorhood.name} - ${city.name}`,
                Details: totalAccountInNeighborhood[0],
                TotalReports: totalReportsByNeighborhood,
                allReports: allReportsByNeighborhood
            });


        } catch(error){
            console.error("Error in neighborhood dashboard:", error instanceof Error ? error.message : error);
            res.status(500).json({
                message: `Internal Server Error (500)`
            });
        }
    }
}
