import { NextFunction, Request, Response } from 'express'
import { z } from 'zod'

import jwt from 'jsonwebtoken'
import { db } from '../config/database'
import { roleModel, userModel } from '../schemas'
import { eq } from 'drizzle-orm'
import {
  changePassword,
  createUser,
  getUsers,
  loginUser,
  updateUser,
} from '../services/auth.service'
import { JsonWebTokenError } from 'jsonwebtoken'

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters'),
})

const registerSchema = z
  .object({
    username: z.string().min(1, 'Username is required'),
    password: z
      .string()
      .min(1, 'Password is required')
      .min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
    active: z.boolean().default(true),
    roleId: z.number(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters'),
    confirmNewPassword: z
      .string()
      .min(8, 'Confirm new password must be at least 8 characters'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "New passwords don't match",
    path: ['confirmNewPassword'],
  })

export const checkToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization
  const token = authHeader?.split(' ')[1]
  try {
    const decoded = jwt.verify(
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoibXl1c2VyIiwicm9sZSI6MSwiaWF0IjoxNzQ1Mzk2ODQxLCJleHAiOjE3NDU0ODMyNDF9.P0fDRyREff4fC7vusiwDMztuQnb9rLPTUwbvcO7Usk4',
      'mohikhan'
    )
    res.json({ success: true, decoded })
  } catch (err: any) {
    res.json({ success: false, error: err.message })
  }
}

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { username, password } = loginSchema.parse(req.body)
    const result = await loginUser(username, password)

    res.json(result)
  } catch (error) {
    next(error)
  }
}

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { username, password, active, roleId } =
      registerSchema.parse(req.body)
    const user = await createUser(
      { username, password, active, roleId },
    )

    res.status(201).json({
      status: 'success',
      data: {
        user: {
          username: user.username,
          password: user.password,
          roleId: user.roleId,
          active: user.active,
        },
      },
    })
  } catch (error) {
    next(error)
  }
}

export const updateUserController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId } = req.params
    const { username, voucherTypes, roleId, active } = req.body

    const updateData: {
      username?: string
      voucherTypes?: string[]
      roleId?: number
      active?: boolean
    } = {}

    if (username !== undefined) updateData.username = username
    if (voucherTypes !== undefined) updateData.voucherTypes = voucherTypes
    if (roleId !== undefined) updateData.roleId = Number(roleId)
    // Change this line
    if (active !== undefined) updateData.active = Boolean(active) // Allow setting to false

    const updatedUser = await updateUser(Number(userId), updateData)

    if (!updatedUser) {
      res.status(404).json({
        status: 'fail',
        message: 'User not found',
      })
      return
    }

    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: updatedUser.userId,
          username: updatedUser.username,
          roleId: updatedUser.roleId,
          active: updatedUser.active,
        },
      },
    })
  } catch (error) {
    next(error)
  }
}

export const changePasswordController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req.params
    const { currentPassword, newPassword } = changePasswordSchema.parse(
      req.body
    )

    await changePassword(Number(userId), currentPassword, newPassword)

    res.status(200).json({
      status: 'success',
      message: 'Password changed successfully',
    })
  } catch (error) {
    next(error)
  }
}

//this is get user_id and role_id by inner join

// export const getUsersWithRoles = async () => {
//   return await db
//     .select({
//       userId: userModel.userId,
//       username: userModel.username,
//       active: userModel.active,
//       roleName: roleModel.roleName,
//       voucherTypes: userModel.voucherTypes,
//     })
//     .from(userModel)
//     .innerJoin(roleModel, eq(userModel.roleId, roleModel.roleId));
// };

export const getUsersWithRoles = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const usersWithRoles = await db
      .select({
        userId: userModel.userId,
        username: userModel.username,
        active: userModel.active,
        roleName: roleModel.roleName,
      })
      .from(userModel)
      .innerJoin(roleModel, eq(userModel.roleId, roleModel.roleId))

    res.status(200).json({
      status: 'success',
      data: {
        users: usersWithRoles.map((user) => ({
          id: user.userId,
          username: user.username,
          active: user.active,
          roleName: user.roleName,
        })),
      },
    })
  } catch (error) {
    next(error)
  }
}

export const getUsersCompanyLocationVoucher = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userInfo = await db
      .select({
        userId: userModel.userId,
      })
      .from(userModel)

    res.status(200).json({
      status: 'success',
      data: {
        users: userInfo.map((user) => ({
          userId: user.userId,
        })),
      },
    })
  } catch (error) {
    next(error)
  }
}
