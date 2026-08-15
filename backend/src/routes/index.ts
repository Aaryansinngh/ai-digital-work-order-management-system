import { Router } from 'express';
import { authenticateJWT, requireRole } from '../middleware/authMiddleware';

import * as authController from '../controllers/authController';
import * as userController from '../controllers/userController';
import * as workOrderController from '../controllers/workOrderController';
import * as jobCardController from '../controllers/jobCardController';
import * as materialRequestController from '../controllers/materialRequestController';
import * as inventoryController from '../controllers/inventoryController';
import * as dashboardController from '../controllers/dashboardController';
import * as aiController from '../controllers/aiController';
import * as auditLogController from '../controllers/auditLogController';

const router = Router();

// PUBLIC AUTH ROUTES
router.post('/auth/login', authController.login);

// PROTECTED ROUTES BELOW
router.use(authenticateJWT);

// User Auth info
router.get('/auth/me', authController.getMe);

// USER MANAGEMENT (ADMIN ONLY)
router.get('/users', requireRole('ADMINISTRATOR'), userController.getUsers);
router.post('/users', requireRole('ADMINISTRATOR'), userController.createUser);
router.patch('/users/:id', requireRole('ADMINISTRATOR'), userController.updateUser);

// WORK ORDERS
router.post('/work-orders', requireRole('SUPERVISOR', 'ADMINISTRATOR'), workOrderController.createWorkOrder);
router.get('/work-orders', workOrderController.getWorkOrders);
router.get('/work-orders/:id', workOrderController.getWorkOrderById);
router.patch('/work-orders/:id', requireRole('SUPERVISOR', 'ADMINISTRATOR'), workOrderController.updateWorkOrder);

// JOB CARDS
router.get('/job-cards/:id', jobCardController.getJobCardById);
router.patch('/job-cards/:id', jobCardController.updateJobCard);
router.post('/job-cards/:id/submit', requireRole('WORKER'), jobCardController.submitJobCard);
router.post('/job-cards/:id/approve', requireRole('SUPERVISOR', 'ADMINISTRATOR'), jobCardController.approveJobCard);
router.post('/job-cards/:id/reject', requireRole('SUPERVISOR', 'ADMINISTRATOR'), jobCardController.rejectJobCard);

// MATERIAL REQUESTS
router.post('/material-requests', requireRole('WORKER'), materialRequestController.createMaterialRequest);
router.get('/material-requests', materialRequestController.getMaterialRequests);
router.patch('/material-requests/:id/approve', requireRole('SUPERVISOR', 'ADMINISTRATOR'), materialRequestController.approveMaterialRequest);
router.patch('/material-requests/:id/reject', requireRole('SUPERVISOR', 'ADMINISTRATOR'), materialRequestController.rejectMaterialRequest);
router.post('/material-requests/:id/issue', requireRole('INVENTORY_MANAGER'), materialRequestController.issueMaterialRequest);

// INVENTORY & EQUIPMENT
router.get('/inventory', inventoryController.getInventoryItems);
router.post('/inventory', requireRole('INVENTORY_MANAGER', 'ADMINISTRATOR'), inventoryController.createInventoryItem);
router.patch('/inventory/:id', requireRole('INVENTORY_MANAGER', 'ADMINISTRATOR'), inventoryController.updateInventoryItem);
router.get('/inventory/history', requireRole('INVENTORY_MANAGER', 'ADMINISTRATOR', 'SUPERVISOR'), inventoryController.getInventoryIssueHistory);
router.get('/equipment', inventoryController.getEquipmentList);

// DASHBOARD
router.get('/dashboard', dashboardController.getDashboardData);

// AI FEATURES
router.post('/ai/priority-score', aiController.previewPriorityScore);
router.get('/ai/search', aiController.searchWorkOrders);
router.post('/ai/report', aiController.generateReport);

// AUDIT LOGS (ADMIN & SUPERVISOR)
router.get('/audit-logs', requireRole('ADMINISTRATOR', 'SUPERVISOR'), auditLogController.getAuditLogs);

export default router;
