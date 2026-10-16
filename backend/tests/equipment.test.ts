import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import prisma from '../src/config/db';
import { ENV } from '../src/config/env';

describe('Equipment Management API Unit & Route Tests', () => {
  const adminUser = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Admin User',
    email: 'admin@test.com',
    role: 'ADMINISTRATOR',
    isActive: true,
  };

  const supervisorUser = {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Supervisor User',
    email: 'supervisor@test.com',
    role: 'SUPERVISOR',
    isActive: true,
  };

  const workerUser = {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Worker User',
    email: 'worker@test.com',
    role: 'WORKER',
    isActive: true,
  };

  const adminToken = jwt.sign(adminUser, ENV.JWT_SECRET);
  const supervisorToken = jwt.sign(supervisorUser, ENV.JWT_SECRET);
  const workerToken = jwt.sign(workerUser, ENV.JWT_SECRET);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication & Authorization', () => {
    it('should reject GET /api/equipment without a token (401)', async () => {
      const res = await request(app).get('/api/equipment');
      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Authentication required');
    });

    it('should reject POST /api/equipment without a token (401)', async () => {
      const res = await request(app)
        .post('/api/equipment')
        .send({ name: 'Test Pump', location: 'Bay 1', criticality: 'HIGH' });
      expect(res.status).toBe(401);
    });

    it('should reject POST /api/equipment by a WORKER (403 Forbidden)', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(workerUser as any);

      const res = await request(app)
        .post('/api/equipment')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({ name: 'Pump P-100', location: 'Bay 1', criticality: 'HIGH' });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Forbidden');
    });

    it('should reject PATCH /api/equipment/:id by a WORKER (403 Forbidden)', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(workerUser as any);

      const res = await request(app)
        .patch('/api/equipment/some-id')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({ location: 'Bay 2' });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Forbidden');
    });
  });

  describe('Validation & Error Handling', () => {
    it('should reject POST /api/equipment with invalid criticality enum (400)', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(adminUser as any);

      const res = await request(app)
        .post('/api/equipment')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Valid Name',
          location: 'Valid Location',
          criticality: 'SUPER_URGENT', // Invalid enum
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Validation failed');
    });

    it('should reject POST /api/equipment with missing required fields (400)', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(adminUser as any);

      const res = await request(app)
        .post('/api/equipment')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Validation failed');
    });

    it('should reject POST /api/equipment with duplicate name (400)', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(adminUser as any);
      jest.spyOn(prisma.equipment, 'findFirst').mockResolvedValue({
        id: 'existing-id',
        name: 'Existing Pump',
        location: 'Bay 1',
        criticality: 'HIGH',
      } as any);

      const res = await request(app)
        .post('/api/equipment')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Existing Pump',
          location: 'Bay 2',
          criticality: 'HIGH',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already exists');
    });

    it('should return 404 when updating non-existent equipment', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(supervisorUser as any);
      jest.spyOn(prisma.equipment, 'findUnique').mockResolvedValue(null);

      const res = await request(app)
        .patch('/api/equipment/non-existent-id')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .send({ location: 'Updated Bay' });

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('Equipment not found');
    });
  });

  describe('Successful CRUD Operations', () => {
    it('should allow ADMINISTRATOR to create equipment (201)', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(adminUser as any);
      jest.spyOn(prisma.equipment, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prisma.equipment, 'create').mockResolvedValue({
        id: 'new-eq-id',
        name: 'Centrifugal Pump P-200',
        location: 'Pump Bay 4',
        criticality: 'CRITICAL',
        maintenanceHistory: 'Brand new unit',
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { workOrders: 0 },
      } as any);
      jest.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as any);

      const res = await request(app)
        .post('/api/equipment')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Centrifugal Pump P-200',
          location: 'Pump Bay 4',
          criticality: 'CRITICAL',
          maintenanceHistory: 'Brand new unit',
        });

      expect(res.status).toBe(201);
      expect(res.body.equipment).toBeDefined();
      expect(res.body.equipment.name).toBe('Centrifugal Pump P-200');
      expect(res.body.equipment.criticality).toBe('CRITICAL');
    });

    it('should allow SUPERVISOR to update equipment (200)', async () => {
      const existing = {
        id: 'eq-123',
        name: 'Electric Motor M-1',
        location: 'Bay A',
        criticality: 'MEDIUM',
        maintenanceHistory: null,
      };

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(supervisorUser as any);
      jest.spyOn(prisma.equipment, 'findUnique').mockResolvedValue(existing as any);
      jest.spyOn(prisma.equipment, 'update').mockResolvedValue({
        ...existing,
        location: 'Bay B - Upgraded',
        criticality: 'HIGH',
        _count: { workOrders: 2 },
      } as any);
      jest.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as any);

      const res = await request(app)
        .patch('/api/equipment/eq-123')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .send({
          location: 'Bay B - Upgraded',
          criticality: 'HIGH',
        });

      expect(res.status).toBe(200);
      expect(res.body.equipment.location).toBe('Bay B - Upgraded');
      expect(res.body.equipment.criticality).toBe('HIGH');
    });

    it('should allow all authenticated roles to GET /api/equipment (200)', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(workerUser as any);
      jest.spyOn(prisma.equipment, 'findMany').mockResolvedValue([
        { id: '1', name: 'Pump 1', location: 'Bay 1', criticality: 'CRITICAL', _count: { workOrders: 1 } },
        { id: '2', name: 'Motor 2', location: 'Bay 2', criticality: 'LOW', _count: { workOrders: 0 } },
      ] as any);

      const res = await request(app)
        .get('/api/equipment')
        .set('Authorization', `Bearer ${workerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.equipment).toHaveLength(2);
    });

    it('should return equipment details on GET /api/equipment/:id (200)', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(workerUser as any);
      jest.spyOn(prisma.equipment, 'findUnique').mockResolvedValue({
        id: '1',
        name: 'Pump 1',
        location: 'Bay 1',
        criticality: 'CRITICAL',
        workOrders: [],
        _count: { workOrders: 0 },
      } as any);

      const res = await request(app)
        .get('/api/equipment/1')
        .set('Authorization', `Bearer ${workerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.equipment.name).toBe('Pump 1');
    });
  });
});
