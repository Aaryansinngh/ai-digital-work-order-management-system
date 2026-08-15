import React, { useEffect, useState } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { WorkOrder, Equipment, User, PriorityScoreResult } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Card } from '../components/ui/Card';
import { Plus, Search, Sparkles, Clock, ShieldAlert, Cpu, ChevronRight } from 'lucide-react';

export const WorkOrdersPage: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useNotification();

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [workersList, setWorkersList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSemanticSearch, setIsSemanticSearch] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [selectedWorker, setSelectedWorker] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [aiPreview, setAiPreview] = useState<PriorityScoreResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchWorkOrders = async () => {
    try {
      setLoading(true);
      if (isSemanticSearch && searchQuery.trim()) {
        const res = await apiClient.get(`/ai/search?query=${encodeURIComponent(searchQuery)}`);
        setWorkOrders(res.data.results);
      } else {
        const params = new URLSearchParams();
        if (statusFilter) params.append('status', statusFilter);
        if (priorityFilter) params.append('priority', priorityFilter);
        if (searchQuery) params.append('search', searchQuery);

        const res = await apiClient.get(`/work-orders?${params.toString()}`);
        setWorkOrders(res.data.workOrders);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const eqRes = await apiClient.get('/equipment');
      setEquipmentList(eqRes.data.equipment);

      const userRes = await apiClient.get('/users?role=WORKER');
      setWorkersList(userRes.data.users);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchWorkOrders();
  }, [statusFilter, priorityFilter]);

  useEffect(() => {
    if (user?.role === 'SUPERVISOR' || user?.role === 'ADMINISTRATOR') {
      fetchMetadata();
    }
  }, [user]);

  const handleSemanticSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSemanticSearch(true);
    fetchWorkOrders();
  };

  // Preview AI Priority Score before submitting
  const calculateAiScorePreview = async () => {
    if (!selectedEquipment || !taskDescription || !deadline) {
      addToast('warning', 'Missing Fields', 'Please select equipment, description, and deadline first.');
      return;
    }
    const eq = equipmentList.find((e) => e.id === selectedEquipment);
    if (!eq) return;

    try {
      const res = await apiClient.post('/ai/priority-score', {
        deadline,
        criticality: eq.criticality,
        taskDescription,
      });
      setAiPreview(res.data);
      addToast('info', 'AI Score Preview Calculated', `Priority Score: ${res.data.score}/100 [${res.data.priority}]`);
    } catch (err: any) {
      addToast('error', 'Scoring Failed', 'Could not preview priority score.');
    }
  };

  const handleCreateWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post('/work-orders', {
        equipmentId: selectedEquipment,
        assignedToId: selectedWorker,
        taskDescription,
        deadline,
      });

      addToast('success', 'Work Order Created', 'Auto-generated Job Card (1:1 constraint) and notified worker.');
      setIsCreateOpen(false);
      // Reset
      setSelectedEquipment('');
      setSelectedWorker('');
      setTaskDescription('');
      setDeadline('');
      setAiPreview(null);
      fetchWorkOrders();
    } catch (err: any) {
      addToast('error', 'Creation Failed', err.response?.data?.message || 'Error creating work order.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            Work Order Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">Centralized operational work order dispatch & tracking</p>
        </div>

        {(user?.role === 'SUPERVISOR' || user?.role === 'ADMINISTRATOR') && (
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsCreateOpen(true)}
          >
            Create New Work Order
          </Button>
        )}
      </div>

      {/* AI Semantic Search & Filters Bar */}
      <Card>
        <form onSubmit={handleSemanticSearch} className="flex flex-col md:flex-row items-center gap-3">
          <div className="flex-1 w-full relative">
            <Input
              placeholder='AI Semantic Search e.g. "urgent turbine maintenance" or "pump leak"'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Sparkles className="w-4 h-4 text-cyan-400" />}
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Select
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'ASSIGNED', label: 'Assigned' },
                { value: 'IN_PROGRESS', label: 'In Progress' },
                { value: 'COMPLETED', label: 'Completed' },
                { value: 'APPROVED_CLOSED', label: 'Approved & Closed' },
              ]}
              value={statusFilter}
              onChange={(e) => {
                setIsSemanticSearch(false);
                setStatusFilter(e.target.value);
              }}
            />

            <Select
              options={[
                { value: '', label: 'All Priorities' },
                { value: 'URGENT', label: 'Urgent' },
                { value: 'HIGH', label: 'High' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'LOW', label: 'Low' },
              ]}
              value={priorityFilter}
              onChange={(e) => {
                setIsSemanticSearch(false);
                setPriorityFilter(e.target.value);
              }}
            />

            <Button type="submit" variant="secondary" icon={<Search className="w-4 h-4" />}>
              Search
            </Button>
          </div>
        </form>
      </Card>

      {/* Work Orders Grid / Table */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading Work Orders...</div>
      ) : workOrders.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-slate-800 rounded-2xl">
          <p className="text-slate-400">No active work orders found matching filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workOrders.map((wo) => (
            <div
              key={wo.id}
              className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs font-bold text-blue-400">{wo.workOrderNumber}</span>
                  <StatusBadge status={wo.status} type="workOrder" />
                </div>

                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-slate-100">{wo.equipment.name}</h3>
                  <StatusBadge status={wo.priority} type="priority" />
                </div>

                <p className="text-xs text-slate-300 line-clamp-2 mb-3">{wo.taskDescription}</p>

                {/* AI Priority Score Pill */}
                <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 mb-3 flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Priority Score:
                  </span>
                  <span className="font-bold text-cyan-400">{wo.priorityScore}/100</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
                <span>Assigned to: <strong className="text-slate-200">{wo.assignedTo.name}</strong></span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  {new Date(wo.deadline).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE WORK ORDER MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Work Order (AI Priority Engine Enabled)"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateWorkOrder} className="space-y-4">
          <Select
            label="Equipment Asset"
            value={selectedEquipment}
            onChange={(e) => setSelectedEquipment(e.target.value)}
            options={[
              { value: '', label: '-- Select Industrial Equipment --' },
              ...equipmentList.map((e) => ({
                value: e.id,
                label: `${e.name} (${e.location} - ${e.criticality})`,
              })),
            ]}
            required
          />

          <Select
            label="Assign Maintenance Worker"
            value={selectedWorker}
            onChange={(e) => setSelectedWorker(e.target.value)}
            options={[
              { value: '', label: '-- Select Worker --' },
              ...workersList.map((w) => ({ value: w.id, label: `${w.name} (${w.email})` })),
            ]}
            required
          />

          <Input
            label="Deadline Date & Time"
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Task Description</label>
            <textarea
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg text-sm text-slate-100 px-3.5 py-2.5 focus:outline-none focus:border-blue-500 transition-colors h-24"
              placeholder="Describe work scope, symptoms, or maintenance required..."
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              required
            />
          </div>

          {/* AI Priority Scoring Calculator Trigger */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-cyan-400" /> AI Priority Score Preview
              </span>
              <Button type="button" variant="secondary" size="sm" onClick={calculateAiScorePreview}>
                Calculate Score
              </Button>
            </div>

            {aiPreview && (
              <div className="mt-3 p-3 bg-slate-900 rounded-lg border border-cyan-900/40 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Score: <strong className="text-cyan-400">{aiPreview.score}/100</strong></span>
                  <StatusBadge status={aiPreview.priority} type="priority" />
                </div>
                <p className="text-[11px] text-slate-400 whitespace-pre-line mt-1">{aiPreview.explanation}</p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={submitting}>
              Create Work Order & Job Card
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
