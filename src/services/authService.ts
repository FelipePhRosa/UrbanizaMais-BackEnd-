import bcrypt from "bcryptjs";
import jwt, { Secret, SignOptions } from "jsonwebtoken";
import connection from "../connection";

interface LoginCredentials {
  identifier: string; 
  password: string;
}

interface TokenPayload {
  userId: number;
  email: string;
  fullName: string;
  role: number;
  avatar_url: string;
  telefone: string;
  city_id: number;
  neighborhood_id: number;
}

export default class AuthService {
  private JWT_SECRET: Secret = process.env.JWT_SECRET || "chave-super-secreta";
  private JWT_EXPIRES_IN: SignOptions["expiresIn"] = "24h";

  generateToken(payload: TokenPayload): string {
    const options: SignOptions = {
      expiresIn: this.JWT_EXPIRES_IN,
    };
    return jwt.sign(payload, this.JWT_SECRET, options);
  }

  verifyToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, this.JWT_SECRET) as TokenPayload;
    } catch (error) {
      throw new Error("Invalid Token or Expired.");
    }
  }

  async login(credentials: LoginCredentials) {
    try {
      const identifierClean = credentials.identifier.trim().toLowerCase();

      const user = await connection("users")
        .whereRaw("LOWER(TRIM(email)) = ?", [identifierClean])
        .orWhereRaw("LOWER(TRIM(nameUser)) = ?", [identifierClean])
        .first();

      if (!user) {
        throw new Error("Invalid Credentials");
      }

      const isPasswordValid = await bcrypt.compare(
        credentials.password,
        user.password_hash
      );

      if (!isPasswordValid) {
        throw new Error("Invalid Credentials");
      }

      const token = this.generateToken({
        userId: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        avatar_url: user.avatar_url,
        telefone: user.telefone,
        city_id: user.city_id,
        neighborhood_id: user.neighborhood_id
      });

      return {
        userId: user.id,
        nameUser: user.nameUser,
        fullName: user.fullName,
        email: user.email,
        telefone: user.telefone,
        birth_date: user.birth_date,
        role: user.role,
        city_id: user.city_id,
        neighborhood_id: user.neighborhood_id,
        avatar_url: user.avatar_url,
        token,
        is_verified: user.is_verified,
        isNewUser: false
      };
    } catch (error) {
      console.error("Login error:", error instanceof Error ? error.message : error);
      throw error;
    }
  }
}
