import { NextFunction, Request, Response } from 'express'
import { z } from 'zod'
import { requirePermission } from '../services/utils/jwt.utils'
import {
  getAllExpenses,
  createExpense,
} from '../services/expense.service'

const expenseSchema = z.object({
  tenantId: z.string().uuid(),
  category: z.string().optional(),
  amount: z.string(),
  description: z.string().optional(),
  incurredAt: z.string().optional(),
})

export const getExpenses = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    requirePermission(req, 'view_finance')
    const tenantId = req.user?.tenantId as string
    const expenses = await getAllExpenses(tenantId)
    res.status(200).json(expenses)
  } catch (error) {
    next(error)
  }
}

export const createExpenseController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    requirePermission(req, 'create_transaction')
    const data = expenseSchema.parse(req.body)
    const expense = await createExpense(data)
    res.status(201).json(expense)
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ status: 'error', message: 'Invalid input', errors: error.errors })
    } else {
      next(error)
    }
  }
}