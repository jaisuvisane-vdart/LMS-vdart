import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import WelcomeBanner from '../../components/common/WelcomeBanner';
import ProgressBar from '../../components/common/ProgressBar';
import { BookOpen, Users, CheckSquare, Award, Plus, FileText, ArrowRight, ArrowUpRight } from 'lucide-react';

const InstructorDashboard = () => {
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
        console.error('Failed to load instructor metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const kpis = [
    { label: 'My Courses', value: metrics?.my_courses ?? 0, sub: 'Authored Programs', icon: BookOpen, accent: 'border-t-4 border-[#2C51A2]' },
    { label: 'Published', value: metrics?.published_courses ?? 0, sub: 'Live in Catalog', icon: Award, accent: 'border-t-4 border-[#1E3B78]' },
    { label: 'Enrolled Trainees', value: metrics?.assigned_learners ?? 0, sub: 'Assigned Learners', icon: Users, accent: 'border-t-4 border-[#2C51A2]' },
    { label: 'Active In-Progress', value: metrics?.active_assignments ?? 0, sub: 'Underway', icon: CheckSquare, accent: 'border-t-4 border-[#D97706]' },
    { label: 'Completed', value: metrics?.completed_training ?? 0, sub: 'Graduated Trainees', icon: Award, accent: 'border-t-4 border-[#2C51A2]' },
    { label: 'Avg Exam Score', value: `${metrics?.avg_assessment_score ?? 82.5}%`, sub: 'Objective Assessments', icon: FileText, accent: 'border-t-4 border-[#2C51A2]' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner with Personalized Welcome & Dynamic Greeting */}
      <WelcomeBanner
        role="instructor"
        actions={
          <Button variant="primary" size="sm" icon={Plus} onClick={() => navigate('/instructor/course-builder')}>
            Create New Course
          </Button>
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

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: My Active Courses Overview */}
        <div className="lg:col-span-2">
          <Card
            title="My Courses & Training Programs"
            subtitle="Authoring milestones and active trainee enrollments"
            action={
              <Button variant="secondary" size="sm" onClick={() => navigate('/instructor/courses')}>
                View All Courses
              </Button>
            }
          >
            <div className="space-y-4">
              <div className="p-5 clay-card rounded-2xl">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#2C51A2] text-white px-2.5 py-0.5 rounded-full clay-pill">
                      Technical Curriculum
                    </span>
                    <h4 className="text-base font-bold text-[#172B4D] mt-2.5">
                      Full-Stack Software Engineering Trainee Onboarding
                    </h4>
                    <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                      Architecture fundamentals, CodeIgniter REST conventions, and React state standards.
                    </p>
                  </div>
                  <Badge variant="warning">Draft</Badge>
                </div>
                <div className="mt-4 pt-4 border-t border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#64748B]">
                  <span className="font-semibold">4 Curriculum Modules • 12 Lessons • 1 Assessment Quiz</span>
                  <button
                    onClick={() => navigate('/instructor/course-builder')}
                    className="text-[#2C51A2] font-bold hover:underline inline-flex items-center gap-1 active:translate-y-0.5"
                  >
                    <span>Edit Syllabus & Lessons</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right 1 Col: Quick Workflow Shortcuts */}
        <div className="space-y-6">
          <Card title="Curriculum Builder Actions">
            <div className="space-y-2.5">
              <button
                onClick={() => navigate('/instructor/course-builder')}
                className="w-full text-left p-3.5 clay-btn-secondary rounded-xl text-xs font-bold text-[#2C51A2] flex items-center justify-between"
              >
                <span>Upload Lesson Materials (PDF/Slide)</span>
                <ArrowUpRight className="w-4 h-4 text-[#2C51A2]" />
              </button>
              <button
                onClick={() => navigate('/instructor/assessments')}
                className="w-full text-left p-3.5 clay-btn-secondary rounded-xl text-xs font-bold text-[#2C51A2] flex items-center justify-between"
              >
                <span>Formulate Objective Quiz & Questions</span>
                <ArrowUpRight className="w-4 h-4 text-[#2C51A2]" />
              </button>
              <button
                onClick={() => navigate('/instructor/assignments')}
                className="w-full text-left p-3.5 clay-btn-secondary rounded-xl text-xs font-bold text-[#2C51A2] flex items-center justify-between"
              >
                <span>Assign Course to Trainees</span>
                <ArrowUpRight className="w-4 h-4 text-[#2C51A2]" />
              </button>
              <button
                onClick={() => navigate('/instructor/trainees')}
                className="w-full text-left p-3.5 clay-btn-secondary rounded-xl text-xs font-bold text-[#2C51A2] flex items-center justify-between"
              >
                <span>View Trainee Progress Matrix</span>
                <ArrowUpRight className="w-4 h-4 text-[#2C51A2]" />
              </button>
            </div>
          </Card>

          <Card title="Evaluation & Answer Security">
            <div className="text-xs text-[#64748B] space-y-2.5 leading-relaxed">
              <p>Passing standard is strictly enforced at <strong className="text-[#172B4D]">70%</strong> for all trainee submissions.</p>
              <p>Answer keys are validated on the server side to ensure assessment integrity.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default InstructorDashboard;
