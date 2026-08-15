import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/db';
import { WorkOrderPriority, WorkOrderStatus } from '@prisma/client';
import { calculatePriorityScore } from '../ai/priorityScorer';
import { logAuditAction } from '../utils/auditLogger';
import { emitToUser, emitToRole } from '../sockets/socketGateway';

const createWorkOrderSchema = z.object({
  equipmentId: z.string().uuid(),
  assignedToId: z.string().uuid(),
  taskDescription: z.string().min(5),
  deadline: z.string(),
  priority: z.nativeEnum(WorkOrderPriority).optional(),
});

const updateWorkOrderSchema = z.object({
  assignedToId: z.string().uuid().optional(),
  priority: z.nativeEnum(WorkOrderPriority).optional(),
  deadline: z.string().optional(),
  status: z.nativeEnum(WorkOrderStatus).optional(),
  taskDescription: z.string().optional(),
});

export async function createWorkOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createWorkOrderSchema.parse(req.body);
    const createdById = req.user!.id;

    // Check assigned worker exists and is active WORKER
    const assignedWorker = await prisma.user.findUnique({
      where: { id: data.assignedToId },
    });

    if (!assignedWorker || !assignedWorker.isActive || assignedWorker.role !== 'WORKER') {
      return res.status(400).json({ message: 'Invalid assigned worker. Must be an active worker.' });
    }

    // Get equipment details
    const equipment = await prisma.equipment.findUnique({
      where: { id: data.equipmentId },
    });

    if (!equipment) {
      return res.status(404).json({ message: 'Equipment not found.' });
    }

    // Calculate Priority Score via AI Engine
    const scoreResult = calculatePriorityScore({
      deadline: data.deadline,
      criticality: equipment.criticality,
      taskDescription: data.taskDescription,
    });

    const finalPriority = data.priority || scoreResult.priority;
    const workOrderNumber = `WO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Create Work Order and auto-generate 1 JobCard in transaction
    const newWorkOrder = await prisma.$transaction(async (tx) => {
      const wo = await tx.workOrder.create({
        data: {
          workOrderNumber,
          equipmentId: data.equipmentId,
          assignedToId: data.assignedToId,
          createdById,
          taskDescription: data.taskDescription,
          priority: finalPriority,
          priorityScore: scoreResult.score,
          priorityExplanation: scoreResult.explanation,
          deadline: new Date(data.deadline),
          status: 'ASSIGNED',
        },
      });

      // Automatically create EXACTLY ONE JobCard
      const jc = await tx.jobCard.create({
        data: {
          workOrderId: wo.id,
          completionPercentage: 0,
          status: 'IN_PROGRESS',
        },
      });

      return { ...wo, jobCard: jc };
    });

    // Audit Log
    await logAuditAction({
      userId: createdById,
      action: 'WORK_ORDER_CREATED',
      entityType: 'WORK_ORDER',
      entityId: newWorkOrder.id,
      newValue: {
        workOrderNumber: newWorkOrder.workOrderNumber,
        assignedTo: assignedWorker.name,
        priority: newWorkOrder.priority,
        priorityScore: newWorkOrder.priorityScore,
      },
    });

    // Real-time notifications
    emitToUser(data.assignedToId, 'work_order_assigned', {
      message: `New Work Order assigned to you: ${newWorkOrder.workOrderNumber}`,
      workOrder: newWorkOrder,
    });

    emitToRole('SUPERVISOR', 'work_order_created', {
      message: `Work Order created: ${newWorkOrder.workOrderNumber}`,
      workOrder: newWorkOrder,
    });

    return res.status(201).json({ workOrder: newWorkOrder });
  } catch (error) {
    next(error);
  }
}

export async function getWorkOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const status = req.query.status as WorkOrderStatus | undefined;
    const priority = req.query.priority as WorkOrderPriority | undefined;
    const assignedToId = req.query.assignedToId as string | undefined;
    const equipmentId = req.query.equipmentId as string | undefined;
    const search = req.query.search as string | undefined;

    // If logged in user is WORKER, default assignedToId filter to self unless overriden
    const workerFilter = req.user?.role === 'WORKER' ? req.user.id : assignedToId;

    const workOrders = await prisma.workOrder.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(priority ? { priority } : {}),
        ...(workerFilter ? { assignedToId: workerFilter } : {}),
        ...(equipmentId ? { equipmentId } : {}),
        ...(search
          ? {
              OR: [
                { workOrderNumber: { contains: search, mode: 'insensitive' } },
                { taskDescription: { contains: search, mode: 'insensitive' } },
                { equipment: { name: { contains: search, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      include: {
        equipment: true,
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        jobCard: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ workOrders });
  } catch (error) {
    next(error);
  }
}

export async function getWorkOrderById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const workOrder = await prisma.workOrder.findUnique({
      where: { id },
      include: {
        equipment: true,
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        jobCard: {
          include: {
            materialRequests: {
              include: {
                inventoryItem: true,
                requestedBy: { select: { id: true, name: true } },
                approvedBy: { select: { id: true, name: true } },
                issuedBy: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!workOrder) {
      return res.status(404).json({ message: 'Work Order not found.' });
    }

    return res.json({ workOrder });
  } catch (error) {
    next(error);
  }
}

export async function updateWorkOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const updates = updateWorkOrderSchema.parse(req.body);

    const existingWO = await prisma.workOrder.findUnique({ where: { id } });
    if (!existingWO) {
      return res.status(404).json({ message: 'Work Order not found.' });
    }

    if (existingWO.status === 'APPROVED_CLOSED') {
      return res.status(400).json({ message: 'Cannot modify a closed work order. Corrections appear in audit logs.' });
    }

    const updatedWO = await prisma.workOrder.update({
      where: { id },
      data: {
        ...(updates.assignedToId ? { assignedToId: updates.assignedToId } : {}),
        ...(updates.priority ? { priority: updates.priority } : {}),
        ...(updates.deadline ? { deadline: new Date(updates.deadline) } : {}),
        ...(updates.status ? { status: updates.status } : {}),
        ...(updates.taskDescription ? { taskDescription: updates.taskDescription } : {}),
      },
      include: {
        equipment: true,
        assignedTo: { select: { id: true, name: true } },
        jobCard: true,
      },
    });

    await logAuditAction({
      userId: req.user?.id,
      action: 'WORK_ORDER_UPDATED',
      entityType: 'WORK_ORDER',
      entityId: id,
      previousValue: { priority: existingWO.priority, status: existingWO.status, assignedToId: existingWO.assignedToId },
      newValue: { priority: updatedWO.priority, status: updatedWO.status, assignedToId: updatedWO.assignedToId },
    });

    emitToRole('SUPERVISOR', 'work_order_updated', { workOrder: updatedWO });
    emitToUser(updatedWO.assignedToId, 'work_order_updated', { workOrder: updatedWO });

    return res.json({ workOrder: updatedWO });
  } catch (error) {
    next(error);
  }
}
