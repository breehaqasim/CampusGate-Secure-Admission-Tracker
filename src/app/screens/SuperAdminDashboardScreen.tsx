import { useEffect, useState } from 'react';
import { Navbar } from '../components/Navbar';
import { Card } from '../components/Card';
import { StatCard } from '../components/StatCard';
import { Button } from '../components/Button';
import { Users, Building2, Clock, CheckCircle, XCircle } from 'lucide-react';
import {
  getPendingAdminRequests,
  approveAdmin,
  rejectAdmin,
} from '../services/adminService';
import { supabase } from "../../lib/supabase";
interface SuperAdminDashboardScreenProps {
  onLogout: () => void;
}

export function SuperAdminDashboardScreen({ onLogout }: SuperAdminDashboardScreenProps) {
  // const [pendingRequests, setPendingRequests] = useState([
  //   { id: '1', name: 'John Smith', email: 'john@stanford.edu', university: 'Stanford University', status: 'pending' },
  //   { id: '2', name: 'Sarah Johnson', email: 'sarah@mit.edu', university: 'MIT', status: 'pending' },
  //   { id: '3', name: 'Michael Brown', email: 'michael@harvard.edu', university: 'Harvard University', status: 'pending' },
  // ]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  useEffect(() => {
  fetchRequests();
}, []);

const fetchRequests = async () => {
  try {
    const data = await getPendingAdminRequests();
    setPendingRequests(data || []);
  } catch (error) {
    console.error(error);
  }
};

  // const handleApprove = (id: string) => {
  //   console.log('Approved request:', id);
  //   setPendingRequests(prev => prev.filter(req => req.id !== id));
  // };
  const handleApprove = async (id: string) => {
  try {
    await approveAdmin(id);
    alert('University admin approved');
    fetchRequests();
  } catch (error) {
    console.error(error);
  }
};

  // const handleReject = (id: string) => {
  //   console.log('Rejected request:', id);
  //   setPendingRequests(prev => prev.filter(req => req.id !== id));
  // };
  const handleReject = async (id: string) => {
  try {
    await rejectAdmin(id);
    alert('University admin rejected');
    fetchRequests();
  } catch (error) {
    console.error(error);
  }
};

  return (
    <div className="min-h-screen bg-[#0f0f0f] dark">
      <Navbar userName="Super Admin" onLogout={onLogout} />

      <main className="overflow-auto">
        <div className="p-8">
          <div className="mb-6">
            <h1 className="text-white text-3xl mb-2">Super Admin Dashboard</h1>
            <p className="text-[#a0a0a0]">Manage system users and approvals</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <StatCard
              title="Total Universities"
              value="250"
              change={8.2}
              trend="up"
              icon={<Building2 size={24} />}
            />
            <StatCard
              title="Pending Requests"
              value={pendingRequests.length}
              icon={<Clock size={24} />}
            />
          </div>

          <Card title="Pending Admin Approvals" subtitle="Review and approve university admin requests" className="mb-8">
            {pendingRequests.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle size={48} className="mx-auto text-[#31A6A8] mb-4" />
                <p className="text-[#a0a0a0]">No pending approval requests</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#2a2a2a]">
                      <th className="px-4 py-3 text-[#a0a0a0] text-sm text-left">Name</th>
                      <th className="px-4 py-3 text-[#a0a0a0] text-sm text-left">Email</th>
                      <th className="px-4 py-3 text-[#a0a0a0] text-sm text-left">University</th>
                      <th className="px-4 py-3 text-[#a0a0a0] text-sm text-left">Status</th>
                      <th className="px-4 py-3 text-[#a0a0a0] text-sm text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingRequests.map((request) => (
                      <tr
                        key={request.id}
                        className="border-b border-[#2a2a2a] hover:bg-[#2a2a2a]/30 transition-colors"
                      >
                        <td className="px-4 py-4 text-white">{request.name}</td>
                        <td className="px-4 py-4 text-white">{request.email}</td>
                        <td className="px-4 py-4 text-white">{request.university}</td>
                        <td className="px-4 py-4">
                          <span className="px-3 py-1 bg-[#f59e0b]/10 text-[#f59e0b] rounded-lg text-sm">
                            Pending
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleApprove(request.id)}
                            >
                              <CheckCircle size={16} className="mr-1" />
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReject(request.id)}
                              className="border-red-500/50 text-red-500 hover:bg-red-500/10"
                            >
                              <XCircle size={16} className="mr-1" />
                              Reject
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="Recent Activity" subtitle="Latest system updates">
            <div className="space-y-4">
              <div className="flex items-center gap-4 pb-3 border-b border-[#2a2a2a]">
                <div className="w-2 h-2 bg-[#31A6A8] rounded-full"></div>
                <div className="flex-1">
                  <p className="text-white text-sm">New university admin registered</p>
                  <p className="text-[#6a6a6a] text-xs mt-0.5">John Smith - Stanford University</p>
                </div>
                <span className="text-[#6a6a6a] text-xs">5m ago</span>
              </div>
              <div className="flex items-center gap-4 pb-3 border-b border-[#2a2a2a]">
                <div className="w-2 h-2 bg-[#22c55e] rounded-full"></div>
                <div className="flex-1">
                  <p className="text-white text-sm">New university added</p>
                  <p className="text-[#6a6a6a] text-xs mt-0.5">MIT - Cambridge, USA</p>
                </div>
                <span className="text-[#6a6a6a] text-xs">12m ago</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-2 h-2 bg-[#8b5cf6] rounded-full"></div>
                <div className="flex-1">
                  <p className="text-white text-sm">Student registration</p>
                  <p className="text-[#6a6a6a] text-xs mt-0.5">25 new students registered today</p>
                </div>
                <span className="text-[#6a6a6a] text-xs">1h ago</span>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
