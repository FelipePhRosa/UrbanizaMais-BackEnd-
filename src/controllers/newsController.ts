import { Response } from "express";
import connection from "../connection";
import { Role } from "../enums/types";
import { NewsBlock, dropEmptyBlocks, normalizeFilename, sanitizeBlocks } from "../services/newsBlocks";
import NewsService, { NEWS_STATUSES, NewsStatus } from "../services/newsService";
import { AuthRequest } from "../types/express";

// Dono, admin e prefeitura publicam notícias; as demais roles só leem.
export const NEWS_EDITOR_ROLES: Role[] = [Role.Owner, Role.Admin, Role.Prefeito];

const TITLE_MAX = 255;
const SUBTITLE_MAX = 500;
const CAPTION_MAX = 255;
const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 48;

interface ParsedPayload {
  title: string;
  subtitle: string | null;
  cover_image: string | null;
  cover_caption: string | null;
  blocks: NewsBlock[];
  city_id: number | null;
  // null quando o corpo da requisição não informa o status.
  status: NewsStatus | null;
}

type ParseResult = { error: string } | { payload: ParsedPayload };

function text(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\r\n/g, "\n").trim();
}

function positiveInt(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parsePayload(body: unknown, options: { requireTitleAndContent: boolean }): ParseResult {
  if (typeof body !== "object" || body === null) {
    return { error: "Request body must be a JSON object." };
  }

  const source = body as Record<string, unknown>;

  let status: NewsStatus | null = null;
  if (source.status !== undefined && source.status !== null && source.status !== "") {
    if (!NEWS_STATUSES.includes(source.status as NewsStatus)) {
      return { error: `status must be one of: ${NEWS_STATUSES.join(", ")}.` };
    }
    status = source.status as NewsStatus;
  }

  // O MySQL rejeitaria um valor acima do VARCHAR com um erro 500, então o
  // limite é validado aqui em vez de cortar o texto do autor em silêncio.
  const title = text(source.title);
  if (options.requireTitleAndContent && !title) {
    return { error: "title is required." };
  }
  if (title.length > TITLE_MAX) {
    return { error: `title must be at most ${TITLE_MAX} characters.` };
  }

  const subtitle = text(source.subtitle);
  if (subtitle.length > SUBTITLE_MAX) {
    return { error: `subtitle must be at most ${SUBTITLE_MAX} characters.` };
  }

  const coverCaption = text(source.cover_caption);
  if (coverCaption.length > CAPTION_MAX) {
    return { error: `cover_caption must be at most ${CAPTION_MAX} characters.` };
  }

  const coverImage = source.cover_image === undefined || source.cover_image === null || source.cover_image === ""
    ? null
    : normalizeFilename(source.cover_image);
  if (source.cover_image && coverImage === null) {
    return { error: "cover_image must be a file uploaded through POST /news/upload." };
  }

  let blocks: NewsBlock[] = [];
  if (source.content !== undefined) {
    const sanitized = sanitizeBlocks(source.content);
    if (!sanitized.ok) return { error: sanitized.error };
    blocks = dropEmptyBlocks(sanitized.blocks);
  } else if (options.requireTitleAndContent) {
    return { error: "content is required." };
  }

  const payload: ParsedPayload = {
    title,
    subtitle: subtitle || null,
    cover_image: coverImage,
    cover_caption: coverCaption || null,
    blocks,
    city_id: null,
    status,
  };

  if (source.city_id !== undefined && source.city_id !== null && source.city_id !== "") {
    const cityId = positiveInt(source.city_id);
    if (!cityId) return { error: "city_id must be a valid number." };
    payload.city_id = cityId;
  }

  return { payload };
}

export default class NewsController {
  constructor(private newsService = new NewsService()) {}

  async getFeed(req: AuthRequest, res: Response) {
    const cityFilter = req.query.city_id;
    let cityId: number | undefined;

    if (cityFilter !== undefined && cityFilter !== "") {
      const parsed = positiveInt(cityFilter);
      if (!parsed) {
        res.status(400).json({ message: "city_id must be a valid number." });
        return;
      }
      cityId = parsed;
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const requestedLimit = Number(req.query.limit) || DEFAULT_PAGE_SIZE;
    const limit = Math.min(Math.max(1, requestedLimit), MAX_PAGE_SIZE);

    try {
      const result = await this.newsService.getFeed({
        city_id: cityId,
        limit,
        offset: (page - 1) * limit,
      });

      res.status(200).json({
        message: "Published news.",
        data: result.data,
        total: result.total,
        page,
        pages: Math.max(1, Math.ceil(result.total / limit)),
        limit,
      });
    } catch (error) {
      console.error("Error listing news:", error instanceof Error ? error.message : error);
      res.status(500).json({ message: "Internal Server Error." });
    }
  }

  async getNewsById(req: AuthRequest, res: Response) {
    const newsId = Number(req.params.id);

    if (!Number.isInteger(newsId) || newsId <= 0) {
      res.status(400).json({ message: "id must be a valid number." });
      return;
    }

    try {
      const news = await this.newsService.getNewsById(newsId);

      // Rascunhos não existem para quem não pode publicá-los.
      const canReadDraft = NEWS_EDITOR_ROLES.includes(Number(req.user?.role) as Role);
      if (!news || (news.status !== "publicado" && !canReadDraft)) {
        res.status(404).json({ message: "News not found." });
        return;
      }

      res.status(200).json({
        message: `Informations for News {${newsId}}`,
        newsInf: news,
      });
    } catch (error) {
      console.error("Error searching news:", error instanceof Error ? error.message : error);
      res.status(500).json({ message: "Internal Server Error." });
    }
  }

  async getMyNews(req: AuthRequest, res: Response) {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: "User not authenticated." });
      return;
    }

    try {
      const news = await this.newsService.getByAuthor(userId);
      res.status(200).json({ message: "News created by you.", data: news });
    } catch (error) {
      console.error("Error listing my news:", error instanceof Error ? error.message : error);
      res.status(500).json({ message: "Internal Server Error." });
    }
  }

  async createNews(req: AuthRequest, res: Response) {
    const userId = Number(req.user?.id);
    const parsed = parsePayload(req.body, { requireTitleAndContent: true });

    if ("error" in parsed) {
      res.status(400).json({ message: parsed.error });
      return;
    }

    const status = parsed.payload.status ?? "rascunho";

    const cityId = parsed.payload.city_id ?? Number(req.user?.city_id);
    if (!positiveInt(cityId)) {
      res.status(400).json({ message: "city_id must be a valid number." });
      return;
    }

    if (status === "publicado" && parsed.payload.blocks.length === 0) {
      res.status(400).json({ message: "Add at least one block before publishing." });
      return;
    }

    try {
      const city = await connection("cities").where({ id: cityId }).first();
      if (!city) {
        res.status(400).json({ message: "Invalid city." });
        return;
      }

      const newsId = await this.newsService.createNews({
        title: parsed.payload.title,
        subtitle: parsed.payload.subtitle,
        cover_image: parsed.payload.cover_image,
        cover_caption: parsed.payload.cover_caption,
        content: parsed.payload.blocks,
        author_id: userId,
        city_id: cityId,
        status,
      });

      const news = await this.newsService.getNewsById(newsId);

      res.status(201).json({ message: `News {${newsId}} created.`, newsInf: news });
    } catch (error) {
      console.error("Error creating news:", error instanceof Error ? error.message : error);
      res.status(500).json({ message: "Error to create News." });
    }
  }

  async updateNews(req: AuthRequest, res: Response) {
    const newsId = Number(req.params.id);

    if (!Number.isInteger(newsId) || newsId <= 0) {
      res.status(400).json({ message: "id must be a valid number." });
      return;
    }

    const parsed = parsePayload(req.body, { requireTitleAndContent: false });
    if ("error" in parsed) {
      res.status(400).json({ message: parsed.error });
      return;
    }

    try {
      const existing = await this.newsService.getNewsById(newsId);
      if (!existing) {
        res.status(404).json({ message: "News not found." });
        return;
      }

      const { title, subtitle, cover_image, cover_caption, blocks, city_id, status } = parsed.payload;
      const sent = (req.body ?? {}) as Record<string, unknown>;
      const patch: Record<string, unknown> = {};

      // Campo opcional ausente no corpo não é o mesmo que campo enviado como
      // null: sem esta distinção, qualquer atualização parcial apagaria o
      // subtítulo e a capa.
      if (title) patch.title = title;
      if (sent.subtitle !== undefined) patch.subtitle = subtitle;
      if (sent.cover_image !== undefined) patch.cover_image = cover_image;
      if (sent.cover_caption !== undefined) patch.cover_caption = cover_caption;
      if (blocks.length > 0 || sent.content !== undefined) patch.content = blocks;

      if (city_id && city_id !== Number(existing.city_id)) {
        const city = await connection("cities").where({ id: city_id }).first();
        if (!city) {
          res.status(400).json({ message: "Invalid city." });
          return;
        }
        patch.city_id = city_id;
      }

      // Idem para o status: sem um valor explícito, manter o atual evita que
      // editar o título despublique a matéria.
      const nextStatus = status ?? existing.status;
      const nextBlocks = patch.content !== undefined ? blocks : existing.content;
      if (nextStatus === "publicado" && dropEmptyBlocks(nextBlocks).length === 0) {
        res.status(400).json({ message: "Add at least one block before publishing." });
        return;
      }

      if (nextStatus !== existing.status) {
        patch.status = nextStatus;
        patch.published_at = nextStatus === "publicado" ? new Date() : null;
      }

      if (Object.keys(patch).length === 0) {
        res.status(400).json({ message: "Nothing to update." });
        return;
      }

      await this.newsService.updateNews(newsId, patch);
      const news = await this.newsService.getNewsById(newsId);

      res.status(200).json({ message: `News {${newsId}} updated.`, newsInf: news });
    } catch (error) {
      console.error("Error updating news:", error instanceof Error ? error.message : error);
      res.status(500).json({ message: "Error to update News." });
    }
  }

  async deleteNews(req: AuthRequest, res: Response) {
    const newsId = Number(req.params.id ?? req.body?.newsId);

    if (!Number.isInteger(newsId) || newsId <= 0) {
      res.status(400).json({ message: "id must be a valid number." });
      return;
    }

    try {
      const existing = await this.newsService.getNewsById(newsId);
      if (!existing) {
        res.status(404).json({ message: "News not found." });
        return;
      }

      await this.newsService.deleteNews(newsId);
      res.status(200).json({ message: `${existing.title} was deleted successfully!` });
    } catch (error) {
      console.error("Error deleting news:", error instanceof Error ? error.message : error);
      res.status(500).json({ message: "Internal Server Error." });
    }
  }

  async uploadNewsImage(req: AuthRequest, res: Response) {
    const file = req.file?.filename;

    if (!file) {
      res.status(400).json({ message: "No image received. Use the field name 'imagem'." });
      return;
    }

    res.status(201).json({
      message: "Image uploaded.",
      filename: file,
      url: `/uploads/${file}`,
    });
  }
}
