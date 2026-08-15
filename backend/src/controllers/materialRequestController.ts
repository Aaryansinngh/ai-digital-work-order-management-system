import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/db';
import { MaterialRequestStatus } from '@prisma/client';
import { logAuditAction } from '../utils/auditLogger';
import { emitToUser, emitToRole, emitToAll } from '../sockets/socketGateway';

const createMaterialRequestSchema = z.object({
  jobCardId: z.string().uuid(),
  inventoryItemId: z.string().uuid(),
  quantity: z.number().int().positive('Quantity must be greater than 0'),
});

const rejectMaterialRequestSchema = z.object({
  rejectionReason: z.string().min(3, 'Rejection reason is required'),
});

export async function createMaterialRequest(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createMaterialRequestSchema.parse(req.body);
    const requestedById = req.user!.id;

    const jobCard = await prisma.jobCard.findUnique({
      where: { id: data.jobCardId },
      include: { workOrder: true },
    });

    if (!jobCard) {
      return res.status(404).json({ message: 'Job Card not found.' });
    }

    const inventoryItem = await prisma.inventoryItem.findUnique({
      where: { id: data.inventoryItemId },
    });

    if (!inventoryItem) {
      return res.status(404).json({ message: 'Inventory item not found.' });
    }

    const materialRequest = await prisma.materialRequest.create({
      data: {
        jobCardId: data.jobCardId,
        inventoryItemId: data.inventoryItemId,
        quantity: data.quantity,
        requestedById,
        status: 'PENDING',
      },
      include: {
        inventoryItem: true,
        requestedBy: { select: { id: true, name: true } },
      },
    });

    await logAuditAction({
      userId: requestedById,
      action: 'MATERIAL_REQUEST_CREATED',
      entityType: 'MATERIAL_REQUEST',
      entityId: materialRequest.id,
      newValue: { item: inventoryItem.name, quantity: data.quantity },
    });

    emitToRole('SUPERVISOR', 'material_request_created', {
      message: `New Material Request raised for ${inventoryItem.name} (Qty: ${data.quantity})`,
      materialRequest,
    });

    return res.status(201).json({ materialRequest });
  } catch (error) {
    next(error);
  }
}

export async function getMaterialRequests(req: Request, res: Response, next: NextFunction) {
  try {
    const status = req.query.status as MaterialRequestStatus | undefined;

    const requests = await prisma.materialRequest.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(req.user?.role === 'WORKER' ? { requestedById: req.user.id } : {}),
      },
      include: {
        inventoryItem: true,
        jobCard: {
          include: {
            workOrder: {
              select: { workOrderNumber: true, taskDescription: true },
            },
          },
        },
        requestedBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true } },
        issuedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ materialRequests: requests });
  } catch (error) {
    next(error);
  }
}

export async function approveMaterialRequest(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const supervisorId = req.user!.id;

    const request = await prisma.materialRequest.findUnique({ where: { id } });
    if (!request) {
      return res.status(404).json({ message: 'Material request not found.' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ message: `Material request is already ${request.status}.` });
    }

    const approvedRequest = await prisma.materialRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: supervisorId,
        approvedAt: new Date(),
      },
      include: {
        inventoryItem: true,
        requestedBy: { select: { id: true, name: true } },
      },
    });

    await logAuditAction({
      userId: supervisorId,
      action: 'MATERIAL_REQUEST_APPROVED',
      entityType: 'MATERIAL_REQUEST',
      entityId: id,
    });

    // Notify Inventory Managers to issue material
    emitToRole('INVENTORY_MANAGER', 'material_request_approved', {
      message: `Material Request approved. Ready for issuance: ${approvedRequest.inventoryItem.name}`,
      materialRequest: approvedRequest,
    });

    emitToUser(approvedRequest.requestedById, 'material_request_updated', {
      message: `Your Material Request for ${approvedRequest.inventoryItem.name} was approved by supervisor.`,
      materialRequest: approvedRequest,
    });

    return res.json({ materialRequest: approvedRequest });
  } catch (error) {
    next(error);
  }
}

