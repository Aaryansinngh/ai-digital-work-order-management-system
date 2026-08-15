import React, { useEffect, useState } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { JobCard, InventoryItem } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ProgressBar } from '../components/ui/Card';
import { Modal, Drawer } from '../components/ui/Modal';
import { FileUpload } from '../components/FileUpload';
import { Select, Input } from '../components/ui/Input';
import { Wrench, CheckCircle, XCircle, Package, Send, AlertTriangle, Camera } from 'lucide-react';

export const JobCardsPage: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useNotification();

  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Job Card State
  const [selectedJobCard, setSelectedJobCard] = useState<JobCard | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Worker Form State
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [remarks, setRemarks] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [savingProgress, setSavingProgress] = useState(false);

  // Material Request Launcher Modal State
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [selectedMaterialItem, setSelectedMaterialItem] = useState('');
  const [requestedQuantity, setRequestedQuantity] = useState(1);

  // Rejection Modal State
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchJobCards = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/work-orders');
      // Extract job cards from work orders
      const cards: JobCard[] = res.data.workOrders
        .filter((wo: any) => wo.jobCard)
        .map((wo: any) => ({
          ...wo.jobCard,
          workOrder: wo,
        }));
      setJobCards(cards);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInventory = async () => {
    try {
      const res = await apiClient.get('/inventory');
      setInventoryItems(res.data.items);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchJobCards();
    fetchInventory();
  }, []);

  const openDrawer = (jc: JobCard) => {
    setSelectedJobCard(jc);
    setCompletionPercentage(jc.completionPercentage || 0);
    setRemarks(jc.remarks || '');
    try {
      setPhotos(jc.evidencePhotos ? JSON.parse(jc.evidencePhotos) : []);
    } catch (e) {
      setPhotos([]);
    }
    setIsDrawerOpen(true);
  };

  // Save Progress (Worker)
  const handleSaveProgress = async () => {
    if (!selectedJobCard) return;
    setSavingProgress(true);
    try {
      const res = await apiClient.patch(`/job-cards/${selectedJobCard.id}`, {
        completionPercentage,
        remarks,
        evidencePhotos: photos,
      });

      addToast('success', 'Progress Saved', 'Job card progress updated.');
      setSelectedJobCard({ ...selectedJobCard, ...res.data.jobCard });
      fetchJobCards();
    } catch (err: any) {
      addToast('error', 'Update Failed', err.response?.data?.message || 'Error updating job card.');
    } finally {
      setSavingProgress(false);
    }
  };

  // Submit Job Card for Approval (Worker)
  const handleSubmitJobCard = async () => {
    if (!selectedJobCard) return;
    try {
      await apiClient.post(`/job-cards/${selectedJobCard.id}/submit`);
      addToast('success', 'Job Card Submitted', 'Submitted for supervisor review.');
      setIsDrawerOpen(false);
      fetchJobCards();
    } catch (err: any) {
      addToast('error', 'Submission Failed', err.response?.data?.message || 'Error submitting job card.');
    }
  };

  // Supervisor Approval
  const handleApprove = async () => {
    if (!selectedJobCard) return;
    try {
      await apiClient.post(`/job-cards/${selectedJobCard.id}/approve`);
      addToast('success', 'Job Card Approved', 'Work Order is closed.');
      setIsDrawerOpen(false);
      fetchJobCards();
    } catch (err: any) {
      addToast('error', 'Approval Failed', err.response?.data?.message || 'Error approving job card.');
    }
  };

  // Supervisor Rejection
  const handleReject = async () => {
    if (!selectedJobCard || !rejectionReason.trim()) return;
    try {
      await apiClient.post(`/job-cards/${selectedJobCard.id}/reject`, { rejectionReason });
      addToast('warning', 'Job Card Returned', 'Sent back to worker for rework.');
      setIsRejectModalOpen(false);
      setIsDrawerOpen(false);
      setRejectionReason('');
      fetchJobCards();
    } catch (err: any) {
      addToast('error', 'Rejection Failed', err.response?.data?.message || 'Error rejecting job card.');
    }
  };

  // Raise Material Request
  const handleRaiseMaterialRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobCard || !selectedMaterialItem) return;

    try {
      await apiClient.post('/material-requests', {
        jobCardId: selectedJobCard.id,
        inventoryItemId: selectedMaterialItem,
        quantity: requestedQuantity,
      });

      addToast('success', 'Material Request Raised', 'Supervisor notification sent.');
      setIsMaterialModalOpen(false);
      setSelectedMaterialItem('');
      setRequestedQuantity(1);
      fetchJobCards();
    } catch (err: any) {
      addToast('error', 'Request Failed', err.response?.data?.message || 'Error raising request.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Job Card Workstation</h1>
        <p className="text-xs text-slate-400 mt-1">
          {user?.role === 'WORKER'
            ? 'Update task completion %, upload photo evidence, and request materials'
            : 'Review completed worker job cards, remarks, and photo evidence'}
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading Job Cards...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobCards.map((jc) => (
            <Card key={jc.id} className="hover:border-slate-700 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs font-bold text-blue-400">
                    {jc.workOrder?.workOrderNumber}
                  </span>
                  <StatusBadge status={jc.status} type="jobCard" />
                </div>

                <h3 className="text-sm font-bold text-slate-100 mb-1">{jc.workOrder?.equipment.name}</h3>
                <p className="text-xs text-slate-400 mb-3">{jc.workOrder?.taskDescription}</p>

                {/* Progress Bar */}
                <div className="mb-3 space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-400">Completion</span>
                    <span className="text-emerald-400">{jc.completionPercentage}%</span>
                  </div>
                  <ProgressBar progress={jc.completionPercentage} />
                </div>

                {/* Rejection Warning Banner */}
                {jc.status === 'REJECTED' && jc.rejectionReason && (
                  <div className="p-2.5 bg-rose-950/40 border border-rose-800/50 rounded-xl text-xs text-rose-300 mb-3">
                    <strong>Rework Required:</strong> {jc.rejectionReason}
                  </div>
                )}
              </div>

              <Button variant="secondary" className="w-full mt-2" onClick={() => openDrawer(jc)}>
                Open Job Card Workstation
              </Button>
            </Card>
          ))}
        </div>
      )}

      {/* JOB CARD WORKSTATION DRAWER */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={`Job Card Workstation: ${selectedJobCard?.workOrder?.workOrderNumber}`}
      >
        {selectedJobCard && (
          <div className="space-y-5 text-xs text-slate-200">
            {/* Equipment Context */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
              <h4 className="font-bold text-slate-100 text-sm">{selectedJobCard.workOrder?.equipment.name}</h4>
              <p className="text-slate-400 mt-1">{selectedJobCard.workOrder?.taskDescription}</p>
              <div className="mt-2 flex items-center gap-2">
                <StatusBadge status={selectedJobCard.workOrder?.priority} type="priority" />
                <StatusBadge status={selectedJobCard.status} type="jobCard" />
              </div>
            </div>

            {/* Completion Percentage Slider (Worker Edit) */}
            {user?.role === 'WORKER' && selectedJobCard.status !== 'APPROVED' && (
              <div>
                <label className="block font-semibold text-slate-300 mb-2">
                  Task Completion Percentage ({completionPercentage}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={completionPercentage}
                  onChange={(e) => setCompletionPercentage(parseInt(e.target.value, 10))}
                  className="w-full accent-blue-500 bg-slate-800"
                />
              </div>
            )}

            {/* Remarks Text Editor */}
            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">Technician Remarks & Notes</label>
              {user?.role === 'WORKER' && selectedJobCard.status !== 'APPROVED' ? (
                <textarea
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500 h-24"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Log maintenance actions taken, issues encountered..."
                />
              ) : (
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-slate-300">
                  {selectedJobCard.remarks || 'No remarks provided.'}
                </div>
              )}
            </div>

            {/* File / Photo Upload Evidence */}
            {user?.role === 'WORKER' && selectedJobCard.status !== 'APPROVED' ? (
              <FileUpload photos={photos} onChange={setPhotos} />
            ) : (
              <div>
                <label className="block font-semibold text-slate-300 mb-2">Photographic Evidence</label>
                {photos.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {photos.map((img, idx) => (
                      <img key={idx} src={img} alt="Evidence" className="w-full h-28 object-cover rounded-lg border border-slate-800" />
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 italic">No photos attached.</p>
                )}
              </div>
            )}

            {/* Material Requests Launcher Button */}
            {user?.role === 'WORKER' && selectedJobCard.status !== 'APPROVED' && (
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                icon={<Package className="w-4 h-4 text-emerald-400" />}
                onClick={() => setIsMaterialModalOpen(true)}
              >
                Raise Spare Material Request
              </Button>
            )}

            {/* Worker Save & Submit Actions */}
            {user?.role === 'WORKER' && selectedJobCard.status !== 'APPROVED' && (
              <div className="flex gap-2 pt-4 border-t border-slate-800">
                <Button variant="secondary" className="flex-1" onClick={handleSaveProgress} isLoading={savingProgress}>
                  Save Progress
                </Button>
                <Button variant="success" className="flex-1" icon={<Send className="w-3.5 h-3.5" />} onClick={handleSubmitJobCard}>
                  Submit for Approval
                </Button>
              </div>
            )}

            {/* Supervisor Actions */}
            {(user?.role === 'SUPERVISOR' || user?.role === 'ADMINISTRATOR') && selectedJobCard.status === 'PENDING_APPROVAL' && (
              <div className="flex gap-2 pt-4 border-t border-slate-800">
                <Button variant="danger" className="flex-1" icon={<XCircle className="w-4 h-4" />} onClick={() => setIsRejectModalOpen(true)}>
                  Reject / Rework
                </Button>
                <Button variant="success" className="flex-1" icon={<CheckCircle className="w-4 h-4" />} onClick={handleApprove}>
                  Approve Job Card
                </Button>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* MATERIAL REQUEST LAUNCHER MODAL */}
      <Modal isOpen={isMaterialModalOpen} onClose={() => setIsMaterialModalOpen(false)} title="Raise Spare Material Request">
        <form onSubmit={handleRaiseMaterialRequest} className="space-y-4">
          <Select
            label="Inventory Spare Item"
            value={selectedMaterialItem}
            onChange={(e) => setSelectedMaterialItem(e.target.value)}
            options={[
              { value: '', label: '-- Select Inventory Item --' },
              ...inventoryItems.map((i) => ({
                value: i.id,
                label: `${i.name} (${i.itemCode}) - Stock: ${i.stockQuantity} ${i.unit}`,
              })),
            ]}
            required
          />

          <Input
            label="Requested Quantity"
            type="number"
            min="1"
            value={requestedQuantity}
            onChange={(e) => setRequestedQuantity(parseInt(e.target.value, 10))}
            required
          />

          <div className="flex justify-end gap-3 pt-3">
            <Button type="button" variant="ghost" onClick={() => setIsMaterialModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Submit Request to Supervisor
            </Button>
          </div>
        </form>
      </Modal>

      {/* REJECTION REASON MODAL */}
      <Modal isOpen={isRejectModalOpen} onClose={() => setIsRejectModalOpen(false)} title="Reject Job Card (Specify Rework Reason)">
        <div className="space-y-4">
          <textarea
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 focus:outline-none focus:border-rose-500 h-28"
            placeholder="Explain why job card was rejected and what rework is required..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
          />

          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleReject}>
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
