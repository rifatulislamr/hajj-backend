import { NextFunction, Request, Response } from 'express'
import { z } from 'zod'
import { requirePermission } from '../services/utils/jwt.utils'
import {
  getAllOrders,
  getOrderById,
  createOrderWithDetails,
  updateOrder,
  cancelOrder,
  createOrderService,
  getOrderServices,
  createTicket,
  getOrderTickets,
  recordOrderPayment,
  getOrderPayments,
  rescheduleOrder,
  recordVendorPayment,
  getVendorPayments,
} from '../services/order.service'

// ========================
// Zod Schemas
// ========================

const orderUpdateSchema = z.object({
  customerId: z.string().uuid().optional(),
  orderType: z
    .enum(['ticket', 'visa', 'reschedule', 'cancellation'])
    .optional(),
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']).optional(),
  totalAmount: z.string().optional(),
  dueAmount: z.string().optional(),
  travelDate: z.string().optional(),
})

// ✅ CHANGE: vendorId optional, country added
const orderServiceItemSchema = z.object({
  vendorId: z.string().uuid().optional(),       // was required — now optional (visa rows have no vendor)
  serviceType: z.string().optional(),
  country: z.string().optional(),               // NEW — for visa rows
  serviceCost: z.string().optional(),
  procurementStatus: z.string().optional(),
})

// ✅ CHANGE: departureDate/arrivalDate accept datetime strings (e.g. "2024-06-15T14:30")
const ticketItemSchema = z.object({
  pnr: z.string().optional(),
  airline: z.string().optional(),
  origin: z.string().optional(),
  destination: z.string().optional(),
  departureDate: z.string().optional(),         // now varchar — "2024-06-15T14:30" works fine
  arrivalDate: z.string().optional(),
  seatClass: z.string().optional(),
  ticketStatus: z.string().optional(),
})

// ✅ CHANGE: orderType optional (one order can mix visa + ticket services)
const createOrderSchema = z.object({
  customerId: z.string().uuid('Customer is required'),
  orderType: z
    .enum(['ticket', 'visa', 'reschedule', 'cancellation'])
    .optional(),                                // was required — now optional
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']).optional(),
  totalAmount: z.string().optional(),
  dueAmount: z.string().optional(),
  travelDate: z.string().optional(),
  services: z.array(orderServiceItemSchema).optional().default([]),
  tickets: z.array(ticketItemSchema).optional().default([]),
})

const orderServiceSchema = z.object({
  orderId: z.string().uuid(),
  vendorId: z.string().uuid().optional(),       // optional
  serviceType: z.string().optional(),
  country: z.string().optional(),               // NEW
  serviceCost: z.string().optional(),
  procurementStatus: z.string().optional(),
})

const ticketSchema = z.object({
  orderId: z.string().uuid(),
  pnr: z.string().optional(),
  airline: z.string().optional(),
  origin: z.string().optional(),
  destination: z.string().optional(),
  departureDate: z.string().optional(),
  arrivalDate: z.string().optional(),
  seatClass: z.string().optional(),
  ticketStatus: z.string().optional(),
})

const orderPaymentSchema = z.object({
  accountId: z.string().uuid('Account is required'),
  amount: z.string().min(1, 'Amount is required'),
  transactionDate: z.string().optional(),
  category: z.string().optional(),
})

const vendorPaymentSchema = z.object({
  vendorId: z.string().uuid('Vendor is required'),
  accountId: z.string().uuid('Account is required'),
  amount: z.string().min(1, 'Amount is required'),
  transactionDate: z.string().optional(),
  category: z.string().optional(),
})

const rescheduleSchema = z.object({
  newTravelDate: z.string().min(1, 'Travel date is required'),
  rescheduleFee: z.string().optional(),
  note: z.string().optional(),
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

    // ✅ FIX: read filters from req.query (was missing before)
    const filters = {
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
      status: (req.query.status as string) || undefined,
      orderType: (req.query.orderType as string) || undefined,
      customerId: (req.query.customerId as string) || undefined,
      fromDate: (req.query.fromDate as string) || undefined,
      toDate: (req.query.toDate as string) || undefined,
    }

    const orders = await getAllOrders(tenantId, filters)
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
      res.status(404).json({ status: 'fail', message: 'Order not found' })
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
    const tenantId = req.user?.tenantId as string
    const data = createOrderSchema.parse(req.body)
    const { services, tickets, ...orderFields } = data

    const result = await createOrderWithDetails({
      ...orderFields,
      tenantId,
      services,
      tickets,
    })

    res.status(201).json({ status: 'success', data: result })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ status: 'error', message: 'Invalid input', errors: error.errors })
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
    const data = orderUpdateSchema.parse(req.body)
    const order = await updateOrder(id, data)
    if (!order) {
      res.status(404).json({ status: 'fail', message: 'Order not found' })
      return
    }
    res.status(200).json({ status: 'success', data: { order } })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ status: 'error', message: 'Invalid input', errors: error.errors })
    } else {
      next(error)
    }
  }
}

