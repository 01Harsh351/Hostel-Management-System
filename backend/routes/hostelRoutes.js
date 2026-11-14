import express from 'express';
import {
  createHostel,
  deleteHostel,
  getAllHostels,
  getHostelById,
  updateHostel,
} from '../controllers/hostelController.js';
import { authorizeRoles, requireDbConnection, verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.use(requireDbConnection);
router.use(verifyToken);

router.get('/', getAllHostels);
router.get('/:id', getHostelById);
router.post('/', authorizeRoles('admin'), createHostel);
router.put('/:id', authorizeRoles('admin'), updateHostel);
router.delete('/:id', authorizeRoles('admin'), deleteHostel);

export default router;
