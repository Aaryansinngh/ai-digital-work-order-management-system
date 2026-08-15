import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';

export async function getAuditLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const action = req.query.action as string | undefined;
    const entityType = req.query.entityType as string | undefined;

    const logs = await prisma.auditLog.findMany({
      where: {
        ...(action ? { action } : {}),
        ...(entityType ? { entityType } : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return res.json({ auditLogs: logs });
  } catch (error) {
    next(error);
  }
}
