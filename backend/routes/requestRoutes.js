import express from 'express';
import {
  approveRoomRequest,
  createRoomRequest,
  getAllRequests,
  getMyRequests,
  rejectRoomRequest,
} from '../controllers/requestController.js';
import { authorizeRoles, requireDbConnection, verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.use(requireDbConnection);
router.use(verifyToken);

router.post('/', authorizeRoles('student'), createRoomRequest);
router.get('/my', authorizeRoles('student'), getMyRequests);
router.get('/', authorizeRoles('admin'), getAllRequests);
router.put('/:id/approve', authorizeRoles('admin'), approveRoomRequest);
router.patch('/:id/approve', authorizeRoles('admin'), approveRoomRequest);
router.put('/:id/reject', authorizeRoles('admin'), rejectRoomRequest);
router.patch('/:id/reject', authorizeRoles('admin'), rejectRoomRequest);

export default router;
