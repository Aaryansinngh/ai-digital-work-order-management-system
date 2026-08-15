import React, { useEffect, useState } from 'react';
import apiClient from '../api/client';
import { useNotification } from '../contexts/NotificationContext';
import { User, Role } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Card } from '../components/ui/Card';
import { Users, UserPlus, ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';

export const UsersPage: React.FC = () => {
  const { addToast } = useNotification();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Password123!');
  const [role, setRole] = useState<Role>('WORKER');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/users');
      setUsers(res.data.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/users', { name, email, password, role });
      addToast('success', 'User Created', `Account for ${name} created with role ${role}.`);
      setIsAddOpen(false);
      setName('');
      setEmail('');
      fetchUsers();
    } catch (err: any) {
      addToast('error', 'Creation Failed', err.response?.data?.message || 'Error creating user account.');
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      await apiClient.patch(`/users/${user.id}`, { isActive: !user.isActive });
      addToast('info', 'User Status Updated', `${user.name} is now ${!user.isActive ? 'Active' : 'Deactivated'}`);
      fetchUsers();
    } catch (err: any) {
      addToast('error', 'Update Failed', 'Could not update active status.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-400" /> User & Role Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">Configure system user accounts, assigned roles, and access authorization</p>
        </div>

        <Button variant="primary" icon={<UserPlus className="w-4 h-4" />} onClick={() => setIsAddOpen(true)}>
          Create User Account
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">User Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Assigned Role</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-900/60 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-200">{u.name}</td>
                  <td className="py-3 px-4 text-slate-400">{u.email}</td>
                  <td className="py-3 px-4">
                    <StatusBadge status={u.role} type="criticality" />
                  </td>
                  <td className="py-3 px-4">
                    {u.isActive ? (
                      <span className="inline-flex items-center text-emerald-400 font-semibold gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-rose-400 font-semibold gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Deactivated
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Button
                      size="sm"
                      variant={u.isActive ? 'danger' : 'success'}
                      onClick={() => handleToggleActive(u)}
                    >
                      {u.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* CREATE USER MODAL */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Create User Account">
        <form onSubmit={handleCreateUser} className="space-y-4">
          <Input label="Full Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

          <Select
            label="System Role"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            options={[
              { value: 'WORKER', label: 'WORKER (Job cards, progress, material requests)' },
              { value: 'SUPERVISOR', label: 'SUPERVISOR (Work orders, approvals, search, reports)' },
              { value: 'INVENTORY_MANAGER', label: 'INVENTORY_MANAGER (Stock levels, material issuance)' },
              { value: 'ADMINISTRATOR', label: 'ADMINISTRATOR (User management, audit logs)' },
            ]}
          />

          <div className="flex justify-end gap-3 pt-3">
            <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create User
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
