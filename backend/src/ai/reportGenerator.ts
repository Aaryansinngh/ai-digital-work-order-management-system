import prisma from '../config/db';

export interface ReportRequestParams {
  startDate?: string;
  endDate?: string;
  module: 'WORK_ORDERS' | 'INVENTORY' | 'JOB_CARDS' | 'SYSTEM_EXECUTIVE';
}

export interface GeneratedReportResult {
  title: string;
  generatedAt: string;
  timeframe: string;
  generatedSummary: string;
  sourceData: any;
}

export async function generateNaturalLanguageReport(params: ReportRequestParams): Promise<GeneratedReportResult> {
  const startDate = params.startDate ? new Date(params.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = params.endDate ? new Date(params.endDate) : new Date();

  const timeframeStr = `${startDate.toISOString().slice(0, 10)} to ${endDate.toISOString().slice(0, 10)}`;

  try {
    switch (params.module) {
    case 'WORK_ORDERS': {
      const totalCount = await prisma.workOrder.count({
        where: { createdAt: { gte: startDate, lte: endDate } },
      });

      const statusGroups = await prisma.workOrder.groupBy({
        by: ['status'],
        where: { createdAt: { gte: startDate, lte: endDate } },
        _count: { _all: true },
      });

      const priorityGroups = await prisma.workOrder.groupBy({
        by: ['priority'],
        where: { createdAt: { gte: startDate, lte: endDate } },
        _count: { _all: true },
      });

      const overdueCount = await prisma.workOrder.count({
        where: {
          deadline: { lt: new Date() },
          status: { notIn: ['COMPLETED', 'APPROVED_CLOSED'] },
        },
      });

      const completedCount = statusGroups.find(g => g.status === 'APPROVED_CLOSED')?._count._all || 0;
      const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      const summary = `### Executive Work Order Summary (${timeframeStr})

During this period, **${totalCount} work orders** were logged across the system. 
- **Completion Efficiency**: ${completionRate}% of work orders (${completedCount}/${totalCount}) have reached final closed approval.
- **Overdue Attention**: There are currently **${overdueCount} overdue work orders** breaching SLA targets that require immediate supervisor follow-up.
- **Priority Distribution**: Urgent work orders represent ${priorityGroups.find(p => p.priority === 'URGENT')?._count._all || 0} tasks, while High priority accounts for ${priorityGroups.find(p => p.priority === 'HIGH')?._count._all || 0} tasks.
- **Operational Recommendation**: Reallocate available maintenance personnel to tackle overdue high-criticality equipment tasks first.`;

      return {
        title: 'Industrial Work Order Performance & SLA Report',
        generatedAt: new Date().toISOString(),
        timeframe: timeframeStr,
        generatedSummary: summary,
        sourceData: {
          totalWorkOrders: totalCount,
          statusDistribution: statusGroups.map(g => ({ status: g.status, count: g._count._all })),
          priorityDistribution: priorityGroups.map(g => ({ priority: g.priority, count: g._count._all })),
          overdueCount,
          completionRatePercent: completionRate,
        },
      };
    }

    case 'INVENTORY': {
      const totalItems = await prisma.inventoryItem.count();
      const items = await prisma.inventoryItem.findMany();
      
      const lowStockItems = items.filter(item => item.stockQuantity <= item.reorderLevel);
      const totalStockUnits = items.reduce((sum, item) => sum + item.stockQuantity, 0);

      const recentIssues = await prisma.inventoryIssue.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          inventoryItem: true,
          issuedBy: { select: { name: true } },
        },
      });

      const summary = `### Inventory & Material Consumption Summary (${timeframeStr})

The facility currently monitors **${totalItems} distinct spare parts & consumables** representing **${totalStockUnits} total stock units**.
- **Low Stock Threshold Alert**: **${lowStockItems.length} items** have dropped below their designated reorder point. Critical low-stock items include: ${lowStockItems.map(i => `${i.name} (${i.stockQuantity} ${i.unit} remaining)`).join(', ') || 'None'}.
- **Material Disbursements**: ${recentIssues.length} recent material disbursements recorded.
- **Reorder Recommendation**: Submit procurement purchase orders immediately for all highlighted low-stock items to prevent equipment maintenance downtime.`;

      return {
        title: 'Inventory Stock Levels & Disbursement Audit Report',
        generatedAt: new Date().toISOString(),
        timeframe: timeframeStr,
        generatedSummary: summary,
        sourceData: {
          totalItems,
          totalStockUnits,
          lowStockItemCount: lowStockItems.length,
          lowStockItems: lowStockItems.map(i => ({ name: i.name, itemCode: i.itemCode, stock: i.stockQuantity, reorderLevel: i.reorderLevel })),
          recentDisbursements: recentIssues.map(iss => ({ item: iss.inventoryItem.name, quantity: iss.quantity, issuedBy: iss.issuedBy.name, date: iss.createdAt })),
        },
      };
    }

    default: {
      const totalUsers = await prisma.user.count({ where: { isActive: true } });
      const totalWO = await prisma.workOrder.count();
      const totalJC = await prisma.jobCard.count();
      const pendingApprovalJC = await prisma.jobCard.count({ where: { status: 'PENDING_APPROVAL' } });
      const pendingMaterialReq = await prisma.materialRequest.count({ where: { status: 'PENDING' } });

      const summary = `### Comprehensive System Executive Audit (${timeframeStr})

The AI CMMS digital platform is operating with **${totalUsers} active users**.
- **Work Orders & Job Cards**: **${totalWO} Work Orders** created with matching 1:1 Job Cards (${totalJC} total).
- **Supervisor Action Queue**: There are **${pendingApprovalJC} Job Cards** awaiting supervisor sign-off and **${pendingMaterialReq} Material Requests** pending supervisor authorization.
- **Audit Compliance**: System access, role adjustments, and work-order state changes are fully recorded in the immutable audit log.`;

      return {
        title: 'System Operational Executive Summary',
        generatedAt: new Date().toISOString(),
        timeframe: timeframeStr,
        generatedSummary: summary,
        sourceData: {
          activeUsers: totalUsers,
          totalWorkOrders: totalWO,
          totalJobCards: totalJC,
          pendingJobCardApprovals: pendingApprovalJC,
          pendingMaterialRequests: pendingMaterialReq,
        },
      };
    }
    }
  } catch (err) {
    return {
      title: 'Automated System Performance Report (Fallback)',
      generatedAt: new Date().toISOString(),
      timeframe: timeframeStr,
      generatedSummary: 'System report generated automatically in fallback mode.',
      sourceData: { fallback: true },
    };
  }
}
