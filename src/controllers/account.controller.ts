import { NextFunction, Request, Response } from 'express'
import { z } from 'zod'
import { requirePermission } from '../services/utils/jwt.utils'
import {
  getAllAccounts,
  getAccountById,
  createAccount,
} from '../services/account.service'

const accountSchema = z.object({
  accountType: z.enum(['cash', 'bank', 'customer', 'vendor']),
  name: z.string().min(1, 'Name is required'),
  balance: z.string().optional(),
  // ✅ tenantId schema থেকে সরানো হয়েছে, token থেকে নেওয়া হবে
})

export const getAccounts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    requirePermission(req, 'view_finance')
    const tenantId = req.user?.tenantId as string
    const accounts = await getAllAccounts(tenantId)
    res.status(200).json(accounts)
  } catch (error) {
    next(error)
  }
}

export const getAccount = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    requirePermission(req, 'view_finance')
    const { id } = req.params
    const tenantId = req.user?.tenantId as string  // ✅ token থেকে
    const account = await getAccountById(id, tenantId)
    if (!account) {
      res.status(404).json({ status: 'fail', message: 'Account not found' })
      return
    }
    res.status(200).json(account)
  } catch (error) {
    next(error)
  }
}

export const createAccountController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    requirePermission(req, 'create_transaction')
    const data = accountSchema.parse(req.body)
    const account = await createAccount({
      ...data,
      tenantId: req.user?.tenantId as string,  // ✅ token থেকে, body থেকে না
    })
    res.status(201).json({ status: 'success', data: { account } })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ status: 'error', message: 'Invalid input', errors: error.errors })
    } else {
      next(error)
    }
  }
}



// import { NextFunction, Request, Response } from 'express'
// import { z } from 'zod'
// import { requirePermission } from '../services/utils/jwt.utils'
// import {
//   getAllAccounts,
//   getAccountById,
//   createAccount,
// } from '../services/account.service'

// const accountSchema = z.object({
//   tenantId: z.string().uuid(),
//   accountType: z.enum(['cash', 'bank', 'customer', 'vendor']),
//   name: z.string().min(1, 'Name is required'),
//   balance: z.string().optional(),
// })

// export const getAccounts = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     requirePermission(req, 'view_finance')
//     const tenantId = req.user?.tenantId as string
//     const accounts = await getAllAccounts(tenantId)
//     res.status(200).json(accounts)
//   } catch (error) {
//     next(error)
//   }
// }

// export const getAccount = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     requirePermission(req, 'view_finance')
//     const { id } = req.params
//     const account = await getAccountById(id)
//     if (!account) {
//       res.status(404).json({ status: 'fail', message: 'Account not found' })
//       return
//     }
//     res.status(200).json(account)
//   } catch (error) {
//     next(error)
//   }
// }

// export const createAccountController = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     requirePermission(req, 'create_transaction')
//     const data = accountSchema.parse(req.body)
//     const account = await createAccount(data)
//     res.status(201).json(account)
//   } catch (error) {
//     if (error instanceof z.ZodError) {
//       res.status(400).json({ status: 'error', message: 'Invalid input', errors: error.errors })
//     } else {
//       next(error)
//     }
//   }
// }