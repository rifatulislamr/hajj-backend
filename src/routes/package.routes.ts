import { Router } from 'express'
import {
  getPackages,
  getPackage,
  createPackageController,
  updatePackageController,
  deletePackageController,
  enrollCustomerController,
  getPackageCustomersController,
  createInstallmentController,
  getInstallmentsController,
  createChecklistController,
  getChecklistsController,
  updateChecklistController,
  createVendorFeeController,
  getVendorFeesController,
} from '../controllers/package.controller'
import { authenticateUser } from '../middlewares/auth.middleware'

const router = Router()

// Package CRUD
router.get('/getall', authenticateUser, getPackages)
router.get('/get/:id', authenticateUser, getPackage)
router.post('/create', authenticateUser, createPackageController)
router.put('/update/:id', authenticateUser, updatePackageController)
router.delete('/delete/:id', authenticateUser, deletePackageController)

// Package Customer
router.post('/customer/enroll', authenticateUser, enrollCustomerController)
router.get('/customer/getall/:packageId', authenticateUser, getPackageCustomersController)

// Installments
router.post('/installment/create', authenticateUser, createInstallmentController)
router.get('/installment/getall/:packageCustomerId', authenticateUser, getInstallmentsController)

// Checklist
router.post('/checklist/create', authenticateUser, createChecklistController)
router.get('/checklist/getall/:packageId', authenticateUser, getChecklistsController)
router.put('/checklist/update/:id', authenticateUser, updateChecklistController)

// Vendor Fees
router.post('/vendor-fee/create', authenticateUser, createVendorFeeController)
router.get('/vendor-fee/getall/:packageId', authenticateUser, getVendorFeesController)

export default router