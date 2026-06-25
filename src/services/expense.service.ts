import { eq } from 'drizzle-orm'
import { db } from '../config/database'
import { generalExpenseModel, NewGeneralExpense } from '../schemas/schema'

export const getAllExpenses = async (tenantId: string) => {
  return await db
    .select()
    .from(generalExpenseModel)
    .where(eq(generalExpenseModel.tenantId, tenantId))
}

export const createExpense = async (data: NewGeneralExpense) => {
  const [expense] = await db
    .insert(generalExpenseModel)
    .values(data)
    .returning()
  return expense
}