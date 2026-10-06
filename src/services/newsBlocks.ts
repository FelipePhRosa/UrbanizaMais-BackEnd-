import crypto from "crypto";

// Contrato dos blocos de uma notícia. O frontend espelha estas mesmas
// definições em src/components/news/blockTypes.js — altere os dois juntos.
export const NEWS_BLOCK_TYPES = [
  "paragraph",
  "heading",
  "quote",
  "image",
  "investment",
  "indicators",
  "timeline",
  "before_after",
  "related_report",
] as const;

export type NewsBlockType = (typeof NEWS_BLOCK_TYPES)[number];

export interface NewsBlock {
  id: string;
  type: NewsBlockType;
  [key: string]: unknown;
}

export const MAX_BLOCKS = 200;

// Nomes gerados pelo multer em src/services/upload.ts: `${Date.now()}-${uuid}${ext}`
const FILENAME_PATTERN = /^\d{10,}-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

const LIMITS = {
  text: 5000,
  heading: 200,
  quote: 1000,
  attribution: 200,
  caption: 300,
  small: 120,
  tiny: 60,
  indicatorItems: 12,
  timelineItems: 40,
  blockId: 64,
} as const;

export type SanitizeResult =
  | { ok: true; blocks: NewsBlock[] }
  | { ok: false; error: string };

function cleanText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  const trimmed = value.replace(/\r\n/g, "\n").trim();
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

function optionalText(value: unknown, max: number): string | undefined {
  const text = cleanText(value, max);
  return text ? text : undefined;
}

function filename(value: unknown): string | null {
  const name = cleanText(value, 255);
  if (!name) return null;
  return FILENAME_PATTERN.test(name) ? name : null;
}

export function normalizeFilename(value: unknown): string | null {
  return filename(value);
}

function blockId(value: unknown): string {
  const id = cleanText(value, LIMITS.blockId);
  return id || crypto.randomUUID();
}

