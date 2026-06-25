import { NextFunction, Request, Response } from 'express'
import { z } from 'zod'
import { requirePermission } from '../services/utils/jwt.utils'
import {
  getAllTransactions,
  createTransaction,
  getTransactionsByAccount,
} from '../services/transaction.service'

const transactionSchema = z.object({
  tenantId: z.string().uuid(),
  accountId: z.string().uuid(),
  referenceType: z.string().optional(),
  referenceId: z.string().uuid().optional(),
  amount: z.string(),
  transactionType: z.enum(['credit', 'debit']),
  category: z.string().optional(),
  transactionDate: z.string().optional(),
  status: z.string().optional(),
})

export const getTransactions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    requirePermission(req, 'view_finance')
    const tenantId = req.user?.tenantId as string
    const transactions = await getAllTransactions(tenantId)
    res.status(200).json(transactions)
  } catch (error) {
    next(error)
  }
}

export const createTransactionController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    requirePermission(req, 'create_transaction')
    const data = transactionSchema.parse(req.body)
    const transaction = await createTransaction(data)
    res.status(201).json(transaction)
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ status: 'error', message: 'Invalid input', errors: error.errors })
    } else {
      next(error)
    }
  }
}

export const getAccountTransactionsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    requirePermission(req, 'view_finance')
    const { accountId } = req.params
    const transactions = await getTransactionsByAccount(accountId)
    res.status(200).json(transactions)
  } catch (error) {
    next(error)
  }
}