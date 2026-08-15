import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { Cpu, Lock, Mail, ArrowRight, ShieldCheck, Wrench, Package, UserCheck } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { addToast } = useNotification();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      addToast('success', 'Welcome Back', 'Logged in successfully.');
      navigate('/dashboard');
    } catch (err: any) {
      addToast('error', 'Login Failed', err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (demoEmail: string) => {
    setLoading(true);
    try {
      await login(demoEmail, 'Password123!');
      addToast('success', 'Demo Login Successful', `Logged in as ${demoEmail}`);
      navigate('/dashboard');
    } catch (err: any) {
      addToast('error', 'Demo Login Failed', err.response?.data?.message || 'Error logging in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Logo Banner */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-2xl shadow-xl shadow-blue-950/50 mb-3">
            <Cpu className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Industrial AI CMMS</h1>
          <p className="text-xs text-slate-400 mt-1">Digital Work Order & Job Card Management System</p>
        </div>

        {/* Login Form Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="user@example.com"
              icon={<Mail className="w-4 h-4" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              icon={<Lock className="w-4 h-4" />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" variant="primary" className="w-full" isLoading={loading} icon={<ArrowRight className="w-4 h-4" />}>
              Sign In to Work Order Portal
            </Button>
          </form>

          {/* Quick Demo Access Roles */}
          <div className="mt-6 pt-5 border-t border-slate-800/80">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3 text-center">
              Quick Demo Access (Select Role)
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => quickLogin('admin@example.com')}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-blue-500/50 text-left transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-slate-200">Admin</div>
                  <div className="text-[10px] text-slate-400">admin@example.com</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => quickLogin('supervisor1@example.com')}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-left transition-colors"
              >
                <UserCheck className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-slate-200">Supervisor</div>
                  <div className="text-[10px] text-slate-400">supervisor1@example.com</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => quickLogin('worker1@example.com')}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 text-left transition-colors"
              >
                <Wrench className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-slate-200">Worker</div>
                  <div className="text-[10px] text-slate-400">worker1@example.com</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => quickLogin('inventory@example.com')}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 text-left transition-colors"
              >
                <Package className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-slate-200">Inventory Mgr</div>
                  <div className="text-[10px] text-slate-400">inventory@example.com</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
