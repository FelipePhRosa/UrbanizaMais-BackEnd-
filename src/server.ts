import express from "express"
import dotenv from "dotenv"
import cors from "cors"
import router from "./router"
import path from "path"
import rateLimit from 'express-rate-limit';

dotenv.config()

const server = express()
const PORT = Number(process.env.PORT) || 3000

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

server.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), {
    index: false,
    dotfiles: 'ignore',
    setHeaders: (res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'");
    }
}));
server.use(express.json());
server.use(router)

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server Listening: ${PORT}`);
});