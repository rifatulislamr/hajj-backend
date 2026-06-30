import { eq, and, gte, lte, SQL } from 'drizzle-orm'
import { db } from '../config/database'
import {
  orderModel,
  orderServiceModel,
  ticketModel,
  transactionModel,
  accountModel,
  customerModel,
  NewOrder,
  NewOrderService,
  NewTicket,
  NewTransaction,
} from '../schemas/schema'

// ========================
// Types
// ========================

// ✅ CHANGE: vendorId optional, country added
type OrderServiceInput = {
  vendorId?: string | null
  serviceType?: string
  country?: string       // NEW — for visa rows
  serviceCost?: string | null
  procurementStatus?: string
}

type TicketInput = Omit<NewTicket, 'orderId'>

export type CreateOrderWithDetailsInput = NewOrder & {
  services?: OrderServiceInput[]
  tickets?: TicketInput[]
}

export type RecordOrderPaymentInput = {
  orderId: string
  tenantId: string
  accountId: string
  amount: string
  transactionDate?: string
  category?: string
}

export type RecordVendorPaymentInput = {
  orderId: string
  tenantId: string
  vendorId: string
  accountId: string
  amount: string
  transactionDate?: string
  category?: string
}

export type RescheduleOrderInput = {
  newTravelDate: string
  rescheduleFee?: string
  note?: string
}

export type OrderFilters = {
  page?: number
  limit?: number
  status?: string
  customerId?: string
  orderType?: string
  fromDate?: string
  toDate?: string
}

// ========================
// Order CRUD — pagination + filter
// ========================

export const getAllOrders = async (tenantId: string, filters: OrderFilters = {}) => {
  const page = filters.page && filters.page > 0 ? filters.page : 1
  const limit = filters.limit && filters.limit > 0 ? filters.limit : 20
  const offset = (page - 1) * limit

  const conditions: SQL[] = [eq(orderModel.tenantId, tenantId)]

  if (filters.status) {
    conditions.push(eq(orderModel.status, filters.status as any))
  }
  if (filters.customerId) {
    conditions.push(eq(orderModel.customerId, filters.customerId))
  }
  if (filters.orderType) {
    conditions.push(eq(orderModel.orderType, filters.orderType as any))
  }
  if (filters.fromDate) {
    conditions.push(gte(orderModel.travelDate, filters.fromDate))
  }
  if (filters.toDate) {
    conditions.push(lte(orderModel.travelDate, filters.toDate))
  }

  const whereClause = and(...conditions)

  const orders = await db
    .select()
    .from(orderModel)
    .where(whereClause)
    .limit(limit)
    .offset(offset)

  // const [{ count }] = await db
  //   .select({ count: db.$count(orderModel, whereClause) })
  //   .from(orderModel)

  const count = await db.$count(orderModel, whereClause)
  return {
    data: orders,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    },
  }
}

export const getOrderById = async (id: string) => {
  const [order] = await db
    .select()
    .from(orderModel)
    .where(eq(orderModel.id, id))
  return order
}

// ========================
// Transactional Create: order + services[] + tickets[]
// ========================

export const createOrderWithDetails = async (data: CreateOrderWithDetailsInput) => {
  const { services, tickets, ...orderData } = data

  const cleanOrderData = {
    ...orderData,
    totalAmount: orderData.totalAmount || null,
    dueAmount: orderData.dueAmount || null,
    travelDate: orderData.travelDate || null,
    // ✅ orderType now optional — null is fine
    orderType: orderData.orderType || null,
  }

  return await db.transaction(async (tx) => {
    const [order] = await tx
      .insert(orderModel)
      .values(cleanOrderData)
      .returning()

    let createdServices: typeof orderServiceModel.$inferSelect[] = []
    if (services && services.length > 0) {
      createdServices = await tx
        .insert(orderServiceModel)
        .values(
          services.map((s) => ({
            orderId: order.id,
            // ✅ vendorId optional — null if not provided
            vendorId: s.vendorId || null,
            serviceType: s.serviceType || null,
            // ✅ NEW: country field
            country: s.country || null,
            serviceCost: s.serviceCost || null,
            procurementStatus: s.procurementStatus || 'pending',
          }))
        )
        .returning()
    }

    let createdTickets: typeof ticketModel.$inferSelect[] = []
    if (tickets && tickets.length > 0) {
      createdTickets = await tx
        .insert(ticketModel)
        .values(tickets.map((t) => ({ ...t, orderId: order.id })))
        .returning()
    }

    return { order, services: createdServices, tickets: createdTickets }
  })
}

