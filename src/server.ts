import express from "express"
import dotenv from "dotenv"
import cors from "cors"
import router from "./router"
import path from "path"
import rateLimit from 'express-rate-limit';
import connection from "./connection"

dotenv.config()

const server = express()
const PORT = 3000

server.set('trust proxy', 1);
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { message: 'Too many requests, try again later.' }
});


server.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));

server.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
server.use(express.json());
server.use(router)

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server Listening: ${PORT}`);
});