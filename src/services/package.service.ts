import { eq } from 'drizzle-orm'
import { db } from '../config/database'
import {
  packageModel,
  packageCustomerModel,
  installmentModel,
  packageChecklistModel,
  packageVendorFeeModel,
  NewPackage,
  NewPackageCustomer,
  NewInstallment,
  NewPackageChecklist,
  NewPackageVendorFee,
} from '../schemas/schema'

// ========================
// Package CRUD
// ========================
export const getAllPackages = async (tenantId: string) => {
  return await db
    .select()
    .from(packageModel)
    .where(eq(packageModel.tenantId, tenantId))
}

export const getPackageById = async (id: string) => {
  const [pkg] = await db
    .select()
    .from(packageModel)
    .where(eq(packageModel.id, id))
  return pkg
}

export const createPackage = async (data: NewPackage) => {
  const [pkg] = await db
    .insert(packageModel)
    .values(data)
    .returning()
  return pkg
}

export const updatePackage = async (id: string, data: Partial<NewPackage>) => {
  const [pkg] = await db
    .update(packageModel)
    .set(data)
    .where(eq(packageModel.id, id))
    .returning()
  return pkg
}

export const deletePackage = async (id: string) => {
  const [pkg] = await db
    .delete(packageModel)
    .where(eq(packageModel.id, id))
    .returning()
  return pkg
}

// ========================
// Package Customer
// ========================
export const enrollCustomer = async (data: NewPackageCustomer) => {
  const pkg = await getPackageById(data.packageId!)

  if (!pkg) throw new Error('Package not found')

  if (pkg.enrollmentDeadline && new Date() > new Date(pkg.enrollmentDeadline)) {
    throw new Error('Enrollment deadline has passed')
  }

  const [packageCustomer] = await db
    .insert(packageCustomerModel)
    .values(data)
    .returning()
  return packageCustomer
}

export const getPackageCustomers = async (packageId: string) => {
  return await db
    .select()
    .from(packageCustomerModel)
    .where(eq(packageCustomerModel.packageId, packageId))
}

export const getPackageCustomerById = async (id: string) => {
  const [packageCustomer] = await db
    .select()
    .from(packageCustomerModel)
    .where(eq(packageCustomerModel.id, id))
  return packageCustomer
}

// ========================
// Installments
// ========================
export const createInstallment = async (data: NewInstallment) => {
  const packageCustomer = await getPackageCustomerById(data.packageCustomerId!)

  if (!packageCustomer) throw new Error('Package customer not found')

  const [installment] = await db
    .insert(installmentModel)
    .values(data)
    .returning()

  // balance due আপডেট করো
  const newBalanceDue = (
    parseFloat(packageCustomer.balanceDue ?? '0') - parseFloat(data.amount ?? '0')
  ).toString()

  await db
    .update(packageCustomerModel)
    .set({ balanceDue: newBalanceDue })
    .where(eq(packageCustomerModel.id, data.packageCustomerId!))

  return installment
}

export const getInstallments = async (packageCustomerId: string) => {
  return await db
    .select()
    .from(installmentModel)
    .where(eq(installmentModel.packageCustomerId, packageCustomerId))
}

// ========================
// Package Checklist
// ========================
export const createChecklist = async (data: NewPackageChecklist) => {
  const [checklist] = await db
    .insert(packageChecklistModel)
    .values(data)
    .returning()
  return checklist
}

export const getPackageChecklists = async (packageId: string) => {
  return await db
    .select()
    .from(packageChecklistModel)
    .where(eq(packageChecklistModel.packageId, packageId))
}

export const updateChecklist = async (
  id: string,
  data: Partial<NewPackageChecklist>
) => {
  const [checklist] = await db
    .update(packageChecklistModel)
    .set(data)
    .where(eq(packageChecklistModel.id, id))
    .returning()
  return checklist
}

// ========================
// Package Vendor Fees
// ========================
export const createVendorFee = async (data: NewPackageVendorFee) => {
  const [fee] = await db
    .insert(packageVendorFeeModel)
    .values(data)
    .returning()
  return fee
}

export const getPackageVendorFees = async (packageId: string) => {
  return await db
    .select()
    .from(packageVendorFeeModel)
    .where(eq(packageVendorFeeModel.packageId, packageId))
}