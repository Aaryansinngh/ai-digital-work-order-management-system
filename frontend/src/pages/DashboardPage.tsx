import React, { useEffect, useState } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { StatCard, Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import {
  ClipboardList,
  CheckCircle,
  AlertTriangle,
  Clock,
  Package,
  Users,
  Wrench,
  TrendingUp,
  Activity,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await apiClient.get('/dashboard');
        setData(res.data);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Loading Operational Dashboard...</div>;
  }

  if (!data) return null;

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Welcome, {user?.name}</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time industrial telemetry context: <span className="text-blue-400 font-semibold">{user?.role}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
          <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span>System Status: <strong className="text-slate-200">OPERATIONAL</strong></span>
        </div>
      </div>

      {/* 1. SUPERVISOR DASHBOARD */}
      {data.role === 'SUPERVISOR' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard title="Active Work Orders" value={data.metrics.activeWorkOrders} icon={<ClipboardList className="w-5 h-5" />} color="blue" />
            <StatCard title="Completed & Closed" value={data.metrics.completedWorkOrders} icon={<CheckCircle className="w-5 h-5" />} color="emerald" />
            <StatCard title="Job Cards Approval" value={data.metrics.pendingJobCardApprovals} icon={<Wrench className="w-5 h-5" />} color="purple" />
            <StatCard title="Material Requests" value={data.metrics.pendingMaterialApprovals} icon={<Package className="w-5 h-5" />} color="amber" />
            <StatCard title="Overdue Work Orders" value={data.metrics.overdueWorkOrders} icon={<AlertTriangle className="w-5 h-5" />} color="rose" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Worker Workload Bar Chart */}
            <Card>
              <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" /> Worker Active Workload
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.charts.workerWorkload}>
                    <XAxis dataKey="workerName" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                    <Bar dataKey="activeTasks" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Priority Distribution Pie Chart */}
            <Card>
              <h3 className="text-sm font-bold text-slate-200 mb-4">Priority Distribution</h3>
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.charts.priorityDistribution} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {data.charts.priorityDistribution.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </>
      )}

      {/* 2. WORKER DASHBOARD */}
      {data.role === 'WORKER' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard title="Assigned Jobs" value={data.metrics.assignedJobs} icon={<ClipboardList className="w-5 h-5" />} color="blue" />
            <StatCard title="In Progress" value={data.metrics.inProgressJobs} icon={<Wrench className="w-5 h-5" />} color="amber" />
            <StatCard title="Completed" value={data.metrics.completedJobs} icon={<CheckCircle className="w-5 h-5" />} color="emerald" />
            <StatCard title="Material Requests" value={data.metrics.pendingMaterialRequests} icon={<Package className="w-5 h-5" />} color="purple" />
            <StatCard title="Overdue Tasks" value={data.metrics.overdueTasks} icon={<AlertTriangle className="w-5 h-5" />} color="rose" />
          </div>

          <Card>
            <h3 className="text-sm font-bold text-slate-200 mb-4">Your Assigned Work Orders</h3>
            <div className="space-y-3">
              {data.workOrders.map((wo: any) => (
                <div key={wo.id} className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-blue-400 font-bold">{wo.workOrderNumber}</span>
                      <StatusBadge status={wo.priority} type="priority" />
                      <StatusBadge status={wo.status} type="workOrder" />
                    </div>
                    <h4 className="text-sm font-semibold text-slate-200 mt-1">{wo.equipment.name}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{wo.taskDescription}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" /> Due: {new Date(wo.deadline).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* 3. INVENTORY MANAGER DASHBOARD */}
      {data.role === 'INVENTORY_MANAGER' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Catalog Items" value={data.metrics.totalItems} icon={<Package className="w-5 h-5" />} color="blue" />
            <StatCard title="Total Stock Units" value={data.metrics.totalStockUnits} icon={<TrendingUp className="w-5 h-5" />} color="emerald" />
            <StatCard title="Low Stock Alerts" value={data.metrics.lowStockCount} icon={<AlertTriangle className="w-5 h-5" />} color="rose" />
            <StatCard title="Pending Issuances" value={data.metrics.pendingIssuances} icon={<Clock className="w-5 h-5" />} color="amber" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" /> Low Stock Reorder Banner
              </h3>
              <div className="space-y-2">
                {data.lowStockItems.map((item: any) => (
                  <div key={item.id} className="p-3 bg-rose-950/30 border border-rose-800/40 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-200">{item.name} ({item.itemCode})</div>
                      <div className="text-[10px] text-rose-400">Current Stock: {item.stock} | Reorder Level: {item.reorderLevel}</div>
                    </div>
                    <span className="px-2.5 py-1 text-[10px] font-bold bg-rose-900/60 text-rose-200 rounded-lg">REORDER NOW</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h3 className="text-sm font-bold text-slate-200 mb-4">Recent Disbursements</h3>
              <div className="space-y-2">
                {data.recentIssues.map((iss: any) => (
                  <div key={iss.id} className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-200">{iss.inventoryItem.name}</div>
                      <div className="text-slate-400">Issued by: {iss.issuedBy.name}</div>
                    </div>
                    <span className="font-mono text-emerald-400 font-bold">-{iss.quantity} {iss.inventoryItem.unit}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}

      {/* 4. ADMINISTRATOR DASHBOARD */}
      {data.role === 'ADMINISTRATOR' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard title="Total Platform Users" value={data.metrics.totalUsers} icon={<Users className="w-5 h-5" />} color="purple" />
            <StatCard title="Active Users" value={data.metrics.activeUsers} icon={<CheckCircle className="w-5 h-5" />} color="emerald" />
            <StatCard title="Total Work Orders" value={data.metrics.totalWorkOrders} icon={<ClipboardList className="w-5 h-5" />} color="blue" />
            <StatCard title="Closed Work Orders" value={data.metrics.closedWorkOrders} icon={<Wrench className="w-5 h-5" />} color="amber" />
            <StatCard title="Closure Rate" value={`${data.metrics.completionRate}%`} icon={<TrendingUp className="w-5 h-5" />} color="emerald" />
          </div>

          <Card>
            <h3 className="text-sm font-bold text-slate-200 mb-4">Recent System Audit Log Activity</h3>
            <div className="space-y-2">
              {data.recentAudit.map((log: any) => (
                <div key={log.id} className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-mono px-2 py-0.5 bg-slate-800 text-blue-400 rounded font-semibold">{log.action}</span>
                    <span className="text-slate-300">{log.user?.name || 'System'} ({log.entityType})</span>
                  </div>
                  <span className="text-slate-500">{new Date(log.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
};
