import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { calculatePriorityScore } from '../ai/priorityScorer';
import { executeSemanticSearch } from '../ai/semanticSearch';
import { generateNaturalLanguageReport } from '../ai/reportGenerator';
import { Criticality } from '@prisma/client';

const scorePreviewSchema = z.object({
  deadline: z.string(),
  criticality: z.nativeEnum(Criticality),
  taskDescription: z.string(),
});

export async function previewPriorityScore(req: Request, res: Response, next: NextFunction) {
  try {
    const data = scorePreviewSchema.parse(req.body);
    const result = calculatePriorityScore(data);
    return res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function searchWorkOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const query = (req.query.query as string) || '';
    const status = req.query.status as any;
    const priority = req.query.priority as any;
    const equipmentId = req.query.equipmentId as string;
    const assignedToId = req.query.assignedToId as string;

    const results = await executeSemanticSearch({
      query,
      status,
      priority,
      equipmentId,
      assignedToId,
    });

    return res.json({
      query,
      count: results.length,
      results,
    });
  } catch (error) {
    next(error);
  }
}

export async function generateReport(req: Request, res: Response, next: NextFunction) {
  try {
    const { startDate, endDate, module } = req.body;
    const report = await generateNaturalLanguageReport({
      startDate,
      endDate,
      module: module || 'WORK_ORDERS',
    });

    return res.json({ report });
  } catch (error) {
    next(error);
  }
}
