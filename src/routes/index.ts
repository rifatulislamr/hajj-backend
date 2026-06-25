import { Router } from "express";
import authRoutes from "./auth.routes";
import customerRoutes from "./customer.routes";
import vendorRoutes from "./vendor.routes";
import orderRoutes from "./order.routes";
import packageRoutes from "./package.routes";
import accountRoutes from "./account.routes";
import transactionRoutes from "./transaction.routes";
import expenseRoutes from "./expense.routes";
import reportRoutes from "./report.routes"
const router=Router()

router.use('/auth',authRoutes)
router.use('/customers', customerRoutes) 
router.use('/vendors', vendorRoutes)  
router.use('/orders', orderRoutes)  
router.use('/packages', packageRoutes)
router.use('/accounts', accountRoutes)
router.use('/transactions', transactionRoutes)
router.use('/expenses', expenseRoutes)
router.use('/reports', reportRoutes)

export default router;