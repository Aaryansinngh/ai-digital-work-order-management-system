import { PrismaClient, Role, Criticality, WorkOrderPriority, WorkOrderStatus, JobCardStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Database Seeding...');

  // 1. Clear existing data
  await prisma.auditLog.deleteMany();
  await prisma.inventoryIssue.deleteMany();
  await prisma.materialRequest.deleteMany();
  await prisma.jobCard.deleteMany();
  await prisma.workOrder.deleteMany();
  await prisma.equipment.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.user.deleteMany();

  const commonPasswordHash = await bcrypt.hash('Password123!', 10);

  // 2. Create Users
  const admin = await prisma.user.create({
    data: {
      name: 'System Admin',
      email: 'admin@example.com',
      passwordHash: commonPasswordHash,
      role: Role.ADMINISTRATOR,
      isActive: true,
    },
  });

  const supervisor1 = await prisma.user.create({
    data: {
      name: 'Robert Vance (Supervisor)',
      email: 'supervisor1@example.com',
      passwordHash: commonPasswordHash,
      role: Role.SUPERVISOR,
      isActive: true,
    },
  });

  const supervisor2 = await prisma.user.create({
    data: {
      name: 'Elena Rostova (Supervisor)',
      email: 'supervisor2@example.com',
      passwordHash: commonPasswordHash,
      role: Role.SUPERVISOR,
      isActive: true,
    },
  });

  const worker1 = await prisma.user.create({
    data: {
      name: 'John Miller (Senior Technician)',
      email: 'worker1@example.com',
      passwordHash: commonPasswordHash,
      role: Role.WORKER,
      isActive: true,
    },
  });

  const worker2 = await prisma.user.create({
    data: {
      name: 'Sarah Connor (Maintenance Worker)',
      email: 'worker2@example.com',
      passwordHash: commonPasswordHash,
      role: Role.WORKER,
      isActive: true,
    },
  });

  const worker3 = await prisma.user.create({
    data: {
      name: 'David Chen (Mechanic)',
      email: 'worker3@example.com',
      passwordHash: commonPasswordHash,
      role: Role.WORKER,
      isActive: true,
    },
  });

  const inventoryManager = await prisma.user.create({
    data: {
      name: 'Marcus Brody (Inventory Manager)',
      email: 'inventory@example.com',
      passwordHash: commonPasswordHash,
      role: Role.INVENTORY_MANAGER,
      isActive: true,
    },
  });

  console.log('✅ Created Default Users (Password: Password123!)');

  // 3. Create Equipment
  const pump = await prisma.equipment.create({
    data: {
      name: 'Centrifugal Water Pump P-101',
      location: 'Pump Room B - Bay 4',
      criticality: Criticality.CRITICAL,
      maintenanceHistory: 'Replaced impeller in Q2 2025. Annual bearing inspection completed.',
    },
  });

  const turbine = await prisma.equipment.create({
    data: {
      name: 'Main Gas Turbine T-202',
      location: 'Power Generation Turbine House A',
      criticality: Criticality.CRITICAL,
      maintenanceHistory: 'Major overhaul completed 2024. Vibration sensor calibrated last month.',
    },
  });

  const motor = await prisma.equipment.create({
    data: {
      name: 'Heavy Electric Motor M-303',
      location: 'Substation 2 - Transformer Yard',
      criticality: Criticality.HIGH,
      maintenanceHistory: 'Stator coil insulation tested OK.',
    },
  });

  const compressor = await prisma.equipment.create({
    data: {
      name: 'Rotary Screw Air Compressor C-404',
      location: 'Compressor Building - Level 1',
      criticality: Criticality.MEDIUM,
      maintenanceHistory: 'Oil filter replacement due.',
    },
  });

  const coolingSystem = await prisma.equipment.create({
    data: {
      name: 'Plant Cooling Tower CS-505',
      location: 'Outdoor Yard 3',
      criticality: Criticality.HIGH,
      maintenanceHistory: 'Descaling treatment performed quarterly.',
    },
  });

  console.log('✅ Created Equipment Assets');

  // 4. Create Inventory Items
  const bearingItem = await prisma.inventoryItem.create({
    data: {
      itemCode: 'BRG-6205',
      name: 'Deep Groove Ball Bearing 6205',
      unit: 'pcs',
      stockQuantity: 45,
      reorderLevel: 10,
      location: 'Rack A-12',
    },
  });

  const oilItem = await prisma.inventoryItem.create({
    data: {
      itemCode: 'LUB-VG68',
      name: 'Synthetic Lubricant Oil ISO VG 68',
      unit: 'Liters',
      stockQuantity: 8, // Low stock trigger
      reorderLevel: 15,
      location: 'Drum Storage Bay 2',
    },
  });

  const gasketItem = await prisma.inventoryItem.create({
    data: {
      itemCode: 'GSK-4IN',
      name: 'High-Temp Flange Gasket Kit 4"',
      unit: 'sets',
      stockQuantity: 25,
      reorderLevel: 5,
      location: 'Bin B-04',
    },
  });

  const sealItem = await prisma.inventoryItem.create({
    data: {
      itemCode: 'SEAL-P101',
      name: 'Centrifugal Pump Mechanical Seal',
      unit: 'pcs',
      stockQuantity: 3, // Low stock trigger
      reorderLevel: 5,
      location: 'Bin C-01',
    },
  });

  console.log('✅ Created Inventory Items');

  // 5. Create Work Orders & Job Cards
  const now = new Date();
  const deadlineOverdue = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const deadlineSoon = new Date(now.getTime() + 12 * 60 * 60 * 1000);
  const deadlineFuture = new Date(now.getTime() + 72 * 60 * 60 * 1000);

  // WO 1: Urgent Pump Mechanical Seal Repair
  const wo1 = await prisma.workOrder.create({
    data: {
      workOrderNumber: 'WO-2026-1001',
      equipmentId: pump.id,
      assignedToId: worker1.id,
      createdById: supervisor1.id,
      taskDescription: 'Urgent mechanical seal leak detected on Centrifugal Pump P-101. Overheating and high vibration risk.',
      priority: WorkOrderPriority.URGENT,
      priorityScore: 92.5,
      priorityExplanation: 'Calculated Priority Score: 92/100 [URGENT]\nKey Factors:\n- Equipment criticality is CRITICAL\n- High SLA risk: Urgent leak and vibration keywords',
      deadline: deadlineSoon,
      status: WorkOrderStatus.IN_PROGRESS,
    },
  });

  const jc1 = await prisma.jobCard.create({
    data: {
      workOrderId: wo1.id,
      completionPercentage: 65,
      remarks: 'Disassembled pump casing. Removed damaged seal. Waiting for replacement mechanical seal.',
      status: JobCardStatus.IN_PROGRESS,
      evidencePhotos: JSON.stringify([
        'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
      ]),
    },
  });

  // Material request for JC1
  await prisma.materialRequest.create({
    data: {
      jobCardId: jc1.id,
      inventoryItemId: sealItem.id,
      quantity: 1,
      status: 'APPROVED',
      requestedById: worker1.id,
      approvedById: supervisor1.id,
      approvedAt: now,
    },
  });

  // WO 2: Turbine Overdue Inspection (Overdue Task)
  const wo2 = await prisma.workOrder.create({
    data: {
      workOrderNumber: 'WO-2026-1002',
      equipmentId: turbine.id,
      assignedToId: worker2.id,
      createdById: supervisor2.id,
      taskDescription: 'Inspect turbine rotor bearing clearance and top up synthetic lubricant oil.',
      priority: WorkOrderPriority.HIGH,
      priorityScore: 84.0,
      priorityExplanation: 'Calculated Priority Score: 84/100 [HIGH]\nKey Factors:\n- Deadline overdue breach SLA target\n- Equipment criticality is CRITICAL',
      deadline: deadlineOverdue,
      status: WorkOrderStatus.IN_PROGRESS,
    },
  });

  await prisma.jobCard.create({
    data: {
      workOrderId: wo2.id,
      completionPercentage: 30,
      remarks: 'Rotor housing cover opened. Requested oil top-up.',
      status: JobCardStatus.IN_PROGRESS,
    },
  });

  // WO 3: Completed Work Order
  const wo3 = await prisma.workOrder.create({
    data: {
      workOrderNumber: 'WO-2026-1003',
      equipmentId: compressor.id,
      assignedToId: worker3.id,
      createdById: supervisor1.id,
      taskDescription: 'Routine oil filter replacement and air filter cleaning for Rotary Screw Air Compressor C-404.',
      priority: WorkOrderPriority.MEDIUM,
      priorityScore: 45.0,
      priorityExplanation: 'Calculated Priority Score: 45/100 [MEDIUM]\nKey Factors:\n- Standard maintenance schedule\n- Equipment criticality MEDIUM',
      deadline: deadlineFuture,
      status: WorkOrderStatus.APPROVED_CLOSED,
      completedAt: new Date(now.getTime() - 10 * 60 * 60 * 1000),
    },
  });

  await prisma.jobCard.create({
    data: {
      workOrderId: wo3.id,
      completionPercentage: 100,
      remarks: 'Replaced oil filter, cleaned air filter intake. Compressor tested under load - operating normal.',
      status: JobCardStatus.APPROVED,
      submittedAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
      approvedAt: new Date(now.getTime() - 10 * 60 * 60 * 1000),
    },
  });

  console.log('✅ Created Work Orders & Job Cards');

  // 6. Create Audit Log Entries
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'SYSTEM_INITIALIZATION',
      entityType: 'SYSTEM',
      metadata: JSON.stringify({ version: '1.0.0', initializedAt: new Date().toISOString() }),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: supervisor1.id,
      action: 'WORK_ORDER_CREATED',
      entityType: 'WORK_ORDER',
      entityId: wo1.id,
      newValue: JSON.stringify({ workOrderNumber: wo1.workOrderNumber, priority: wo1.priority }),
    },
  });

  console.log('✅ Seed Completed Successfully!');
}

main()
  .catch(e => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
