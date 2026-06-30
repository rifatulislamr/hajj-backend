export interface MySQLError extends Error {
  code: string
  errno: number
  sqlState: string
  sqlMessage: string
}

export interface User {
  id: number
  email: string
  password: string
  role?: string
  createdAt?: Date
  updatedAt?: Date
}

export interface TokenPayload {
  userId: number
  email: string
  role?: string
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number
        username: string
        roleId?: number
        tenantId?: string
        permissions?: string[]
        hasPermission: (permission: string) => boolean
        hasRole: (roleId: number) => boolean
      }
    }
  }
}