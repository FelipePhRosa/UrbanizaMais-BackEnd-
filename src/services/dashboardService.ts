import connection from "../connection";

export default class DashboardService {

    // ─── ADMIN GLOBAL ────────────────────────────────────────────────

    async getGlobalStats() {
        const [totalCities] = await connection('cities').count('* as total');
        const [totalNeighborhoods] = await connection('neighborhoods').count('* as total');
        const [totalUsers] = await connection('users').count('* as total');
        const [totalReports] = await connection('reports').count('* as total');

        return {
            totalCities: Number(totalCities.total),
            totalNeighborhoods: Number(totalNeighborhoods.total),
            totalUsers: Number(totalUsers.total),
            totalReports: Number(totalReports.total),
        };
    }

    async getReportsByStatus() {
        const statuses = ['pendente', 'aprovado', 'resolvida', 'rejeitado'];

        const results = await Promise.all(
            statuses.map(async (status) => {
                const [row] = await connection('reports').where({ status }).count('* as total');
                return { status, total: Number(row.total) };
            })
        );

        return results;
    }

    async getTopNeighborhoodsByReports(limit = 5) {
        return await connection('reports')
            .join('neighborhoods', 'reports.neighborhood_id', 'neighborhoods.id')
            .join('cities', 'reports.city_id', 'cities.id')
            .select(
                'neighborhoods.id as neighborhood_id',
                'neighborhoods.name as neighborhood',
                'cities.name as city',
            )
            .count('reports.id as totalReports')
            .groupBy('reports.neighborhood_id', 'reports.city_id', 'neighborhoods.name', 'cities.name')
            .orderBy('totalReports', 'desc')
            .limit(limit);
    }

    // ─── ADMIN POR CIDADE ─────────────────────────────────────────────

    async getCityStats(city_id: number) {
        const city = await connection('cities').where({ id: city_id }).first();

        const [totalUsers] = await connection('users').where({ city_id }).count('* as total');
        const [totalReports] = await connection('reports').where({ city_id }).count('* as total');
        const [totalNeighborhoods] = await connection('neighborhoods').where({ city_id }).count('* as total');

        const reportsByStatus = await connection('reports')
            .where({ city_id })
            .select('status')
            .count('* as total')
            .groupBy('status');

        return {
            city,
            totalUsers: Number(totalUsers.total),
            totalReports: Number(totalReports.total),
            totalNeighborhoods: Number(totalNeighborhoods.total),
            reportsByStatus,
        };
    }

    async getTopNeighborhoodsByCity(city_id: number, limit = 5) {
        return await connection('reports')
            .join('neighborhoods', 'reports.neighborhood_id', 'neighborhoods.id')
            .where({ 'reports.city_id': city_id })
            .select('neighborhoods.id as neighborhood_id', 'neighborhoods.name as neighborhood')
            .count('reports.id as totalReports')
            .groupBy('reports.neighborhood_id', 'neighborhoods.name')
            .orderBy('totalReports', 'desc')
            .limit(limit);
    }

    async getRecentReportsByCity(city_id: number, limit = 10) {
        return await connection('reports')
            .where({ city_id })
            .orderBy('created_at', 'desc')
            .limit(limit)
            .select('*');
    }

    async getMonthlyTrend() {
    return await connection('reports')
        .select(connection.raw("DATE_FORMAT(created_at, '%b') as mes"))
        .count('* as recebidos')
        .whereRaw("created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)")
        .groupByRaw("DATE_FORMAT(created_at, '%Y-%m')")
        .orderByRaw("MIN(created_at)");
}

}
