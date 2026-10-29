import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import enrollmentService from '../../services/enrollmentService';
import Button from '../../components/common/Button';
import WelcomeBanner from '../../components/common/WelcomeBanner';
import AnimatedNumber from '../../components/common/AnimatedNumber';
import CategoryManagerModal from '../../components/courses/CategoryManagerModal';
import {
  Users,
  GraduationCap,
  BookOpen,
  CheckCircle,
  Clock,
  BarChart2,
  Plus,
  UserPlus,
  BookPlus,
  Sliders,
  PieChart,
  LayoutGrid,
  UserCheck,
  TrendingUp,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activityRange, setActivityRange] = useState('Week');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [pendingEnrollments, setPendingEnrollments] = useState(0);

  // Gauge & Activity hover states
  const [hoveredStatus, setHoveredStatus] = useState(null); // 'completed' | 'in_progress' | 'not_started' | 'not_passed'
  const [hoveredActivitySlot, setHoveredActivitySlot] = useState(null);

  const fetchStats = async (range = activityRange) => {
    try {
      setLoading(true);
      const res = await api.get('/dashboard/stats', { params: { range } });
      if (res.status === 'success') {
        setMetrics(res.data.metrics);
      }
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingEnrollments = async () => {
    try {
      const res = await enrollmentService.getPendingCount();
      if (res.status === 'success') {
        setPendingEnrollments(res.data.pending_count);
      }
    } catch (err) {
      console.warn('Failed to load pending enrollments:', err);
    }
  };

  useEffect(() => {
    fetchStats(activityRange);
  }, [activityRange]);

  useEffect(() => {
    fetchPendingEnrollments();
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
      <div data-aos="fade-down">
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
      </div>

      {/* Pending Self-Enrollment Notice */}
      {pendingEnrollments > 0 && (
        <div data-aos="fade-up" className="clay-card p-4 rounded-2xl border border-amber-300/80 bg-amber-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 border border-amber-300">
              <UserCheck className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                Enrollment Requests Awaiting Review
              </div>
              <div className="text-xs text-amber-900 mt-0.5">
                There {pendingEnrollments === 1 ? 'is' : 'are'} <strong>{pendingEnrollments}</strong> learner enrollment {pendingEnrollments === 1 ? 'request' : 'requests'} pending administrative confirmation.
              </div>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            icon={ChevronRight}
            onClick={() => navigate('/admin/courses?tab=requests')}
          >
            Review Requests ({pendingEnrollments})
          </Button>
        </div>
      )}

      {/* KPI Cards Grid with Minimal Clay Elevation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              data-aos="fade-up"
              data-aos-delay={idx * 60}
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
                  {loading ? '—' : <AnimatedNumber value={kpi.value} />}
                </div>
              </div>
              <div className="text-[10px] text-[#64748B] font-semibold pt-2 border-t border-[#F1F5F9] mt-2">
                {kpi.sub}
              </div>
            </div>
          );
        })}
      </div>

      {/* 2x2 Grid: Portal Activity, Quick Actions, Overview, Courses' Progress Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Portal Activity */}
        <div className="clay-card p-6 rounded-2xl flex flex-col justify-between" data-aos="fade-up" data-aos-delay="150">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-[#172B4D]">Portal activity</h3>
                <p className="text-xs text-[#64748B] mt-0.5">Database login events vs course completions</p>
              </div>
              <div className="relative">
                <select
                  value={activityRange}
                  onChange={(e) => setActivityRange(e.target.value)}
                  className="appearance-none bg-[#F8FAFC] border border-[#CBD5E1] text-xs font-semibold text-[#172B4D] pl-3 pr-7 py-1.5 rounded-xl hover:bg-white focus:outline-none focus:border-[#2C51A2] cursor-pointer transition-colors"
                >
                  <option value="Day">Day</option>
                  <option value="Week">Week</option>
                  <option value="Month">Month</option>
                  <option value="Year">Year</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-[#64748B] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Clustered Bar Chart SVG with Dynamic Database Series */}
            {(() => {
              const series = metrics?.portal_activity?.series || [];
              const maxVal = Math.max(metrics?.portal_activity?.max_value || 6, 1);
              const chartHeight = 135;
              const baselineY = 155;
              const topY = baselineY - chartHeight; // 20
              const tickCount = 6;
              const ticks = Array.from({ length: tickCount + 1 }, (_, i) => {
                const fraction = (tickCount - i) / tickCount;
                const val = Math.round(maxVal * fraction);
                const y = topY + i * (chartHeight / tickCount);
                return { val, y };
              });

              const chartLeft = 32;
              const chartRight = 448;
              const chartWidth = chartRight - chartLeft;
              const slotCount = series.length || 7;
              const slotWidth = chartWidth / slotCount;
              const barWidth = Math.min(13, Math.max(6, Math.floor(slotWidth * 0.22)));
              const barGap = 3;

              return (
                <div className="w-full h-56 pt-2 relative">
                  <svg viewBox="0 0 460 190" className="w-full h-full overflow-visible">
                    {/* Horizontal Grid lines and Y-axis values */}
                    {ticks.map((tick, i) => (
                      <g key={i}>
                        <text
                          x="24"
                          y={tick.y + 3.5}
                          textAnchor="end"
                          className="text-[9.5px] fill-[#94A3B8] font-mono select-none"
                        >
                          {tick.val}
                        </text>
                        <line
                          x1={chartLeft}
                          y1={tick.y}
                          x2={chartRight}
                          y2={tick.y}
                          stroke="#F1F5F9"
                          strokeWidth="1"
                        />
                      </g>
                    ))}

                    {/* X-axis baseline */}
                    <line
                      x1={chartLeft}
                      y1={baselineY}
                      x2={chartRight}
                      y2={baselineY}
                      stroke="#CBD5E1"
                      strokeWidth="1.5"
                    />

                    {/* Clustered Bars for Series */}
                    {series.map((item, idx) => {
                      const centerX = chartLeft + (idx + 0.5) * slotWidth;
                      const loginsH = Math.min(chartHeight, (item.logins / maxVal) * chartHeight);
                      const loginsY = baselineY - loginsH;
                      const loginsX = centerX - barWidth - barGap / 2;

                      const compH = Math.min(chartHeight, (item.completions / maxVal) * chartHeight);
                      const compY = baselineY - compH;
                      const compX = centerX + barGap / 2;

                      const isHovered = hoveredActivitySlot === idx;

                      return (
                        <g
                          key={idx}
                          onMouseEnter={() => setHoveredActivitySlot(idx)}
                          onMouseLeave={() => setHoveredActivitySlot(null)}
                          className="cursor-pointer"
                        >
                          {/* Hover background column indicator */}
                          {isHovered && (
                            <rect
                              x={centerX - slotWidth / 2 + 2}
                              y={topY}
                              width={slotWidth - 4}
                              height={chartHeight + 2}
                              fill="#EFF6FF"
                              rx="4"
                              opacity="0.6"
                            />
                          )}

                          {/* Logins Bar (Blue) */}
                          <rect
                            x={loginsX}
                            y={loginsY}
                            width={barWidth}
                            height={loginsH}
                            fill="#2563EB"
                            rx="2"
                            className="transition-all duration-300"
                            opacity={hoveredActivitySlot !== null && !isHovered ? 0.6 : 1}
                          />

                          {/* Completions Bar (Green) */}
                          <rect
                            x={compX}
                            y={compY}
                            width={barWidth}
                            height={compH}
                            fill="#10B981"
                            rx="2"
                            className="transition-all duration-300"
                            opacity={hoveredActivitySlot !== null && !isHovered ? 0.6 : 1}
                          />

                          {/* X-axis Labels */}
                          <text
                            x={centerX}
                            y={baselineY + 14}
                            textAnchor="middle"
                            className={`text-[9.5px] select-none transition-colors ${
                              isHovered ? 'fill-[#1E3B78] font-bold' : 'fill-[#64748B] font-medium'
                            }`}
                          >
                            {item.label}
                          </text>
                          {item.sublabel && (
                            <text
                              x={centerX}
                              y={baselineY + 25}
                              textAnchor="middle"
                              className="text-[8.5px] fill-[#94A3B8] select-none"
                            >
                              {item.sublabel}
                            </text>
                          )}

                          {/* Tooltip on Hover */}
                          {isHovered && (
                            <g>
                              <rect
                                x={Math.max(10, Math.min(320, centerX - 65))}
                                y={Math.max(4, Math.min(loginsY, compY) - 34)}
                                width="130"
                                height="26"
                                rx="6"
                                fill="#0F172A"
                                opacity="0.95"
                              />
                              <text
                                x={Math.max(10, Math.min(320, centerX - 65)) + 65}
                                y={Math.max(4, Math.min(loginsY, compY) - 34) + 16}
                                textAnchor="middle"
                                className="text-[10px] fill-white font-mono font-medium select-none"
                              >
                                {item.logins} Logins • {item.completions} Done
                              </text>
                            </g>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </div>
              );
            })()}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-5 pt-3 border-t border-[#F1F5F9] text-xs font-medium text-[#172B4D]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]"></span>
              <span>Logins</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></span>
              <span>Course completions</span>
            </div>
          </div>
        </div>

        {/* Card 2: Quick Actions */}
        <div className="clay-card p-6 rounded-2xl flex flex-col justify-between" data-aos="fade-up" data-aos-delay="200">
          <div>
            <h3 className="text-base font-bold text-[#172B4D] mb-4">Quick actions</h3>
            <div className="space-y-2.5">
              {[
                { label: 'Add user', icon: UserPlus, onClick: () => navigate('/admin/users') },
                { label: 'Add course', icon: BookPlus, onClick: () => navigate('/admin/courses') },
                { label: 'Portal settings', icon: Sliders, onClick: () => navigate('/admin/settings') },
                { label: 'Custom reports', icon: PieChart, onClick: () => navigate('/admin/reports') },
                { label: 'Add category', icon: LayoutGrid, onClick: () => setShowCategoryModal(true) },
              ].map((action, i) => {
                const ActionIcon = action.icon;
                return (
                  <button
                    key={i}
                    onClick={action.onClick}
                    className="w-full flex items-center gap-3.5 p-2.5 rounded-xl hover:bg-[#F8FAFC] transition-colors text-left group cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[#172B4D] group-hover:text-[#2C51A2] group-hover:bg-[#EFF6FF] transition-colors">
                      <ActionIcon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-semibold text-[#172B4D] group-hover:text-[#2C51A2] transition-colors">
                      {action.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Card 3: Overview */}
        <div className="clay-card p-6 rounded-2xl flex flex-col justify-between" data-aos="fade-up" data-aos-delay="250">
          <div>
            <h3 className="text-base font-bold text-[#172B4D] mb-2">Overview</h3>
            <div className="divide-y divide-[#F1F5F9]">
              {[
                { label: 'Active users', value: metrics?.total_users ?? 0, icon: UserCheck },
                { label: 'Assigned courses', value: metrics?.total_assignments ?? 0, icon: BookOpen },
                { label: 'Active training', value: metrics?.active_assignments ?? 0, icon: Clock },
                { label: 'Instructors', value: metrics?.total_instructors ?? 0, icon: GraduationCap },
                { label: 'Completion rate', value: `${metrics?.completion_percentage ?? 0}%`, icon: TrendingUp },
              ].map((row, i) => {
                const RowIcon = row.icon;
                return (
                  <div key={i} className="flex items-center justify-between py-3.5 first:pt-2 last:pb-1">
                    <div className="flex items-center gap-3 text-[#172B4D]">
                      <RowIcon className="w-4 h-4 text-[#64748B]" />
                      <span className="text-sm font-medium text-[#172B4D]">{row.label}</span>
                    </div>
                    <span className="text-sm sm:text-base font-bold font-mono text-[#172B4D]">
                      {loading ? '—' : <AnimatedNumber value={row.value} />}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Card 4: Courses' Progress Status */}
        <div className="clay-card p-6 rounded-2xl flex flex-col justify-between" data-aos="fade-up" data-aos-delay="300">
          <div>
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => navigate('/admin/courses')}
                className="flex items-center gap-1.5 text-base font-bold text-[#172B4D] hover:text-[#2C51A2] transition-colors group cursor-pointer"
              >
                <span>Courses' progress status</span>
                <ChevronRight className="w-4 h-4 text-[#64748B] group-hover:text-[#2C51A2] group-hover:translate-x-0.5 transition-all" />
              </button>
              <span className="text-lg font-bold font-mono text-[#172B4D]">
                <AnimatedNumber value={metrics?.total_assignments ?? 0} />
              </span>
            </div>

            {/* 180° Semi-Circular Gauge (Half-Donut Arch Matching Reference Image) */}
            {(() => {
              const progressStatus = metrics?.progress_status || {
                completed: { count: 0, percentage: 0, color: '#10B981', label: 'Completed' },
                in_progress: { count: 0, percentage: 0, color: '#F59E0B', label: 'In progress' },
                not_started: { count: 0, percentage: 0, color: '#94A3B8', label: 'Not started' },
                not_passed: { count: 0, percentage: 0, color: '#EF4444', label: 'Not passed' },
                total: 0,
                completion_percentage: 0,
              };

              const GAUGE_R = 115;
              const GAUGE_CX = 160;
              const GAUGE_CY = 150;
              const GAUGE_ARC_LEN = Math.PI * GAUGE_R; // ~361.283 px
              const GAUGE_PATH = `M ${GAUGE_CX - GAUGE_R},${GAUGE_CY} A ${GAUGE_R},${GAUGE_R} 0 0,1 ${GAUGE_CX + GAUGE_R},${GAUGE_CY}`;

              const total = progressStatus.total || 0;

              // Arc lengths based on exact database percentages
              const pCompleted = Number(progressStatus.completed?.percentage || 0);
              const pInProgress = Number(progressStatus.in_progress?.percentage || 0);
              const pNotStarted = Number(progressStatus.not_started?.percentage || 0);
              const pNotPassed = Number(progressStatus.not_passed?.percentage || 0);

              const lenCompleted = (pCompleted / 100) * GAUGE_ARC_LEN;
              const lenInProgress = (pInProgress / 100) * GAUGE_ARC_LEN;
              const lenNotStarted = (pNotStarted / 100) * GAUGE_ARC_LEN;
              const lenNotPassed = total > 0
                ? Math.max(0, GAUGE_ARC_LEN - (lenCompleted + lenInProgress + lenNotStarted))
                : 0;

              const segments = [
                {
                  key: 'completed',
                  label: 'Completed',
                  color: '#10B981',
                  count: progressStatus.completed?.count || 0,
                  percentage: pCompleted,
                  length: lenCompleted,
                  offset: 0,
                },
                {
                  key: 'in_progress',
                  label: 'In progress',
                  color: '#F59E0B',
                  count: progressStatus.in_progress?.count || 0,
                  percentage: pInProgress,
                  length: lenInProgress,
                  offset: -lenCompleted,
                },
                {
                  key: 'not_started',
                  label: 'Not started',
                  color: '#94A3B8',
                  count: progressStatus.not_started?.count || 0,
                  percentage: pNotStarted,
                  length: lenNotStarted,
                  offset: -(lenCompleted + lenInProgress),
                },
                {
                  key: 'not_passed',
                  label: 'Not passed',
                  color: '#EF4444',
                  count: progressStatus.not_passed?.count || 0,
                  percentage: pNotPassed,
                  length: lenNotPassed,
                  offset: -(lenCompleted + lenInProgress + lenNotStarted),
                },
              ];

              const currentHover = hoveredStatus
                ? segments.find((s) => s.key === hoveredStatus)
                : null;

              const displayPercentage = currentHover
                ? `${currentHover.percentage.toFixed(2)}%`
                : `${Number(progressStatus.completion_percentage || 0).toFixed(2)}%`;

              const displayLabel = currentHover
                ? `${currentHover.label}: ${currentHover.count} / ${total}`
                : 'Completion rate';

              return (
                <div className="w-full flex flex-col items-center justify-center pt-2 pb-2">
                  <div className="w-full max-w-[340px] relative flex justify-center">
                    <svg viewBox="0 0 320 175" className="w-full h-auto overflow-visible">
                      {/* Background base track */}
                      <path
                        d={GAUGE_PATH}
                        fill="none"
                        stroke="#F1F5F9"
                        strokeWidth="36"
                        strokeLinecap="butt"
                      />

                      {/* Segments: Completed, In progress, Not started, Not passed */}
                      {segments.map((seg) => {
                        if (seg.length <= 0) return null;
                        const isHovered = hoveredStatus === seg.key;
                        const anyHovered = hoveredStatus !== null;

                        return (
                          <path
                            key={seg.key}
                            d={GAUGE_PATH}
                            fill="none"
                            stroke={seg.color}
                            strokeWidth={isHovered ? 40 : 36}
                            strokeDasharray={`${seg.length} ${GAUGE_ARC_LEN * 2}`}
                            strokeDashoffset={seg.offset}
                            strokeLinecap="butt"
                            onMouseEnter={() => setHoveredStatus(seg.key)}
                            onMouseLeave={() => setHoveredStatus(null)}
                            className="cursor-pointer transition-all duration-300"
                            opacity={anyHovered && !isHovered ? 0.45 : 1}
                            style={{
                              filter: isHovered ? `drop-shadow(0 4px 6px ${seg.color}40)` : 'none',
                            }}
                          />
                        );
                      })}

                      {/* Center Display: Percentage and Subtitle */}
                      <text
                        x={GAUGE_CX}
                        y={GAUGE_CY - 16}
                        textAnchor="middle"
                        className="text-4xl font-extrabold fill-[#1E293B] font-mono tracking-tight select-none transition-all duration-200"
                      >
                        {displayPercentage}
                      </text>
                      <text
                        x={GAUGE_CX}
                        y={GAUGE_CY + 4}
                        textAnchor="middle"
                        className={`text-xs select-none transition-all duration-200 ${
                          currentHover ? 'font-bold' : 'font-medium fill-[#64748B]'
                        }`}
                        fill={currentHover ? currentHover.color : '#64748B'}
                      >
                        {displayLabel}
                      </text>
                    </svg>
                  </div>

                  {/* Gauge Legend with Hover Interaction */}
                  <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5 pt-3 mt-1 border-t border-[#F1F5F9] w-full text-xs font-medium text-[#172B4D]">
                    {segments.map((seg) => {
                      const isHovered = hoveredStatus === seg.key;
                      return (
                        <div
                          key={seg.key}
                          onMouseEnter={() => setHoveredStatus(seg.key)}
                          onMouseLeave={() => setHoveredStatus(null)}
                          className={`flex items-center gap-2 cursor-pointer transition-all duration-200 px-2.5 py-1 rounded-xl ${
                            isHovered
                              ? 'bg-[#F1F5F9] font-bold scale-105 shadow-sm'
                              : 'hover:bg-[#F8FAFC]'
                          }`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 transition-transform"
                            style={{ backgroundColor: seg.color }}
                          />
                          <span className={isHovered ? 'text-[#0F172A]' : 'text-[#334155]'}>
                            {seg.label}
                          </span>
                          {isHovered && (
                            <span className="text-[11px] font-mono font-bold text-[#64748B]">
                              ({seg.percentage.toFixed(1)}%)
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Category Management Modal */}
      <CategoryManagerModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
      />
    </div>
  );
};

export default AdminDashboard;