export const cancelOrderController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    requirePermission(req, 'update_order')
    const { id } = req.params
    const order = await cancelOrder(id)
    if (!order) {
      res.status(404).json({ status: 'fail', message: 'Order not found' })
      return
    }
    res.status(200).json({ status: 'success', message: 'Order cancelled successfully', data: { order } })
  } catch (error) {
    next(error)
  }
}

export const rescheduleOrderController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    requirePermission(req, 'update_order')
    const { id } = req.params
    const data = rescheduleSchema.parse(req.body)
    const order = await rescheduleOrder(id, data)
    res.status(200).json({ status: 'success', data: { order } })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ status: 'error', message: 'Invalid input', errors: error.errors })
    } else if (error instanceof Error && error.message === 'Order not found') {
      res.status(404).json({ status: 'fail', message: 'Order not found' })
    } else {
      next(error)
    }
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
      res.status(400).json({ status: 'error', message: 'Invalid input', errors: error.errors })
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
      res.status(400).json({ status: 'error', message: 'Invalid input', errors: error.errors })
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

// ========================
// Customer Payment Controllers
// ========================

export const createOrderPaymentController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    requirePermission(req, 'create_order')
    const tenantId = req.user?.tenantId as string
    const { orderId } = req.params
    const data = orderPaymentSchema.parse(req.body)

    const result = await recordOrderPayment({ orderId, tenantId, ...data })
    res.status(201).json({ status: 'success', data: result })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ status: 'error', message: 'Invalid input', errors: error.errors })
    } else if (error instanceof Error && error.message === 'Order not found') {
      res.status(404).json({ status: 'fail', message: 'Order not found' })
    } else {
      next(error)
    }
  }
}

export const getOrderPaymentsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    requirePermission(req, 'view_orders')
    const { orderId } = req.params
    const payments = await getOrderPayments(orderId)
    res.status(200).json(payments)
  } catch (error) {
    next(error)
  }
}

// ========================
// Vendor Payment Controllers
// ========================

export const createVendorPaymentController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    requirePermission(req, 'create_order')
    const tenantId = req.user?.tenantId as string
    const { orderId } = req.params
    const data = vendorPaymentSchema.parse(req.body)
    const result = await recordVendorPayment({ orderId, tenantId, ...data })
    res.status(201).json({ status: 'success', data: result })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ status: 'error', message: 'Invalid input', errors: error.errors })
    } else if (error instanceof Error && error.message === 'Order not found') {
      res.status(404).json({ status: 'fail', message: 'Order not found' })
    } else {
      next(error)
    }
  }
}

export const getVendorPaymentsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    requirePermission(req, 'view_orders')
    const { orderId } = req.params
    const payments = await getVendorPayments(orderId)
    res.status(200).json(payments)
  } catch (error) {
    next(error)
  }
}



// import { NextFunction, Request, Response } from 'express'
// import { z } from 'zod'
// import { requirePermission } from '../services/utils/jwt.utils'
// import {
//   getAllOrders,
//   getOrderById,
//   createOrderWithDetails,
//   updateOrder,
//   cancelOrder,
//   createOrderService,
//   getOrderServices,
//   createTicket,
//   getOrderTickets,
//   recordOrderPayment,
//   getOrderPayments,
//   rescheduleOrder,
//   recordVendorPayment,
//   getVendorPayments,
// } from '../services/order.service'

// // ========================
// // Zod Schemas
// // ========================

// const orderUpdateSchema = z.object({
//   customerId: z.string().uuid().optional(),
//   orderType: z
//     .enum(['ticket', 'visa', 'reschedule', 'cancellation'])
//     .optional(),
//   status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']).optional(),
//   totalAmount: z.string().optional(),
//   dueAmount: z.string().optional(),
//   travelDate: z.string().optional(),
// })

// // ✅ CHANGE: vendorId optional, country added
// const orderServiceItemSchema = z.object({
//   vendorId: z.string().uuid().optional(),       // was required — now optional (visa rows have no vendor)
//   serviceType: z.string().optional(),
//   country: z.string().optional(),               // NEW — for visa rows
//   serviceCost: z.string().optional(),
//   procurementStatus: z.string().optional(),
// })