export const updateOrder = async (id: string, data: Partial<NewOrder>) => {
  const [order] = await db
    .update(orderModel)
    .set(data)
    .where(eq(orderModel.id, id))
    .returning()
  return order
}

// ========================
// Cancel (status → cancelled)
// ========================

export const cancelOrder = async (id: string) => {
  const [order] = await db
    .update(orderModel)
    .set({ status: 'cancelled' })
    .where(eq(orderModel.id, id))
    .returning()
  return order
}

// ========================
// Reschedule
// ========================

export const rescheduleOrder = async (orderId: string, data: RescheduleOrderInput) => {
  return await db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(orderModel)
      .where(eq(orderModel.id, orderId))

    if (!order) throw new Error('Order not found')

    const fee = parseFloat(data.rescheduleFee ?? '0')
    const newTotal = (parseFloat(order.totalAmount ?? '0') + fee).toFixed(2)
    const newDue = (parseFloat(order.dueAmount ?? '0') + fee).toFixed(2)

    const [updatedOrder] = await tx
      .update(orderModel)
      .set({
        travelDate: data.newTravelDate,
        totalAmount: fee > 0 ? newTotal : order.totalAmount,
        dueAmount: fee > 0 ? newDue : order.dueAmount,
        orderType: 'reschedule',
        status: 'confirmed',
      })
      .where(eq(orderModel.id, orderId))
      .returning()

    return updatedOrder
  })
}

// ========================
// Order Service
// ========================

export const createOrderService = async (data: {
  orderId: string
  vendorId?: string | null
  serviceType?: string
  country?: string
  serviceCost?: string | null
  procurementStatus?: string
}) => {
  const [service] = await db
    .insert(orderServiceModel)
    .values({
      orderId: data.orderId,
      vendorId: data.vendorId || null,
      serviceType: data.serviceType || null,
      country: data.country || null,
      serviceCost: data.serviceCost || null,
      procurementStatus: data.procurementStatus || 'pending',
    })
    .returning()
  return service
}

export const getOrderServices = async (orderId: string) => {
  return await db
    .select()
    .from(orderServiceModel)
    .where(eq(orderServiceModel.orderId, orderId))
}

// ========================
// Order Ticket
// ========================

export const createTicket = async (data: NewTicket) => {
  const [ticket] = await db
    .insert(ticketModel)
    .values(data)
    .returning()
  return ticket
}

export const getOrderTickets = async (orderId: string) => {
  return await db
    .select()
    .from(ticketModel)
    .where(eq(ticketModel.orderId, orderId))
}

export const rescheduleTicket = async (
  ticketId: string,
  newDepartureDate: string,
  newArrivalDate?: string
) => {
  const [ticket] = await db
    .update(ticketModel)
    .set({
      departureDate: newDepartureDate,
      arrivalDate: newArrivalDate,
      ticketStatus: 'rescheduled',
    })
    .where(eq(ticketModel.id, ticketId))
    .returning()
  return ticket
}

// ========================
// Customer Payment (credit)
// ========================

export const recordOrderPayment = async (data: RecordOrderPaymentInput) => {
  return await db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(orderModel)
      .where(eq(orderModel.id, data.orderId))

    if (!order) throw new Error('Order not found')

    const transactionData: NewTransaction = {
      tenantId: data.tenantId,
      accountId: data.accountId,
      referenceType: 'order',
      referenceId: data.orderId,
      amount: data.amount,
      transactionType: 'credit',
      category: data.category ?? 'order_payment',
      transactionDate: data.transactionDate ?? new Date().toISOString().slice(0, 10),
      status: 'completed',
    }

    const [transaction] = await tx
      .insert(transactionModel)
      .values(transactionData)
      .returning()

    const currentDue = parseFloat(order.dueAmount ?? '0')
    const paidAmount = parseFloat(data.amount)
    const newDue = Math.max(currentDue - paidAmount, 0).toFixed(2)

    const [updatedOrder] = await tx
      .update(orderModel)
      .set({ dueAmount: newDue })
      .where(eq(orderModel.id, data.orderId))
      .returning()

    const [account] = await tx
      .select()
      .from(accountModel)
      .where(eq(accountModel.id, data.accountId))

    if (account) {
      const newBalance = (parseFloat(account.balance ?? '0') + paidAmount).toFixed(2)
      await tx
        .update(accountModel)
        .set({ balance: newBalance })
        .where(eq(accountModel.id, data.accountId))
    }

    return { transaction, order: updatedOrder }
  })
}

export const getOrderPayments = async (orderId: string) => {
  return await db
    .select()
    .from(transactionModel)
    .where(
      and(
        eq(transactionModel.referenceType, 'order'),
        eq(transactionModel.referenceId, orderId),
        eq(transactionModel.transactionType, 'credit')
      )
    )
}

