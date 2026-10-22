import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useDialog } from '../../contexts/DialogContext';
import assignmentService from '../../services/assignmentService';
import courseService from '../../services/courseService';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import ProgressBar from '../../components/common/ProgressBar';
import Pagination from '../../components/common/Pagination';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Trash2,
  Calendar,
  Users,
  BookOpen,
  Clock,
  AlertCircle,
  Building,
  Check,
  ArrowLeft
} from 'lucide-react';

const CourseAssignments = () => {
  const { user } = useAuth();
  const { showAlert, showConfirm } = useDialog();
  const [searchParams] = useSearchParams();
  const paramCourseId = searchParams.get('courseId');
  const paramOpenAssign = searchParams.get('openAssign');

  const [assignments, setAssignments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [learners, setLearners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState(paramCourseId || '');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // View Mode: 'list' | 'assign'
  const [viewMode, setViewMode] = useState('list');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedLearnerIds, setSelectedLearnerIds] = useState([]);
  const [dueDate, setDueDate] = useState('');
  const [learnerSearch, setLearnerSearch] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All Departments');
  const [submitting, setSubmitting] = useState(false);

  const isInstructor = (user?.role || '').toLowerCase() === 'instructor';

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const res = await assignmentService.getAssignments({
        search,
        status: statusFilter,
        course_id: courseFilter,
      });
      if (res.status === 'success') {
        setAssignments(res.data);
      }
    } catch (err) {
      console.error('Failed to load assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCoursesAndLearners = async () => {
    try {
      const [coursesRes, learnersRes] = await Promise.all([
        courseService.getCourses(isInstructor ? { my_courses: 1 } : {}),
        assignmentService.getAvailableLearners(),
      ]);
      if (coursesRes.status === 'success') {
        setCourses(coursesRes.data);
        if (coursesRes.data.length > 0) {
          const initialCourseId = paramCourseId || coursesRes.data[0].id;
          setSelectedCourseId(initialCourseId);
        }
      }
      if (learnersRes.status === 'success') {
        setLearners(learnersRes.data);
      }
    } catch (err) {
      console.error('Failed to load courses or learners:', err);
    }
  };

  useEffect(() => {
    loadCoursesAndLearners();
  }, []);

  useEffect(() => {
    fetchAssignments();
  }, [statusFilter, courseFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, courseFilter]);

  const paginatedAssignments = assignments.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Handle direct modal trigger via URL param
  useEffect(() => {
    if (paramOpenAssign && courses.length > 0) {
      handleOpenAssign(paramCourseId);
    }
  }, [paramOpenAssign, courses]);

  const handleOpenAssign = (courseId = null) => {
    if (courseId) {
      setSelectedCourseId(courseId);
    } else {
      const firstPublished = courses.find((c) => c.status === 'published');
      if (firstPublished) {
        setSelectedCourseId(firstPublished.id);
      } else if (courses.length > 0) {
        setSelectedCourseId(courses[0].id);
      }
    }
    setSelectedLearnerIds([]);
    setDueDate('');
    setLearnerSearch('');
    setSelectedDepartment('All Departments');
    setViewMode('assign');
  };

  const handleToggleLearner = (learnerId) => {
    setSelectedLearnerIds((prev) =>
      prev.includes(learnerId) ? prev.filter((id) => id !== learnerId) : [...prev, learnerId]
    );
  };

  // Derive distinct departments from learners list
  const availableDepartments = [
    'All Departments',
    ...Array.from(new Set(learners.map((l) => l.department).filter(Boolean))),
  ];

  // Filter learners by department and search text
  const filteredLearners = learners.filter((l) => {
    const matchesDept =
      selectedDepartment === 'All Departments' || l.department === selectedDepartment;
    const term = learnerSearch.toLowerCase();
    const matchesSearch =
      !term ||
      (l.first_name || '').toLowerCase().includes(term) ||
      (l.last_name || '').toLowerCase().includes(term) ||
      (l.email || '').toLowerCase().includes(term) ||
      (l.employee_id || '').toLowerCase().includes(term);
    return matchesDept && matchesSearch;
  });

  const handleSelectAllFiltered = () => {
    const ids = filteredLearners.map((l) => parseInt(l.id));
    setSelectedLearnerIds((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const handleDeselectFiltered = () => {
    const idsToRemove = new Set(filteredLearners.map((l) => parseInt(l.id)));
    setSelectedLearnerIds((prev) => prev.filter((id) => !idsToRemove.has(id)));
  };

  const handleClearAll = () => {
    setSelectedLearnerIds([]);
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCourseId) {
      showAlert({
        title: 'Validation Error',
        message: 'Please select a course to assign.',
        type: 'warning',
      });
      return;
    }
    const currentCourse = courses.find((c) => String(c.id) === String(selectedCourseId));
    if (currentCourse && currentCourse.status !== 'published') {
      showAlert({
        title: 'Publication Required',
        message: 'Cannot assign course: The course must be published before it can be assigned to learners.',
        type: 'warning',
      });
      return;
    }
    if (selectedLearnerIds.length === 0) {
      showAlert({
        title: 'Validation Error',
        message: 'Please select at least one trainee learner.',
        type: 'warning',
      });
      return;
    }

    try {
      setSubmitting(true);
      const res = await assignmentService.assignCourse({
        course_id: selectedCourseId,
        learner_ids: selectedLearnerIds,
        due_date: dueDate || null,
      });

      if (res.status === 'success') {
        setViewMode('list');
        const enrolledCount = res.data?.assigned_count ?? selectedLearnerIds.length;
        setSuccessMessage(`Successfully enrolled ${enrolledCount} trainee(s) into course!`);
        fetchAssignments();
        setTimeout(() => setSuccessMessage(''), 6000);
      }
    } catch (err) {
      showAlert({
        title: 'Enrollment Error',
        message: err.response?.data?.message || err.message || 'Error assigning course',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId, learnerName) => {
    const confirmed = await showConfirm({
      title: 'Unenroll Trainee',
      message: `Unenroll ${learnerName} from this course? Their progress record will be archived.`,
      confirmText: 'Unenroll Trainee',
      type: 'confirm',
    });
    if (!confirmed) return;

    try {
      await assignmentService.deleteAssignment(assignmentId);
      fetchAssignments();
    } catch (err) {
      showAlert({
        title: 'Unenrollment Error',
        message: err.message || 'Error deleting assignment',
        type: 'error',
      });
    }
  };

  // Identify learners already assigned to the currently selected modal course
  const enrolledInSelectedCourse = new Set(
    assignments
      .filter((a) => String(a.course_id) === String(selectedCourseId))
      .map((a) => parseInt(a.learner_id))
  );

  const selectedCourseObj = courses.find((c) => String(c.id) === String(selectedCourseId));

  if (viewMode === 'assign') {
    return (
      <div className="space-y-6">
        {/* Top Header Banner with Back Button */}
        <div className="clay-card p-6 sm:p-7 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#2C51A2] text-white px-2.5 py-0.5 rounded-full clay-pill">
                Enrollment Management
              </span>
              <span className="text-xs text-[#64748B]">Trainee Course Assignment Studio</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#172B4D] uppercase tracking-wide mt-1.5">
              Assign Training Program to Trainees
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5 max-w-2xl leading-relaxed">
              Enroll employees, set completion deadlines, and establish automated tracking.
            </p>
          </div>
          <div>
            <Button variant="secondary" size="md" icon={ArrowLeft} onClick={() => setViewMode('list')}>
              Back to Assignments
            </Button>
          </div>
        </div>

        {/* Dedicated Assign Form Card */}
        <div className="clay-card p-6 sm:p-8 rounded-2xl shadow-sm">
          <form onSubmit={handleAssignSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#172B4D] mb-1.5">
                  Select Course <span className="text-[#DC2626]">*</span>
                </label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full text-[#172B4D] text-xs font-bold rounded-xl h-11 px-3.5 focus:outline-none clay-input cursor-pointer"
                  required
                >
                  {courses.map((c) => {
                    const isPublished = c.status === 'published';
                    return (
                      <option key={c.id} value={c.id} disabled={!isPublished}>
                        {c.title} {isPublished ? '(Published)' : '(Draft - Publication Required)'}
                      </option>
                    );
                  })}
                </select>
                {(() => {
                  const activeC = courses.find((c) => String(c.id) === String(selectedCourseId));
                  if (activeC && activeC.status !== 'published') {
                    return (
                      <p className="text-[11px] font-bold text-[#DC2626] mt-1.5 leading-snug">
                        Publication Required: This course is currently in draft. It must be published before trainees can be assigned.
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#172B4D] mb-1.5">
                  Completion Deadline (Optional)
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full text-[#172B4D] text-xs font-bold rounded-xl h-11 px-3.5 focus:outline-none clay-input cursor-pointer font-mono"
                />
              </div>
            </div>

            {/* Department Filter & Search Toolbar */}
            <div className="pt-3 border-t border-[#E2E8F0]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <label className="text-xs font-bold uppercase tracking-wider text-[#2C51A2]">
                  Select Trainees ({selectedLearnerIds.length} Selected) <span className="text-[#DC2626]">*</span>
                </label>

                {/* Batch Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllFiltered}
                    className="text-xs font-bold text-[#2C51A2] hover:underline active:translate-y-0.5"
                  >
                    Select All Filtered ({filteredLearners.length})
                  </button>
                  <span className="text-[#CBD5E1]">|</span>
                  <button
                    type="button"
                    onClick={handleDeselectFiltered}
                    className="text-xs font-bold text-[#64748B] hover:underline active:translate-y-0.5"
                  >
                    Deselect Filtered
                  </button>
                  <span className="text-[#CBD5E1]">|</span>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-xs font-bold text-[#DC2626] hover:underline active:translate-y-0.5"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                {/* Department Dropdown Filter */}
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full text-xs font-bold text-[#2C51A2] rounded-xl h-10 px-3.5 focus:outline-none clay-input cursor-pointer"
                >
                  {availableDepartments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>

                {/* Text Search Filter */}
                <input
                  type="text"
                  placeholder="Search trainees by name, email, employee ID..."
                  value={learnerSearch}
                  onChange={(e) => setLearnerSearch(e.target.value)}
                  className="w-full text-xs rounded-xl h-10 px-3.5 focus:outline-none clay-input"
                />
              </div>

              {/* Trainee Checkbox List */}
              <div className="border border-[#CBD5E1] rounded-2xl max-h-80 overflow-y-auto divide-y divide-[#E2E8F0] touch-scroll clay-card">
                {filteredLearners.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#64748B]">
                    No active trainee learners found matching the filter criteria.
                  </div>
                ) : (
                  filteredLearners.map((learner) => {
                    const isChecked = selectedLearnerIds.includes(parseInt(learner.id));
                    const isEnrolled = enrolledInSelectedCourse.has(parseInt(learner.id));

                    return (
                      <label
                        key={learner.id}
                        className={`flex items-center justify-between p-3.5 cursor-pointer transition-colors ${
                          isChecked ? 'bg-[#EFF6FF]' : 'hover:bg-[#F8FAFC]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleLearner(parseInt(learner.id))}
                            className="w-4 h-4 accent-[#2C51A2] cursor-pointer"
                          />
                          <div>
                            <div className="font-bold text-xs text-[#172B4D] flex items-center gap-2">
                              <span>{learner.first_name} {learner.last_name}</span>
                              {isEnrolled && (
                                <span className="text-[9px] font-bold uppercase tracking-wider bg-[#E2E8F0] text-[#475569] px-2 py-0.5 rounded-full clay-pill">
                                  Already Enrolled
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-[#64748B]">
                              {learner.employee_id} • {learner.email}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold bg-[#E2E9F4] text-[#2C51A2] px-2.5 py-0.5 rounded-full clay-pill">
                          {learner.department || 'General Trainee'}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            {/* Target Assignment Summary Banner */}
            {selectedLearnerIds.length > 0 && selectedCourseObj && (
              <div className="p-4 clay-card rounded-2xl text-xs text-[#172B4D] flex items-center justify-between">
                <div>
                  <span className="font-bold uppercase tracking-wider text-[10px] text-[#2C51A2] block">Batch Summary</span>
                  <span>
                    Enrolling <strong>{selectedLearnerIds.length}</strong> trainee(s) into <strong>{selectedCourseObj.title}</strong>
                    {dueDate ? ` (Due: ${new Date(dueDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })})` : ' (No deadline)'}.
                  </span>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-[#E2E8F0] flex justify-end gap-2.5">
              <Button variant="secondary" onClick={() => setViewMode('list')}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={submitting}
                disabled={selectedCourseObj?.status !== 'published' || selectedLearnerIds.length === 0}
                title={selectedCourseObj?.status !== 'published' ? 'Course must be published before assignment' : ''}
              >
                Confirm Course Assignment ({selectedLearnerIds.length})
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner with Minimal Clay Surface */}
      <div className="clay-card p-6 sm:p-7 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#2C51A2] text-white px-2.5 py-0.5 rounded-full clay-pill">
              Enrollment Management
            </span>
            <span className="text-xs text-[#64748B]">Trainee Course Assignments</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#172B4D] uppercase tracking-wide mt-1.5">
            Trainee Course Assignments & Tracking
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5 max-w-2xl leading-relaxed">
            Enroll trainee employees into published programs, assign completion deadlines, and monitor real-time progress.
          </p>
        </div>
        <div>
          <Button variant="primary" size="md" icon={Plus} onClick={() => handleOpenAssign()}>
            Assign Course to Trainees
          </Button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successMessage && (
        <div 
          className="bg-[#EFF6FF] border border-[#2C51A2] p-4 text-xs font-bold text-[#172B4D] rounded-2xl flex items-center justify-between shadow-sm"
          style={{
            boxShadow: '0 4px 12px -2px rgba(16, 185, 129, 0.1), inset 0 1px 1px rgba(255, 255, 255, 0.8)'
          }}
        >
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-[#2C51A2] shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage('')}
            className="text-[#172B4D] hover:text-[#1E3B78] font-extrabold text-base leading-none"
          >
            &times;
          </button>
        </div>
      )}

      {/* Filter Toolbar with Minimal Clay Surface */}
      <div className="clay-card p-4 rounded-2xl flex flex-col md:flex-row items-center gap-4">
        <div className="flex-1 w-full flex items-center gap-2">
          <Input
            placeholder="Search by trainee name, ID, course..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={Search}
          />
          <Button variant="secondary" size="md" onClick={fetchAssignments}>
            Filter
          </Button>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full md:w-auto">
          {/* Course Filter Dropdown */}
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="h-11 px-3.5 rounded-xl text-xs font-bold text-[#2C51A2] clay-input cursor-pointer max-w-xs"
          >
            <option value="">All Courses ({courses.length})</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>

          {/* Status Filter Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-11 px-3.5 rounded-xl text-xs font-bold text-[#2C51A2] clay-input cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>

      {/* Assignments Table with Minimal Clay Surface */}
      <div className="clay-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto touch-scroll">
          <table className="w-full text-left border-collapse text-xs min-w-[760px]">
            <thead>
              <tr 
                className="text-white uppercase tracking-wider font-bold text-[11px]"
                style={{
                  background: 'linear-gradient(160deg, #1E3B78 0%, #2C51A2 100%)',
                  boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.2)'
                }}
              >
                <th className="py-3.5 px-4">Trainee Employee</th>
                <th className="py-3.5 px-4">Department</th>
                <th className="py-3.5 px-4">Assigned Course</th>
                <th className="py-3.5 px-4">Assigned / Due</th>
                <th className="py-3.5 px-4 w-44">Module Progress</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]/70">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-[#64748B]">
                    Loading assignments matrix...
                  </td>
                </tr>
              ) : assignments.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-[#64748B]">
                    No active course assignments found.
                  </td>
                </tr>
              ) : (
                paginatedAssignments.map((item) => (
                  <tr key={item.id} className="hover:bg-[#EFF6FF]/60 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-[#172B4D]">
                      <div className="flex items-center gap-2.5">
                        <div 
                          className="w-7 h-7 rounded-full text-white flex items-center justify-center font-bold text-xs shrink-0"
                          style={{
                            background: 'linear-gradient(160deg, #23458B 0%, #1E3B78 100%)',
                            boxShadow: '0 2px 4px rgba(44, 81, 162, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.4)'
                          }}
                        >
                          {item.learner_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <div>{item.learner_name}</div>
                          <div className="text-[10px] text-[#64748B] font-mono">
                            {item.learner_employee_id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#172B4D] font-bold">
                      {item.learner_department || 'General Trainee'}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#172B4D]">{item.course_title}</div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[10px] text-[#2C51A2] font-bold uppercase">{item.course_category}</span>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full ${
                          item.course_type === 'certified' || !item.course_type
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-300'
                        }`}>
                          {item.course_type === 'non_certified' ? 'Non-Certified' : 'Certified'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[11px] text-[#64748B]">
                      <div className="font-mono">Assigned: {item.assigned_at?.slice(0, 10)}</div>
                      {item.due_date ? (
                        <div className="text-[#B45309] font-bold font-mono">Due: {item.due_date}</div>
                      ) : (
                        <div className="text-[#94A3B8]">Self-paced</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <ProgressBar value={parseFloat(item.progress_percentage || 0)} showLabel height="h-2" />
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Badge
                        variant={
                          item.status === 'completed'
                            ? 'success'
                            : item.status === 'in_progress'
                            ? 'warning'
                            : item.status === 'overdue'
                            ? 'error'
                            : 'neutral'
                        }
                      >
                        {item.status?.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="danger"
                        size="sm"
                        icon={Trash2}
                        onClick={() => handleDeleteAssignment(item.id, item.learner_name)}
                        title="Unenroll Trainee"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Universal Pagination */}
        <Pagination
          currentPage={currentPage}
          totalItems={assignments.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[5, 10, 20, 50]}
        />
      </div>
    </div>
  );
};

export default CourseAssignments;
