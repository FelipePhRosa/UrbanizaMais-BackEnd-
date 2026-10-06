import connection from "../connection";
import { NewsBlock } from "./newsBlocks";

export type NewsStatus = "rascunho" | "publicado";

export const NEWS_STATUSES: NewsStatus[] = ["rascunho", "publicado"];

export interface NewsInput {
  title: string;
  subtitle: string | null;
  cover_image: string | null;
  cover_caption: string | null;
  content: NewsBlock[];
  author_id: number;
  city_id: number;
  status: NewsStatus;
}

export type NewsUpdate = Partial<Omit<NewsInput, "author_id">> & { published_at?: Date | null };

export interface FeedQuery {
  city_id?: number;
  limit: number;
  offset: number;
}

const AUTHOR_SELECT = {
  authorName: "author.fullName",
  authorUsername: "author.nameUser",
  authorAvatar: "author.avatar_url",
  cityName: "city.name",
};

// O driver devolve colunas JSON já parseadas, mas o comportamento varia com a
// versão do mysql2 — por isso a dupla checagem.
export function parseContent(raw: unknown): NewsBlock[] {
  if (Array.isArray(raw)) return raw as NewsBlock[];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as NewsBlock[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export default class NewsService {
  async createNews(data: NewsInput): Promise<number> {
    const [insertId] = await connection("news").insert({
      ...data,
      content: JSON.stringify(data.content),
      published_at: data.status === "publicado" ? connection.fn.now() : null,
    });
    return Number(insertId);
  }

  async updateNews(newsId: number, patch: NewsUpdate): Promise<number> {
    const data: Record<string, unknown> = { ...patch };
    if (patch.content !== undefined) data.content = JSON.stringify(patch.content);
    return await connection("news").where({ id: newsId }).update(data);
  }

  async getNewsById(newsId: number) {
    const news = await connection("news")
      .join("users as author", "author.id", "news.author_id")
      .join("cities as city", "city.id", "news.city_id")
      .where("news.id", newsId)
      .select("news.*", AUTHOR_SELECT)
      .first();

    if (!news) return null;
    return { ...news, content: parseContent(news.content) };
  }

  async getFeed({ city_id, limit, offset }: FeedQuery) {
    const base = () => {
      const query = connection("news").where({ status: "publicado" });
      if (city_id) query.andWhere({ city_id });
      return query;
    };

    const [countRow] = await base().count("* as total");
    const total = Number(countRow?.total ?? 0);

    const rows = await base()
      .join("users as author", "author.id", "news.author_id")
      .join("cities as city", "city.id", "news.city_id")
      .select(
        "news.id",
        "news.title",
        "news.subtitle",
        "news.cover_image",
        "news.city_id",
        "news.status",
        "news.published_at",
        "news.created_at",
        AUTHOR_SELECT
      )
      .orderBy("news.published_at", "desc")
      .orderBy("news.id", "desc")
      .limit(limit)
      .offset(offset);

    return { data: rows, total, limit, offset };
  }

  async getByAuthor(authorId: number) {
    const rows = await connection("news")
      .join("cities as city", "city.id", "news.city_id")
      .where({ author_id: authorId })
      .select(
        "news.id",
        "news.title",
        "news.subtitle",
        "news.cover_image",
        "news.city_id",
        "news.status",
        "news.published_at",
        "news.created_at",
        "news.updated_at",
        { cityName: "city.name" }
      )
      .orderBy("news.updated_at", "desc");

    return rows;
  }

  async deleteNews(newsId: number): Promise<number> {
    return await connection("news").where({ id: newsId }).delete();
  }
}
