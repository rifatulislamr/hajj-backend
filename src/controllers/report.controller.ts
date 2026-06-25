import { NextFunction, Request, Response } from 'express'
import { requirePermission } from '../services/utils/jwt.utils'
import {
  getProfitLossReport,
  getCashBankSummary,
} from '../services/report.service'

export const getProfitLossController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    requirePermission(req, 'view_reports')
    const tenantId = req.user?.tenantId as string
    const report = await getProfitLossReport(tenantId)
    res.status(200).json({ status: 'success', data: { report } })
  } catch (error) {
    next(error)
  }
}

export const getCashBankController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    requirePermission(req, 'view_reports')
    const tenantId = req.user?.tenantId as string
    const summary = await getCashBankSummary(tenantId)
    res.status(200).json({ status: 'success', data: { summary } })
  } catch (error) {
    next(error)
  }
}