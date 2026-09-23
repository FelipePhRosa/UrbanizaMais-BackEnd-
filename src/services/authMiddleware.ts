// src/middlewares/authMiddleware.ts
import { Request, Response, NextFunction } from "express";
import AuthService from "./authService";
import connection from "../connection";
import { AuthRequest } from "../types/express";
import { Role } from "../enums/types";

const authService = new AuthService();
// Middleware para verificar se o usuário está autenticado
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer")) {
      res.status(401).json({ error: "Invalid Token or Expired." });
      return
    }

    const token = authHeader.split(" ")[1];
    const decoded = authService.verifyToken(token);

    const user = await connection('users')
      .where({ id: decoded.userId })
      .first();

    if (!user) {
      res.status(401).json({ error: "User not found." });
      return
    }

    if (Number(user.role) === Role.Banned) {
      res.status(403).json({ error: "Access denied: account suspended." });
      return
    }

    req.user = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: Number(user.role),
      avatar_url: user.avatar_url,
      telefone: user.telefone,
      city_id: user.city_id,
      neighborhood_id: user.neighborhood_id
    };

    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid Token or Expired." });
    return
  }
};
