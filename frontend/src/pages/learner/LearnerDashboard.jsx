import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import assignmentService from '../../services/assignmentService';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import WelcomeBanner from '../../components/common/WelcomeBanner';
import ProgressBar from '../../components/common/ProgressBar';
import { BookOpen, CheckCircle, Clock, Award, PlayCircle, Calendar, FileText, ChevronRight } from 'lucide-react';

const LearnerDashboard = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [assignedCourses, setAssignedCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, coursesRes] = await Promise.all([
          api.get('/dashboard/stats'),
          assignmentService.getMyCourses(),
        ]);
        if (statsRes.status === 'success') {
          setMetrics(statsRes.data.metrics);
        }
        if (coursesRes.status === 'success') {
          setAssignedCourses(coursesRes.data || []);
        }
      } catch (err) {
        console.error('Failed to load learner dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const kpis = [
    { label: 'Assigned Programs', value: metrics?.assigned_courses ?? 1, sub: 'Required Training', icon: BookOpen, iconColor: 'text-[#2C51A2]', iconBg: 'bg-[#E2E9F4]' },
    { label: 'In Progress', value: metrics?.in_progress_courses ?? 1, sub: 'Active Studies', icon: Clock, iconColor: 'text-[#D97706]', iconBg: 'bg-[#FEF3C7]' },
    { label: 'Completed', value: metrics?.completed_courses ?? 0, sub: 'Passed Curriculum', icon: CheckCircle, iconColor: 'text-[#2C51A2]', iconBg: 'bg-[#E2E9F4]' },
    { label: 'Passed Exams', value: metrics?.passed_assessments ?? 0, sub: 'Certifications', icon: Award, iconColor: 'text-[#1E3B78]', iconBg: 'bg-[#E2E9F4]' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner with Personalized Welcome & Dynamic Greeting */}
      <WelcomeBanner
        role="learner"
        actions={
          <div className="clay-pill flex items-center gap-2 text-xs font-semibold text-[#2C51A2] bg-white px-3.5 py-2 border border-[#E2E8F0] rounded-xl shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-[#2C51A2]" />
            <span>Corporate Deadline: Nov 15, 2026</span>
          </div>
        }
      />

      {/* KPI Cards Grid with fluid wrapping */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="clay-card clay-card-hover p-5 rounded-2xl border border-white/60 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-[#64748B] mb-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#1E3B78]">
                    {kpi.label}
                  </span>
                  <div className={`w-8 h-8 rounded-xl ${kpi.iconBg} flex items-center justify-center shadow-inner`}>
                    <Icon className={`w-4 h-4 ${kpi.iconColor}`} />
                  </div>
                </div>
                <div className="text-2xl font-bold text-[#172B4D] tracking-tight">
                  {loading ? '—' : kpi.value}
                </div>
              </div>
              <div className="text-[11px] text-[#64748B] font-medium pt-2.5 border-t border-[#E2E8F0]/60 mt-2.5">
                {kpi.sub}
              </div>
            </div>
          );
        })}
      </div>

      {/* Continue Learning Featured Block */}
      {(() => {
        const featuredCourse = assignedCourses.find((c) => (c.progress_percentage || 0) < 100) || assignedCourses[0];
        if (!featuredCourse) return null;
        const pct = Math.round(featuredCourse.progress_percentage || 0);

        return (
          <div className="bg-gradient-to-r from-[#1E3B78] to-[#2C51A2] text-white p-6 sm:p-8 rounded-2xl shadow-[0_12px_28px_rgba(44, 81, 162, 0.08)] border border-white/10 relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2 max-w-2xl">
                <span className="clay-pill text-[10px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur text-white px-3 py-1 rounded-full border border-white/20">
                  Active Assigned Curriculum
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  {featuredCourse.course_title}
                </h3>
                <p className="text-xs text-[#E2E9F4] font-medium">
                  Instructor: <strong className="text-white">{featuredCourse.instructor_name}</strong> • Due Date: <strong className="text-white">{featuredCourse.due_date || 'Self-paced'}</strong>
                </p>
                <div className="pt-2 w-full max-w-md">
                  <div className="flex justify-between text-xs text-[#E2E9F4] mb-1.5 font-semibold">
                    <span>Course Progress</span>
                    <span>{pct}% Complete</span>
                  </div>
                  <div className="w-full bg-[#172B4D]/60 h-2.5 rounded-full overflow-hidden p-0.5 shadow-inner">
                    <div className="bg-white h-full rounded-full transition-all duration-300 shadow-sm" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              </div>
              <div>
                <Button
                  variant="secondary"
                  size="lg"
                  icon={pct >= 100 || featuredCourse.status === 'completed' ? CheckCircle : PlayCircle}
                  className="bg-white text-[#1E3B78] hover:bg-[#F3F6FB] border-white h-12 px-6 shadow-md"
                  onClick={() => navigate(`/learner/courses/${featuredCourse.course_id}?resume=true${featuredCourse.resumed_lesson_id ? `&lessonId=${featuredCourse.resumed_lesson_id}` : ''}`)}
                >
                  {pct >= 100 || featuredCourse.status === 'completed' ? 'Completed' : 'Resume Learning Unit'}
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Main Grid: My Assigned Courses */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card
            title="My Assigned Training Programs"
            subtitle="Curriculum assigned by your department supervisor"
            action={
              <Button variant="outline" size="sm" onClick={() => navigate('/learner/courses')}>
                View All ({assignedCourses.length})
              </Button>
            }
          >
            {assignedCourses.length === 0 ? (
              <div className="p-8 text-center bg-[#F3F6FB]/70 border border-[#E2E8F0]/70 rounded-2xl">
                <BookOpen className="w-8 h-8 text-[#94A3B8] mx-auto mb-2" />
                <p className="text-sm font-bold text-[#1E3B78]">No Training Courses Assigned</p>
                <p className="text-xs text-[#64748B] mt-1">
                  You are not currently enrolled in any assigned training programs.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {assignedCourses.slice(0, 4).map((c) => {
                  const pct = Math.round(c.progress_percentage || 0);
                  const isCompleted = c.status === 'completed';
                  return (
                    <div
                      key={c.id}
                      className="clay-card clay-card-hover p-5 rounded-xl border border-white/70"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#2C51A2]">
                            {c.category || 'General Curriculum'}
                          </span>
                          <h4 className="text-sm font-bold text-[#172B4D] mt-1">
                            {c.course_title}
                          </h4>
                          <p className="text-xs text-[#64748B] mt-1">
                            Lead Instructor: {c.instructor_name} • Deadline: {c.due_date || 'Self-paced'}
                          </p>
                        </div>
                        <Badge variant={isCompleted ? 'success' : pct > 0 ? 'warning' : 'default'}>
                          {isCompleted ? 'Completed' : pct > 0 ? 'In Progress' : 'Assigned'}
                        </Badge>
                      </div>
                      <div className="mt-4 pt-4 border-t border-[#E2E8F0]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                        <div className="w-full sm:w-1/2">
                          <ProgressBar value={pct} showLabel height="h-2" />
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          icon={isCompleted || pct >= 100 ? CheckCircle : ChevronRight}
                          onClick={() => navigate(`/learner/courses/${c.course_id}?resume=true${c.resumed_lesson_id ? `&lessonId=${c.resumed_lesson_id}` : ''}`)}
                        >
                          {isCompleted || pct >= 100 ? 'Completed' : 'Study Unit'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Right 1 Col: Required Assessments */}
        <div className="space-y-6">
          <Card
            title="Mandatory Assessments"
            action={
              <Button variant="outline" size="sm" onClick={() => navigate('/learner/assessments')}>
                View Exams
              </Button>
            }
          >
            <div className="space-y-3">
              <div
                className="clay-card clay-card-hover p-4 rounded-xl border border-white/80 cursor-pointer"
                onClick={() => navigate('/learner/assessments')}
              >
                <div className="flex items-center justify-between text-xs font-bold text-[#1E3B78]">
                  <span>PHP Architecture & Security</span>
                  <Badge variant="success">Available</Badge>
                </div>
                <p className="text-[11px] text-[#64748B] mt-1.5 leading-relaxed">
                  Knowledge Evaluation • Passing Standard: 70%
                </p>
              </div>
            </div>
          </Card>

          <Card title="Training Compliance Record">
            <div className="text-xs text-[#64748B] space-y-2 leading-relaxed font-medium">
              <p>Lesson completions are recorded in real-time in your permanent training history.</p>
              <p>Final certificates are automatically generated upon passing mandatory assessments.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LearnerDashboard;
