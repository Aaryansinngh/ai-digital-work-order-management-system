import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/db';
import { logAuditAction } from '../utils/auditLogger';

const createInventoryItemSchema = z.object({
  itemCode: z.string().min(2),
  name: z.string().min(2),
  unit: z.string().min(1),
  stockQuantity: z.number().int().min(0),
  reorderLevel: z.number().int().min(0),
  location: z.string().optional(),
});

const updateInventoryItemSchema = z.object({
  name: z.string().optional(),
  unit: z.string().optional(),
  stockQuantity: z.number().int().min(0).optional(),
  reorderLevel: z.number().int().min(0).optional(),
  location: z.string().optional(),
});

export async function getInventoryItems(req: Request, res: Response, next: NextFunction) {
  try {
    const search = req.query.search as string | undefined;
    const lowStockOnly = req.query.lowStock === 'true';

    const items = await prisma.inventoryItem.findMany({
      where: {
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { itemCode: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
    });

    const filteredItems = lowStockOnly ? items.filter(item => item.stockQuantity <= item.reorderLevel) : items;

    return res.json({
      items: filteredItems.map(item => ({
        ...item,
        isLowStock: item.stockQuantity <= item.reorderLevel,
      })),
      totalCount: items.length,
      lowStockCount: items.filter(i => i.stockQuantity <= i.reorderLevel).length,
    });
  } catch (error) {
    next(error);
  }
}

export async function createInventoryItem(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createInventoryItemSchema.parse(req.body);

    const existing = await prisma.inventoryItem.findUnique({
      where: { itemCode: data.itemCode },
    });

    if (existing) {
      return res.status(400).json({ message: `Item code '${data.itemCode}' already exists.` });
    }

    const item = await prisma.inventoryItem.create({
      data: {
        itemCode: data.itemCode,
        name: data.name,
        unit: data.unit,
        stockQuantity: data.stockQuantity,
        reorderLevel: data.reorderLevel,
        location: data.location,
      },
    });

    await logAuditAction({
      userId: req.user?.id,
      action: 'INVENTORY_ITEM_CREATED',
      entityType: 'INVENTORY_ITEM',
      entityId: item.id,
      newValue: { name: item.name, stockQuantity: item.stockQuantity },
    });

    return res.status(201).json({ item });
  } catch (error) {
    next(error);
  }
}

export async function updateInventoryItem(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const updates = updateInventoryItemSchema.parse(req.body);

    const existing = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Inventory item not found.' });
    }

    const updatedItem = await prisma.inventoryItem.update({
      where: { id },
      data: updates,
    });

    await logAuditAction({
      userId: req.user?.id,
      action: 'INVENTORY_ITEM_UPDATED',
      entityType: 'INVENTORY_ITEM',
      entityId: id,
      previousValue: { stockQuantity: existing.stockQuantity, reorderLevel: existing.reorderLevel },
      newValue: { stockQuantity: updatedItem.stockQuantity, reorderLevel: updatedItem.reorderLevel },
    });

    return res.json({ item: updatedItem });
  } catch (error) {
    next(error);
  }
}

export async function getInventoryIssueHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const issues = await prisma.inventoryIssue.findMany({
      include: {
        inventoryItem: true,
        issuedBy: { select: { id: true, name: true, email: true } },
        materialRequest: {
          include: {
            jobCard: {
              include: {
                workOrder: { select: { workOrderNumber: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ issues });
  } catch (error) {
    next(error);
  }
}

export async function getEquipmentList(req: Request, res: Response, next: NextFunction) {
  try {
    const equipment = await prisma.equipment.findMany({
      orderBy: { name: 'asc' },
    });
    return res.json({ equipment });
  } catch (error) {
    next(error);
  }
}
