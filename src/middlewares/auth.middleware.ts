import { NextFunction, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { UnauthorizedError } from "../services/utils/errors.utils";
import {
  extractTokenFromHeader,
  getUserPermissions,
  verifyAccessToken,
} from "../services/utils/jwt.utils";
import { db } from "../config/database";
import { tenantModel, userModel } from "../schemas/schema";

export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);
    console.log(token);
    const decoded = verifyAccessToken(token);

    const permissions = await getUserPermissions(decoded.userId);

    // user এর tenantId বের করো
    const [userWithTenant] = await db
      .select({
        tenantId: userModel.roleId, // আপাতত roleId দিয়ে tenant বুঝাচ্ছি
      })
      .from(userModel)
      .where(eq(userModel.userId, decoded.userId))

    // tenants টেবিল থেকে প্রথম tenant নাও
    const [tenant] = await db.select().from(tenantModel)

    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role,
      tenantId: tenant?.id,
      permissions: permissions,
      hasPermission: (perm: string) => permissions.includes(perm),
      hasRole: (role: number) => decoded.role === role,
    };

    console.log("🚀 ~ authenticateUser ~ req.user:", req.user)
    console.log('permissions', permissions)
    next();
  } catch (error) {
    console.error(error)
    return next(UnauthorizedError("Invalid token"));
  }
};





















// import { NextFunction, Request, Response } from "express";
// import { UnauthorizedError } from "../services/utils/errors.utils";
// import { extractTokenFromHeader, getUserPermissions, verifyAccessToken } from "../services/utils/jwt.utils";



// export const authenticateUser = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const authHeader = req.headers.authorization;
//     const token = extractTokenFromHeader(authHeader);
//     console.log(token);
//     const decoded = verifyAccessToken(token) ;
  
//     const permissions = await getUserPermissions(decoded.userId);
   
//     req.user = {
//       userId: decoded.userId,
//       username: decoded.username,
//       role: decoded.role,
//       permissions:permissions,
//       hasPermission: (perm: string) => permissions.includes(perm),
//       hasRole: (role: number) => decoded.role === role,
//     };
//     console.log("🚀 ~ authenticateUser ~ req.user:", req.user)
//     console.log('permissions',permissions)
//     next();
//   } catch (error) {
//     console.error(error)
//     return next(UnauthorizedError("Invalid token"));
//   }
// };

// // utils/getUserPermissions.ts
