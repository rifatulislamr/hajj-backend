import { Router } from 'express'
import {
  getProfitLossController,
  getCashBankController,
} from '../controllers/report.controller'
import { authenticateUser } from '../middlewares/auth.middleware'

const router = Router()

router.get('/profit-loss', authenticateUser, getProfitLossController)
router.get('/cash-bank', authenticateUser, getCashBankController)

export default router