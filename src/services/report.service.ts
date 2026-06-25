import { eq } from 'drizzle-orm'
import { db } from '../config/database'
import {
  orderModel,
  packageCustomerModel,
  generalExpenseModel,
  accountModel,
} from '../schemas/schema'

export const getProfitLossReport = async (tenantId: string) => {
  const orders = await db
    .select()
    .from(orderModel)
    .where(eq(orderModel.tenantId, tenantId))

  const totalOrderIncome = orders.reduce(
    (sum, order) => sum + parseFloat(order.totalAmount ?? '0'), 0
  )
  const totalOrderDue = orders.reduce(
    (sum, order) => sum + parseFloat(order.dueAmount ?? '0'), 0
  )

  const packageCustomers = await db
    .select()
    .from(packageCustomerModel)

  const totalPackageIncome = packageCustomers.reduce(
    (sum, pc) => sum + parseFloat(pc.totalFee ?? '0'), 0
  )
  const totalPackageDue = packageCustomers.reduce(
    (sum, pc) => sum + parseFloat(pc.balanceDue ?? '0'), 0
  )

  const expenses = await db
    .select()
    .from(generalExpenseModel)
    .where(eq(generalExpenseModel.tenantId, tenantId))

  const totalExpenses = expenses.reduce(
    (sum, exp) => sum + parseFloat(exp.amount ?? '0'), 0
  )

  const totalIncome = totalOrderIncome + totalPackageIncome
  const totalReceived = totalIncome - totalOrderDue - totalPackageDue
  const netProfit = totalReceived - totalExpenses

  return {
    totalOrderIncome,
    totalPackageIncome,
    totalIncome,
    totalOrderDue,
    totalPackageDue,
    totalDue: totalOrderDue + totalPackageDue,
    totalExpenses,
    totalReceived,
    netProfit,
  }
}

export const getCashBankSummary = async (tenantId: string) => {
  const accounts = await db
    .select()
    .from(accountModel)
    .where(eq(accountModel.tenantId, tenantId))

  const cash = accounts
    .filter((a) => a.accountType === 'cash')
    .reduce((sum, a) => sum + parseFloat(a.balance ?? '0'), 0)

  const bank = accounts
    .filter((a) => a.accountType === 'bank')
    .reduce((sum, a) => sum + parseFloat(a.balance ?? '0'), 0)

  return {
    cash,
    bank,
    total: cash + bank,
    accounts,
  }
}