import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useNotification } from './NotificationContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({ socket: null, isConnected: false });

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();
  const { addToast } = useNotification();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!token || !user) {
      if (socket) socket.disconnect();
      setSocket(null);
      setIsConnected(false);
      return;
    }

    const newSocket = io(import.meta.env.VITE_API_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Real-time Event Listeners
    newSocket.on('work_order_assigned', (data) => {
      addToast('info', 'Work Order Assigned', data.message);
    });

    newSocket.on('work_order_created', (data) => {
      addToast('info', 'New Work Order Created', data.message);
    });

    newSocket.on('job_card_submitted', (data) => {
      addToast('warning', 'Job Card Submitted', data.message);
    });

    newSocket.on('job_card_approved', (data) => {
      addToast('success', 'Job Card Approved!', data.message);
    });

    newSocket.on('job_card_rejected', (data) => {
      addToast('error', 'Job Card Rework Required', data.message);
    });

    newSocket.on('material_request_created', (data) => {
      addToast('info', 'Material Request Raised', data.message);
    });

    newSocket.on('material_request_approved', (data) => {
      addToast('info', 'Material Approved for Issuance', data.message);
    });

    newSocket.on('material_request_issued', (data) => {
      addToast('success', 'Materials Issued', data.message);
    });

    newSocket.on('low_stock_warning', (data) => {
      addToast('warning', '⚠️ Low Stock Alert', data.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token, user]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
