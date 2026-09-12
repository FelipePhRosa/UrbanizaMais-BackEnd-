"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const router_1 = __importDefault(require("./router"));
const path_1 = __importDefault(require("path"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
dotenv_1.default.config();
const server = (0, express_1.default)();
const PORT = 3000;
server.set('trust proxy', 1);
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { message: 'Too many requests, try again later.' }
});
server.use(limiter);
server.use((0, cors_1.default)({
    origin: "https://zeniteplatform.vercel.app",
    credentials: true
}));
server.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '..', 'uploads')));
server.use(express_1.default.json());
server.use(router_1.default);
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server Listening: ${PORT}`);
});
