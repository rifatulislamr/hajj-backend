import { eq } from 'drizzle-orm'
import { db } from '../config/database'
import { customerModel, NewCustomer } from '../schemas/schema'

export const getAllCustomers = async (tenantId: string) => {
  return await db
    .select()
    .from(customerModel)
    .where(eq(customerModel.tenantId, tenantId))
}

export const getCustomerById = async (id: string, tenantId: string) => {
  const [customer] = await db
    .select()
    .from(customerModel)
    .where(eq(customerModel.id, id))
  return customer
}

export const createCustomer = async (data: NewCustomer) => {
  const [customer] = await db
    .insert(customerModel)
    .values(data)
    .returning()
  return customer
}

export const updateCustomer = async (id: string, data: Partial<NewCustomer>) => {
  const [customer] = await db
    .update(customerModel)
    .set(data)
    .where(eq(customerModel.id, id))
    .returning()
  return customer
}

export const deleteCustomer = async (id: string) => {
  const [customer] = await db
    .delete(customerModel)
    .where(eq(customerModel.id, id))
    .returning()
  return customer
}