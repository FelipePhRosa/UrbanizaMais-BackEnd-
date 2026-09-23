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

    async createNeighborhood(req: AuthRequest, res: Response){
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

        try{
            const { name, city_id, latitude, longitude } = req.body
            const user = req.user
            
            const city = await this.citiesService.getCityById(city_id)
            const neighborhoodAlreadyExists = await connection('neighborhoods').where({ name, city_id});

            if(!user){
                res.status(404).json({
                    error: `User not found.`
                });
                return;
            };
            
            if( !name || !city_id || !latitude || !longitude ){
                res.status(400).json({
                    message: `Please complete all required fields.`
                });
                return;
            };

            if(neighborhoodAlreadyExists.length > 0){
                res.status(409).json({
                    message: `This neighborhood '${name}' already exists in ${city.name}`
                });
                return;
            };

            await this.neighborhoodService.createNeighborhood({
                name,
                city_id,
                latitude,
                longitude,
                created_by: userId
            });
            res.status(201).json({
                message: `Neighborhood created successfully. By - ${user.fullName}`
            });

        } catch(error){
            console.error("Error creating neighborhood:", error instanceof Error ? error.message : error);
            res.status(500).json({
                message: `Error to create new NeighborHood.`
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
        const { neighborhood_id, city_id } = req.body
        const userRole = Number(req.user?.role);

        if (!req.user || (userRole !== 1 && userRole !== 2)) {
            res.status(403).json({
                message: `You don't have permission to delete neighborhood.`
            });
            return;
        }

        try{
            const city = await this.citiesService.getCityById(city_id)
            const neighborhood = await this.neighborhoodService.getNeighborhoodById(neighborhood_id, city_id);
            if(!neighborhood){
                res.status(404).json({
                    message: `Neighborhood not found, verify NeighborhoodID.`
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