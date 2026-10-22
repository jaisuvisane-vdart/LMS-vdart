import React, { useEffect, useState } from 'react';
import { useDialog } from '../../contexts/DialogContext';
import assessmentService from '../../services/assessmentService';
import courseService from '../../services/courseService';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Pagination from '../../components/common/Pagination';
import {
  Award,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Search,
  Filter,
  BarChart3,
  HelpCircle,
  ArrowLeft
} from 'lucide-react';

const TraineePerformance = () => {
  const { showAlert } = useDialog();
  const [attempts, setAttempts] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedResult, setSelectedResult] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // View Mode: 'list' | 'scorecard'
  const [viewMode, setViewMode] = useState('list');
  const [inspectScorecard, setInspectScorecard] = useState(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  const fetchAttempts = async () => {
    try {
      setLoading(true);
      const res = await assessmentService.getAttempts({
        course_id: selectedCourse,
        is_passed: selectedResult,
        status: selectedStatus,
        search: searchTerm,
      });
      if (res.status === 'success') {
        setAttempts(res.data);
      }
    } catch (err) {
      console.error('Failed to load trainee attempts:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await courseService.getCourses({ my_courses: 1 });
      if (res.status === 'success') {
        setCourses(res.data);
      }
    } catch (err) {
      console.error('Failed to load courses:', err);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    fetchAttempts();
  }, [selectedCourse, selectedResult, selectedStatus]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCourse, selectedResult, selectedStatus, searchTerm]);

  const paginatedAttempts = attempts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleInspectScorecard = async (attemptId) => {
    try {
      setInspectLoading(true);
      setViewMode('scorecard');
      const res = await assessmentService.getAttemptResult(attemptId);
      if (res.status === 'success') {
        setInspectScorecard(res.data);
      }
    } catch (err) {
      showAlert({
        title: 'Scorecard Error',
        message: 'Error loading scorecard inspection',
        type: 'error',
      });
      setViewMode('list');
    } finally {
      setInspectLoading(false);
    }
  };

  // Metrics
  const totalPassed = attempts.filter((a) => a.is_passed == 1).length;
  const passRate = attempts.length > 0 ? ((totalPassed / attempts.length) * 100).toFixed(0) : 0;
  const avgScore =
    attempts.length > 0
      ? (
          attempts.reduce((sum, a) => sum + parseFloat(a.percentage || 0), 0) /
          attempts.length
        ).toFixed(1)
      : 0;

  if (viewMode === 'scorecard') {
    return (
      <div className="space-y-6">
        {/* Top Banner Header with Back Button */}
        <div className="clay-card p-6 sm:p-7 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#2C51A2] text-white px-2.5 py-0.5 rounded-full clay-pill">
                Performance Evaluation
              </span>
              <span className="text-xs text-[#64748B]">Trainee Examination Scorecard</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#172B4D] uppercase tracking-wide mt-1.5">
              Scorecard: {inspectScorecard?.learner_name || 'Trainee'} • {inspectScorecard?.assessment_title || ''}
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5 max-w-2xl leading-relaxed">
              Itemized review of submitted examination responses, scored benchmarks, and rationale explanations.
            </p>
          </div>
          <div>
            <Button variant="secondary" size="md" icon={ArrowLeft} onClick={() => setViewMode('list')}>
              Back to Trainee Directory
            </Button>
          </div>
        </div>

        {inspectLoading || !inspectScorecard ? (
          <div className="clay-card p-12 rounded-2xl text-center text-xs text-[#64748B]">
            Loading scorecard audit records...
          </div>
        ) : (
          <div className="space-y-6 max-w-4xl">
            {/* Header Score Summary Banner */}
            <div
              className={`p-6 rounded-2xl border ${
                inspectScorecard.is_passed == 1
                  ? 'bg-gradient-to-br from-[#EFF6FF] to-[#E2E9F4] border-[#BCD0EC] text-[#172B4D] shadow-sm'
                  : 'bg-gradient-to-br from-[#FEF2F2] to-[#FEE2E2] border-[#FECACA] text-[#991B1B] shadow-sm'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-widest opacity-80">
                    Evaluation Outcome
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight mt-0.5">
                    {inspectScorecard.is_passed == 1 ? 'Exam Passed' : 'Exam Failed (Benchmark Not Met)'}
                  </h3>
                  <p className="text-xs mt-1.5 opacity-90 font-medium">
                    Passing Threshold: {parseFloat(inspectScorecard.passing_percentage).toFixed(0)}% • Submitted: {inspectScorecard.submitted_at}
                  </p>
                </div>
                <div className="sm:text-right">
                  <div className="text-4xl font-extrabold tracking-tight">
                    {parseFloat(inspectScorecard.percentage).toFixed(1)}%
                  </div>
                  <div className="text-xs font-semibold opacity-90 mt-1">
                    {inspectScorecard.total_score} of {inspectScorecard.max_score} Total Marks
                  </div>
                </div>
              </div>
            </div>

            {/* Questions Breakdown */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#1E3B78]">
                Item-by-Item Review ({inspectScorecard.questions?.length || 0} Questions)
              </h4>

              {inspectScorecard.questions?.map((q, idx) => {
                const isCorrect = q.is_correct == 1;
                return (
                  <div
                    key={q.question_id}
                    className="clay-card p-5 sm:p-6 rounded-2xl shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="clay-pill text-[10px] font-bold bg-[#2C51A2] text-white px-2.5 py-0.5 rounded-full uppercase">
                          Item {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-[#172B4D]">
                          {q.marks} {q.marks > 1 ? 'Marks' : 'Mark'}
                        </span>
                      </div>
                      <Badge variant={isCorrect ? 'success' : 'error'}>
                        {isCorrect ? `+${q.score_awarded} Awarded` : '0 Awarded'}
                      </Badge>
                    </div>

                    <p className="text-sm font-bold text-[#172B4D] mb-3 leading-relaxed">
                      {q.question_text}
                    </p>

                    <div className="space-y-2">
                      {q.options?.map((opt) => {
                        const isSelected = opt.id == q.selected_option_id;
                        const isAnswerKey = opt.is_correct == 1;

                        let style = 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B]';
                        if (isAnswerKey) {
                          style = 'bg-[#EFF6FF] border-[#BCD0EC] text-[#172B4D] font-bold shadow-sm';
                        } else if (isSelected && !isAnswerKey) {
                          style = 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B] font-semibold shadow-sm';
                        }

                        return (
                          <div
                            key={opt.id}
                            className={`p-3 text-xs border rounded-xl flex items-center justify-between ${style}`}
                          >
                            <span>{opt.option_text}</span>
                            <div className="flex items-center gap-2 text-[10px] uppercase font-bold">
                              {isSelected && <span>[Trainee Selected]</span>}
                              {isAnswerKey && <span>[Correct Answer]</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {q.explanation && (
                      <div className="mt-3 text-[11px] text-[#64748B] bg-[#F1F5F9]/80 p-3.5 rounded-xl border border-[#E2E8F0]">
                        <strong className="text-[#172B4D]">Explanation:</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-[#E2E8F0] flex justify-end">
              <Button variant="secondary" size="md" onClick={() => setViewMode('list')}>
                Return to Performance Directory
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="clay-card p-6 rounded-2xl border border-white/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="clay-pill text-[10px] font-bold uppercase tracking-wider bg-[#2C51A2] text-white px-2.5 py-0.5 rounded-full">
              Performance Reviewer
            </span>
            <span className="text-xs text-[#64748B] font-medium">Trainee Knowledge Verification</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1E3B78] tracking-tight mt-1.5">
            Trainee Assessment Results & Performance
          </h1>
          <p className="text-xs text-[#64748B] mt-1 max-w-2xl leading-relaxed">
            Audit objective exam attempts, evaluate individual answers, monitor pass/fail outcomes, and track trainee progress.
          </p>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Attempts', value: attempts.length, sub: 'Exam Submissions', icon: Users, iconColor: 'text-[#2C51A2]', iconBg: 'bg-[#E2E9F4]' },
          { label: 'Passing Rate', value: `${passRate}%`, sub: 'Passed Benchmark', icon: CheckCircle, iconColor: 'text-[#2C51A2]', iconBg: 'bg-[#E2E9F4]' },
          { label: 'Average Score', value: `${avgScore}%`, sub: 'All Evaluated Attempts', icon: BarChart3, iconColor: 'text-[#1E3B78]', iconBg: 'bg-[#E2E9F4]' },
          { label: 'Certifications', value: totalPassed, sub: 'Passing Scores', icon: Award, iconColor: 'text-[#D97706]', iconBg: 'bg-[#FEF3C7]' },
        ].map((kpi, idx) => {
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

      {/* Filter Toolbar */}
      <div className="clay-card p-4 rounded-2xl border border-white/60 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full md:w-auto flex-1">
          <Select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            options={[
              { value: '', label: 'All Courses' },
              ...courses.map((c) => ({ value: c.id, label: c.title })),
            ]}
          />
          <Select
            value={selectedResult}
            onChange={(e) => setSelectedResult(e.target.value)}
            options={[
              { value: '', label: 'All Results' },
              { value: '1', label: 'Passed Only' },
              { value: '0', label: 'Failed Only' },
            ]}
          />
          <Select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'completed', label: 'Completed' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'timed_out', label: 'Timed Out' },
            ]}
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="w-full sm:w-64">
            <Input
              placeholder="Search trainee name or exam..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={Search}
            />
          </div>
          <Button variant="outline" size="md" onClick={fetchAttempts}>
            Filter
          </Button>
        </div>
      </div>

      {/* Attempts Table */}
      <div className="clay-card rounded-2xl border border-white/60 overflow-hidden">
        <div className="overflow-x-auto touch-scroll">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="bg-gradient-to-r from-[#1E3B78] to-[#2C51A2] text-white text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Trainee Employee</th>
                <th className="py-3.5 px-4">Course & Assessment</th>
                <th className="py-3.5 px-4 text-center">Attempt</th>
                <th className="py-3.5 px-4 text-center">Score / Total</th>
                <th className="py-3.5 px-4 text-center">Percentage</th>
                <th className="py-3.5 px-4 text-center">Outcome</th>
                <th className="py-3.5 px-4">Date Submitted</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]/70 text-xs">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-[#64748B]">
                    Loading trainee examination records...
                  </td>
                </tr>
              ) : attempts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-[#64748B]">
                    No assessment attempts recorded for the selected criteria.
                  </td>
                </tr>
              ) : (
                paginatedAttempts.map((att) => {
                  const pct = parseFloat(att.percentage || 0).toFixed(1);
                  const isPassed = att.is_passed == 1;
                  return (
                    <tr key={att.id} className="hover:bg-[#F3F6FB]/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#1E3B78]">{att.learner_name}</div>
                        <div className="text-[11px] text-[#64748B]">{att.learner_email}</div>
                        {att.learner_department && (
                          <span className="text-[10px] text-[#2C51A2] font-semibold">{att.learner_department}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-bold text-[#172B4D] truncate">{att.assessment_title}</div>
                        <div className="text-[11px] text-[#64748B] truncate">{att.course_title}</div>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-[#172B4D]">
                        #{att.attempt_number}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-[#172B4D]">
                        {att.total_score} / {att.max_score}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-sm text-[#2C51A2]">
                        {pct}%
                      </td>
                      <td className="py-3 px-4 text-center">
                        {att.status === 'in_progress' ? (
                          <Badge variant="warning">In Progress</Badge>
                        ) : att.status === 'timed_out' ? (
                          <Badge variant="error">Timed Out</Badge>
                        ) : isPassed ? (
                          <Badge variant="success">Passed</Badge>
                        ) : (
                          <Badge variant="error">Failed</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[#64748B]">
                        {att.submitted_at || att.started_at}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {att.status === 'completed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            icon={Eye}
                            onClick={() => handleInspectScorecard(att.id)}
                          >
                            Scorecard
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Universal Pagination */}
        <Pagination
          currentPage={currentPage}
          totalItems={attempts.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[5, 10, 20, 50]}
        />
      </div>
    </div>
  );
};

export default TraineePerformance;
