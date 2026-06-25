import { NextFunction, Request, Response } from 'express'
import { z } from 'zod'
import { requirePermission } from '../services/utils/jwt.utils'
import {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from '../services/customer.service'

const customerSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  passportNumber: z.string().optional(),
  address: z.string().optional(),
})

// export const getCustomers = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     requirePermission(req, 'view_customers')
//     const tenantId = req.query.tenantId as string
//     const customers = await getAllCustomers(tenantId)
//     res.status(200).json({
//       status: 'success',
//       data: { customers },
//     })
//   } catch (error) {
//     next(error)
//   }
// }

export const getCustomers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    requirePermission(req, 'view_customers')
    const tenantId = req.user?.tenantId as string  // ← URL থেকে না, token থেকে
    const customers = await getAllCustomers(tenantId)
    res.status(200).json(customers)
  } catch (error) {
    next(error)
  }
}

export const getCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    requirePermission(req, 'view_customers')
    const { id } = req.params
    const tenantId = req.query.tenantId as string
    const customer = await getCustomerById(id, tenantId)
    if (!customer) {
      res.status(404).json({
        status: 'fail',
        message: 'Customer not found',
      })
      return
    }
    res.status(200).json(customer)
  } catch (error) {
    next(error)
  }
}

export const createCustomerController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    requirePermission(req, 'create_customer')
    const data = customerSchema.parse(req.body)
    const customer = await createCustomer(data)
    res.status(201).json({
      status: 'success',
      data: { customer },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid input',
        errors: error.errors,
      })
    } else {
      next(error)
    }
  }
}

export const updateCustomerController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    requirePermission(req, 'update_customer')
    const { id } = req.params
    const data = customerSchema.partial().parse(req.body)
    const customer = await updateCustomer(id, data)
    if (!customer) {
      res.status(404).json({
        status: 'fail',
        message: 'Customer not found',
      })
      return
    }
    res.status(200).json({
      status: 'success',
      data: { customer },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid input',
        errors: error.errors,
      })
    } else {
      next(error)
    }
  }
}

export const deleteCustomerController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    requirePermission(req, 'delete_customer')
    const { id } = req.params
    const customer = await deleteCustomer(id)
    if (!customer) {
      res.status(404).json({
        status: 'fail',
        message: 'Customer not found',
      })
      return
    }
    res.status(200).json({
      status: 'success',
      message: 'Customer deleted successfully',
    })
  } catch (error) {
    next(error)
  }
}