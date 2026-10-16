import React, { useEffect, useState } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { Equipment, Criticality } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Card } from '../components/ui/Card';
import {
  Boxes,
  Plus,
  Search,
  Edit2,
  Calendar,
  MapPin,
  ClipboardList,
  AlertTriangle,
  RefreshCw,
  FileText,
} from 'lucide-react';

const CRITICALITY_OPTIONS = [
  { value: 'LOW', label: 'Low Criticality' },
  { value: 'MEDIUM', label: 'Medium Criticality' },
  { value: 'HIGH', label: 'High Criticality' },
  { value: 'CRITICAL', label: 'Critical Asset' },
];

export const EquipmentPage: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useNotification();

  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [criticalityFilter, setCriticalityFilter] = useState<string>('ALL');

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [criticality, setCriticality] = useState<Criticality>('MEDIUM');
  const [maintenanceHistory, setMaintenanceHistory] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canManage = user?.role === 'ADMINISTRATOR' || user?.role === 'SUPERVISOR';

  const fetchEquipment = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get('/equipment');
      setEquipmentList(res.data.equipment || []);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to load industrial equipment catalog.';
      setError(msg);
      addToast('error', 'Failed to load equipment', msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipment();
  }, []);

  const openAddModal = () => {
    setEditingEquipment(null);
    setName('');
    setLocation('');
    setCriticality('MEDIUM');
    setMaintenanceHistory('');
    setIsModalOpen(true);
  };

  const openEditModal = (eq: Equipment) => {
    setEditingEquipment(eq);
    setName(eq.name);
    setLocation(eq.location);
    setCriticality(eq.criticality);
    setMaintenanceHistory(eq.maintenanceHistory || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || name.trim().length < 2) {
      addToast('warning', 'Validation Error', 'Equipment name must be at least 2 characters.');
      return;
    }
    if (!location.trim() || location.trim().length < 2) {
      addToast('warning', 'Validation Error', 'Location must be at least 2 characters.');
      return;
    }

    try {
      setSubmitting(true);
      if (editingEquipment) {
        await apiClient.patch(`/equipment/${editingEquipment.id}`, {
          name: name.trim(),
          location: location.trim(),
          criticality,
          maintenanceHistory: maintenanceHistory.trim() || null,
        });
        addToast('success', 'Equipment Updated', `${name} updated successfully.`);
      } else {
        await apiClient.post('/equipment', {
          name: name.trim(),
          location: location.trim(),
          criticality,
          maintenanceHistory: maintenanceHistory.trim() || null,
        });
        addToast('success', 'Equipment Created', `${name} added to equipment catalog.`);
      }

      setIsModalOpen(false);
      fetchEquipment();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error saving equipment asset.';
      addToast('error', editingEquipment ? 'Update Failed' : 'Creation Failed', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredEquipment = equipmentList.filter((eq) => {
    const matchesSearch =
      eq.name.toLowerCase().includes(search.toLowerCase()) ||
      eq.location.toLowerCase().includes(search.toLowerCase()) ||
      (eq.maintenanceHistory && eq.maintenanceHistory.toLowerCase().includes(search.toLowerCase()));
    const matchesCriticality = criticalityFilter === 'ALL' || eq.criticality === criticalityFilter;
    return matchesSearch && matchesCriticality;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Boxes className="w-5 h-5 text-blue-400" />
            Equipment & Asset Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track industrial machinery, location registry, operational criticality, and maintenance records
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
            onClick={fetchEquipment}
          >
            Refresh
          </Button>

          {canManage && (
            <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={openAddModal}>
              Register New Equipment
            </Button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80">
        <div className="flex-1 w-full relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by equipment name, location, or maintenance notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="w-full sm:w-56">
          <select
            value={criticalityFilter}
            onChange={(e) => setCriticalityFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
          >
            <option value="ALL">All Criticality Levels</option>
            <option value="CRITICAL">Critical Only</option>
            <option value="HIGH">High Criticality</option>
            <option value="MEDIUM">Medium Criticality</option>
            <option value="LOW">Low Criticality</option>
          </select>
        </div>
      </div>

      {/* Content State Handling */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-xs">Loading equipment catalog...</p>
        </div>
      ) : error ? (
        <Card className="text-center py-12 border-rose-900/40 bg-rose-950/10">
          <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-200">Unable to load equipment</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">{error}</p>
          <Button variant="primary" size="sm" className="mt-4" onClick={fetchEquipment}>
            Try Again
          </Button>
        </Card>
      ) : filteredEquipment.length === 0 ? (
        <Card className="text-center py-16 border-dashed border-slate-800 bg-slate-900/30">
          <Boxes className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-200">No Equipment Assets Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {search || criticalityFilter !== 'ALL'
              ? 'No equipment matching your search filter was found. Try clearing filters.'
              : 'The equipment catalog is currently empty. Register industrial assets to attach to work orders.'}
          </p>
          {canManage && !search && criticalityFilter === 'ALL' && (
            <Button variant="primary" size="sm" className="mt-4" icon={<Plus className="w-4 h-4" />} onClick={openAddModal}>
              Register First Asset
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEquipment.map((eq) => (
            <Card
              key={eq.id}
              className="flex flex-col justify-between hover:border-slate-700/80 transition-colors"
            >
              <div>
                {/* Top Badge & Action */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <StatusBadge status={eq.criticality} type="criticality" />
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => openEditModal(eq)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors"
                      title="Edit Equipment"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Title & Location */}
                <h3 className="text-sm font-bold text-slate-100">{eq.name}</h3>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                  <span>{eq.location}</span>
                </div>

                {/* Maintenance History */}
                {eq.maintenanceHistory ? (
                  <div className="mt-3 p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/80 text-[11px] text-slate-300">
                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <FileText className="w-3 h-3 text-slate-400" /> Maintenance Records
                    </div>
                    <p className="line-clamp-3 italic text-slate-400">{eq.maintenanceHistory}</p>
                  </div>
                ) : (
                  <p className="mt-3 text-[11px] text-slate-600 italic">No maintenance history recorded.</p>
                )}
              </div>

              {/* Card Footer: Metadata */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <ClipboardList className="w-3 h-3 text-slate-400" />
                  {eq._count?.workOrders ?? 0} Work Orders
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-500" />
                  {new Date(eq.createdAt).toLocaleDateString()}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* CREATE / EDIT EQUIPMENT MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !submitting && setIsModalOpen(false)}
        title={editingEquipment ? 'Edit Equipment Asset' : 'Register New Industrial Asset'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Equipment Name"
            placeholder="e.g. Centrifugal Water Pump P-101"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="Plant Location / Bay"
            placeholder="e.g. Pump Room B - Bay 4"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
          />

          <Select
            label="Operational Criticality"
            value={criticality}
            onChange={(e) => setCriticality(e.target.value as Criticality)}
            options={CRITICALITY_OPTIONS}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Maintenance History / Operational Notes
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Last major overhaul Q2 2025. Impeller replaced. Annual inspection due..."
              value={maintenanceHistory}
              onChange={(e) => setMaintenanceHistory(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg text-sm text-slate-100 p-3 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={submitting}>
              {editingEquipment ? 'Save Changes' : 'Create Asset'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default EquipmentPage;
