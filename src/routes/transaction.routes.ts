import { Router } from 'express'
import {
  getTransactions,
  createTransactionController,
  getAccountTransactionsController,
} from '../controllers/transaction.controller'
import { authenticateUser } from '../middlewares/auth.middleware'

const router = Router()

router.get('/getall', authenticateUser, getTransactions)
router.post('/create', authenticateUser, createTransactionController)
router.get('/getall/:accountId', authenticateUser, getAccountTransactionsController)

export default router