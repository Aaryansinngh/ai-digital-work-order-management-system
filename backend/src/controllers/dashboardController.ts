import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';

export async function getDashboardData(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const now = new Date();

    // 1. SUPERVISOR DASHBOARD METRICS
    if (user.role === 'SUPERVISOR') {
      const activeWorkOrders = await prisma.workOrder.count({
        where: { status: { in: ['CREATED', 'ASSIGNED', 'IN_PROGRESS'] } },
      });

      const completedWorkOrders = await prisma.workOrder.count({
        where: { status: { in: ['COMPLETED', 'APPROVED_CLOSED'] } },
      });

      const pendingJobCardApprovals = await prisma.jobCard.count({
        where: { status: 'PENDING_APPROVAL' },
      });

      const pendingMaterialApprovals = await prisma.materialRequest.count({
        where: { status: 'PENDING' },
      });

      const overdueWorkOrders = await prisma.workOrder.count({
        where: {
          deadline: { lt: now },
          status: { notIn: ['COMPLETED', 'APPROVED_CLOSED'] },
        },
      });

      // Priority Distribution Chart
      const priorityRaw = await prisma.workOrder.groupBy({
        by: ['priority'],
        _count: { _all: true },
      });
      const priorityDistribution = priorityRaw.map(p => ({ name: p.priority, count: p._count._all }));

      // Status Distribution Chart
      const statusRaw = await prisma.workOrder.groupBy({
        by: ['status'],
        _count: { _all: true },
      });
      const statusDistribution = statusRaw.map(s => ({ name: s.status, count: s._count._all }));

      // Worker Workload Chart
      const workers = await prisma.user.findMany({
        where: { role: 'WORKER', isActive: true },
        select: {
          id: true,
          name: true,
          assignedWorkOrders: {
            where: { status: { notIn: ['APPROVED_CLOSED'] } },
            select: { id: true },
          },
        },
      });

      const workerWorkload = workers.map(w => ({
        workerName: w.name,
        activeTasks: w.assignedWorkOrders.length,
      }));

      // Recent Activity Log
      const recentAudit = await prisma.auditLog.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true, role: true } } },
      });

      return res.json({
        role: 'SUPERVISOR',
        metrics: {
          activeWorkOrders,
          completedWorkOrders,
          pendingJobCardApprovals,
          pendingMaterialApprovals,
          overdueWorkOrders,
        },
        charts: {
          priorityDistribution,
          statusDistribution,
          workerWorkload,
        },
        recentActivity: recentAudit,
      });
    }

    // 2. WORKER DASHBOARD METRICS
    if (user.role === 'WORKER') {
      const myWorkOrders = await prisma.workOrder.findMany({
        where: { assignedToId: user.id },
        include: {
          equipment: true,
          jobCard: true,
        },
        orderBy: { deadline: 'asc' },
      });

      const assignedJobs = myWorkOrders.filter(w => w.status === 'ASSIGNED').length;
      const inProgressJobs = myWorkOrders.filter(w => w.status === 'IN_PROGRESS').length;
      const completedJobs = myWorkOrders.filter(w => w.status === 'COMPLETED' || w.status === 'APPROVED_CLOSED').length;
      const pendingMaterialRequests = await prisma.materialRequest.count({
        where: { requestedById: user.id, status: 'PENDING' },
      });
      const overdueTasks = myWorkOrders.filter(
        w => new Date(w.deadline) < now && !['COMPLETED', 'APPROVED_CLOSED'].includes(w.status)
      ).length;

      return res.json({
        role: 'WORKER',
        metrics: {
          assignedJobs,
          inProgressJobs,
          completedJobs,
          pendingMaterialRequests,
          overdueTasks,
        },
        workOrders: myWorkOrders,
      });
    }

    // 3. INVENTORY MANAGER DASHBOARD METRICS
    if (user.role === 'INVENTORY_MANAGER') {
      const items = await prisma.inventoryItem.findMany();
      const totalItems = items.length;
      const totalStockUnits = items.reduce((sum, i) => sum + i.stockQuantity, 0);
      const lowStockItems = items.filter(i => i.stockQuantity <= i.reorderLevel);

      const pendingMaterialRequests = await prisma.materialRequest.count({
        where: { status: 'APPROVED' }, // Approved by supervisor, waiting issuance
      });

      const recentIssues = await prisma.inventoryIssue.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: {
          inventoryItem: true,
          issuedBy: { select: { name: true } },
        },
      });

      return res.json({
        role: 'INVENTORY_MANAGER',
        metrics: {
          totalItems,
          totalStockUnits,
          lowStockCount: lowStockItems.length,
          pendingIssuances: pendingMaterialRequests,
        },
        lowStockItems: lowStockItems.map(i => ({ id: i.id, name: i.name, itemCode: i.itemCode, stock: i.stockQuantity, reorderLevel: i.reorderLevel })),
        recentIssues,
      });
    }

    // 4. ADMINISTRATOR DASHBOARD METRICS
    const totalUsers = await prisma.user.count();
    const activeUsers = await prisma.user.count({ where: { isActive: true } });
    const usersByRole = await prisma.user.groupBy({
      by: ['role'],
      _count: { _all: true },
    });

    const totalWO = await prisma.workOrder.count();
    const closedWO = await prisma.workOrder.count({ where: { status: 'APPROVED_CLOSED' } });
    const completionRate = totalWO > 0 ? Math.round((closedWO / totalWO) * 100) : 0;

    const recentAudit = await prisma.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, email: true, role: true } } },
    });

    return res.json({
      role: 'ADMINISTRATOR',
      metrics: {
        totalUsers,
        activeUsers,
        totalWorkOrders: totalWO,
        closedWorkOrders: closedWO,
        completionRate,
      },
      usersByRole: usersByRole.map(u => ({ role: u.role, count: u._count._all })),
      recentAudit,
    });
  } catch (error) {
    next(error);
  }
}
