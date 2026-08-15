import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import logger from '../utils/logger';
import { Role } from '@prisma/client';

let io: SocketIOServer | null = null;

export interface SocketUser {
  id: string;
  email: string;
  role: Role;
}

export function initSocketGateway(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    },
  });

  // JWT Middleware for Socket Connections
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication token required for Socket connection'));
    }

    try {
      const decoded = jwt.verify(token, ENV.JWT_SECRET) as SocketUser;
      (socket as any).user = decoded;
      next();
    } catch (err) {
      next(new Error('Invalid Socket authentication token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user as SocketUser;
    logger.info(`⚡ Socket Connected: User ${user.email} (${user.role}) - ID: ${socket.id}`);

    // Join room for specific user ID
    socket.join(`user:${user.id}`);
    // Join room for role
    socket.join(`role:${user.role}`);

    socket.on('disconnect', () => {
      logger.info(`🔌 Socket Disconnected: User ${user.email}`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.io gateway has not been initialized');
  }
  return io;
}

export function emitToUser(userId: string, event: string, payload: any) {
  if (io) {
    io.to(`user:${userId}`).emit(event, payload);
  }
}

export function emitToRole(role: Role, event: string, payload: any) {
  if (io) {
    io.to(`role:${role}`).emit(event, payload);
  }
}

export function emitToAll(event: string, payload: any) {
  if (io) {
    io.emit(event, payload);
  }
}