export async function rejectMaterialRequest(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { rejectionReason } = rejectMaterialRequestSchema.parse(req.body);

    const request = await prisma.materialRequest.findUnique({ where: { id } });
    if (!request) {
      return res.status(404).json({ message: 'Material request not found.' });
    }

    const rejectedRequest = await prisma.materialRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approvedById: req.user!.id,
        approvedAt: new Date(),
        rejectionReason,
      },
      include: { inventoryItem: true },
    });

    await logAuditAction({
      userId: req.user!.id,
      action: 'MATERIAL_REQUEST_REJECTED',
      entityType: 'MATERIAL_REQUEST',
      entityId: id,
      newValue: { rejectionReason },
    });

    emitToUser(request.requestedById, 'material_request_updated', {
      message: `Your Material Request for ${rejectedRequest.inventoryItem.name} was rejected. Reason: ${rejectionReason}`,
      materialRequest: rejectedRequest,
    });

    return res.json({ materialRequest: rejectedRequest });
  } catch (error) {
    next(error);
  }
}

export async function issueMaterialRequest(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const inventoryManagerId = req.user!.id;

    const request = await prisma.materialRequest.findUnique({
      where: { id },
      include: { inventoryItem: true },
    });

    if (!request) {
      return res.status(404).json({ message: 'Material request not found.' });
    }

    if (request.status !== 'APPROVED') {
      return res.status(400).json({ message: 'Only approved material requests can be issued.' });
    }

    // Guardrail: Check sufficient stock level
    if (request.inventoryItem.stockQuantity < request.quantity) {
      return res.status(400).json({
        message: `Insufficient stock to satisfy request. Available: ${request.inventoryItem.stockQuantity} ${request.inventoryItem.unit}, Requested: ${request.quantity} ${request.inventoryItem.unit}`,
      });
    }

    // Atomic Transaction: Deduct stock, issue request, record issue history
    const { updatedRequest, updatedItem } = await prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.update({
        where: { id: request.inventoryItemId },
        data: {
          stockQuantity: {
            decrement: request.quantity,
          },
        },
      });

      const issuedReq = await tx.materialRequest.update({
        where: { id },
        data: {
          status: 'ISSUED',
          issuedById: inventoryManagerId,
          issuedAt: new Date(),
        },
      });

      await tx.inventoryIssue.create({
        data: {
          inventoryItemId: request.inventoryItemId,
          quantity: request.quantity,
          materialRequestId: id,
          issuedById: inventoryManagerId,
        },
      });

      return { updatedRequest: issuedReq, updatedItem: item };
    });

    await logAuditAction({
      userId: inventoryManagerId,
      action: 'MATERIAL_ISSUED',
      entityType: 'MATERIAL_REQUEST',
      entityId: id,
      newValue: {
        item: updatedItem.name,
        quantityIssued: request.quantity,
        remainingStock: updatedItem.stockQuantity,
      },
    });

    // Check low-stock threshold alert
    if (updatedItem.stockQuantity <= updatedItem.reorderLevel) {
      emitToAll('low_stock_warning', {
        message: `⚠️ LOW STOCK ALERT: ${updatedItem.name} (${updatedItem.itemCode}) stock level is ${updatedItem.stockQuantity} ${updatedItem.unit} (Reorder level: ${updatedItem.reorderLevel}).`,
        inventoryItem: updatedItem,
      });
    }

    emitToUser(request.requestedById, 'material_request_issued', {
      message: `Materials issued for your job card: ${updatedItem.name} (Qty: ${request.quantity})`,
      materialRequest: updatedRequest,
    });

    return res.json({
      materialRequest: updatedRequest,
      remainingStock: updatedItem.stockQuantity,
      message: 'Materials issued successfully.',
    });
  } catch (error) {
    next(error);
  }
}
