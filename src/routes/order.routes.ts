import { Router } from 'express'
import {
  getOrders,
  getOrder,
  createOrderController,
  updateOrderController,
  cancelOrderController,
  createOrderServiceController,
  getOrderServicesController,
  createTicketController,
  getOrderTicketsController,
  createOrderPaymentController,
  getOrderPaymentsController,
  // ADD THESE TWO:
  createVendorPaymentController,
  getVendorPaymentsController,
  rescheduleOrderController,
} from '../controllers/order.controller'
import { authenticateUser } from '../middlewares/auth.middleware'

const router = Router()

// Order routes
router.get('/getall', authenticateUser, getOrders)
router.get('/get/:id', authenticateUser, getOrder)
router.post('/create', authenticateUser, createOrderController)
router.put('/update/:id', authenticateUser, updateOrderController)
router.put('/cancel/:id', authenticateUser, cancelOrderController)

// ✅ Reschedule route (was missing)
router.put('/reschedule/:id', authenticateUser, rescheduleOrderController)

// Order Service routes
router.post('/service/create', authenticateUser, createOrderServiceController)
router.get('/service/getall/:orderId', authenticateUser, getOrderServicesController)

// Ticket routes
router.post('/ticket/create', authenticateUser, createTicketController)
router.get('/ticket/getall/:orderId', authenticateUser, getOrderTicketsController)

// Customer Payment routes
router.post('/:orderId/payments', authenticateUser, createOrderPaymentController)
router.get('/:orderId/payments', authenticateUser, getOrderPaymentsController)

// ✅ Vendor Payment routes (were missing)
router.post('/:orderId/vendor-payments', authenticateUser, createVendorPaymentController)
router.get('/:orderId/vendor-payments', authenticateUser, getVendorPaymentsController)

export default router