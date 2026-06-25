import { eq } from 'drizzle-orm'
import { db } from '../config/database'
import { vendorModel, NewVendor } from '../schemas/schema'

export const getAllVendors = async (tenantId: string) => {
  return await db
    .select()
    .from(vendorModel)
    .where(eq(vendorModel.tenantId, tenantId))
}

export const getVendorById = async (id: string) => {
  const [vendor] = await db
    .select()
    .from(vendorModel)
    .where(eq(vendorModel.id, id))
  return vendor
}

export const createVendor = async (data: NewVendor) => {
  const [vendor] = await db
    .insert(vendorModel)
    .values(data)
    .returning()
  return vendor
}

export const updateVendor = async (id: string, data: Partial<NewVendor>) => {
  const [vendor] = await db
    .update(vendorModel)
    .set(data)
    .where(eq(vendorModel.id, id))
    .returning()
  return vendor
}

export const deleteVendor = async (id: string) => {
  const [vendor] = await db
    .delete(vendorModel)
    .where(eq(vendorModel.id, id))
    .returning()
  return vendor
}