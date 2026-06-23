import express from 'express'
import { getBankBalanceSummaryController, getCashInHandController, getItemSummaryController, getProfitSummaryController, getPurchaseSummaryController, getRemainingAmountController } from '../controllers/dashboard.controller'
import { authenticateUser } from '../middlewares/auth.middleware'

const router = express.Router()

router.get('/item-summary', authenticateUser, getItemSummaryController)
router.get('/remaining-amount', authenticateUser, getRemainingAmountController)
router.get('/cash-in-hand', authenticateUser, getCashInHandController)
router.get('/profit-summary', authenticateUser, getProfitSummaryController)
router.get('/purchase-summary', authenticateUser, getPurchaseSummaryController)
router.get('/bank-account-balance-summary', authenticateUser, getBankBalanceSummaryController)

export default router
