import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/db';
import { logAuditAction } from '../utils/auditLogger';
import { emitToUser, emitToRole } from '../sockets/socketGateway';

const updateJobCardSchema = z.object({
  completionPercentage: z.number().min(0).max(100).optional(),
  remarks: z.string().optional(),
  evidencePhotos: z.array(z.string()).optional(),
});

const rejectJobCardSchema = z.object({
  rejectionReason: z.string().min(3, 'Rejection reason is required.'),
});

export async function getJobCardById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const jobCard = await prisma.jobCard.findUnique({
      where: { id },
      include: {
        workOrder: {
          include: {
            equipment: true,
            assignedTo: { select: { id: true, name: true, email: true } },
            createdBy: { select: { id: true, name: true } },
          },
        },
        materialRequests: {
          include: {
            inventoryItem: true,
            requestedBy: { select: { id: true, name: true } },
            approvedBy: { select: { id: true, name: true } },
            issuedBy: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!jobCard) {
      return res.status(404).json({ message: 'Job Card not found.' });
    }

    return res.json({ jobCard });
  } catch (error) {
    next(error);
  }
}

export async function updateJobCard(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const updates = updateJobCardSchema.parse(req.body);

    const existingJC = await prisma.jobCard.findUnique({
      where: { id },
      include: { workOrder: true },
    });

    if (!existingJC) {
      return res.status(404).json({ message: 'Job Card not found.' });
    }

    // Role check: Workers can only update their assigned job cards
    if (req.user?.role === 'WORKER' && existingJC.workOrder.assignedToId !== req.user.id) {
      return res.status(403).json({ message: 'You can only update Job Cards assigned to you.' });
    }

    if (existingJC.status === 'APPROVED') {
      return res.status(400).json({ message: 'Approved Job Cards cannot be edited.' });
    }

    const updatedJC = await prisma.jobCard.update({
      where: { id },
      data: {
        ...(updates.completionPercentage !== undefined ? { completionPercentage: updates.completionPercentage } : {}),
        ...(updates.remarks !== undefined ? { remarks: updates.remarks } : {}),
        ...(updates.evidencePhotos ? { evidencePhotos: JSON.stringify(updates.evidencePhotos) } : {}),
      },
    });

    // If progress percentage changed > 0, set WorkOrder status to IN_PROGRESS
    if (updates.completionPercentage && updates.completionPercentage > 0 && existingJC.workOrder.status === 'ASSIGNED') {
      await prisma.workOrder.update({
        where: { id: existingJC.workOrderId },
        data: { status: 'IN_PROGRESS' },
      });
    }

    await logAuditAction({
      userId: req.user?.id,
      action: 'JOB_CARD_UPDATED',
      entityType: 'JOB_CARD',
      entityId: id,
      newValue: updates,
    });

    emitToRole('SUPERVISOR', 'job_card_updated', { jobCard: updatedJC });

    return res.json({ jobCard: updatedJC });
  } catch (error) {
    next(error);
  }
}

export async function submitJobCard(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const existingJC = await prisma.jobCard.findUnique({
      where: { id },
      include: { workOrder: true },
    });

    if (!existingJC) {
      return res.status(404).json({ message: 'Job Card not found.' });
    }

    if (req.user?.role === 'WORKER' && existingJC.workOrder.assignedToId !== req.user.id) {
      return res.status(403).json({ message: 'You can only submit your assigned Job Card.' });
    }

    // Update JobCard and WorkOrder status
    const submittedJC = await prisma.$transaction(async (tx) => {
      const jc = await tx.jobCard.update({
        where: { id },
        data: {
          status: 'PENDING_APPROVAL',
          submittedAt: new Date(),
          completionPercentage: 100,
        },
      });

      await tx.workOrder.update({
        where: { id: existingJC.workOrderId },
        data: { status: 'COMPLETED' },
      });

      return jc;
    });

    await logAuditAction({
      userId: req.user?.id,
      action: 'JOB_CARD_SUBMITTED',
      entityType: 'JOB_CARD',
      entityId: id,
    });

    // Send real-time notification to Supervisors
    emitToRole('SUPERVISOR', 'job_card_submitted', {
      message: `Job Card for Work Order ${existingJC.workOrder.workOrderNumber} submitted for approval.`,
      jobCard: submittedJC,
    });

    return res.json({ jobCard: submittedJC, message: 'Job Card submitted successfully for supervisor approval.' });
  } catch (error) {
    next(error);
  }
}

export async function approveJobCard(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const existingJC = await prisma.jobCard.findUnique({
      where: { id },
      include: { workOrder: true },
    });

    if (!existingJC) {
      return res.status(404).json({ message: 'Job Card not found.' });
    }

    const approvedJC = await prisma.$transaction(async (tx) => {
      const jc = await tx.jobCard.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
        },
      });

      await tx.workOrder.update({
        where: { id: existingJC.workOrderId },
        data: {
          status: 'APPROVED_CLOSED',
          completedAt: new Date(),
        },
      });

      return jc;
    });

    await logAuditAction({
      userId: req.user?.id,
      action: 'JOB_CARD_APPROVED',
      entityType: 'JOB_CARD',
      entityId: id,
    });

    emitToUser(existingJC.workOrder.assignedToId, 'job_card_approved', {
      message: `Your Job Card for Work Order ${existingJC.workOrder.workOrderNumber} was approved!`,
      jobCard: approvedJC,
    });

    return res.json({ jobCard: approvedJC, message: 'Job Card approved and Work Order closed.' });
  } catch (error) {
    next(error);
  }
}

export async function rejectJobCard(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { rejectionReason } = rejectJobCardSchema.parse(req.body);

    const existingJC = await prisma.jobCard.findUnique({
      where: { id },
      include: { workOrder: true },
    });

    if (!existingJC) {
      return res.status(404).json({ message: 'Job Card not found.' });
    }

    const rejectedJC = await prisma.$transaction(async (tx) => {
      const jc = await tx.jobCard.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectionReason,
        },
      });

      await tx.workOrder.update({
        where: { id: existingJC.workOrderId },
        data: { status: 'IN_PROGRESS' },
      });

      return jc;
    });

    await logAuditAction({
      userId: req.user?.id,
      action: 'JOB_CARD_REJECTED',
      entityType: 'JOB_CARD',
      entityId: id,
      newValue: { rejectionReason },
    });

    emitToUser(existingJC.workOrder.assignedToId, 'job_card_rejected', {
      message: `Your Job Card for ${existingJC.workOrder.workOrderNumber} was returned for rework. Reason: ${rejectionReason}`,
      jobCard: rejectedJC,
    });

    return res.json({ jobCard: rejectedJC, message: 'Job Card rejected and sent back to worker for rework.' });
  } catch (error) {
    next(error);
  }
}
