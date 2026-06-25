import { NextFunction, Request, Response } from 'express'
import { z } from 'zod'
import { requirePermission } from '../services/utils/jwt.utils'
import {
  getAllPackages,
  getPackageById,
  createPackage,
  updatePackage,
  deletePackage,
  enrollCustomer,
  getPackageCustomers,
  createInstallment,
  getInstallments,
  createChecklist,
  getPackageChecklists,
  updateChecklist,
  createVendorFee,
  getPackageVendorFees,
} from '../services/package.service'

const packageSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().min(1, 'Name is required'),
  packageType: z.enum(['hajj', 'umrah']),
  price: z.string().optional(),
  enrollmentDeadline: z.string().optional(),
})

const packageCustomerSchema = z.object({
  packageId: z.string().uuid(),
  customerId: z.string().uuid(),
  totalFee: z.string().optional(),
  balanceDue: z.string().optional(),
  status: z.string().optional(),
})

const installmentSchema = z.object({
  packageCustomerId: z.string().uuid(),
  amount: z.string(),
  dueDate: z.string().optional(),
  status: z.string().optional(),
})

const checklistSchema = z.object({
  packageId: z.string().uuid(),
  taskName: z.string().min(1, 'Task name is required'),
  description: z.string().optional(),
  required: z.boolean().optional(),
})

const vendorFeeSchema = z.object({
  packageId: z.string().uuid(),
  vendorId: z.string().uuid(),
  feeType: z.string().optional(),
  amount: z.string(),
  paidAt: z
    .string()
    .optional()
    .transform((val) => (val ? new Date(val) : null)),
})

// ========================
// Package Controllers
// ========================
export const getPackages = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    requirePermission(req, 'view_packages')
    const tenantId = req.user?.tenantId as string
    const packages = await getAllPackages(tenantId)
    res.status(200).json(packages)
  } catch (error) {
    next(error)
  }
}

export const getPackage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    requirePermission(req, 'view_packages')
    const { id } = req.params
    const pkg = await getPackageById(id)
    if (!pkg) {
      res.status(404).json({ status: 'fail', message: 'Package not found' })
      return
    }
    res.status(200).json(pkg)
  } catch (error) {
    next(error)
  }
}

export const createPackageController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    requirePermission(req, 'create_package')
    const data = packageSchema.parse(req.body)
    const pkg = await createPackage(data)
    res.status(201).json(pkg)
  } catch (error) {
    if (error instanceof z.ZodError) {
      res
        .status(400)
        .json({
          status: 'error',
          message: 'Invalid input',
          errors: error.errors,
        })
    } else {
      next(error)
    }
  }
}

export const updatePackageController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    requirePermission(req, 'update_package')
    const { id } = req.params
    const data = packageSchema.partial().parse(req.body)
    const pkg = await updatePackage(id, data)
    if (!pkg) {
      res.status(404).json({ status: 'fail', message: 'Package not found' })
      return
    }
    res.status(200).json(pkg)
  } catch (error) {
    if (error instanceof z.ZodError) {
      res
        .status(400)
        .json({
          status: 'error',
          message: 'Invalid input',
          errors: error.errors,
        })
    } else {
      next(error)
    }
  }
}

export const deletePackageController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    requirePermission(req, 'delete_package')
    const { id } = req.params
    const pkg = await deletePackage(id)
    if (!pkg) {
      res.status(404).json({ status: 'fail', message: 'Package not found' })
      return
    }
    res
      .status(200)
      .json({ status: 'success', message: 'Package deleted successfully' })
  } catch (error) {
    next(error)
  }
}

// ========================
// Package Customer Controllers
// ========================
export const enrollCustomerController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    requirePermission(req, 'create_package')
    const data = packageCustomerSchema.parse(req.body)
    const packageCustomer = await enrollCustomer(data)
    res.status(201).json(packageCustomer)
  } catch (error) {
    if (error instanceof z.ZodError) {
      res
        .status(400)
        .json({
          status: 'error',
          message: 'Invalid input',
          errors: error.errors,
        })
    } else {
      next(error)
    }
  }
}

export const getPackageCustomersController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    requirePermission(req, 'view_packages')
    const { packageId } = req.params
    const customers = await getPackageCustomers(packageId)
    res.status(200).json(customers)
  } catch (error) {
    next(error)
  }
}

// ========================
// Installment Controllers
// ========================
export const createInstallmentController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    requirePermission(req, 'create_package')
    const data = installmentSchema.parse(req.body)
    const installment = await createInstallment(data)
    res.status(201).json(installment)
  } catch (error) {
    if (error instanceof z.ZodError) {
      res
        .status(400)
        .json({
          status: 'error',
          message: 'Invalid input',
          errors: error.errors,
        })
    } else {
      next(error)
    }
  }
}

export const getInstallmentsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    requirePermission(req, 'view_packages')
    const { packageCustomerId } = req.params
    const installments = await getInstallments(packageCustomerId)
    res.status(200).json(installments)
  } catch (error) {
    next(error)
  }
}

// ========================
// Checklist Controllers
// ========================
export const createChecklistController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    requirePermission(req, 'create_package')
    const data = checklistSchema.parse(req.body)
    const checklist = await createChecklist(data)
    res.status(201).json(checklist)
  } catch (error) {
    if (error instanceof z.ZodError) {
      res
        .status(400)
        .json({
          status: 'error',
          message: 'Invalid input',
          errors: error.errors,
        })
    } else {
      next(error)
    }
  }
}

export const getChecklistsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    requirePermission(req, 'view_packages')
    const { packageId } = req.params
    const checklists = await getPackageChecklists(packageId)
    res.status(200).json(checklists)
  } catch (error) {
    next(error)
  }
}

export const updateChecklistController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    requirePermission(req, 'update_package')
    const { id } = req.params
    const data = checklistSchema.partial().parse(req.body)
    const checklist = await updateChecklist(id, data)
    res.status(200).json(checklist)
  } catch (error) {
    if (error instanceof z.ZodError) {
      res
        .status(400)
        .json({
          status: 'error',
          message: 'Invalid input',
          errors: error.errors,
        })
    } else {
      next(error)
    }
  }
}

// ========================
// Vendor Fee Controllers
// ========================
export const createVendorFeeController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    requirePermission(req, 'create_package')
    const data = vendorFeeSchema.parse(req.body)
    const fee = await createVendorFee(data)
    res.status(201).json(fee)
  } catch (error) {
    if (error instanceof z.ZodError) {
      res
        .status(400)
        .json({
          status: 'error',
          message: 'Invalid input',
          errors: error.errors,
        })
    } else {
      next(error)
    }
  }
}

export const getVendorFeesController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    requirePermission(req, 'view_packages')
    const { packageId } = req.params
    const fees = await getPackageVendorFees(packageId)
    res.status(200).json(fees)
  } catch (error) {
    next(error)
  }
}
