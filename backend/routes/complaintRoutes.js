import express from 'express';
import {
  createComplaint,
  getAllComplaints,
  getMyComplaints,
  resolveComplaint,
  updateComplaint,
} from '../controllers/complaintController.js';
import { authorizeRoles, requireDbConnection, verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.use(requireDbConnection);
router.use(verifyToken);

router.post('/', authorizeRoles('student'), createComplaint);
router.get('/my', authorizeRoles('student'), getMyComplaints);
router.get('/', authorizeRoles('admin'), getAllComplaints);
router.put('/:id', authorizeRoles('admin'), updateComplaint);
router.patch('/:id/resolve', authorizeRoles('admin'), resolveComplaint);

export default router;
