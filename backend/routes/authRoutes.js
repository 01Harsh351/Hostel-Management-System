import express from 'express';
import {
  getMe,
  loginUser,
  provisionFirstAdmin,
  registerStudent,
  updateMe,
} from '../controllers/authController.js';
import { requireDbConnection, verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', registerStudent);
router.post('/login', loginUser);
router.get('/me', requireDbConnection, verifyToken, getMe);
router.put('/me', requireDbConnection, verifyToken, updateMe);
router.post('/provision-admin', requireDbConnection, provisionFirstAdmin);

export default router;
