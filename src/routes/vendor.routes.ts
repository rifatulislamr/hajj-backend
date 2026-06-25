import { Router } from 'express'
import {
  getVendors,
  getVendor,
  createVendorController,
  updateVendorController,
  deleteVendorController,
} from '../controllers/vendor.controller'
import { authenticateUser } from '../middlewares/auth.middleware'

const router = Router()

router.get('/getall', authenticateUser, getVendors)
router.get('/get/:id', authenticateUser, getVendor)
router.post('/create', authenticateUser, createVendorController)
router.put('/update/:id', authenticateUser, updateVendorController)
router.delete('/delete/:id', authenticateUser, deleteVendorController)

export default router