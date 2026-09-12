"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require('dotenv').config();
const knex_1 = __importDefault(require("knex"));
const connection = (0, knex_1.default)({
    client: process.env.DB_CONNECTION || "mysql2",
    connection: {
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "zenite",
        port: Number(process.env.DB_PORT) || 3306,
        password: process.env.DB_PASSWORD || "Lolzinho1@",
        database: process.env.DB_NAME || "reclamai",
    },
});
exports.default = connection;
