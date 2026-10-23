import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import assignmentService from '../../services/assignmentService';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import ProgressBar from '../../components/common/ProgressBar';
import { BookOpen, Calendar, Clock, Award, PlayCircle, CheckCircle, AlertCircle } from 'lucide-react';

const LearnerCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchMyCourses = async () => {
    try {
      setLoading(true);
      const res = await assignmentService.getMyCourses(filter);
      if (res.status === 'success') {
        setCourses(res.data);
      }
    } catch (err) {
      console.error('Failed to load my courses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyCourses();
  }, [filter]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'in_progress':
        return <Badge variant="warning">In Progress</Badge>;
      case 'overdue':
        return <Badge variant="error">Overdue</Badge>;
      default:
        return <Badge variant="default">Assigned</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="clay-card p-6 rounded-2xl border border-white/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="clay-pill text-[10px] font-bold uppercase tracking-wider bg-[#2C51A2] text-white px-2.5 py-0.5 rounded-full">
              Trainee Curriculum
            </span>
            <span className="text-xs text-[#64748B] font-medium">My Active Learning Path</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1E3B78] tracking-tight mt-1.5">
            My Assigned Training Courses
          </h1>
          <p className="text-xs text-[#64748B] mt-1 max-w-2xl leading-relaxed">
            Complete assigned courses, access learning materials, and fulfill compliance benchmarks.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { label: 'All Assigned Programs', value: '' },
          { label: 'In Progress', value: 'in_progress' },
          { label: 'Completed Certifications', value: 'completed' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all rounded-xl ${
              filter === tab.value
                ? 'clay-btn-primary text-white shadow-sm'
                : 'clay-btn-secondary text-[#64748B] hover:text-[#1E3B78]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Courses Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs font-semibold text-[#64748B] clay-card rounded-2xl border border-white/60">
          Loading your assigned courses...
        </div>
      ) : courses.length === 0 ? (
        <div className="p-12 text-center clay-card rounded-2xl border border-white/60">
          <BookOpen className="w-10 h-10 text-[#64748B] mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#1E3B78]">No Assigned Courses Found</h3>
          <p className="text-xs text-[#64748B] mt-1 mb-4">
            You do not have any active training programs matching this filter.
          </p>
          {user?.role === 'admin' && (
            <Button variant="primary" size="sm" onClick={() => navigate('/admin/courses')}>
              Open Global Catalog to Preview & Launch Any Course
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {courses.map((item) => (
            <div
              key={item.id}
              className="clay-card clay-card-hover rounded-2xl border border-white/60 flex flex-col justify-between overflow-hidden"
            >
              <div className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="clay-pill text-[10px] font-bold uppercase tracking-wider bg-[#E2E9F4] text-[#1E3B78] px-3 py-1 rounded-full">
                      {item.course_category}
                    </span>
                    <span className={`clay-pill text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                      item.course_type === 'certified' || !item.course_type
                        ? 'bg-blue-50 text-[#1E3B78] border border-blue-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-300'
                    }`}>
                      {item.course_type === 'non_certified' ? 'Non-Certified' : 'Certified'}
                    </span>
                  </div>
                  {getStatusBadge(item.status)}
                </div>

                <h3 className="text-base font-bold text-[#1E3B78] tracking-tight leading-snug">
                  {item.course_title}
                </h3>
                <p className="text-xs text-[#64748B] mt-2 line-clamp-2 leading-relaxed">
                  {item.course_description || 'No description provided.'}
                </p>

                <div className="mt-4 pt-3 border-t border-[#E2E8F0]/60 text-xs text-[#64748B] space-y-1.5 font-medium">
                  <div>
                    Instructor: <strong className="text-[#172B4D]">{item.instructor_name}</strong> ({item.instructor_department})
                  </div>
                  {item.due_date && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <Calendar className="w-3.5 h-3.5 text-[#2C51A2]" />
                      <span>Deadline: </span>
                      <strong className={item.status === 'overdue' ? 'text-[#DC2626]' : 'text-[#172B4D]'}>
                        {new Date(item.due_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </strong>
                    </div>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="mt-5 space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-[#1E3B78]">
                    <span>Training Progress</span>
                    <span>{item.progress_percentage}%</span>
                  </div>
                  <ProgressBar value={item.progress_percentage} height="h-2.5" />
                  <div className="text-[10px] text-[#64748B] font-medium text-right">
                    {item.completed_lessons} of {item.total_lessons} lessons completed
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="px-5 sm:px-6 py-4 bg-[#F3F6FB]/80 border-t border-[#E2E8F0]/60 flex items-center justify-between">
                <div className="text-[11px] font-semibold text-[#64748B]">
                  Passing Score: <strong className="text-[#2C51A2]">{item.passing_percentage}%</strong>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  icon={PlayCircle}
                  onClick={() => navigate(`/learner/courses/${item.course_id}?resume=true${item.resumed_lesson_id ? `&lessonId=${item.resumed_lesson_id}` : ''}`)}
                >
                  {item.progress_percentage > 0 ? 'Resume Course' : 'Start Course'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LearnerCourses;