// ========================
// Vendor Payment (debit)
// ========================

export const recordVendorPayment = async (data: RecordVendorPaymentInput) => {
  return await db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(orderModel)
      .where(eq(orderModel.id, data.orderId))

    if (!order) throw new Error('Order not found')

    const transactionData: NewTransaction = {
      tenantId: data.tenantId,
      accountId: data.accountId,
      referenceType: 'order',
      referenceId: data.orderId,
      amount: data.amount,
      transactionType: 'debit',
      category: data.category ?? 'vendor_payment',
      transactionDate: data.transactionDate ?? new Date().toISOString().slice(0, 10),
      status: 'completed',
    }

    const [transaction] = await tx
      .insert(transactionModel)
      .values(transactionData)
      .returning()

    const [account] = await tx
      .select()
      .from(accountModel)
      .where(eq(accountModel.id, data.accountId))

    if (account) {
      const paidAmount = parseFloat(data.amount)
      const newBalance = (parseFloat(account.balance ?? '0') - paidAmount).toFixed(2)
      await tx
        .update(accountModel)
        .set({ balance: newBalance })
        .where(eq(accountModel.id, data.accountId))
    }

    await tx
      .update(orderServiceModel)
      .set({ procurementStatus: 'completed' })
      .where(
        and(
          eq(orderServiceModel.orderId, data.orderId),
          eq(orderServiceModel.vendorId, data.vendorId)
        )
      )

    return { transaction }
  })
}

export const getVendorPayments = async (orderId: string) => {
  return await db
    .select()
    .from(transactionModel)
    .where(
      and(
        eq(transactionModel.referenceType, 'order'),
        eq(transactionModel.referenceId, orderId),
        eq(transactionModel.transactionType, 'debit')
      )
    )
}



// import { eq, and, like, gte, lte, SQL } from 'drizzle-orm'
// import { db } from '../config/database'
// import {
//   orderModel,
//   orderServiceModel,
//   ticketModel,
//   transactionModel,
//   accountModel,
//   customerModel,
//   NewOrder,
//   NewOrderService,
//   NewTicket,
//   NewTransaction,
// } from '../schemas/schema'

// // ========================
// // Types
// // ========================
// type OrderServiceInput = Omit<NewOrderService, 'orderId'>
// type TicketInput = Omit<NewTicket, 'orderId'>

// export type CreateOrderWithDetailsInput = NewOrder & {
//   services?: OrderServiceInput[]
//   tickets?: TicketInput[]
// }

// export type RecordOrderPaymentInput = {
//   orderId: string
//   tenantId: string
//   accountId: string
//   amount: string
//   transactionDate?: string
//   category?: string
// }

// export type RecordVendorPaymentInput = {
//   orderId: string
//   tenantId: string
//   vendorId: string
//   accountId: string
//   amount: string
//   transactionDate?: string
//   category?: string
// }

// export type RescheduleOrderInput = {
//   newTravelDate: string
//   rescheduleFee?: string
//   note?: string
// }

// export type OrderFilters = {
//   page?: number
//   limit?: number
//   status?: string
//   customerId?: string
//   orderType?: string
//   fromDate?: string
//   toDate?: string
//   search?: string
// }

// // ========================
// // Order CRUD — pagination + filter
// // ========================
// export const getAllOrders = async (tenantId: string, filters: OrderFilters = {}) => {
//   const page = filters.page && filters.page > 0 ? filters.page : 1
//   const limit = filters.limit && filters.limit > 0 ? filters.limit : 20
//   const offset = (page - 1) * limit

//   const conditions: SQL[] = [eq(orderModel.tenantId, tenantId)]

//   if (filters.status) {
//     conditions.push(eq(orderModel.status, filters.status as any))
//   }
//   if (filters.customerId) {
//     conditions.push(eq(orderModel.customerId, filters.customerId))
//   }
//   if (filters.orderType) {
//     conditions.push(eq(orderModel.orderType, filters.orderType as any))
//   }
//   if (filters.fromDate) {
//     conditions.push(gte(orderModel.travelDate, filters.fromDate))
//   }
//   if (filters.toDate) {
//     conditions.push(lte(orderModel.travelDate, filters.toDate))
//   }

//   const whereClause = and(...conditions)

//   const orders = await db
//     .select()
//     .from(orderModel)
//     .where(whereClause)
//     .limit(limit)
//     .offset(offset)

//   const [{ count }] = await db
//     .select({ count: db.$count(orderModel, whereClause) })
//     .from(orderModel)

