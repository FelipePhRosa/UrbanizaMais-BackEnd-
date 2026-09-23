import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { Request, Response, NextFunction, RequestHandler } from "express";

// Limites centralizados e configuráveis via .env
const MAX_IMAGE_SIZE_MB = Number(process.env.MAX_IMAGE_SIZE_MB) || 10;
const MAX_VIDEO_SIZE_MB = Number(process.env.MAX_VIDEO_SIZE_MB) || 50;

const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;

const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");

const IMAGE_MIMES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const VIDEO_MIMES: Record<string, string> = {
  "video/mp4": ".mp4",
  "video/webm": ".webm",
};

const ALLOWED_MIMES: Record<string, string> = { ...IMAGE_MIMES, ...VIDEO_MIMES };

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Nomes de arquivo seguros e únicos — nunca usa o originalname do cliente
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = ALLOWED_MIMES[file.mimetype] || ".bin";
    cb(null, `${Date.now()}-${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: Math.max(MAX_IMAGE_SIZE_BYTES, MAX_VIDEO_SIZE_BYTES),
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIMES[file.mimetype]) {
      cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
      return;
    }
    cb(null, true);
  },
});

// Assinaturas binárias (magic bytes) por tipo — não confiar apenas no MIME declarado
function matchesMagicBytes(buffer: Buffer, mimetype: string): boolean {
  switch (mimetype) {
    case "image/jpeg":
      return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case "image/png":
      return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case "image/webp":
      return buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
    case "video/mp4":
      return buffer.length >= 12 && buffer.subarray(4, 8).toString("ascii") === "ftyp";
    case "video/webm":
      return buffer.length >= 4 && buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
    default:
      return false;
  }
}

function deleteFileSilently(filePath: string) {
  fs.promises.unlink(filePath).catch(() => {});
}

function friendlyUploadError(res: Response, message: string) {
  res.status(400).json({ message });
}

async function validateUploadedFile(file: Express.Multer.File): Promise<string | null> {
  const isImage = file.mimetype in IMAGE_MIMES;

  if (isImage && file.size > MAX_IMAGE_SIZE_BYTES) {
    return `Image exceeds the maximum size of ${MAX_IMAGE_SIZE_MB} MB.`;
  }
  if (!isImage && file.size > MAX_VIDEO_SIZE_BYTES) {
    return `Video exceeds the maximum size of ${MAX_VIDEO_SIZE_MB} MB.`;
  }

  const handle = await fs.promises.open(file.path, "r");
  try {
    const header = Buffer.alloc(16);
    await handle.read(header, 0, 16, 0);
    if (!matchesMagicBytes(header, file.mimetype)) {
      return "File content does not match the declared type.";
    }
  } finally {
    await handle.close();
  }

  return null;
}

// Middleware único: multer + tratamento de erro amigável + validação de conteúdo
export function uploadSingle(fieldName: string): RequestHandler {
  const multerMiddleware = upload.single(fieldName);

  return (req: Request, res: Response, next: NextFunction) => {
    multerMiddleware(req, res, async (err) => {
      if (err) {
        if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
          friendlyUploadError(res, `File is too large. Maximum: ${MAX_IMAGE_SIZE_MB} MB for images, ${MAX_VIDEO_SIZE_MB} MB for videos.`);
          return;
        }
        friendlyUploadError(res, "Invalid or unsupported file. Allowed: JPEG, PNG, WebP, MP4, WebM.");
        return;
      }

      if (!req.file) {
        next();
        return;
      }

      try {
        const problem = await validateUploadedFile(req.file);
        if (problem) {
          deleteFileSilently(req.file.path);
          req.file = undefined as unknown as Express.Multer.File;
          friendlyUploadError(res, problem);
          return;
        }
        next();
      } catch (validationError) {
        deleteFileSilently(req.file.path);
        req.file = undefined as unknown as Express.Multer.File;
        console.error("Upload validation error:", validationError instanceof Error ? validationError.message : validationError);
        friendlyUploadError(res, "Failed to validate the uploaded file.");
      }
    });
  };
}

export default upload;
