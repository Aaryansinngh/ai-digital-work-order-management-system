import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../config/db';
import { ENV } from '../config/env';
import { logAuditAction } from '../utils/auditLogger';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      await logAuditAction({
        action: 'LOGIN_FAILED',
        entityType: 'USER',
        metadata: { email, reason: 'Email not found' },
      });
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (!user.isActive) {
      await logAuditAction({
        userId: user.id,
        action: 'LOGIN_BLOCKED_DEACTIVATED',
        entityType: 'USER',
        entityId: user.id,
      });
      return res.status(403).json({ message: 'Account is deactivated. Please contact an administrator.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      await logAuditAction({
        userId: user.id,
        action: 'LOGIN_FAILED',
        entityType: 'USER',
        entityId: user.id,
        metadata: { email, reason: 'Incorrect password' },
      });
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      ENV.JWT_SECRET,
      { expiresIn: ENV.JWT_EXPIRES_IN as any }
    );

    await logAuditAction({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      entityType: 'USER',
      entityId: user.id,
    });

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return res.json({ user });
  } catch (error) {
    next(error);
  }
}

const bootstrapSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  email: z.string().email('Valid email is required.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

export async function bootstrapAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      return res.status(403).json({ message: 'Bootstrap already completed. An administrator account already exists.' });
    }

    const { name, email, password } = bootstrapSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        passwordHash,
        role: 'ADMINISTRATOR',
        isActive: true,
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
      userId: user.id,
      action: 'ADMIN_BOOTSTRAP',
      entityType: 'USER',
      entityId: user.id,
      metadata: { email: user.email },
    });

    return res.status(201).json({
      message: 'Administrator account created successfully.',
      user,
    });
  } catch (error) {
    next(error);
  }
}
