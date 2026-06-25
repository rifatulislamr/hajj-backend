import { eq } from 'drizzle-orm'
import { db } from '../config/database'
import { accountModel, NewAccount } from '../schemas/schema'

export const getAllAccounts = async (tenantId: string) => {
  return await db
    .select()
    .from(accountModel)
    .where(eq(accountModel.tenantId, tenantId))
}

export const getAccountById = async (id: string) => {
  const [account] = await db
    .select()
    .from(accountModel)
    .where(eq(accountModel.id, id))
  return account
}

export const createAccount = async (data: NewAccount) => {
  const [account] = await db
    .insert(accountModel)
    .values(data)
    .returning()
  return account
}

export const updateAccountBalance = async (id: string, balance: string) => {
  const [account] = await db
    .update(accountModel)
    .set({ balance })
    .where(eq(accountModel.id, id))
    .returning()
  return account
}