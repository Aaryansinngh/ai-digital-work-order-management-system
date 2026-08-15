import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/db';

describe('Full Industrial CMMS End-to-End Application Workflow', () => {
  let adminToken: string;
  let supervisorToken: string;
  let workerToken: string;
  let inventoryToken: string;

  let workerUserId: string;
  let pumpEquipmentId: string;
  let bearingInventoryItemId: string;

  let createdWorkOrderId: string;
  let generatedJobCardId: string;
  let createdMaterialRequestId: string;
  let initialStock: number;

  beforeAll(async () => {
    // 1. Login Administrator
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'Password123!' });
    expect(adminRes.status).toBe(200);
    expect(adminRes.body.token).toBeDefined();
    adminToken = adminRes.body.token;

    // 2. Login Supervisor
    const superRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'supervisor1@example.com', password: 'Password123!' });
    expect(superRes.status).toBe(200);
    expect(superRes.body.token).toBeDefined();
    supervisorToken = superRes.body.token;

    // 3. Login Worker
    const workerRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'worker1@example.com', password: 'Password123!' });
    expect(workerRes.status).toBe(200);
    expect(workerRes.body.token).toBeDefined();
    workerToken = workerRes.body.token;
    workerUserId = workerRes.body.user.id;

    // 4. Login Inventory Manager
    const invRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'inventory@example.com', password: 'Password123!' });
    expect(invRes.status).toBe(200);
    expect(invRes.body.token).toBeDefined();
    inventoryToken = invRes.body.token;

    // Retrieve equipment and inventory item IDs
    const equipment = await prisma.equipment.findFirst({ where: { name: { contains: 'Pump' } } });
    expect(equipment).toBeDefined();
    pumpEquipmentId = equipment!.id;

    const bearing = await prisma.inventoryItem.findFirst({ where: { itemCode: 'BRG-6205' } });
    expect(bearing).toBeDefined();
    bearingInventoryItemId = bearing!.id;
    initialStock = bearing!.stockQuantity;
  });

  test('Step 1: Test Authentication & Dashboard Data for all roles', async () => {
    // Admin dashboard
    const adminDash = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminDash.status).toBe(200);
    expect(adminDash.body.stats).toBeDefined();

    // Supervisor dashboard
    const superDash = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${supervisorToken}`);
    expect(superDash.status).toBe(200);

    // Worker dashboard
    const workerDash = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${workerToken}`);
    expect(workerDash.status).toBe(200);

    // Inventory Manager dashboard
    const invDash = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${inventoryToken}`);
    expect(invDash.status).toBe(200);
  });

  test('Step 2: AI Priority Scoring Preview & Supervisor Creates Work Order', async () => {
    // Test AI priority scoring preview endpoint
    const aiScoreRes = await request(app)
      .post('/api/ai/priority-score')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        equipmentId: pumpEquipmentId,
        priority: 'HIGH',
        deadline: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        taskDescription: 'Urgent replacement of noisy bearing BRG-6205 in Pump P-101',
      });
    expect(aiScoreRes.status).toBe(200);
    expect(aiScoreRes.body.priorityScore).toBeGreaterThan(0);
    expect(aiScoreRes.body.priorityExplanation).toContain('Score');

    // Create Work Order
    const woRes = await request(app)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        equipmentId: pumpEquipmentId,
        assignedToId: workerUserId,
        taskDescription: 'Urgent replacement of noisy bearing BRG-6205 in Pump P-101',
        priority: 'HIGH',
        deadline: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      });
    expect(woRes.status).toBe(201);
    expect(woRes.body.workOrder).toBeDefined();
    expect(woRes.body.jobCard).toBeDefined(); // Automatically generated Job Card!

    createdWorkOrderId = woRes.body.workOrder.id;
    generatedJobCardId = woRes.body.jobCard.id;
  });

  test('Step 3: Worker Updates Job Card, Requests Material, & Submits Job Card', async () => {
    // Get Job Card details
    const jcGet = await request(app)
      .get(`/api/job-cards/${generatedJobCardId}`)
      .set('Authorization', `Bearer ${workerToken}`);
    expect(jcGet.status).toBe(200);

    // Update Job Card progress
    const jcUpdate = await request(app)
      .patch(`/api/job-cards/${generatedJobCardId}`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send({
        completionPercentage: 50,
        remarks: 'Disassembled pump casing, identified bearing wear. Requesting replacement parts.',
      });
    expect(jcUpdate.status).toBe(200);
    expect(jcUpdate.body.jobCard.completionPercentage).toBe(50);

    // Create Material Request for BRG-6205 quantity 2
    const matReqRes = await request(app)
      .post('/api/material-requests')
      .set('Authorization', `Bearer ${workerToken}`)
      .send({
        jobCardId: generatedJobCardId,
        inventoryItemId: bearingInventoryItemId,
        quantity: 2,
      });
    expect(matReqRes.status).toBe(201);
    expect(matReqRes.body.materialRequest.status).toBe('PENDING');
    createdMaterialRequestId = matReqRes.body.materialRequest.id;

    // Submit Job Card for approval
    const jcSubmit = await request(app)
      .post(`/api/job-cards/${generatedJobCardId}/submit`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send({
        completionPercentage: 80,
        remarks: 'Waiting for material issuance to finalize reassembly.',
      });
    expect(jcSubmit.status).toBe(200);
    expect(jcSubmit.body.jobCard.status).toBe('PENDING_APPROVAL');
  });

  test('Step 4: Supervisor Approves Job Card & Material Request', async () => {
    // Approve Job Card
    const jcApprove = await request(app)
      .post(`/api/job-cards/${generatedJobCardId}/approve`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({});
    expect(jcApprove.status).toBe(200);
    expect(jcApprove.body.jobCard.status).toBe('APPROVED');

    // Approve Material Request
    const matApprove = await request(app)
      .patch(`/api/material-requests/${createdMaterialRequestId}/approve`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({});
    expect(matApprove.status).toBe(200);
    expect(matApprove.body.materialRequest.status).toBe('APPROVED');
  });

  test('Step 5: Inventory Manager Issues Material & Stock Decreases', async () => {
    // Issue Material Request
    const issueRes = await request(app)
      .post(`/api/material-requests/${createdMaterialRequestId}/issue`)
      .set('Authorization', `Bearer ${inventoryToken}`)
      .send({});
    expect(issueRes.status).toBe(200);
    expect(issueRes.body.materialRequest.status).toBe('ISSUED');

    // Check inventory stock quantity for BRG-6205
    const inventoryRes = await request(app)
      .get('/api/inventory')
      .set('Authorization', `Bearer ${inventoryToken}`);
    expect(inventoryRes.status).toBe(200);

    const updatedBearing = inventoryRes.body.inventory.find((item: any) => item.id === bearingInventoryItemId);
    expect(updatedBearing).toBeDefined();
    expect(updatedBearing.stockQuantity).toBe(initialStock - 2); // Decreased by 2!
  });

  test('Step 6: Test AI Search, AI Reports, and Audit Logs', async () => {
    // AI Search
    const searchRes = await request(app)
      .get('/api/ai/search?q=bearing')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(searchRes.status).toBe(200);
    expect(searchRes.body.results).toBeDefined();

    // AI Report Generation
    const reportRes = await request(app)
      .post('/api/ai/report')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ module: 'WORK_ORDERS' });
    expect(reportRes.status).toBe(200);
    expect(reportRes.body.report.summaryText).toBeDefined();

    // Audit Logs
    const auditRes = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(auditRes.status).toBe(200);
    expect(auditRes.body.logs.length).toBeGreaterThan(0);
  });
});
