import React from 'react';

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-lg backdrop-blur-md ${className}`}>
      {children}
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: string;
  color?: 'blue' | 'emerald' | 'amber' | 'rose' | 'purple';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = 'blue',
}) => {
  const iconBgClasses = {
    blue: 'bg-blue-950/80 text-blue-400 border-blue-800/50',
    emerald: 'bg-emerald-950/80 text-emerald-400 border-emerald-800/50',
    amber: 'bg-amber-950/80 text-amber-400 border-amber-800/50',
    rose: 'bg-rose-950/80 text-rose-400 border-rose-800/50',
    purple: 'bg-purple-950/80 text-purple-400 border-purple-800/50',
  };

  return (
    <Card className="hover:border-slate-700/80 transition-all duration-300">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 tracking-wider uppercase">{title}</p>
          <h3 className="text-2xl font-bold text-slate-100 mt-1">{value}</h3>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
          {trend && <span className="inline-block mt-2 text-xs font-medium text-emerald-400">{trend}</span>}
        </div>
        <div className={`p-3 rounded-xl border ${iconBgClasses[color]}`}>{icon}</div>
      </div>
    </Card>
  );
};

export const ProgressBar: React.FC<{ progress: number; className?: string }> = ({ progress, className = '' }) => {
  return (
    <div className={`w-full bg-slate-800 rounded-full h-2.5 overflow-hidden ${className}`}>
      <div
        className="bg-gradient-to-r from-blue-500 to-emerald-400 h-2.5 rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  );
};

export const EmptyState: React.FC<{ title: string; description: string; icon?: React.ReactNode }> = ({
  title,
  description,
  icon,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
      {icon && <div className="p-4 rounded-full bg-slate-800/60 text-slate-400 mb-3">{icon}</div>}
      <h3 className="text-base font-semibold text-slate-200">{title}</h3>
      <p className="text-xs text-slate-400 max-w-sm mt-1">{description}</p>
    </div>
  );
};