function positiveInt(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function sanitizeImage(value: unknown, label: string): { filename: string; caption?: string } | string {
  if (typeof value !== "object" || value === null) return `${label} must be an object.`;
  const source = value as Record<string, unknown>;
  const name = filename(source.filename);
  if (!name) return `${label} has an invalid image. Upload it again.`;
  const caption = optionalText(source.caption, LIMITS.caption);
  return caption ? { filename: name, caption } : { filename: name };
}

function sanitizeParagraph(block: Record<string, unknown>): NewsBlock | string {
  const text = cleanText(block.text, LIMITS.text);
  if (!text) return "Paragraph blocks cannot be empty.";
  return { id: blockId(block.id), type: "paragraph", text };
}

function sanitizeHeading(block: Record<string, unknown>): NewsBlock | string {
  const text = cleanText(block.text, LIMITS.heading);
  if (!text) return "Heading blocks cannot be empty.";
  return { id: blockId(block.id), type: "heading", text };
}

function sanitizeQuote(block: Record<string, unknown>): NewsBlock | string {
  const text = cleanText(block.text, LIMITS.quote);
  if (!text) return "Quote blocks cannot be empty.";
  const result: NewsBlock = { id: blockId(block.id), type: "quote", text };
  const attribution = optionalText(block.attribution, LIMITS.attribution);
  if (attribution) result.attribution = attribution;
  return result;
}

function sanitizeImageBlock(block: Record<string, unknown>): NewsBlock | string {
  const image = sanitizeImage(block, "Image block");
  if (typeof image === "string") return image;
  return { id: blockId(block.id), type: "image", ...image };
}

function sanitizeInvestment(block: Record<string, unknown>): NewsBlock | string {
  const value = cleanText(block.value, LIMITS.tiny);
  const label = cleanText(block.label, LIMITS.small);
  if (!value || !label) return "Investment blocks need a value and a label.";
  const result: NewsBlock = { id: blockId(block.id), type: "investment", value, label };
  const source = optionalText(block.source, LIMITS.attribution);
  if (source) result.source = source;
  return result;
}

function sanitizeIndicators(block: Record<string, unknown>): NewsBlock | string {
  if (!Array.isArray(block.items) || block.items.length === 0) {
    return "Indicator blocks need at least one item.";
  }
  if (block.items.length > LIMITS.indicatorItems) {
    return `Indicator blocks accept at most ${LIMITS.indicatorItems} items.`;
  }

  const items: Array<{ value: string; label: string }> = [];
  for (const item of block.items) {
    if (typeof item !== "object" || item === null) return "Each indicator must be an object.";
    const source = item as Record<string, unknown>;
    const value = cleanText(source.value, LIMITS.tiny);
    const label = cleanText(source.label, LIMITS.small);
    if (!value || !label) return "Each indicator needs a value and a label.";
    items.push({ value, label });
  }

  return { id: blockId(block.id), type: "indicators", items };
}

function sanitizeTimeline(block: Record<string, unknown>): NewsBlock | string {
  if (!Array.isArray(block.items) || block.items.length === 0) {
    return "Timeline blocks need at least one step.";
  }
  if (block.items.length > LIMITS.timelineItems) {
    return `Timeline blocks accept at most ${LIMITS.timelineItems} steps.`;
  }

  const items: Array<{ date: string; title: string; description?: string }> = [];
  for (const item of block.items) {
    if (typeof item !== "object" || item === null) return "Each timeline step must be an object.";
    const source = item as Record<string, unknown>;
    const date = cleanText(source.date, LIMITS.tiny);
    const title = cleanText(source.title, LIMITS.heading);
    if (!date || !title) return "Each timeline step needs a date and a title.";
    const step: { date: string; title: string; description?: string } = { date, title };
    const description = optionalText(source.description, LIMITS.text);
    if (description) step.description = description;
    items.push(step);
  }

  return { id: blockId(block.id), type: "timeline", items };
}

function sanitizeBeforeAfter(block: Record<string, unknown>): NewsBlock | string {
  const before = sanitizeImage(block.before, "Before image");
  if (typeof before === "string") return before;
  const after = sanitizeImage(block.after, "After image");
  if (typeof after === "string") return after;
  return { id: blockId(block.id), type: "before_after", before, after };
}

function sanitizeRelatedReport(block: Record<string, unknown>): NewsBlock | string {
  const reportId = positiveInt(block.report_id);
  if (!reportId) return "Related report blocks need a valid report id.";
  return { id: blockId(block.id), type: "related_report", report_id: reportId };
}

const SANITIZERS: Record<NewsBlockType, (block: Record<string, unknown>) => NewsBlock | string> = {
  paragraph: sanitizeParagraph,
  heading: sanitizeHeading,
  quote: sanitizeQuote,
  image: sanitizeImageBlock,
  investment: sanitizeInvestment,
  indicators: sanitizeIndicators,
  timeline: sanitizeTimeline,
  before_after: sanitizeBeforeAfter,
  related_report: sanitizeRelatedReport,
};

export function sanitizeBlocks(input: unknown): SanitizeResult {
  if (!Array.isArray(input)) {
    return { ok: false, error: "content must be an array of blocks." };
  }
  if (input.length > MAX_BLOCKS) {
    return { ok: false, error: `A news article accepts at most ${MAX_BLOCKS} blocks.` };
  }

  const blocks: NewsBlock[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < input.length; index += 1) {
    const raw = input[index];
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      return { ok: false, error: `Block ${index + 1} must be an object.` };
    }

    const block = raw as Record<string, unknown>;
    const type = block.type as NewsBlockType;
    const sanitize = SANITIZERS[type];
    if (!sanitize) {
      return { ok: false, error: `Block ${index + 1} has an unknown type.` };
    }

    const result = sanitize(block);
    if (typeof result === "string") {
      return { ok: false, error: `Block ${index + 1}: ${result}` };
    }

    if (seen.has(result.id)) result.id = crypto.randomUUID();
    seen.add(result.id);
    blocks.push(result);
  }

  return { ok: true, blocks };
}

// Blocos vazios são ruído de edição: o editor pode salvar um parágrafo em branco
// no meio do fluxo, e ele não deve aparecer na página pública.
export function dropEmptyBlocks(blocks: NewsBlock[]): NewsBlock[] {
  return blocks.filter((block) => block.type !== "paragraph" || cleanText(block.text, LIMITS.text));
}
