"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const multer_1 = __importDefault(require("multer"));
// Configura onde e como salvar os arquivos
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/"); // pasta onde salvará
    },
    filename: (req, file, cb) => {
        // Garante um nome único
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    },
});
// Exporta o middleware configurado
const upload = (0, multer_1.default)({ storage });
exports.default = upload;
