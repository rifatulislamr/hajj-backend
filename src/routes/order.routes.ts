import { Router } from 'express'
import {
  getOrders,
  getOrder,
  createOrderController,
  updateOrderController,
  deleteOrderController,
  createOrderServiceController,
  getOrderServicesController,
  createTicketController,
  getOrderTicketsController,
} from '../controllers/order.controller'
import { authenticateUser } from '../middlewares/auth.middleware'

const router = Router()

// Order routes
router.get('/getall', authenticateUser, getOrders)
router.get('/get/:id', authenticateUser, getOrder)
router.post('/create', authenticateUser, createOrderController)
router.put('/update/:id', authenticateUser, updateOrderController)
router.delete('/delete/:id', authenticateUser, deleteOrderController)

// Order Service routes
router.post('/service/create', authenticateUser, createOrderServiceController)
router.get('/service/getall/:orderId', authenticateUser, getOrderServicesController)

// Ticket routes
router.post('/ticket/create', authenticateUser, createTicketController)
router.get('/ticket/getall/:orderId', authenticateUser, getOrderTicketsController)

export default router