//   return {
//     data: orders,
//     pagination: {
//       page,
//       limit,
//       total: count,
//       totalPages: Math.ceil(count / limit),
//     },
//   }
// }

// export const searchOrders = async (tenantId: string, searchTerm: string) => {
//   return await db
//     .select({
//       order: orderModel,
//       customer: customerModel,
//     })
//     .from(orderModel)
//     .leftJoin(customerModel, eq(orderModel.customerId, customerModel.id))
//     .where(
//       and(
//         eq(orderModel.tenantId, tenantId),
//         like(customerModel.name, `%${searchTerm}%`)
//       )
//     )
// }

// export const getOrderById = async (id: string) => {
//   const [order] = await db
//     .select()
//     .from(orderModel)
//     .where(eq(orderModel.id, id))
//   return order
// }

// // ========================
// // Transactional Create: order + services[] + tickets[] একসাথে
// // ========================
// export const createOrderWithDetails = async (data: CreateOrderWithDetailsInput) => {
//   const { services, tickets, ...orderData } = data

//   // empty string → null (numeric column e empty string dile PostgreSQL error)
//   const cleanOrderData = {
//     ...orderData,
//     totalAmount: orderData.totalAmount || null,
//     dueAmount: orderData.dueAmount || null,
//   }

//   return await db.transaction(async (tx) => {
//     const [order] = await tx
//       .insert(orderModel)
//       .values(cleanOrderData)
//       .returning()

//     let createdServices: typeof orderServiceModel.$inferSelect[] = []
//     if (services && services.length > 0) {
//       createdServices = await tx
//         .insert(orderServiceModel)
//         .values(
//           services.map((s) => ({
//             ...s,
//             orderId: order.id,
//             serviceCost: s.serviceCost || null, // empty string → null
//           }))
//         )
//         .returning()
//     }

//     let createdTickets: typeof ticketModel.$inferSelect[] = []
//     if (tickets && tickets.length > 0) {
//       createdTickets = await tx
//         .insert(ticketModel)
//         .values(tickets.map((t) => ({ ...t, orderId: order.id })))
//         .returning()
//     }

//     return { order, services: createdServices, tickets: createdTickets }
//   })
// }

// export const updateOrder = async (id: string, data: Partial<NewOrder>) => {
//   const [order] = await db
//     .update(orderModel)
//     .set(data)
//     .where(eq(orderModel.id, id))
//     .returning()
//   return order
// }

// // ========================
// // Cancel (status change, NOT delete)
// // ========================
// export const cancelOrder = async (id: string) => {
//   const [order] = await db
//     .update(orderModel)
//     .set({ status: 'cancelled' })
//     .where(eq(orderModel.id, id))
//     .returning()
//   return order
// }

// // ========================
// // Reschedule
// // ========================
// export const rescheduleOrder = async (orderId: string, data: RescheduleOrderInput) => {
//   return await db.transaction(async (tx) => {
//     const [order] = await tx
//       .select()
//       .from(orderModel)
//       .where(eq(orderModel.id, orderId))

//     if (!order) {
//       throw new Error('Order not found')
//     }

//     const fee = parseFloat(data.rescheduleFee ?? '0')
//     const newTotal = (parseFloat(order.totalAmount ?? '0') + fee).toFixed(2)
//     const newDue = (parseFloat(order.dueAmount ?? '0') + fee).toFixed(2)

//     const [updatedOrder] = await tx
//       .update(orderModel)
//       .set({
//         travelDate: data.newTravelDate,
//         totalAmount: fee > 0 ? newTotal : order.totalAmount,
//         dueAmount: fee > 0 ? newDue : order.dueAmount,
//         orderType: 'reschedule',
//         status: 'confirmed',
//       })
//       .where(eq(orderModel.id, orderId))
//       .returning()

//     return updatedOrder
//   })
// }

// // ========================
// // Order Service
// // ========================
// export const createOrderService = async (data: NewOrderService) => {
//   const [service] = await db
//     .insert(orderServiceModel)
//     .values(data)
//     .returning()
//   return service
// }

// export const getOrderServices = async (orderId: string) => {
//   return await db
//     .select()
//     .from(orderServiceModel)
//     .where(eq(orderServiceModel.orderId, orderId))
// }

// // ========================
// // Order Ticket
// // ========================
// export const createTicket = async (data: NewTicket) => {
//   const [ticket] = await db
//     .insert(ticketModel)
//     .values(data)
//     .returning()
//   return ticket
// }

// export const getOrderTickets = async (orderId: string) => {
//   return await db
//     .select()
//     .from(ticketModel)
//     .where(eq(ticketModel.orderId, orderId))
// }

