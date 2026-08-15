import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { Bell, LogOut, Wifi, WifiOff, User as UserIcon } from 'lucide-react';
import { StatusBadge } from '../components/ui/StatusBadge';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { isConnected } = useSocket();
  const [showNotifications, setShowNotifications] = useState(false);

  if (!user) return null;

  return (
    <header className="h-16 bg-slate-950/80 border-b border-slate-800/80 backdrop-blur-md sticky top-0 z-30 px-6 flex items-center justify-between">
      {/* Left: Role Context */}
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-slate-200">
          Industrial Operational Portal
        </h2>
        <StatusBadge status={user.role} type="criticality" />
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Socket Connection Status Indicator */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs">
          {isConnected ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <Wifi className="w-3 h-3" /> Socket Live
              </span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <WifiOff className="w-3 h-3" /> Connecting...
              </span>
            </>
          )}
        </div>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-900 transition-colors relative"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full" />
          </button>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-400 bg-rose-950/30 hover:bg-rose-900/40 border border-rose-900/40 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Logout
        </button>
      </div>
    </header>
  );
};
