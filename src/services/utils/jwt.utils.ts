import jwt, { SignOptions } from "jsonwebtoken";
import { eq, and } from "drizzle-orm";
import { BadRequestError, UnauthorizedError } from "./errors.utils";
import { db } from "../../config/database";
import { Request } from "express";
import {
  tenantUserModel,
  rolePermissionsModel,
  permissionsModel,
} from "../../schemas/schema";

interface TokenPayload {
  userId: number;
  username: string;
  tenantId?: string;
  roleId?: number;
  [key: string]: any;
}

const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || "24h";
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not configured");
}

export const generateAccessToken = (payload: TokenPayload): string | undefined => {
  try {
    const expiresIn = (ACCESS_TOKEN_EXPIRES_IN as `${number}${'s' | 'm' | 'h' | 'd'}`) || "24h";
    const options: SignOptions = {
      expiresIn: expiresIn,
    };
    const token = jwt.sign(payload, JWT_SECRET, options);
    return token;
  } catch (error) {
    console.error(error);
    throw BadRequestError("Error generating access token");
  }
};

export const verifyAccessToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    console.error(error);
    if (error instanceof jwt.TokenExpiredError) {
      throw UnauthorizedError("Token has expired");
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw UnauthorizedError("Invalid token");
    }
    throw UnauthorizedError("Token verification failed");
  }
};

export const extractTokenFromHeader = (authHeader?: string): string => {
  if (!authHeader) {
    throw UnauthorizedError("No authorization header");
  }

  const [bearer, token] = authHeader.split(" ");

  if (bearer !== "Bearer" || !token) {
    throw UnauthorizedError("Invalid authorization header format");
  }

  return token;
};

export const decodeToken = (token: string): TokenPayload | null => {
  try {
    const decoded = jwt.decode(token);
    if (decoded && typeof decoded === 'object') {
      return decoded as TokenPayload;
    }
    return null;
  } catch (error) {
    return null;
  }
};

export const isTokenExpired = (token: string): boolean => {
  const decoded = decodeToken(token);
  if (!decoded || typeof decoded.exp !== 'number') return true;
  const currentTime = Math.floor(Date.now() / 1000);
  return decoded.exp < currentTime;
};

export const getMillisecondsFromTimeString = (timeString: string): number => {
  const unit = timeString.slice(-1);
  const value = parseInt(timeString.slice(0, -1));

  switch (unit) {
    case "s": return value * 1000;
    case "m": return value * 60 * 1000;
    case "h": return value * 60 * 60 * 1000;
    case "d": return value * 24 * 60 * 60 * 1000;
    default: throw new Error("Invalid time string format");
  }
};

export async function getUserPermissions(userId: number, tenantId: string) {
  try {
    const tenantUser = await db
      .select({
        roleId: tenantUserModel.roleId,
      })
      .from(tenantUserModel)
      .where(
        and(
          eq(tenantUserModel.userId, userId),
          eq(tenantUserModel.tenantId, tenantId)
        )
      );

    if (!tenantUser.length) return [];

    const roleId = tenantUser[0].roleId;

    const rolePerms = await db
      .select({
        permissionName: permissionsModel.name,
      })
      .from(rolePermissionsModel)
      .innerJoin(
        permissionsModel,
        eq(rolePermissionsModel.permissionId, permissionsModel.id)
      )
      .where(eq(rolePermissionsModel.roleId, roleId));

    return rolePerms.map((rp) => rp.permissionName);
  } catch (error) {
    console.error('getUserPermissions error:', error);
    return [];
  }
}

export const requirePermission = (req: Request, permission: string) => {
  if (!req.user?.hasPermission(permission)) {
    throw new Error('Forbidden');
  }
};


