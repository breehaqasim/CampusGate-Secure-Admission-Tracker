import { useEffect, useState } from 'react';
import { Navbar } from '../components/Navbar';
import { Card } from '../components/Card';
import { StatCard } from '../components/StatCard';
import { Button } from '../components/Button';
import { Building2, Clock, CheckCircle, XCircle } from 'lucide-react';
import {
  getPendingAdminRequests,
  approveAdmin,
  rejectAdmin,
} from '../services/adminService';
import { supabase } from "../../lib/supabase";
interface SuperAdminDashboardScreenProps {
  onLogout: () => void;
}

interface ActivityItem {
  id: string;
  type: 'admin-registration' | 'university-added' | 'student-registration';
  title: string;
  subtitle: string;
  createdAt: string;
}

export function SuperAdminDashboardScreen({ onLogout }: SuperAdminDashboardScreenProps) {
  // const [pendingRequests, setPendingRequests] = useState([
  //   { id: '1', name: 'John Smith', email: 'john@stanford.edu', university: 'Stanford University', status: 'pending' },
  //   { id: '2', name: 'Sarah Johnson', email: 'sarah@mit.edu', university: 'MIT', status: 'pending' },
  //   { id: '3', name: 'Michael Brown', email: 'michael@harvard.edu', university: 'Harvard University', status: 'pending' },
  // ]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [totalUniversities, setTotalUniversities] = useState(0);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diffMs < hour) {
      const minutes = Math.max(1, Math.floor(diffMs / minute));
      return `${minutes}m ago`;
    }

    if (diffMs < day) {
      const hours = Math.floor(diffMs / hour);
      return `${hours}h ago`;
    }

    const days = Math.floor(diffMs / day);
    return `${days}d ago`;
  };

  const fetchTotalUniversities = async () => {
    try {
      const { count, error } = await supabase
        .from('universities')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      setTotalUniversities(count || 0);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const [profilesRes, universitiesRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, role, university_name, created_at')
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('universities')
          .select('id, name, city, country, created_at')
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (universitiesRes.error) throw universitiesRes.error;

      const profileActivities: ActivityItem[] = (profilesRes.data || [])
        .filter((profile: any) => profile?.created_at && (profile?.role === 'student' || profile?.role === 'university-admin'))
        .map((profile: any) => {
          if (profile.role === 'university-admin') {
            return {
              id: `profile-${profile.id}`,
              type: 'admin-registration',
              title: 'New university admin registered',
              subtitle: `${profile.full_name || 'New Admin'} - ${profile.university_name || 'University not specified'}`,
              createdAt: profile.created_at,
            };
          }

          return {
            id: `profile-${profile.id}`,
            type: 'student-registration',
            title: 'Student registration',
            subtitle: `${profile.full_name || 'New Student'} joined the platform`,
            createdAt: profile.created_at,
          };
        });

      const universityActivities: ActivityItem[] = (universitiesRes.data || [])
        .filter((university: any) => university?.created_at)
        .map((university: any) => ({
          id: `university-${university.id}`,
          type: 'university-added',
          title: 'New university added',
          subtitle: `${university.name} - ${university.city || ''}${university.country ? `, ${university.country}` : ''}`.trim(),
          createdAt: university.created_at,
        }));

      const merged = [...profileActivities, ...universityActivities]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 6);

      setRecentActivity(merged);
    } catch (error) {
      console.error(error);
      setRecentActivity([]);
    }
  };

  const fetchDashboardData = async () => {
    await Promise.all([fetchRequests(), fetchTotalUniversities(), fetchRecentActivity()]);
  };

  useEffect(() => {
  fetchDashboardData();
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
    fetchDashboardData();
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
    fetchDashboardData();
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
              value={totalUniversities}
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
            {recentActivity.length === 0 ? (
              <p className="text-[#a0a0a0] text-sm">No recent activity yet.</p>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity, index) => {
                  const dotColor =
                    activity.type === 'admin-registration'
                      ? 'bg-[#31A6A8]'
                      : activity.type === 'university-added'
                      ? 'bg-[#22c55e]'
                      : 'bg-[#8b5cf6]';

                  return (
                    <div
                      key={activity.id}
                      className={`flex items-center gap-4 ${
                        index < recentActivity.length - 1 ? 'pb-3 border-b border-[#2a2a2a]' : ''
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${dotColor}`}></div>
                      <div className="flex-1">
                        <p className="text-white text-sm">{activity.title}</p>
                        <p className="text-[#6a6a6a] text-xs mt-0.5">{activity.subtitle}</p>
                      </div>
                      <span className="text-[#6a6a6a] text-xs">{formatTimeAgo(activity.createdAt)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
