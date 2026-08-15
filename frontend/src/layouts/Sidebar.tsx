import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  ClipboardList,
  Wrench,
  Package,
  Users,
  ShieldCheck,
  FileBarChart,
  Boxes,
  Cpu,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  if (!user) return null;

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['ADMINISTRATOR', 'SUPERVISOR', 'WORKER', 'INVENTORY_MANAGER'] },
    { label: 'Work Orders', path: '/work-orders', icon: ClipboardList, roles: ['ADMINISTRATOR', 'SUPERVISOR', 'WORKER'] },
    { label: 'Job Cards', path: '/job-cards', icon: Wrench, roles: ['ADMINISTRATOR', 'SUPERVISOR', 'WORKER'] },
    { label: 'Inventory', path: '/inventory', icon: Package, roles: ['ADMINISTRATOR', 'SUPERVISOR', 'INVENTORY_MANAGER', 'WORKER'] },
    { label: 'User Management', path: '/users', icon: Users, roles: ['ADMINISTRATOR'] },
    { label: 'Audit Logs', path: '/audit-logs', icon: ShieldCheck, roles: ['ADMINISTRATOR', 'SUPERVISOR'] },
    { label: 'AI Reports Studio', path: '/reports', icon: FileBarChart, roles: ['ADMINISTRATOR', 'SUPERVISOR'] },
  ];

  const filteredNav = navItems.filter((item) => item.roles.includes(user.role));

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800/80 flex flex-col h-screen sticky top-0 flex-shrink-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center gap-3">
        <div className="p-2 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-xl shadow-lg shadow-blue-900/30 text-white">
          <Cpu className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-slate-100 tracking-wide">DIGITAL CMMS</h1>
          <p className="text-[10px] text-cyan-400 font-semibold uppercase tracking-wider">AI Work Order Engine</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {filteredNav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-md shadow-blue-950/40'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Role Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-900/40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-blue-400 border border-slate-700">
            {user.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-slate-200 truncate">{user.name}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold truncate">
              {user.role.replace('_', ' ')}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};
