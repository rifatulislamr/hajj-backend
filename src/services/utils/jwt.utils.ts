import jwt, { SignOptions } from "jsonwebtoken";
import { BadRequestError, UnauthorizedError } from "./errors.utils";
import { db } from "../../config/database";
import { Request } from "express";
import { cosineDistance } from "drizzle-orm";
interface TokenPayload {
  userId: number;
  username: string;
  role?:number;
  [key: string]: any;
}

const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || "24h";
const JWT_SECRET = process.env.JWT_SECRET;
console.log(JWT_SECRET);
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not configured");
}

export const generateAccessToken = (payload: TokenPayload): string|undefined => {
  try {
    const secret=JWT_SECRET as string;
    const expiresIn = ACCESS_TOKEN_EXPIRES_IN as `${number}${'s'|'m'|'h'|'d'}` || "24h";
    console.log(secret)
    const options: SignOptions = {
      expiresIn: expiresIn,
    };
    const token= jwt.sign(payload, JWT_SECRET, options);
    
    console.log(`Token received:[${token}] length: ${token.length}`);
    
    return token;
  } catch (error) {
    console.error(error)
    throw BadRequestError("Error generating access token");
  }
};

export const verifyAccessToken = (token: string):TokenPayload => {
  try {
    console.log('before Varification',token,'payload',JWT_SECRET)
    return jwt.verify(token,JWT_SECRET) as TokenPayload;
  } catch (error) {
    console.error(error)
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
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    default:
      throw new Error("Invalid time string format");
  }
};

export async function getUserPermissions(userId: number) {

    const result = await db.query.userRolesModel.findMany({
      where: (ur, { eq }) => eq(ur.userId, userId),
      with: {
        role: {
          with: {
            rolePermissions: {
              with: {
                permission: true,
              },
            },
          },
        },
      },
    });
  const permissions = new Set<string>();
  console.log('dfdfdfdfdfdf',result)
  for (const ur of result) {
    for (const perm of ur.role?.rolePermissions) {
      permissions.add(perm.permission.name);
    }
  }

  return Array.from(permissions);
}

export const requirePermission = (req: Request, permission: string) => {
  console.log('this is current user',req.user)
  console.log('Is permission',req.user?.hasPermission(permission))
  if (!req.user?.hasPermission(permission)) {
    throw new Error('Forbidden');
  }
};