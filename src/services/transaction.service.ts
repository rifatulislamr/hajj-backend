import { eq } from 'drizzle-orm'
import { db } from '../config/database'
import { transactionModel, accountModel, NewTransaction } from '../schemas/schema'
import { getAccountById } from './account.service'

export const getAllTransactions = async (tenantId: string) => {
  return await db
    .select()
    .from(transactionModel)
    .where(eq(transactionModel.tenantId, tenantId))
}

export const getTransactionsByAccount = async (accountId: string) => {
  return await db
    .select()
    .from(transactionModel)
    .where(eq(transactionModel.accountId, accountId))
}

export const createTransaction = async (data: NewTransaction) => {
  const account = await getAccountById(data.accountId!)

  if (!account) throw new Error('Account not found')

  const currentBalance = parseFloat(account.balance ?? '0')
  const amount = parseFloat(data.amount ?? '0')

  let newBalance: number
  if (data.transactionType === 'credit') {
    newBalance = currentBalance + amount
  } else {
    newBalance = currentBalance - amount
  }

  const result = await db.transaction(async (tx) => {
    const [transaction] = await tx
      .insert(transactionModel)
      .values(data)
      .returning()

    await tx
      .update(accountModel)
      .set({ balance: newBalance.toString() })
      .where(eq(accountModel.id, data.accountId!))

    return transaction
  })

  return result
}