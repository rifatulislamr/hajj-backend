import { Router } from "express";
import {
  changePasswordController,
  getUsersCompanyLocationVoucher,
  getUsersWithRoles,
  login,
  register,
  updateUserController,
} from "../controllers/auth.controller";
import { authenticateUser } from "../middlewares/auth.middleware";
import { getUserList } from "../controllers/users.controller";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get('/users', authenticateUser, getUserList);
router.get("/users-by-roles", getUsersWithRoles);
router.get("/user-with-comapnyid-locationid", getUsersCompanyLocationVoucher);
router.put("/users/:userId", updateUserController);
router.patch("/change-password/:userId", changePasswordController);

export default router;
