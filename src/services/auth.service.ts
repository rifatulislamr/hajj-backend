import { eq, and } from 'drizzle-orm'
import { db } from '../config/database'
import { BadRequestError, UnauthorizedError } from './utils/errors.utils'
import { generateAccessToken } from './utils/jwt.utils'
import {
  comparePassword,
  hashPassword,
  validatePassword,
} from './utils/password.utils'
import { NewUser, roleModel, tenantModel, tenantUserModel, userModel } from '../schemas/schema'

export const findUserByUsername = async (username: string) => {
  const [user] = await db
    .select()
    .from(userModel)
    .where(eq(userModel.username, username))
  return user
}

export const getUserDetailsByUserId = async (userId: number) => {
  const [user] = await db
    .select({
      userId: userModel.userId,
      username: userModel.username,
      active: userModel.active,
      tenantId: tenantUserModel.tenantId,
      roleId: tenantUserModel.roleId,
      roleName: roleModel.roleName,
    })
    .from(userModel)
    .leftJoin(tenantUserModel, eq(tenantUserModel.userId, userModel.userId))
    .leftJoin(roleModel, eq(tenantUserModel.roleId, roleModel.roleId))
    .where(eq(userModel.userId, userId))

  return user
}

export const createUser = async (
  userData: Pick<NewUser, 'username' | 'password' | 'active'> & {
    agencyName?: string
    roleId: number
  }
) => {
  try {
    const existingUser = await findUserByUsername(userData.username)
    if (existingUser) {
      throw BadRequestError('Username already registered, Please Try Another')
    }

    validatePassword(userData.password)
    const hashedPassword = await hashPassword(userData.password)

    const result = await db.transaction(async (tx) => {
      // ১. Tenant তৈরি করো
      const [newTenant] = await tx
        .insert(tenantModel)
        .values({
          name: userData.agencyName ?? 'Default Agency',
          status: 'active',
        })
        .returning()

      // ২. User তৈরি করো (এখন roleId/tenantId user table এ নেই)
      const [newUser] = await tx
        .insert(userModel)
        .values({
          username: userData.username,
          password: hashedPassword,
          active: userData.active ?? true,
        })
        .returning()

      // ৩. tenant_users এ link তৈরি করো
      const [tenantUser] = await tx
        .insert(tenantUserModel)
        .values({
          tenantId: newTenant.id,
          userId: newUser.userId,
          roleId: userData.roleId,
        })
        .returning()

      return { newUser, tenantUser, newTenant }
    })

    return {
      id: result.newUser.userId,
      username: result.newUser.username,
      active: result.newUser.active,
      roleId: result.tenantUser.roleId,
      tenantId: result.tenantUser.tenantId,
    }
  } catch (error) {
    throw error
  }
}

export const getUsers = async () => {
  const userList = await db.select().from(userModel)
  return userList
}

export const updateUser = async (
  userId: number,
  updateData: {
    username?: string
    roleId?: number
    active?: boolean
    voucherTypes?: string[]
  }
) => {
  const { roleId, ...userFields } = updateData

  if (Object.keys(userFields).length > 0) {
    await db
      .update(userModel)
      .set(userFields)
      .where(eq(userModel.userId, userId))
  }

  // roleId পরিবর্তন হলে tenant_users টেবিল update করো
  if (roleId !== undefined) {
    await db
      .update(tenantUserModel)
      .set({ roleId })
      .where(eq(tenantUserModel.userId, userId))
  }

  const [updatedUser] = await db
    .select({
      userId: userModel.userId,
      username: userModel.username,
      active: userModel.active,
      roleId: tenantUserModel.roleId,
    })
    .from(userModel)
    .leftJoin(tenantUserModel, eq(tenantUserModel.userId, userModel.userId))
    .where(eq(userModel.userId, userId))

  return updatedUser
}

export const loginUser = async (username: string, password: string) => {
  const user = await findUserByUsername(username)

  if (!user) {
    throw UnauthorizedError('Wrong username/password. Please Contact with Administrator')
  }

  validatePassword(password)

  const isValidPassword = await comparePassword(password, user.password)

  if (!isValidPassword) {
    throw UnauthorizedError('Wrong username/password. Please Contact with Administrator')
  }

  const userDetails = await getUserDetailsByUserId(user.userId)

const token = generateAccessToken({
  userId: user.userId,
  username: user.username,
  tenantId: userDetails?.tenantId ?? undefined,
  roleId: userDetails?.roleId ?? undefined,
})

  return {
    token,
    user: userDetails,
  }
}

export const changePassword = async (
  userId: number,
  currentPassword: string,
  newPassword: string
) => {
  const [user] = await db
    .select()
    .from(userModel)
    .where(eq(userModel.userId, userId))

  if (!user) {
    throw UnauthorizedError('User not found')
  }

  const isValidPassword = await comparePassword(currentPassword, user.password)

  if (!isValidPassword) {
    throw UnauthorizedError('Current password is incorrect')
  }

  validatePassword(newPassword)
  const hashedPassword = await hashPassword(newPassword)

  await db
    .update(userModel)
    .set({ password: hashedPassword })
    .where(eq(userModel.userId, userId))
}


