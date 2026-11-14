import express from 'express';
import {
  getAdminDashboardSummary,
  getOccupancyStats,
  getRecentActivity,
  getStudentDashboardSummary,
  getStudentsDirectory,
  triggerSampleCampusSeed,
} from '../controllers/dashboardController.js';
import { authorizeRoles, requireDbConnection, verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.use(requireDbConnection);
router.use(verifyToken);

router.get('/summary', authorizeRoles('admin'), getAdminDashboardSummary);
router.get('/occupancy', authorizeRoles('admin'), getOccupancyStats);
router.get('/recent-activity', getRecentActivity);
router.get('/student', authorizeRoles('student'), getStudentDashboardSummary);
router.get('/students', authorizeRoles('admin'), getStudentsDirectory);
router.post('/seed-sample', authorizeRoles('admin'), triggerSampleCampusSeed);

export default router;
