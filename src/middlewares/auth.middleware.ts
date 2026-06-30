import { NextFunction, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { UnauthorizedError } from "../services/utils/errors.utils";
import {
  extractTokenFromHeader,
  getUserPermissions,
  verifyAccessToken,
} from "../services/utils/jwt.utils";
import { db } from "../config/database";
import { tenantUserModel } from "../schemas/schema";

export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);
    const decoded = verifyAccessToken(token);

    // tenantId এখন JWT payload থেকেই আসবে (login এর সময় বসানো হয়েছে)
    const tenantId = decoded.tenantId;
    if (!tenantId) {
      throw UnauthorizedError("Tenant context missing in token");
    }

    const [tenantUser] = await db
      .select({ roleId: tenantUserModel.roleId })
      .from(tenantUserModel)
      .where(eq(tenantUserModel.userId, decoded.userId));
      // চাইলে .where(and(eq(userId, decoded.userId), eq(tenantId, tenantId))) করো

    const permissions = await getUserPermissions(decoded.userId, tenantId);

    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      tenantId: tenantId,
      roleId: tenantUser?.roleId,
      permissions: permissions,
      hasPermission: (perm: string) => permissions.includes(perm),
      hasRole: (roleId: number) => tenantUser?.roleId === roleId,
    };

    next();
  } catch (error) {
    return next(UnauthorizedError("Invalid token"));
  }
};




