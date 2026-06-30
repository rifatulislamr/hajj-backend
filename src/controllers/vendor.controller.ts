import { NextFunction, Request, Response } from 'express'
import { z } from 'zod'
import { requirePermission } from '../services/utils/jwt.utils'
import {
  getAllVendors,
  getVendorById,
  createVendor,
  updateVendor,
  deleteVendor,
} from '../services/vendor.service'

const vendorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.string().optional(),
  contactDetails: z.string().optional(),
})

export const getVendors = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    requirePermission(req, 'view_vendors')
    const tenantId = req.user?.tenantId as string
    const vendors = await getAllVendors(tenantId)
    res.status(200).json(vendors)
  } catch (error) {
    next(error)
  }
}

export const getVendor = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    requirePermission(req, 'view_vendors')
    const { id } = req.params
    const vendor = await getVendorById(id)
    if (!vendor) {
      res.status(404).json({ status: 'fail', message: 'Vendor not found' })
      return
    }
    res.status(200).json(vendor)
  } catch (error) {
    next(error)
  }
}

export const createVendorController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    requirePermission(req, 'create_vendor')
    const data = vendorSchema.parse(req.body)
    const vendor = await createVendor({
      ...data,
      tenantId: req.user?.tenantId,
    })
    res.status(201).json(vendor)
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

export const updateVendorController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    requirePermission(req, 'update_vendor')
    const { id } = req.params
    const data = vendorSchema.partial().parse(req.body)
    const vendor = await updateVendor(id, data)
    if (!vendor) {
      res.status(404).json({ status: 'fail', message: 'Vendor not found' })
      return
    }
    res.status(200).json(vendor)
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

export const deleteVendorController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    requirePermission(req, 'delete_vendor')
    const { id } = req.params
    const vendor = await deleteVendor(id)
    if (!vendor) {
      res.status(404).json({ status: 'fail', message: 'Vendor not found' })
      return
    }
    res.status(200).json({ status: 'success', message: 'Vendor deleted successfully' })
  } catch (error) {
    next(error)
  }
}