import { Router } from 'express'
import {
  getCustomers,
  getCustomer,
  createCustomerController,
  updateCustomerController,
  deleteCustomerController,
} from '../controllers/customer.controller'
import { authenticateUser } from '../middlewares/auth.middleware'

const router = Router()

router.get('/getall', authenticateUser, getCustomers)
router.get('/get/:id', authenticateUser, getCustomer)
router.post('/create', authenticateUser, createCustomerController)
router.put('/update/:id', authenticateUser, updateCustomerController)
router.delete('/delete/:id', authenticateUser, deleteCustomerController)

export default router