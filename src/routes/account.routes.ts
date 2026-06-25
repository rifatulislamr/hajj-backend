import { Router } from 'express'
import {
  getAccounts,
  getAccount,
  createAccountController,
} from '../controllers/account.controller'
import { authenticateUser } from '../middlewares/auth.middleware'

const router = Router()

router.get('/getall', authenticateUser, getAccounts)
router.get('/get/:id', authenticateUser, getAccount)
router.post('/create', authenticateUser, createAccountController)

export default router