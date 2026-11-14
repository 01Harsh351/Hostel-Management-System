import express from 'express';
import {
  createRoom,
  getAvailableRooms,
  getRoomById,
  getRooms,
  updateRoom,
} from '../controllers/roomController.js';
import { authorizeRoles, requireDbConnection, verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.use(requireDbConnection);
router.use(verifyToken);

router.get('/', getRooms);
router.get('/available', getAvailableRooms);
router.get('/:id', getRoomById);
router.post('/', authorizeRoles('admin'), createRoom);
router.put('/:id', authorizeRoles('admin'), updateRoom);

export default router;
