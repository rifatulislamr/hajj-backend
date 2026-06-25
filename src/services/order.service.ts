import { eq } from 'drizzle-orm'
import { db } from '../config/database'
import {
  orderModel,
  orderServiceModel,
  ticketModel,
  NewOrder,
  NewOrderService,
  NewTicket,
} from '../schemas/schema'

// ========================
// Order CRUD
// ========================
export const getAllOrders = async (tenantId: string) => {
  return await db
    .select()
    .from(orderModel)
    .where(eq(orderModel.tenantId, tenantId))
}

export const getOrderById = async (id: string) => {
  const [order] = await db
    .select()
    .from(orderModel)
    .where(eq(orderModel.id, id))
  return order
}

export const createOrder = async (data: NewOrder) => {
  const [order] = await db
    .insert(orderModel)
    .values(data)
    .returning()
  return order
}

export const updateOrder = async (id: string, data: Partial<NewOrder>) => {
  const [order] = await db
    .update(orderModel)
    .set(data)
    .where(eq(orderModel.id, id))
    .returning()
  return order
}

export const deleteOrder = async (id: string) => {
  const [order] = await db
    .delete(orderModel)
    .where(eq(orderModel.id, id))
    .returning()
  return order
}

// ========================
// Order Service
// ========================
export const createOrderService = async (data: NewOrderService) => {
  const [service] = await db
    .insert(orderServiceModel)
    .values(data)
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