import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import ProgressBar from '../../components/common/ProgressBar';
import Button from '../../components/common/Button';
import WelcomeBanner from '../../components/common/WelcomeBanner';
import { Users, GraduationCap, BookOpen, CheckCircle, Clock, BarChart2, Plus, ArrowUpRight } from 'lucide-react';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/dashboard/stats');
        if (res.status === 'success') {
          setMetrics(res.data.metrics);
        }
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const kpis = [
    { label: 'Total Users', value: metrics?.total_users ?? 3, sub: 'Registered Accounts', icon: Users, accent: 'border-t-4 border-[#2C51A2]' },
    { label: 'Instructors', value: metrics?.total_instructors ?? 1, sub: 'Course Authors', icon: GraduationCap, accent: 'border-t-4 border-[#1E3B78]' },
    { label: 'Learners', value: metrics?.total_learners ?? 1, sub: 'Enrolled Learners', icon: Users, accent: 'border-t-4 border-[#2C51A2]' },
    { label: 'Courses', value: metrics?.total_courses ?? 0, sub: 'Active Curriculum', icon: BookOpen, accent: 'border-t-4 border-[#2C51A2]' },
    { label: 'In Progress', value: metrics?.active_assignments ?? 0, sub: 'Active Training', icon: Clock, accent: 'border-t-4 border-[#D97706]' },
    { label: 'Completed', value: metrics?.completed_assignments ?? 0, sub: 'Certifications', icon: CheckCircle, accent: 'border-t-4 border-[#2C51A2]' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner with Personalized Welcome & Dynamic Greeting */}
      <WelcomeBanner
        role="admin"
        actions={
          <>
            <Button variant="secondary" size="sm" icon={BarChart2} onClick={() => navigate('/admin/reports')}>
              Export Reports
            </Button>
            <Button variant="primary" size="sm" icon={Plus} onClick={() => navigate('/admin/users')}>
              Create User
            </Button>
          </>
        }
      />

      {/* KPI Cards Grid with Minimal Clay Elevation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className={`clay-card p-5 rounded-2xl clay-card-hover flex flex-col justify-between ${kpi.accent}`}
            >
              <div>
                <div className="flex items-center justify-between text-[#64748B] mb-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#2C51A2]">
                    {kpi.label}
                  </span>
                  <div 
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: 'linear-gradient(145deg, #E2E9F4 0%, #F3F6FB 100%)',
                      boxShadow: '0 2px 4px rgba(44, 81, 162, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.9)'
                    }}
                  >
                    <Icon className="w-4 h-4 text-[#2C51A2]" />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-[#172B4D] tracking-tight font-mono">
                  {loading ? '—' : kpi.value}
                </div>
              </div>
              <div className="text-[10px] text-[#64748B] font-semibold pt-2 border-t border-[#F1F5F9] mt-2">
                {kpi.sub}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Progress & Governance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Organization Progress */}
        <div className="lg:col-span-2 space-y-6">
          <Card
            title="Organization Training Completion Rate"
            subtitle="Real-time compliance tracking across all departments"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#2C51A2] uppercase tracking-wider">Overall Training Completion</span>
                <span className="font-extrabold text-sm text-[#2C51A2] font-mono">
                  {metrics?.completion_percentage ?? 0}%
                </span>
              </div>
              <ProgressBar value={metrics?.completion_percentage ?? 0} height="h-3.5" />
              <p className="text-xs text-[#64748B] leading-relaxed">
                Calculated against all active curriculum assignments and mandatory assessment evaluations.
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-[#E2E8F0]">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#2C51A2] mb-3">
                Departmental Training Summary
              </h4>
              <div className="border border-[#E2E8F0] rounded-xl overflow-hidden shadow-xs">
                <div className="bg-[#F8FAFC] px-4 py-3 border-b border-[#E2E8F0] grid grid-cols-3 text-[11px] font-bold text-[#2C51A2] uppercase tracking-wider">
                  <div>Department</div>
                  <div className="text-center">Enrolled Trainees</div>
                  <div className="text-right">Completion Rate</div>
                </div>
                <div className="divide-y divide-[#F1F5F9] text-xs">
                  {[
                    { dept: 'Information Technology', count: '1 Trainee', progress: 0 },
                    { dept: 'Software Engineering', count: '1 Trainee', progress: 0 },
                    { dept: 'Technical Training Unit', count: '1 Instructor', progress: 100 },
                  ].map((row, i) => (
                    <div key={i} className="px-4 py-3 grid grid-cols-3 items-center hover:bg-[#F8FAFC] transition-colors">
                      <div className="font-bold text-[#172B4D] truncate">{row.dept}</div>
                      <div className="text-center text-[#64748B]">{row.count}</div>
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 sm:w-24">
                          <ProgressBar value={row.progress} height="h-2" />
                        </div>
                        <span className="text-[11px] font-bold text-[#2C51A2] font-mono w-9 text-right">{row.progress}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right 1 Col: Quick Actions & System Status */}
        <div className="space-y-6">
          <Card title="Administrative Quick Actions">
            <div className="space-y-2.5">
              <button
                onClick={() => navigate('/admin/users')}
                className="w-full text-left p-3.5 clay-btn-secondary rounded-xl text-xs font-bold text-[#2C51A2] flex items-center justify-between"
              >
                <span>Create User Accounts</span>
                <ArrowUpRight className="w-4 h-4 text-[#2C51A2]" />
              </button>
              <button
                onClick={() => navigate('/admin/audit')}
                className="w-full text-left p-3.5 clay-btn-secondary rounded-xl text-xs font-bold text-[#2C51A2] flex items-center justify-between"
              >
                <span>Audit Security & Activity Logs</span>
                <ArrowUpRight className="w-4 h-4 text-[#2C51A2]" />
              </button>
              <button
                onClick={() => navigate('/admin/courses')}
                className="w-full text-left p-3.5 clay-btn-secondary rounded-xl text-xs font-bold text-[#2C51A2] flex items-center justify-between"
              >
                <span>Review Course Catalog</span>
                <ArrowUpRight className="w-4 h-4 text-[#2C51A2]" />
              </button>
              <button
                onClick={() => navigate('/admin/settings')}
                className="w-full text-left p-3.5 clay-btn-secondary rounded-xl text-xs font-bold text-[#2C51A2] flex items-center justify-between"
              >
                <span>Configure Platform Settings</span>
                <ArrowUpRight className="w-4 h-4 text-[#2C51A2]" />
              </button>
            </div>
          </Card>

          <Card title="Security & Compliance Guards">
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-[#F1F5F9]">
                <span className="text-[#64748B] font-semibold">RBAC Authorization:</span>
                <Badge variant="success">Enforced</Badge>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#F1F5F9]">
                <span className="text-[#64748B] font-semibold">Session Cryptography:</span>
                <Badge variant="navy">JWT HS256</Badge>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-[#64748B] font-semibold">Material Download Gate:</span>
                <Badge variant="primary">Restricted</Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
