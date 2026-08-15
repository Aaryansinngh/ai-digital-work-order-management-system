import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../config/db';
import { Role } from '@prisma/client';
import { logAuditAction } from '../utils/auditLogger';

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.nativeEnum(Role),
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.nativeEnum(Role).optional(),
  isActive: z.boolean().optional(),
});

export async function getUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const roleFilter = req.query.role as Role | undefined;
    const search = req.query.search as string | undefined;

    const users = await prisma.user.findMany({
      where: {
        ...(roleFilter ? { role: roleFilter } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ users });
  } catch (error) {
    next(error);
  }
}

export async function createUser(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createUserSchema.parse(req.body);

    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });

    if (existing) {
      return res.status(400).json({ message: 'User with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const newUser = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase().trim(),
        passwordHash,
        role: data.role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    await logAuditAction({
      userId: req.user?.id,
      action: 'USER_CREATED',
      entityType: 'USER',
      entityId: newUser.id,
      newValue: { name: newUser.name, email: newUser.email, role: newUser.role },
    });

    return res.status(201).json({ user: newUser });
  } catch (error) {
    next(error);
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const updates = updateUserSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const updateData: any = { ...updates };
    if (updates.password) {
      updateData.passwordHash = await bcrypt.hash(updates.password, 10);
      delete updateData.password;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await logAuditAction({
      userId: req.user?.id,
      action: 'USER_UPDATED',
      entityType: 'USER',
      entityId: updatedUser.id,
      previousValue: { name: existingUser.name, role: existingUser.role, isActive: existingUser.isActive },
      newValue: { name: updatedUser.name, role: updatedUser.role, isActive: updatedUser.isActive },
    });

    return res.json({ user: updatedUser });
  } catch (error) {
    next(error);
  }
}
