import { getUsers } from "../services/auth.service";
import { requirePermission } from "../services/utils/jwt.utils";
import { Request,Response,NextFunction } from "express";
export const getUserList = async (req: Request, res: Response, next: NextFunction) => {
    try {
      requirePermission(req, 'view_users');
      const users = await getUsers();
      res.json(users);
    } catch (err) {
      next(err);
    }
  };