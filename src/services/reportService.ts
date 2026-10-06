import connection from "../connection"

interface ReportData{
    reportTitle: string,
    user_id: number,
    category_id: number,
    city_id: number,
    neighborhood_id: number,
    description: string,
    address: string,
    latitude: number,
    longitude: number,
    image?: string
}

export default class ReportService {
    async createReport(reportData: ReportData) {
        return await connection('reports').insert(reportData);
    }

async getAllReports(userId?: number, role?: string) {
  // Usuários comuns não veem rejeitados
  const statuses = role === '1' 
    ? ['aprovado', 'resolvida', 'rejeitado'] // adm vê tudo
    : ['aprovado', 'resolvida'];             // usuário comum vê só aprovadas e resolvidas

  const reports = await connection('reports')
    .whereIn('status', statuses)
    .select(
      'reports.*',
      connection('likes')
        .count('*')
        .whereRaw('likes.report_id = reports.id')
        .as('likes'),
      connection.raw(
        `(SELECT EXISTS (
            SELECT 1 FROM likes 
            WHERE likes.report_id = reports.id AND likes.user_id = ?
        )) as likedByCurrentUser`,
        [userId ?? 0]
      )
    )
    .orderBy('created_at', 'desc');

  return reports;
}



    async getReportById(reportId: number, userId?: number) {
        const report = await connection('reports')
            .where({ id: reportId })
            .select(
                'reports.*',
                // Total de likes
                connection('likes')
                    .count('*')
                    .whereRaw('likes.report_id = reports.id')
                    .as('likes'),

                // Se o usuário curtiu
                connection.raw(
                    `(SELECT EXISTS (
                        SELECT 1 FROM likes 
                        WHERE likes.report_id = reports.id AND likes.user_id = ?
                    )) as likedByCurrentUser`,
                    [userId ?? 0]
                )
            )
            .first(); // retorna um único registro

        return report;
    }

    async getAllReportsPending(){
        return await connection('reports').where({ status: 'pendente' }).select('*');
    }

    async getAllReportsRejected(){
        return await connection('reports').where({ status: 'rejeitado' }).select('*')
    }

    async getAllReportsByCity(city_id: number, status?: string, neighborhood_id?: number) {
        const query = connection('reports')
            .leftJoin('neighborhoods', 'reports.neighborhood_id', 'neighborhoods.id')
            .where('reports.city_id', city_id);

        if (status) {
            query.andWhere('reports.status', status);
        }

        if (neighborhood_id) {
            query.andWhere('reports.neighborhood_id', neighborhood_id);
        }

        return await query.select('reports.*', 'neighborhoods.name as neighborhood_name').orderBy('reports.created_at', 'desc');
    }

    async getNeighborhoodReportStats(city_id: number) {
        const countByStatus = (status: string) => connection('reports')
            .count('*')
            .whereRaw('reports.neighborhood_id = neighborhoods.id AND reports.city_id = ?', [city_id])
            .andWhere({ status });

        return await connection('neighborhoods')
            .where({ city_id })
            .orderBy('name')
            .select('id', 'name')
            .select(
                countByStatus('pendente').as('pending'),
                countByStatus('aprovado').as('approved'),
                countByStatus('rejeitado').as('rejected'),
                connection('reports')
                    .count('*')
                    .whereRaw('reports.neighborhood_id = neighborhoods.id AND reports.city_id = ?', [city_id])
                    .as('total')
            );
    }


    async deleteReport(reportId: number){
        return await connection('reports').where({ id: reportId }).delete();
    }

    async getAllLikes(reportId: number){
        return await connection('likes').where({ report_id: reportId }).count('* as total');
    }

    async getMyReports(user_id: number){
      return await connection('reports').where({ user_id }).orderBy('created_at', 'desc');
    }

    async getReportsByCity(city_id: number){
        return await connection('reports').where({ city_id: city_id }).orderBy('created_at', 'desc');
    }
}