import { NextFunction, Request, Response } from 'express'
import { z } from 'zod'
import { requirePermission } from '../services/utils/jwt.utils'
import {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrder,
  deleteOrder,
  createOrderService,
  getOrderServices,
  createTicket,
  getOrderTickets,
} from '../services/order.service'

const orderSchema = z.object({
  tenantId: z.string().uuid(),
  customerId: z.string().uuid(),
  orderType: z.enum(['ticket', 'visa', 'reschedule', 'cancellation']),
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']).optional(),
  totalAmount: z.string().optional(),
  dueAmount: z.string().optional(),
  travelDate: z.string().optional(),
})

const orderServiceSchema = z.object({
  orderId: z.string().uuid(),
  vendorId: z.string().uuid(),
  serviceType: z.string().optional(),
  serviceCost: z.string().optional(),
  procurementStatus: z.string().optional(),
})

const ticketSchema = z.object({
  orderId: z.string().uuid(),
  pnr: z.string().optional(),
  airline: z.string().optional(),
  departureDate: z.string().optional(),
  arrivalDate: z.string().optional(),
  seatClass: z.string().optional(),
  ticketStatus: z.string().optional(),
})

// ========================
// Order Controllers
// ========================
export const getOrders = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    requirePermission(req, 'view_orders')
    const tenantId = req.user?.tenantId as string
    const orders = await getAllOrders(tenantId)
    res.status(200).json(orders)
  } catch (error) {
    next(error)
  }
}

export const getOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    requirePermission(req, 'view_orders')
    const { id } = req.params
    const order = await getOrderById(id)
    if (!order) {
      res.status(404).json({
        status: 'fail',
        message: 'Order not found',
      })
      return
    }
    res.status(200).json(order)
  } catch (error) {
    next(error)
  }
}

export const createOrderController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    requirePermission(req, 'create_order')
    const data = orderSchema.parse(req.body)
    const order = await createOrder(data)
    res.status(201).json({
      status: 'success',
      data: { order },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid input',
        errors: error.errors,
      })
    } else {
      next(error)
    }
  }
}

export const updateOrderController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    requirePermission(req, 'update_order')
    const { id } = req.params
    const data = orderSchema.partial().parse(req.body)
    const order = await updateOrder(id, data)
    if (!order) {
      res.status(404).json({
        status: 'fail',
        message: 'Order not found',
      })
      return
    }
    res.status(200).json({
      status: 'success',
      data: { order },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid input',
        errors: error.errors,
      })
    } else {
      next(error)
    }
  }
}

export const deleteOrderController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    requirePermission(req, 'delete_order')
    const { id } = req.params
    const order = await deleteOrder(id)
    if (!order) {
      res.status(404).json({
        status: 'fail',
        message: 'Order not found',
      })
      return
    }
    res.status(200).json({
      status: 'success',
      message: 'Order deleted successfully',
    })
  } catch (error) {
    next(error)
  }
}

// ========================
// Order Service Controllers
// ========================
export const createOrderServiceController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    requirePermission(req, 'create_order')
    const data = orderServiceSchema.parse(req.body)
    const service = await createOrderService(data)
    res.status(201).json(service)
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid input',
        errors: error.errors,
      })
    } else {
      next(error)
    }
  }
}

export const getOrderServicesController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    requirePermission(req, 'view_orders')
    const { orderId } = req.params
    const services = await getOrderServices(orderId)
    res.status(200).json(services)
  } catch (error) {
    next(error)
  }
}

// ========================
// Ticket Controllers
// ========================
export const createTicketController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    requirePermission(req, 'create_order')
    const data = ticketSchema.parse(req.body)
    const ticket = await createTicket(data)
    res.status(201).json(ticket)
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid input',
        errors: error.errors,
      })
    } else {
      next(error)
    }
  }
}

export const getOrderTicketsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    requirePermission(req, 'view_orders')
    const { orderId } = req.params
    const tickets = await getOrderTickets(orderId)
    res.status(200).json(tickets)
  } catch (error) {
    next(error)
  }
}   