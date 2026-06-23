import { eq, sql } from 'drizzle-orm'
import { db } from '../config/database'
import { BadRequestError, UnauthorizedError } from './utils/errors.utils'
import { generateAccessToken } from './utils/jwt.utils'
import {
  comparePassword,
  hashPassword,
  validatePassword,
} from './utils/password.utils'
import { NewUser, roleModel, userModel } from '../schemas/schema'

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
      roleId: userModel.roleId,
      roleName: roleModel.roleName,
    })
    .from(userModel)
    .leftJoin(roleModel, eq(userModel.roleId, roleModel.roleId))
    .where(eq(userModel.userId, userId))

  return user
}

export const createUser = async (userData: NewUser) => {
  try {
    const existingUser = await findUserByUsername(userData.username)

    if (existingUser) {
      throw BadRequestError('Username already registered, Please Try Another')
    }

    validatePassword(userData.password)
    const hashedPassword = await hashPassword(userData.password)

    // ← .returning() PostgreSQL এ
    const [newUser] = await db
      .insert(userModel)
      .values({
        username: userData.username,
        password: hashedPassword,
        active: userData.active ?? true,
        roleId: userData.roleId,
      })
      .returning()

    return {
      id: newUser.userId,
      username: newUser.username,
      password: userData.password,
      active: newUser.active,
      roleId: newUser.roleId,
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
  }
) => {
  await db
    .update(userModel)
    .set(updateData)
    .where(eq(userModel.userId, userId))

  const [updatedUser] = await db
    .select({
      userId: userModel.userId,
      username: userModel.username,
      roleId: userModel.roleId,
      active: userModel.active,
    })
    .from(userModel)
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
    role: user.roleId ?? 0,
    permissions: [],
    hasPermission: (perm: string) => false,
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


// import { eq, sql } from 'drizzle-orm'
// import { db } from '../config/database'
// import { BadRequestError, UnauthorizedError } from './utils/errors.utils'
// import { generateAccessToken } from './utils/jwt.utils'
// import {
//   comparePassword,
//   hashPassword,
//   validatePassword,
// } from './utils/password.utils'
// import { NewUser, userModel } from '../schemas'

// export const findUserByUsername = async (username: string) => {
//   const [user] = await db
//     .select()
//     .from(userModel)
//     .where(eq(userModel.username, username))
//   return user
// }

// export const getUserDetailsByUserId = async (userId: number) => {
//   const user = await db.query.userModel.findFirst({
//     where: eq(userModel.userId, userId),
//     with: {
//       role: {
//         with: {
//           rolePermissions: {
//             with: {
//               permission: true,
//             },
//           },
//         },
//       },
//     },
//   })

//   return user
// }

// // Create user function

// export const createUser = async (userData: NewUser) => {
//   try {
//     const existingUser = await findUserByUsername(userData.username)

//     if (existingUser) {
//       throw BadRequestError('Username already registered, Please Try Another')
//     }

//     validatePassword(userData.password)
//     const hashedPassword = await hashPassword(userData.password)

//     const [newUserId] = await db
//       .insert(userModel)
//       .values({
//         username: userData.username,
//         password: hashedPassword,
//         active: userData.active,
//         roleId: userData.roleId,
//       })
//       .$returningId()
//     //  // Insert user-company relationships
//     //  if (companyIds.length > 0) {
//     //   await db.insert(userCompanyModel).values(
//     //     companyIds.map(companyId => ({
//     //       userId: newUserId.userId,
//     //       companyId,
//     //     }))
//     //   );
//     // }

//     return {
//       id: newUserId,
//       username: userData.username,
//       password: userData.password,
//       active: userData.active,
//       roleId: userData.roleId,
//     }

//     // Insert user-location relationships
//   } catch (error) {
//     throw error
//   }
// }

// //get user api

// export const getUsers = async () => {
//   const userList = await db.select().from(userModel)

//   return userList
// }

// //this is update user api

// export const updateUser = async (
//   userId: number,
//   updateData: {
//     username?: string
//     voucherTypes?: string[]
//     roleId?: number
//     active?: boolean
//   }
// ) => {
//   // Perform the update
//   await db
//     .update(userModel)
//     .set(updateData)
//     .where(sql`${userModel.userId} = ${userId}`)

//   // Fetch the updated user
//   const updatedUser = await db
//     .select({
//       userId: userModel.userId,
//       username: userModel.username,
//       roleId: userModel.roleId,
//       active: userModel.active,
//     })
//     .from(userModel)
//     .where(sql`${userModel.userId} = ${userId}`)
//     .limit(1)

//   return updatedUser[0]
// }

// export const loginUser = async (username: string, password: string) => {
//   const user = await findUserByUsername(username)

//   if (!user) {
//     throw UnauthorizedError(
//       'Wrong username/passwrod. Please Contact with Administrator'
//     )
//   }

//   // Validate password format if needed
//   validatePassword(password)

//   // Compare the plain password with stored hash
//   // Note: We don't hash the incoming password before comparison
//   const isValidPassword = await comparePassword(password, user.password)

//   if (!isValidPassword) {
//     throw UnauthorizedError(
//       'Wrong username/password. Please Contact with Administrator'
//     )
//   }

//   // fetch user details from db like role, voucher types, company, location, etc.
//   const userDetails = await getUserDetailsByUserId(user.userId);

//   const permissions = userDetails?.role?.rolePermissions.map((ur) =>
//     ur.permission.name 
//   ) || '';

//   const token = generateAccessToken({
//     userId: user.userId,
//     username: user.username,
//     role: user.roleId || 0,
//     permissions: permissions,
//     hasPermission: (perm: string) => permissions.includes(perm),
//   })

//   return {
//     token,
//     user: userDetails,
//   }
// }

// export const changePassword = async (
//   userId: number,
//   currentPassword: string,
//   newPassword: string
// ) => {
//   const user = await db
//     .select()
//     .from(userModel)
//     .where(eq(userModel.userId, userId))
//     .then((rows) => rows[0])

//   if (!user) {
//     throw UnauthorizedError('User not found')
//   }

//   const isValidPassword = await comparePassword(currentPassword, user.password)

//   if (!isValidPassword) {
//     throw UnauthorizedError('Current password is incorrect')
//   }

//   validatePassword(newPassword)
//   const hashedPassword = await hashPassword(newPassword)

//   await db
//     .update(userModel)
//     .set({ password: hashedPassword })
//     .where(eq(userModel.userId, userId))
// }

// // export const createUserCompany = async (userId: number, companyId: number) => {
// //   try {
// //     const [newUserCompany] = await db
// //       .insert(userCompanyModel)
// //       .values({
// //         userId: userId,
// //         companyId: companyId,
// //       })
// //       .onDuplicateKeyUpdate({ set: { userId: userId, companyId: companyId } });

// //     return {
// //       userId: userId,
// //       companyId: companyId,
// //     };
// //   } catch (error) {
// //     throw error;
// //   }
// // };
