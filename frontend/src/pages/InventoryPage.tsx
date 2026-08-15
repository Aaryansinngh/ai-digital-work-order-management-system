import React, { useEffect, useState } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { InventoryItem, MaterialRequest, InventoryIssue } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Card, StatCard } from '../components/ui/Card';
import { Package, AlertTriangle, CheckCircle, Plus, RefreshCw, History, ShieldAlert } from 'lucide-react';

export const InventoryPage: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useNotification();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [materialRequests, setMaterialRequests] = useState<MaterialRequest[]>([]);
  const [issueHistory, setIssueHistory] = useState<InventoryIssue[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Item Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [itemCode, setItemCode] = useState('');
  const [itemName, setItemName] = useState('');
  const [unit, setUnit] = useState('pcs');
  const [stockQuantity, setStockQuantity] = useState(10);
  const [reorderLevel, setReorderLevel] = useState(5);
  const [location, setLocation] = useState('');

  const fetchInventoryData = async () => {
    try {
      setLoading(true);
      const itemRes = await apiClient.get('/inventory');
      setItems(itemRes.data.items);

      const reqRes = await apiClient.get('/material-requests');
      setMaterialRequests(reqRes.data.materialRequests);

      if (user?.role === 'INVENTORY_MANAGER' || user?.role === 'ADMINISTRATOR' || user?.role === 'SUPERVISOR') {
        const histRes = await apiClient.get('/inventory/history');
        setIssueHistory(histRes.data.issues);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryData();
  }, [user]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/inventory', {
        itemCode,
        name: itemName,
        unit,
        stockQuantity,
        reorderLevel,
        location,
      });

      addToast('success', 'Item Added', `Inventory item ${itemName} created.`);
      setIsAddOpen(false);
      setItemCode('');
      setItemName('');
      fetchInventoryData();
    } catch (err: any) {
      addToast('error', 'Add Failed', err.response?.data?.message || 'Error adding inventory item.');
    }
  };

  // Supervisor Approval
  const handleApproveRequest = async (id: string) => {
    try {
      await apiClient.patch(`/material-requests/${id}/approve`);
      addToast('success', 'Request Approved', 'Approved for inventory manager issuance.');
      fetchInventoryData();
    } catch (err: any) {
      addToast('error', 'Approval Error', err.response?.data?.message || 'Error approving material request.');
    }
  };

  // Inventory Manager Issuance
  const handleIssueMaterial = async (id: string) => {
    try {
      const res = await apiClient.post(`/material-requests/${id}/issue`);
      addToast('success', 'Materials Issued', `Stock updated. Remaining: ${res.data.remainingStock}`);
      fetchInventoryData();
    } catch (err: any) {
      addToast('error', 'Issuance Failed', err.response?.data?.message || 'Stock allocation error.');
    }
  };

  const lowStockItems = items.filter((i) => i.isLowStock || i.stockQuantity <= i.reorderLevel);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Inventory & Spare Parts Management</h1>
          <p className="text-xs text-slate-400 mt-1">Real-time stock level tracking, material disbursements, and low-stock alerts</p>
        </div>

        {(user?.role === 'INVENTORY_MANAGER' || user?.role === 'ADMINISTRATOR') && (
          <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setIsAddOpen(true)}>
            Add New Spare Item
          </Button>
        )}
      </div>

      {/* Low Stock Warning Alert Banner */}
      {lowStockItems.length > 0 && (
        <div className="p-4 bg-amber-950/40 border border-amber-800/60 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 animate-bounce" />
            <div>
              <h3 className="text-xs font-bold text-amber-200 uppercase tracking-wider">
                Low Stock Threshold Warning ({lowStockItems.length} Items Below Reorder Point)
              </h3>
              <p className="text-xs text-amber-300/80 mt-0.5">
                {lowStockItems.map((i) => `${i.name} (${i.stockQuantity} ${i.unit})`).join(' • ')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Items Catalog */}
      <div>
        <h2 className="text-sm font-bold text-slate-200 mb-3">Spare Parts Stock Catalog</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map((item) => {
            const isLow = item.stockQuantity <= item.reorderLevel;
            return (
              <Card key={item.id} className={isLow ? 'border-amber-800/80 bg-amber-950/20' : ''}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-blue-400">{item.itemCode}</span>
                  {isLow && (
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-900/60 text-amber-300 border border-amber-800 rounded">
                      LOW STOCK
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-slate-100">{item.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">Location: {item.location || 'Warehouse Main'}</p>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Current Stock:</span>
                  <span className={`font-bold text-base ${isLow ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {item.stockQuantity} {item.unit}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 text-right mt-0.5">
                  Reorder Level: {item.reorderLevel} {item.unit}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Material Requests Approval & Issuance Workstation */}
      <Card>
        <h2 className="text-sm font-bold text-slate-200 mb-4">Material Requests Workstation</h2>
        <div className="space-y-3">
          {materialRequests.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-4 text-center">No active material requests.</p>
          ) : (
            materialRequests.map((req) => (
              <div
                key={req.id}
                className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={req.status} type="material" />
                    <span className="font-bold text-slate-200">{req.inventoryItem?.name}</span>
                  </div>
                  <div className="text-slate-400">
                    Quantity: <strong className="text-slate-200">{req.quantity} {req.inventoryItem?.unit}</strong> | Work Order: {req.jobCard?.workOrder?.workOrderNumber} | Raised by: {req.requestedBy?.name}
                  </div>
                </div>

                {/* Supervisor Approval Action */}
                {(user?.role === 'SUPERVISOR' || user?.role === 'ADMINISTRATOR') && req.status === 'PENDING' && (
                  <Button size="sm" variant="success" onClick={() => handleApproveRequest(req.id)}>
                    Approve Request
                  </Button>
                )}

                {/* Inventory Manager Issue Action */}
                {user?.role === 'INVENTORY_MANAGER' && req.status === 'APPROVED' && (
                  <Button size="sm" variant="primary" onClick={() => handleIssueMaterial(req.id)}>
                    Issue Material
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Inventory Issue Transaction History Log */}
      {issueHistory.length > 0 && (
        <Card>
          <h2 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
            <History className="w-4 h-4 text-blue-400" /> Material Disbursement Transaction Log
          </h2>
          <div className="space-y-2">
            {issueHistory.map((iss) => (
              <div key={iss.id} className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-slate-200">{iss.inventoryItem?.name}</div>
                  <div className="text-slate-400">
                    Issued to Work Order {iss.materialRequest?.jobCard?.workOrder?.workOrderNumber || 'General'} by {iss.issuedBy?.name}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-emerald-400">-{iss.quantity} {iss.inventoryItem?.unit}</div>
                  <div className="text-[10px] text-slate-500">{new Date(iss.createdAt).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ADD INVENTORY ITEM MODAL */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add Spare Part Inventory Item">
        <form onSubmit={handleAddItem} className="space-y-4">
          <Input label="Item Code / SKU" value={itemCode} onChange={(e) => setItemCode(e.target.value)} required />
          <Input label="Item Description / Name" value={itemName} onChange={(e) => setItemName(e.target.value)} required />
          <Input label="Unit of Measurement (e.g. pcs, Liters, sets)" value={unit} onChange={(e) => setUnit(e.target.value)} required />
          <Input label="Initial Stock Quantity" type="number" value={stockQuantity} onChange={(e) => setStockQuantity(parseInt(e.target.value, 10))} required />
          <Input label="Reorder Alert Threshold" type="number" value={reorderLevel} onChange={(e) => setReorderLevel(parseInt(e.target.value, 10))} required />
          <Input label="Warehouse Location" value={location} onChange={(e) => setLocation(e.target.value)} />

          <div className="flex justify-end gap-3 pt-3">
            <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Add Item to Catalog
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
