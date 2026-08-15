import React from 'react';
import { WorkOrderStatus, WorkOrderPriority, JobCardStatus, MaterialRequestStatus, Criticality } from '../../types';

interface StatusBadgeProps {
  status?: WorkOrderStatus | JobCardStatus | MaterialRequestStatus | Criticality | WorkOrderPriority | string;
  type?: 'workOrder' | 'jobCard' | 'material' | 'priority' | 'criticality';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'workOrder' }) => {
  if (!status) return null;

  let colorClasses = 'bg-slate-800 text-slate-300 border-slate-700';

  switch (status) {
    // Work Order Statuses
    case 'CREATED':
      colorClasses = 'bg-sky-950/80 text-sky-400 border-sky-800/50';
      break;
    case 'ASSIGNED':
      colorClasses = 'bg-blue-950/80 text-blue-400 border-blue-800/50';
      break;
    case 'IN_PROGRESS':
      colorClasses = 'bg-amber-950/80 text-amber-400 border-amber-800/50 animate-pulse';
      break;
    case 'COMPLETED':
      colorClasses = 'bg-indigo-950/80 text-indigo-400 border-indigo-800/50';
      break;
    case 'APPROVED_CLOSED':
    case 'APPROVED':
    case 'ISSUED':
      colorClasses = 'bg-emerald-950/80 text-emerald-400 border-emerald-800/50';
      break;
    case 'PENDING_APPROVAL':
    case 'PENDING':
      colorClasses = 'bg-purple-950/80 text-purple-400 border-purple-800/50';
      break;
    case 'REJECTED':
      colorClasses = 'bg-rose-950/80 text-rose-400 border-rose-800/50';
      break;

    // Priorities
    case 'URGENT':
    case 'CRITICAL':
      colorClasses = 'bg-rose-950/90 text-rose-300 border-rose-700/60 font-semibold shadow-sm shadow-rose-900/40';
      break;
    case 'HIGH':
      colorClasses = 'bg-amber-950/80 text-amber-300 border-amber-700/50';
      break;
    case 'MEDIUM':
      colorClasses = 'bg-blue-950/80 text-blue-300 border-blue-700/50';
      break;
    case 'LOW':
      colorClasses = 'bg-slate-800 text-slate-300 border-slate-700';
      break;
  }

  const label = status.replace('_', ' ');

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${colorClasses}`}>
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-75"></span>
      {label}
    </span>
  );
};
