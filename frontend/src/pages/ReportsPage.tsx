import React, { useState } from 'react';
import apiClient from '../api/client';
import { useNotification } from '../contexts/NotificationContext';
import { GeneratedReport } from '../types';
import { Button } from '../components/ui/Button';
import { Select, Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { FileBarChart, Sparkles, Printer, Download, Table, FileText } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { addToast } = useNotification();

  const [module, setModule] = useState<'WORK_ORDERS' | 'INVENTORY' | 'SYSTEM_EXECUTIVE'>('WORK_ORDERS');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [report, setReport] = useState<GeneratedReport | null>(null);
  const [generating, setGenerating] = useState(false);

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const res = await apiClient.post('/ai/report', {
        startDate,
        endDate,
        module,
      });

      setReport(res.data.report);
      addToast('success', 'AI Report Generated', 'Natural language summary generated from database telemetry.');
    } catch (err: any) {
      addToast('error', 'Generation Error', 'Could not generate report.');
    } finally {
      setGenerating(false);
    }
  };

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <FileBarChart className="w-5 h-5 text-cyan-400" /> AI Automated Report Generation Studio
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Generates natural language executive summaries based strictly on verified database telemetry
          </p>
        </div>

        {report && (
          <Button variant="secondary" icon={<Printer className="w-4 h-4" />} onClick={handlePrintPdf}>
            Print / Export PDF Report
          </Button>
        )}
      </div>

      {/* Report Generator Controls */}
      <Card>
        <form onSubmit={handleGenerateReport} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <Select
            label="Report Target Module"
            value={module}
            onChange={(e) => setModule(e.target.value as any)}
            options={[
              { value: 'WORK_ORDERS', label: 'Work Orders & SLA Performance' },
              { value: 'INVENTORY', label: 'Inventory & Spare Stock Audit' },
              { value: 'SYSTEM_EXECUTIVE', label: 'Comprehensive System Operational Summary' },
            ]}
          />

          <Input label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          <Input label="End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />

          <Button type="submit" variant="primary" isLoading={generating} icon={<Sparkles className="w-4 h-4 text-cyan-300" />}>
            Generate AI Report
          </Button>
        </form>
      </Card>

      {/* Generated Report Display */}
      {report && (
        <div className="space-y-6 print:p-0 print:bg-white print:text-black">
          {/* Section 1: Generated Executive Summary */}
          <Card className="border-cyan-900/50 bg-slate-900/90">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" /> {report.title}
              </h2>
              <span className="text-xs text-slate-400 font-mono">Generated: {new Date(report.generatedAt).toLocaleString()}</span>
            </div>

            <div className="prose prose-invert max-w-none text-xs leading-relaxed space-y-3 whitespace-pre-line text-slate-200">
              {report.generatedSummary}
            </div>
          </Card>

          {/* Section 2: Underlying Source Data Table */}
          <Card>
            <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
              <Table className="w-4 h-4 text-blue-400" /> Verified Source Telemetry Data
            </h3>
            <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-cyan-400 overflow-x-auto">
              {JSON.stringify(report.sourceData, null, 2)}
            </pre>
          </Card>
        </div>
      )}
    </div>
  );
};
