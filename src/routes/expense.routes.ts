import { Router } from 'express'
import {
  getExpenses,
  createExpenseController,
} from '../controllers/expense.controller'
import { authenticateUser } from '../middlewares/auth.middleware'

const router = Router()

router.get('/getall', authenticateUser, getExpenses)
router.post('/create', authenticateUser, createExpenseController)

export default router