// // ✅ CHANGE: departureDate/arrivalDate accept datetime strings (e.g. "2024-06-15T14:30")
// const ticketItemSchema = z.object({
//   pnr: z.string().optional(),
//   airline: z.string().optional(),
//   origin: z.string().optional(),
//   destination: z.string().optional(),
//   departureDate: z.string().optional(),         // now varchar — "2024-06-15T14:30" works fine
//   arrivalDate: z.string().optional(),
//   seatClass: z.string().optional(),
//   ticketStatus: z.string().optional(),
// })

// // ✅ CHANGE: orderType optional (one order can mix visa + ticket services)
// const createOrderSchema = z.object({
//   customerId: z.string().uuid('Customer is required'),
//   orderType: z
//     .enum(['ticket', 'visa', 'reschedule', 'cancellation'])
//     .optional(),                                // was required — now optional
//   status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']).optional(),
//   totalAmount: z.string().optional(),
//   dueAmount: z.string().optional(),
//   travelDate: z.string().optional(),
//   services: z.array(orderServiceItemSchema).optional().default([]),
//   tickets: z.array(ticketItemSchema).optional().default([]),
// })

// const orderServiceSchema = z.object({
//   orderId: z.string().uuid(),
//   vendorId: z.string().uuid().optional(),       // optional
//   serviceType: z.string().optional(),
//   country: z.string().optional(),               // NEW
//   serviceCost: z.string().optional(),
//   procurementStatus: z.string().optional(),
// })

// const ticketSchema = z.object({
//   orderId: z.string().uuid(),
//   pnr: z.string().optional(),
//   airline: z.string().optional(),
//   origin: z.string().optional(),
//   destination: z.string().optional(),
//   departureDate: z.string().optional(),
//   arrivalDate: z.string().optional(),
//   seatClass: z.string().optional(),
//   ticketStatus: z.string().optional(),
// })

// const orderPaymentSchema = z.object({
//   accountId: z.string().uuid('Account is required'),
//   amount: z.string().min(1, 'Amount is required'),
//   transactionDate: z.string().optional(),
//   category: z.string().optional(),
// })

// const vendorPaymentSchema = z.object({
//   vendorId: z.string().uuid('Vendor is required'),
//   accountId: z.string().uuid('Account is required'),
//   amount: z.string().min(1, 'Amount is required'),
//   transactionDate: z.string().optional(),
//   category: z.string().optional(),
// })

// const rescheduleSchema = z.object({
//   newTravelDate: z.string().min(1, 'Travel date is required'),
//   rescheduleFee: z.string().optional(),
//   note: z.string().optional(),
// })

// // ========================
// // Order Controllers
// // ========================

// export const getOrders = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     requirePermission(req, 'view_orders')
//     const tenantId = req.user?.tenantId as string

//     // ✅ FIX: read filters from req.query (was missing before)
//     const filters = {
//       page: req.query.page ? Number(req.query.page) : 1,
//       limit: req.query.limit ? Number(req.query.limit) : 20,
//       status: (req.query.status as string) || undefined,
//       orderType: (req.query.orderType as string) || undefined,
//       customerId: (req.query.customerId as string) || undefined,
//       fromDate: (req.query.fromDate as string) || undefined,
//       toDate: (req.query.toDate as string) || undefined,
//     }

//     const orders = await getAllOrders(tenantId, filters)
//     res.status(200).json(orders)
//   } catch (error) {
//     next(error)
//   }
// }

// export const getOrder = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     requirePermission(req, 'view_orders')
//     const { id } = req.params
//     const order = await getOrderById(id)
//     if (!order) {
//       res.status(404).json({ status: 'fail', message: 'Order not found' })
//       return
//     }
//     res.status(200).json(order)
//   } catch (error) {
//     next(error)
//   }
// }

// export const createOrderController = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     requirePermission(req, 'create_order')
//     const tenantId = req.user?.tenantId as string
//     const data = createOrderSchema.parse(req.body)
//     const { services, tickets, ...orderFields } = data

//     const result = await createOrderWithDetails({
//       ...orderFields,
//       tenantId,
//       services,
//       tickets,
//     })

//     res.status(201).json({ status: 'success', data: result })
//   } catch (error) {
//     if (error instanceof z.ZodError) {
//       res.status(400).json({ status: 'error', message: 'Invalid input', errors: error.errors })
//     } else {
//       next(error)
//     }
//   }
// }

// export const updateOrderController = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     requirePermission(req, 'update_order')
//     const { id } = req.params
//     const data = orderUpdateSchema.parse(req.body)
//     const order = await updateOrder(id, data)
//     if (!order) {
//       res.status(404).json({ status: 'fail', message: 'Order not found' })
//       return
//     }
//     res.status(200).json({ status: 'success', data: { order } })
//   } catch (error) {
//     if (error instanceof z.ZodError) {
//       res.status(400).json({ status: 'error', message: 'Invalid input', errors: error.errors })
//     } else {
//       next(error)
//     }
//   }
// }