// export const rescheduleTicket = async (
//   ticketId: string,
//   newDepartureDate: string,
//   newArrivalDate?: string
// ) => {
//   const [ticket] = await db
//     .update(ticketModel)
//     .set({
//       departureDate: newDepartureDate,
//       arrivalDate: newArrivalDate,
//       ticketStatus: 'rescheduled',
//     })
//     .where(eq(ticketModel.id, ticketId))
//     .returning()
//   return ticket
// }

// // ========================
// // Customer Payment (credit)
// // ========================
// export const recordOrderPayment = async (data: RecordOrderPaymentInput) => {
//   return await db.transaction(async (tx) => {
//     const [order] = await tx
//       .select()
//       .from(orderModel)
//       .where(eq(orderModel.id, data.orderId))

//     if (!order) {
//       throw new Error('Order not found')
//     }

//     const transactionData: NewTransaction = {
//       tenantId: data.tenantId,
//       accountId: data.accountId,
//       referenceType: 'order',
//       referenceId: data.orderId,
//       amount: data.amount,
//       transactionType: 'credit',
//       category: data.category ?? 'order_payment',
//       transactionDate: data.transactionDate ?? new Date().toISOString().slice(0, 10),
//       status: 'completed',
//     }

//     const [transaction] = await tx
//       .insert(transactionModel)
//       .values(transactionData)
//       .returning()

//     const currentDue = parseFloat(order.dueAmount ?? '0')
//     const paidAmount = parseFloat(data.amount)
//     const newDue = Math.max(currentDue - paidAmount, 0).toFixed(2)

//     const [updatedOrder] = await tx
//       .update(orderModel)
//       .set({ dueAmount: newDue })
//       .where(eq(orderModel.id, data.orderId))
//       .returning()

//     const [account] = await tx
//       .select()
//       .from(accountModel)
//       .where(eq(accountModel.id, data.accountId))

//     if (account) {
//       const newBalance = (parseFloat(account.balance ?? '0') + paidAmount).toFixed(2)
//       await tx
//         .update(accountModel)
//         .set({ balance: newBalance })
//         .where(eq(accountModel.id, data.accountId))
//     }

//     return { transaction, order: updatedOrder }
//   })
// }

// export const getOrderPayments = async (orderId: string) => {
//   return await db
//     .select()
//     .from(transactionModel)
//     .where(
//       and(
//         eq(transactionModel.referenceType, 'order'),
//         eq(transactionModel.referenceId, orderId),
//         eq(transactionModel.transactionType, 'credit')
//       )
//     )
// }

// // ========================
// // Vendor Payment (debit)
// // ========================
// export const recordVendorPayment = async (data: RecordVendorPaymentInput) => {
//   return await db.transaction(async (tx) => {
//     const [order] = await tx
//       .select()
//       .from(orderModel)
//       .where(eq(orderModel.id, data.orderId))

//     if (!order) {
//       throw new Error('Order not found')
//     }

//     const transactionData: NewTransaction = {
//       tenantId: data.tenantId,
//       accountId: data.accountId,
//       referenceType: 'order',
//       referenceId: data.orderId,
//       amount: data.amount,
//       transactionType: 'debit',
//       category: data.category ?? 'vendor_payment',
//       transactionDate: data.transactionDate ?? new Date().toISOString().slice(0, 10),
//       status: 'completed',
//     }

//     const [transaction] = await tx
//       .insert(transactionModel)
//       .values(transactionData)
//       .returning()

//     const [account] = await tx
//       .select()
//       .from(accountModel)
//       .where(eq(accountModel.id, data.accountId))

//     if (account) {
//       const paidAmount = parseFloat(data.amount)
//       const newBalance = (parseFloat(account.balance ?? '0') - paidAmount).toFixed(2)
//       await tx
//         .update(accountModel)
//         .set({ balance: newBalance })
//         .where(eq(accountModel.id, data.accountId))
//     }

//     await tx
//       .update(orderServiceModel)
//       .set({ procurementStatus: 'completed' })
//       .where(
//         and(
//           eq(orderServiceModel.orderId, data.orderId),
//           eq(orderServiceModel.vendorId, data.vendorId)
//         )
//       )

//     return { transaction }
//   })
// }

// export const getVendorPayments = async (orderId: string) => {
//   return await db
//     .select()
//     .from(transactionModel)
//     .where(
//       and(
//         eq(transactionModel.referenceType, 'order'),
//         eq(transactionModel.referenceId, orderId),
//         eq(transactionModel.transactionType, 'debit')
//       )
//     )
// }

