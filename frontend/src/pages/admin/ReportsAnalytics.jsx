import React, { useEffect, useState } from 'react';
import reportService from '../../services/reportService';
import { exportToCsv } from '../../utils/downloadHelper';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import ProgressBar from '../../components/common/ProgressBar';
import Input from '../../components/common/Input';
import Pagination from '../../components/common/Pagination';
import {
  BarChart3,
  Download,
  CheckCircle,
  Clock,
  Award,
  Users,
  BookOpen,
  Building,
  Search,
  Filter
} from 'lucide-react';

const ReportsAnalytics = () => {
  const [overviewData, setOverviewData] = useState(null);
  const [coursesReport, setCoursesReport] = useState([]);
  const [complianceReport, setComplianceReport] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active view tab
  const [activeTab, setActiveTab] = useState('courses'); // 'courses' | 'departments' | 'trainees'
  const [searchTerm, setSearchTerm] = useState('');

  const fetchReports = async () => {
    try {
      setLoading(true);
      const [overviewRes, coursesRes, complianceRes] = await Promise.all([
        reportService.getOverview(),
        reportService.getCoursesReport({ search: searchTerm }),
        reportService.getComplianceReport({ search: searchTerm }),
      ]);

      if (overviewRes.status === 'success') {
        setOverviewData(overviewRes.data);
      }
      if (coursesRes.status === 'success') {
        setCoursesReport(coursesRes.data);
      }
      if (complianceRes.status === 'success') {
        setComplianceReport(complianceRes.data);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [searchTerm]);

  // CSV Export utility
  const handleExportCSV = () => {
    try {
      if (activeTab === 'courses') {
        const headers = [
          'Course Title',
          'Category',
          'Instructor',
          'Enrolled',
          'In Progress',
          'Completed',
          'Completion Rate',
          'Avg Exam Score'
        ];
        const rows = (coursesReport || []).map((c) => [
          c.course_title || '',
          c.category || '',
          c.instructor_name || '',
          c.enrolled_count ?? 0,
          c.in_progress_count ?? 0,
          c.completed_count ?? 0,
          `${c.completion_rate ?? 0}%`,
          `${c.avg_exam_score ?? 0}%`
        ]);
        exportToCsv('course_completion_report.csv', headers, rows);
      } else if (activeTab === 'departments') {
        const headers = [
          'Department',
          'Trainees',
          'Total Assignments',
          'Completed Assignments',
          'Compliance Rate',
          'Avg Exam Score'
        ];
        const rows = (overviewData?.departments || []).map((d) => [
          d.department || '',
          d.total_learners ?? 0,
          d.total_assignments ?? 0,
          d.completed_assignments ?? 0,
          `${d.completion_percentage ?? 0}%`,
          `${d.avg_exam_score ?? 0}%`
        ]);
        exportToCsv('departmental_compliance_report.csv', headers, rows);
      } else {
        const headers = [
          'Employee ID',
          'Name',
          'Email',
          'Department',
          'Assigned Courses',
          'Completed',
          'Compliance Rate',
          'Passed Exams'
        ];
        const rows = (complianceReport || []).map((t) => [
          t.employee_id || '',
          t.learner_name || '',
          t.email || '',
          t.department || '',
          t.assigned_count ?? 0,
          t.completed_count ?? 0,
          `${t.compliance_rate ?? 0}%`,
          t.passed_assessments_count ?? 0
        ]);
        exportToCsv('trainee_compliance_report.csv', headers, rows);
      }
    } catch (err) {
      console.error('Error generating CSV export:', err);
    }
  };

  const overview = overviewData?.overview;
  const departments = overviewData?.departments || [];

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm]);

  const currentDataList =
    activeTab === 'courses'
      ? coursesReport
      : activeTab === 'departments'
      ? departments
      : complianceReport;

  const paginatedCourses = coursesReport.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const paginatedDepartments = departments.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const paginatedCompliance = complianceReport.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      {/* Top Banner Header with Minimal Clay Surface */}
      <div className="clay-card p-6 sm:p-7 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#2C51A2] text-white px-2.5 py-0.5 rounded-full clay-pill">
              Executive Analytics
            </span>
            <span className="text-xs text-[#64748B]">Compliance & Competency Metrics</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#172B4D] uppercase tracking-wide mt-1.5">
            Enterprise Training Analytics & Reports
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5 max-w-2xl leading-relaxed">
            Audit organizational learning compliance, monitor course completion velocity, and export compliance reports.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="secondary" size="sm" icon={Download} onClick={handleExportCSV}>
            Export CSV ({activeTab})
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid with Minimal Clay Elevation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Completion Rate', value: `${overview?.completion_rate ?? 0}%`, sub: 'Organization Benchmark', icon: CheckCircle, accent: 'border-t-4 border-[#2C51A2]' },
          { label: 'Active Enrollments', value: overview?.active_enrollments ?? 0, sub: `${overview?.total_assignments ?? 0} Total Assigned`, icon: Clock, accent: 'border-t-4 border-[#2C51A2]' },
          { label: 'Exam Passing Rate', value: `${overview?.exam_pass_rate ?? 0}%`, sub: `${overview?.passed_attempts ?? 0} Passed Attempts`, icon: Award, accent: 'border-t-4 border-[#1E3B78]' },
          { label: 'Average Exam Score', value: `${overview?.avg_score ?? 0}%`, sub: 'Evaluated Objective Exams', icon: BarChart3, accent: 'border-t-4 border-[#D97706]' },
        ].map((kpi, idx) => {
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

      {/* View Switcher Tabs and Search Bar with Minimal Clay Surface */}
      <div className="clay-card p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 border-b sm:border-b-0 pb-2 sm:pb-0 w-full sm:w-auto">
          {[
            { id: 'courses', label: 'Course Curriculum', icon: BookOpen },
            { id: 'departments', label: 'Departmental Compliance', icon: Building },
            { id: 'trainees', label: 'Trainee Compliance', icon: Users },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold uppercase tracking-wider transition-all rounded-xl ${
                  isActive
                    ? 'clay-btn-primary'
                    : 'clay-btn-secondary'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-72">
          <Input
            placeholder="Search report items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={Search}
          />
        </div>
      </div>

      {/* Main Report Table Container with Minimal Clay Surface */}
      <div className="clay-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto touch-scroll">
          {/* TAB 1: Courses Analytics Table */}
          {activeTab === 'courses' && (
            <table className="w-full text-center border-collapse min-w-[760px]">
              <thead>
                <tr 
                  className="text-white text-[11px] font-bold uppercase tracking-wider text-center"
                  style={{
                    background: 'linear-gradient(160deg, #1E3B78 0%, #2C51A2 100%)',
                    boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.2)'
                  }}
                >
                  <th className="py-3.5 px-4 text-center">Curriculum Course</th>
                  <th className="py-3.5 px-4 text-center">Instructor</th>
                  <th className="py-3.5 px-4 text-center">Enrolled</th>
                  <th className="py-3.5 px-4 text-center">In Progress</th>
                  <th className="py-3.5 px-4 text-center">Completed</th>
                  <th className="py-3.5 px-4 text-center w-44">Completion Rate</th>
                  <th className="py-3.5 px-4 text-center">Exams Passed</th>
                  <th className="py-3.5 px-4 text-center">Avg Exam Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]/70 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-[#64748B]">
                      Loading curriculum completion metrics...
                    </td>
                  </tr>
                ) : coursesReport.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-[#64748B]">
                      No course metrics found.
                    </td>
                  </tr>
                ) : (
                  paginatedCourses.map((c) => (
                    <tr key={c.course_id} className="hover:bg-[#EFF6FF]/60 transition-colors">
                      <td className="py-3.5 px-4 text-center">
                        <div className="font-bold text-[#172B4D]">{c.course_title}</div>
                        <span className="text-[10px] text-[#2C51A2] font-bold uppercase">{c.category}</span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-[#172B4D] text-left">
                        {c.instructor_name}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-[#172B4D] font-mono">
                        {c.enrolled_count}
                      </td>
                      <td className="py-3.5 px-4 text-center text-[#D97706] font-bold font-mono">
                        {c.in_progress_count}
                      </td>
                      <td className="py-3.5 px-4 text-center text-[#2C51A2] font-bold font-mono">
                        {c.completed_count}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <ProgressBar value={parseFloat(c.completion_rate || 0)} showLabel height="h-2" />
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-[#172B4D] font-mono">
                        {c.passed_exams_count || 0}
                      </td>
                      <td className="py-3.5 px-4 text-center font-extrabold text-[#2C51A2] font-mono">
                        {c.avg_exam_score ? `${c.avg_exam_score}%` : 'N/A'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* TAB 2: Departmental Compliance Table */}
          {activeTab === 'departments' && (
            <table className="w-full text-center border-collapse min-w-[700px]">
              <thead>
                <tr 
                  className="text-white text-[11px] font-bold uppercase tracking-wider text-center"
                  style={{
                    background: 'linear-gradient(160deg, #1E3B78 0%, #2C51A2 100%)',
                    boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.2)'
                  }}
                >
                  <th className="py-3.5 px-4 text-center">Corporate Department</th>
                  <th className="py-3.5 px-4 text-center">Trainees</th>
                  <th className="py-3.5 px-4 text-center">Assigned Curriculum</th>
                  <th className="py-3.5 px-4 text-center">Completed Curriculum</th>
                  <th className="py-3.5 px-4 text-center w-52">Compliance Rate</th>
                  <th className="py-3.5 px-4 text-center">Avg Exam Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]/70 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-[#64748B]">
                      Loading departmental compliance metrics...
                    </td>
                  </tr>
                ) : departments.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-[#64748B]">
                      No department metrics found.
                    </td>
                  </tr>
                ) : (
                  paginatedDepartments.map((d, idx) => (
                    <tr key={idx} className="hover:bg-[#EFF6FF]/60 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-[#172B4D] text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Building className="w-4 h-4 text-[#2C51A2]" />
                        <span>{d.department}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-[#172B4D] font-mono">
                      {d.total_learners}
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold text-[#172B4D] font-mono">
                      {d.total_assignments}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-[#2C51A2] font-mono">
                      {d.completed_assignments}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <ProgressBar value={parseFloat(d.completion_percentage || 0)} showLabel height="h-2" />
                    </td>
                    <td className="py-3.5 px-4 text-center font-extrabold text-[#2C51A2] font-mono">
                      {d.avg_exam_score}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            </table>
          )}

          {/* TAB 3: Trainee Compliance Table */}
          {activeTab === 'trainees' && (
            <table className="w-full text-center border-collapse min-w-[760px]">
              <thead>
                <tr 
                  className="text-white text-[11px] font-bold uppercase tracking-wider text-center"
                  style={{
                    background: 'linear-gradient(160deg, #1E3B78 0%, #2C51A2 100%)',
                    boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.2)'
                  }}
                >
                  <th className="py-3.5 px-4 text-center">Trainee Employee</th>
                  <th className="py-3.5 px-4 text-center">Department & Designation</th>
                  <th className="py-3.5 px-4 text-center">Assigned</th>
                  <th className="py-3.5 px-4 text-center">In Progress</th>
                  <th className="py-3.5 px-4 text-center">Completed</th>
                  <th className="py-3.5 px-4 text-center w-44">Compliance Rate</th>
                  <th className="py-3.5 px-4 text-center">Passed Exams</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]/70 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-[#64748B]">
                      Loading trainee compliance metrics...
                    </td>
                  </tr>
                ) : complianceReport.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-[#64748B]">
                      No trainee compliance records found.
                    </td>
                  </tr>
                ) : (
                  paginatedCompliance.map((t) => (
                    <tr key={t.learner_id} className="hover:bg-[#EFF6FF]/60 transition-colors">
                      <td className="py-3.5 px-4 text-left">
                        <div className="font-bold text-[#172B4D]">{t.learner_name}</div>
                        <div className="text-[11px] text-[#64748B]">{t.email} ({t.employee_id})</div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="font-semibold text-[#172B4D]">{t.department}</div>
                        <div className="text-[11px] text-[#64748B]">{t.designation}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-[#172B4D] font-mono">
                        {t.assigned_count}
                      </td>
                      <td className="py-3.5 px-4 text-center text-[#D97706] font-bold font-mono">
                        {t.in_progress_count}
                      </td>
                      <td className="py-3.5 px-4 text-center text-[#2C51A2] font-bold font-mono">
                        {t.completed_count}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <ProgressBar value={parseFloat(t.compliance_rate || 0)} showLabel height="h-2" />
                      </td>
                      <td className="py-3.5 px-4 text-center font-extrabold text-[#2C51A2] font-mono">
                        {t.passed_assessments_count}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
        <Pagination
          currentPage={currentPage}
          totalItems={currentDataList.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[5, 10, 20, 50]}
        />
      </div>
    </div>
  );
};

export default ReportsAnalytics;
