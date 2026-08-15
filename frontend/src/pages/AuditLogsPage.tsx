import React, { useEffect, useState } from 'react';
import apiClient from '../api/client';
import { AuditLog } from '../types';
import { Card } from '../components/ui/Card';
import { ShieldCheck, Clock, User as UserIcon } from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get('/audit-logs');
        setLogs(res.data.auditLogs);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" /> Immutable System Audit Log
        </h1>
        <p className="text-xs text-slate-400 mt-1">Audit trail recording login events, work order modifications, job card approvals, and inventory transactions</p>
      </div>

      <Card>
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading Audit Trail...</div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-4 bg-slate-950/70 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-blue-400 font-mono font-bold text-[10px]">
                    {log.action}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-200 flex items-center gap-2">
                      <span>{log.user ? `${log.user.name} (${log.user.role})` : 'System Automatic Process'}</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-400">Entity: {log.entityType}</span>
                    </div>
                    {log.newValue && (
                      <div className="text-[11px] font-mono text-cyan-400/90 mt-1 truncate max-w-xl">
                        {log.newValue}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-slate-500 flex items-center gap-1 font-mono text-[11px] shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(log.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
