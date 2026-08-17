import http from 'http';
import app from './app';
import { ENV } from './config/env';
import logger from './utils/logger';
import { initSocketGateway } from './sockets/socketGateway';

const server = http.createServer(app);

// Initialize Socket.io Gateway
initSocketGateway(server);

const PORT = parseInt(ENV.PORT, 10) || 5000;

server.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 AI Work Order & Job Card Management Server running on port ${PORT}`);
  logger.info(`📡 Socket.io Gateway active on ws://localhost:${PORT}`);
});