// export const cancelOrderController = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     requirePermission(req, 'update_order')
//     const { id } = req.params
//     const order = await cancelOrder(id)
//     if (!order) {
//       res.status(404).json({ status: 'fail', message: 'Order not found' })
//       return
//     }
//     res.status(200).json({ status: 'success', message: 'Order cancelled successfully', data: { order } })
//   } catch (error) {
//     next(error)
//   }
// }

// export const rescheduleOrderController = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     requirePermission(req, 'update_order')
//     const { id } = req.params
//     const data = rescheduleSchema.parse(req.body)
//     const order = await rescheduleOrder(id, data)
//     res.status(200).json({ status: 'success', data: { order } })
//   } catch (error) {
//     if (error instanceof z.ZodError) {
//       res.status(400).json({ status: 'error', message: 'Invalid input', errors: error.errors })
//     } else if (error instanceof Error && error.message === 'Order not found') {
//       res.status(404).json({ status: 'fail', message: 'Order not found' })
//     } else {
//       next(error)
//     }
//   }
// }

// // ========================
// // Order Service Controllers
// // ========================

// export const createOrderServiceController = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     requirePermission(req, 'create_order')
//     const data = orderServiceSchema.parse(req.body)
//     const service = await createOrderService(data)
//     res.status(201).json(service)
//   } catch (error) {
//     if (error instanceof z.ZodError) {
//       res.status(400).json({ status: 'error', message: 'Invalid input', errors: error.errors })
//     } else {
//       next(error)
//     }
//   }
// }

// export const getOrderServicesController = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     requirePermission(req, 'view_orders')
//     const { orderId } = req.params
//     const services = await getOrderServices(orderId)
//     res.status(200).json(services)
//   } catch (error) {
//     next(error)
//   }
// }

// // ========================
// // Ticket Controllers
// // ========================

// export const createTicketController = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     requirePermission(req, 'create_order')
//     const data = ticketSchema.parse(req.body)
//     const ticket = await createTicket(data)
//     res.status(201).json(ticket)
//   } catch (error) {
//     if (error instanceof z.ZodError) {
//       res.status(400).json({ status: 'error', message: 'Invalid input', errors: error.errors })
//     } else {
//       next(error)
//     }
//   }
// }

// export const getOrderTicketsController = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     requirePermission(req, 'view_orders')
//     const { orderId } = req.params
//     const tickets = await getOrderTickets(orderId)
//     res.status(200).json(tickets)
//   } catch (error) {
//     next(error)
//   }
// }

// // ========================
// // Customer Payment Controllers
// // ========================

// export const createOrderPaymentController = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     requirePermission(req, 'create_order')
//     const tenantId = req.user?.tenantId as string
//     const { orderId } = req.params
//     const data = orderPaymentSchema.parse(req.body)

//     const result = await recordOrderPayment({ orderId, tenantId, ...data })
//     res.status(201).json({ status: 'success', data: result })
//   } catch (error) {
//     if (error instanceof z.ZodError) {
//       res.status(400).json({ status: 'error', message: 'Invalid input', errors: error.errors })
//     } else if (error instanceof Error && error.message === 'Order not found') {
//       res.status(404).json({ status: 'fail', message: 'Order not found' })
//     } else {
//       next(error)
//     }
//   }
// }

// export const getOrderPaymentsController = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     requirePermission(req, 'view_orders')
//     const { orderId } = req.params
//     const payments = await getOrderPayments(orderId)
//     res.status(200).json(payments)
//   } catch (error) {
//     next(error)
//   }
// }

// // ========================
// // Vendor Payment Controllers
// // ========================

// export const createVendorPaymentController = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     requirePermission(req, 'create_order')
//     const tenantId = req.user?.tenantId as string
//     const { orderId } = req.params
//     const data = vendorPaymentSchema.parse(req.body)
//     const result = await recordVendorPayment({ orderId, tenantId, ...data })
//     res.status(201).json({ status: 'success', data: result })
//   } catch (error) {
//     if (error instanceof z.ZodError) {
//       res.status(400).json({ status: 'error', message: 'Invalid input', errors: error.errors })
//     } else if (error instanceof Error && error.message === 'Order not found') {
//       res.status(404).json({ status: 'fail', message: 'Order not found' })
//     } else {
//       next(error)
//     }
//   }
// }

// export const getVendorPaymentsController = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     requirePermission(req, 'view_orders')
//     const { orderId } = req.params
//     const payments = await getVendorPayments(orderId)
//     res.status(200).json(payments)
//   } catch (error) {
//     next(error)
//   }
// }



