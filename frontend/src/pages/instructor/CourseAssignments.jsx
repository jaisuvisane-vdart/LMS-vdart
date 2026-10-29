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
import Select from '../../components/common/Select';
import ProgressBar from '../../components/common/ProgressBar';
import Pagination from '../../components/common/Pagination';
import ActionMenu from '../../components/common/ActionMenu';
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
  ArrowLeft,
  Layers,
  UserCheck,
  GraduationCap
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
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState(paramCourseId || '');
  const [batchFilter, setBatchFilter] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // View Mode: 'list' | 'assign'
  const [viewMode, setViewMode] = useState('list');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedBatches, setSelectedBatches] = useState([]);
  const [selectedLearnerIds, setSelectedLearnerIds] = useState([]);
  const [dueDate, setDueDate] = useState('');
  const [learnerSearch, setLearnerSearch] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All Departments');
  const [individualBatchFilter, setIndividualBatchFilter] = useState('All Batches');
  const [submitting, setSubmitting] = useState(false);

  const isInstructor = (user?.role || '').toLowerCase() === 'instructor';

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const res = await assignmentService.getAssignments({
        search,
        status: statusFilter,
        course_id: courseFilter,
        batch: batchFilter,
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
      const [coursesRes, learnersRes, batchesRes] = await Promise.all([
        courseService.getCourses(isInstructor ? { my_courses: 1 } : {}),
        assignmentService.getAvailableLearners(),
        assignmentService.getAvailableBatches(paramCourseId || null),
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
      if (batchesRes?.status === 'success') {
        setBatches(batchesRes.data || []);
      }
    } catch (err) {
      console.error('Failed to load courses, learners, or batches:', err);
    }
  };

  useEffect(() => {
    loadCoursesAndLearners();
  }, []);

  useEffect(() => {
    fetchAssignments();
  }, [statusFilter, courseFilter, batchFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, courseFilter, batchFilter]);

  // When selectedCourseId changes in assign mode, reload batch metrics for that specific course
  useEffect(() => {
    if (selectedCourseId) {
      assignmentService.getAvailableBatches(selectedCourseId).then((res) => {
        if (res.status === 'success') {
          setBatches(res.data || []);
        }
      }).catch(console.error);
    }
  }, [selectedCourseId]);

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
    setSelectedBatches([]);
    setSelectedLearnerIds([]);
    setDueDate('');
    setLearnerSearch('');
    setSelectedDepartment('All Departments');
    setIndividualBatchFilter('All Batches');
    setViewMode('assign');
  };

  const handleToggleLearner = (learnerId) => {
    setSelectedLearnerIds((prev) => {
      const next = prev.includes(learnerId)
        ? prev.filter((id) => id !== learnerId)
        : [...prev, learnerId];

      const learner = learners.find((l) => parseInt(l.id) === learnerId);
      if (learner?.batch) {
        const batchMembers = learners.filter((l) => l.batch === learner.batch);
        const allBatchSelected =
          batchMembers.length > 0 &&
          batchMembers.every((m) => next.includes(parseInt(m.id)));

        setSelectedBatches((prevBatches) => {
          if (allBatchSelected && !prevBatches.includes(learner.batch)) {
            return [...prevBatches, learner.batch];
          } else if (!allBatchSelected && prevBatches.includes(learner.batch)) {
            return prevBatches.filter((b) => b !== learner.batch);
          }
          return prevBatches;
        });
      }

      return next;
    });
  };

  const handleToggleBatch = (batchName) => {
    const batchLearnerIds = learners
      .filter((l) => l.batch === batchName)
      .map((l) => parseInt(l.id));

    const isBatchSelected = selectedBatches.includes(batchName);

    if (isBatchSelected) {
      setSelectedBatches((prev) => prev.filter((b) => b !== batchName));
      setSelectedLearnerIds((prev) => prev.filter((id) => !batchLearnerIds.includes(id)));
    } else {
      setSelectedBatches((prev) => [...prev, batchName]);
      setSelectedLearnerIds((prev) => Array.from(new Set([...prev, ...batchLearnerIds])));
    }
  };

  const handleSelectAllBatches = () => {
    const allBatchNames = batches.map((b) => b.batch);
    const allBatchLearnerIds = learners
      .filter((l) => allBatchNames.includes(l.batch))
      .map((l) => parseInt(l.id));

    setSelectedBatches(allBatchNames);
    setSelectedLearnerIds((prev) => Array.from(new Set([...prev, ...allBatchLearnerIds])));
  };

  const handleClearBatches = () => {
    const allBatchNames = new Set(batches.map((b) => b.batch));
    setSelectedBatches([]);
    setSelectedLearnerIds((prev) => {
      return prev.filter((id) => {
        const l = learners.find((item) => parseInt(item.id) === id);
        return l && !allBatchNames.has(l.batch);
      });
    });
  };

  // Derive distinct departments from learners list
  const availableDepartments = [
    'All Departments',
    ...Array.from(new Set(learners.map((l) => l.department).filter(Boolean))),
  ];

  // Derive distinct batches list for filters
  const availableBatches = [
    'All Batches',
    ...Array.from(
      new Set(
        [
          ...batches.map((b) => b.batch),
          ...learners.map((l) => l.batch),
          ...assignments.map((a) => a.learner_batch),
        ].filter(Boolean)
      )
    ).sort(),
  ];

  // Filter learners by department, batch, and search text
  const filteredLearners = learners.filter((l) => {
    const matchesDept =
      selectedDepartment === 'All Departments' || l.department === selectedDepartment;
    const matchesBatch =
      individualBatchFilter === 'All Batches' || l.batch === individualBatchFilter;
    const term = learnerSearch.toLowerCase();
    const matchesSearch =
      !term ||
      (l.first_name || '').toLowerCase().includes(term) ||
      (l.last_name || '').toLowerCase().includes(term) ||
      (l.email || '').toLowerCase().includes(term) ||
      (l.employee_id || '').toLowerCase().includes(term) ||
      (l.batch || '').toLowerCase().includes(term);
    return matchesDept && matchesBatch && matchesSearch;
  });

  const handleSelectAllFiltered = () => {
    const ids = filteredLearners.map((l) => parseInt(l.id));
    setSelectedLearnerIds((prev) => {
      const next = Array.from(new Set([...prev, ...ids]));
      const updatedBatches = batches
        .filter((b) => {
          const members = learners.filter((l) => l.batch === b.batch);
          return members.length > 0 && members.every((m) => next.includes(parseInt(m.id)));
        })
        .map((b) => b.batch);
      setSelectedBatches(updatedBatches);
      return next;
    });
  };

  const handleDeselectFiltered = () => {
    const idsToRemove = new Set(filteredLearners.map((l) => parseInt(l.id)));
    setSelectedLearnerIds((prev) => {
      const next = prev.filter((id) => !idsToRemove.has(id));
      const updatedBatches = batches
        .filter((b) => {
          const members = learners.filter((l) => l.batch === b.batch);
          return members.length > 0 && members.every((m) => next.includes(parseInt(m.id)));
        })
        .map((b) => b.batch);
      setSelectedBatches(updatedBatches);
      return next;
    });
  };

  const handleClearAll = () => {
    setSelectedLearnerIds([]);
    setSelectedBatches([]);
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

    if (selectedLearnerIds.length === 0 && selectedBatches.length === 0) {
      showAlert({
        title: 'Validation Error',
        message: 'Please select at least one trainee learner or batch.',
        type: 'warning',
      });
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        course_id: selectedCourseId,
        due_date: dueDate || null,
        learner_ids: selectedLearnerIds,
        batches: selectedBatches,
      };

      const res = await assignmentService.assignCourse(payload);

      if (res.status === 'success') {
        setViewMode('list');
        const enrolledCount = res.data?.assigned_count ?? 0;
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
        <div data-aos="fade-down" className="clay-card p-6 sm:p-7 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
        <div data-aos="fade-up" data-aos-delay="150" className="clay-card p-6 sm:p-8 rounded-2xl shadow-sm">
          <form onSubmit={handleAssignSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Select
                  label="Select Course"
                  required
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  placeholder="Select Course..."
                  options={courses.map((c) => {
                    const isPublished = c.status === 'published';
                    return {
                      value: c.id,
                      label: `${c.title} ${isPublished ? '(Published)' : '(Draft - Publication Required)'}`,
                      disabled: !isPublished,
                    };
                  })}
                />
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

            {/* SECTION 1: BATCH-WISE SELECTION */}
            <div className="pt-4 border-t border-[#E2E8F0] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#2C51A2]" />
                    <label className="text-xs font-bold uppercase tracking-wider text-[#1E3B78]">
                      Assign by Batch ({selectedBatches.length} of {batches.length} Batches Selected)
                    </label>
                  </div>
                  <p className="text-[11px] text-[#64748B] mt-0.5">
                    Click a batch card to select or deselect all trainees in that batch simultaneously.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleSelectAllBatches}
                    className="text-xs font-bold text-[#2C51A2] hover:underline active:translate-y-0.5 cursor-pointer"
                  >
                    Select All Batches ({batches.length})
                  </button>
                  <span className="text-[#CBD5E1]">|</span>
                  <button
                    type="button"
                    onClick={handleClearBatches}
                    className="text-xs font-bold text-[#DC2626] hover:underline active:translate-y-0.5 cursor-pointer"
                  >
                    Deselect Batches
                  </button>
                </div>
              </div>

              {batches.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#64748B] border border-[#CBD5E1] rounded-2xl bg-[#F8FAFC]">
                  No active trainee batches found in the directory.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {batches.map((b) => {
                    const isChecked = selectedBatches.includes(b.batch);
                    const total = b.active_learners || 0;
                    const alreadyEnrolled = b.enrolled_count || 0;
                    const allEnrolled = alreadyEnrolled === total && total > 0;

                    const batchMembers = learners.filter((l) => l.batch === b.batch);
                    const batchSelectedCount = batchMembers.filter((l) =>
                      selectedLearnerIds.includes(parseInt(l.id))
                    ).length;
                    const isFullySelected =
                      batchMembers.length > 0 && batchSelectedCount === batchMembers.length;
                    const isPartiallySelected =
                      batchSelectedCount > 0 && batchSelectedCount < batchMembers.length;

                    return (
                      <div
                        key={b.batch}
                        onClick={() => handleToggleBatch(b.batch)}
                        className={`p-3.5 border transition-all cursor-pointer flex flex-col justify-between rounded-xl ${
                          isChecked || isFullySelected
                            ? 'bg-[#EFF6FF] border-[#2C51A2] shadow-xs'
                            : isPartiallySelected
                            ? 'bg-[#F0FDF4] border-[#16A34A]'
                            : 'bg-white border-[#E2E8F0] hover:bg-[#F8FAFC]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isChecked || isFullySelected}
                              onChange={() => {}}
                              className="w-4 h-4 accent-[#2C51A2] cursor-pointer rounded"
                            />
                            <div>
                              <span className="font-mono font-extrabold text-sm text-[#1E3B78] tracking-tight block">
                                {b.batch}
                              </span>
                              <div className="text-[11px] text-[#64748B] font-medium mt-0.5">
                                {total} Active Trainee{total === 1 ? '' : 's'}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <span
                              className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full clay-pill ${
                                isFullySelected
                                  ? 'bg-[#2C51A2] text-white'
                                  : isPartiallySelected
                                  ? 'bg-[#16A34A] text-white'
                                  : 'bg-[#E2E9F4] text-[#2C51A2]'
                              }`}
                            >
                              {isFullySelected
                                ? 'All Selected'
                                : isPartiallySelected
                                ? `${batchSelectedCount}/${batchMembers.length} Selected`
                                : 'Batch'}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-[11px]">
                          <span className="text-[#64748B]">Enrollment:</span>
                          <span
                            className={`font-bold font-mono ${
                              allEnrolled
                                ? 'text-[#16A34A]'
                                : alreadyEnrolled > 0
                                ? 'text-[#D97706]'
                                : 'text-[#64748B]'
                            }`}
                          >
                            {alreadyEnrolled} / {total} Enrolled
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SECTION 2: INDIVIDUAL TRAINEE FINE-TUNING & ROSTER */}
            <div className="pt-4 border-t border-[#E2E8F0] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#2C51A2]" />
                    <label className="text-xs font-bold uppercase tracking-wider text-[#1E3B78]">
                      Select Individual Trainees ({selectedLearnerIds.length} Selected) <span className="text-[#DC2626]">*</span>
                    </label>
                  </div>
                  <p className="text-[11px] text-[#64748B] mt-0.5">
                    Filter by department or batch, search by name or ID, and adjust individual trainee selections.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleSelectAllFiltered}
                    className="text-xs font-bold text-[#2C51A2] hover:underline active:translate-y-0.5 cursor-pointer"
                  >
                    Select All Filtered ({filteredLearners.length})
                  </button>
                  <span className="text-[#CBD5E1]">|</span>
                  <button
                    type="button"
                    onClick={handleDeselectFiltered}
                    className="text-xs font-bold text-[#64748B] hover:underline active:translate-y-0.5 cursor-pointer"
                  >
                    Deselect Filtered
                  </button>
                  <span className="text-[#CBD5E1]">|</span>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-xs font-bold text-[#DC2626] hover:underline active:translate-y-0.5 cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  placeholder="All Departments"
                  options={availableDepartments.map((dept) => ({
                    value: dept,
                    label: dept,
                  }))}
                />

                <Select
                  value={individualBatchFilter}
                  onChange={(e) => setIndividualBatchFilter(e.target.value)}
                  placeholder="All Batches"
                  options={availableBatches.map((b) => ({
                    value: b,
                    label: b,
                  }))}
                />

                <input
                  type="text"
                  placeholder="Search trainees by name, email, ID..."
                  value={learnerSearch}
                  onChange={(e) => setLearnerSearch(e.target.value)}
                  className="w-full text-xs rounded-xl h-10 px-3.5 focus:outline-none clay-input"
                />
              </div>

              <div className="border border-[#CBD5E1] rounded-2xl max-h-80 overflow-y-auto divide-y divide-[#E2E8F0] touch-scroll clay-card bg-white">
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
                            className="w-4 h-4 accent-[#2C51A2] cursor-pointer rounded"
                          />
                          <div>
                            <div className="font-bold text-xs text-[#172B4D] flex items-center gap-2">
                              <span>
                                {learner.first_name} {learner.last_name}
                              </span>
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
                        <div className="flex items-center gap-2">
                          {learner.batch && (
                            <span className="text-[10px] font-mono font-bold bg-[#E2E9F4] text-[#1E3B78] px-2.5 py-0.5 rounded-full clay-pill">
                              {learner.batch}
                            </span>
                          )}
                          <span className="text-[10px] font-bold bg-[#F1F5F9] text-[#64748B] px-2.5 py-0.5 rounded-full clay-pill">
                            {learner.department || 'General Trainee'}
                          </span>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            {/* SECTION 3: ASSIGNMENT SUMMARY BANNER */}
            {selectedLearnerIds.length > 0 && selectedCourseObj && (
              <div className="p-4 border border-[#2C51A2] bg-[#EFF6FF] rounded-2xl clay-card text-xs text-[#172B4D] flex items-center justify-between">
                <div>
                  <span className="font-bold uppercase tracking-wider text-[10px] text-[#2C51A2] block">
                    Assignment Enrollment Summary
                  </span>
                  <span>
                    Enrolling <strong>{selectedLearnerIds.length}</strong> trainee(s) (
                    <strong>{selectedLearnerIds.filter((id) => !enrolledInSelectedCourse.has(id)).length}</strong> new,{' '}
                    <strong>{selectedLearnerIds.filter((id) => enrolledInSelectedCourse.has(id)).length}</strong> already enrolled)
                    {selectedBatches.length > 0 ? ` across ${selectedBatches.length} batch(es)` : ''} into{' '}
                    <strong>{selectedCourseObj.title}</strong>
                    {dueDate
                      ? ` (Due: ${new Date(dueDate).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })})`
                      : ' (No deadline)'}
                    .
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
                disabled={
                  selectedCourseObj?.status !== 'published' ||
                  selectedLearnerIds.length === 0
                }
                title={
                  selectedCourseObj?.status !== 'published'
                    ? 'Course must be published before assignment'
                    : ''
                }
              >
                {`Confirm Assignment (${selectedLearnerIds.length} Trainees)`}
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
      <div data-aos="fade-down" className="clay-card p-6 sm:p-7 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
            Enroll learners into published programs, assign completion deadlines, and monitor real-time progress.
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
      <div data-aos="fade-up" data-aos-delay="100" className="clay-card p-4 rounded-2xl flex flex-col md:flex-row items-center gap-4">
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
          <div className="w-full sm:w-60">
            <Select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              placeholder={`All Courses (${courses.length})`}
              options={[
                { value: '', label: `All Courses (${courses.length})` },
                ...courses.map((c) => ({ value: c.id, label: c.title })),
              ]}
            />
          </div>

          {/* Batch Filter Dropdown */}
          <div className="w-full sm:w-44">
            <Select
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              placeholder="All Batches"
              options={availableBatches.map((b) => ({
                value: b === 'All Batches' ? '' : b,
                label: b,
              }))}
            />
          </div>

          {/* Status Filter Dropdown */}
          <div className="w-full sm:w-40">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              placeholder="All Statuses"
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'assigned', label: 'Assigned' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'completed', label: 'Completed' },
                { value: 'overdue', label: 'Overdue' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Assignments Table with Minimal Clay Surface */}
      <div data-aos="fade-up" data-aos-delay="150" className="clay-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto touch-scroll">
          <table className="w-full text-center border-collapse text-xs min-w-[760px]">
            <thead>
              <tr 
                className="text-white uppercase tracking-wider font-bold text-[11px] text-center"
                style={{
                  background: 'linear-gradient(160deg, #1E3B78 0%, #2C51A2 100%)',
                  boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.2)'
                }}
              >
                <th className="py-3.5 px-4 text-center">Learner</th>
                <th className="py-3.5 px-4 text-center">Batch</th>
                <th className="py-3.5 px-4 text-center">Department</th>
                <th className="py-3.5 px-4 text-center">Assigned Course</th>
                <th className="py-3.5 px-4 text-center">Assigned / Due</th>
                <th className="py-3.5 px-4 text-center w-44">Lesson Progress</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]/70">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-[#64748B]">
                    Loading assignments matrix...
                  </td>
                </tr>
              ) : assignments.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-[#64748B]">
                    No active course assignments found.
                  </td>
                </tr>
              ) : (
                paginatedAssignments.map((item) => (
                  <tr key={item.id} className="hover:bg-[#EFF6FF]/60 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-[#172B4D] text-left">
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
                        <div className="text-left">
                          <div>{item.learner_name}</div>
                          <div className="text-[10px] text-[#64748B] font-mono">
                            {item.learner_employee_id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {item.learner_batch ? (
                        <span className="clay-pill text-[10px] font-mono font-bold uppercase tracking-wider bg-[#E2E9F4] text-[#1E3B78] px-2.5 py-0.5 rounded-full">
                          {item.learner_batch}
                        </span>
                      ) : (
                        <span className="text-[#94A3B8]">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-[#172B4D] font-bold text-center">
                      {item.learner_department || 'General Trainee'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="font-bold text-[#172B4D]">{item.course_title}</div>
                      <div className="flex items-center justify-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[10px] text-[#2C51A2] font-bold uppercase">{item.course_category}</span>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full ${
                          item.course_type === 'certified' || !item.course_type
                            ? 'bg-blue-50 text-[#1E3B78] border border-blue-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-300'
                        }`}>
                          {item.course_type === 'non_certified' ? 'Non-Certified' : 'Certified'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[11px] text-[#64748B] text-center">
                      <div className="font-mono">Assigned: {item.assigned_at?.slice(0, 10)}</div>
                      {item.due_date ? (
                        <div className="text-[#B45309] font-bold font-mono">Due: {item.due_date}</div>
                      ) : (
                        <div className="text-[#94A3B8]">Self-paced</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
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
                    <td className="py-3.5 px-4 text-center">
                      <ActionMenu
                        triggerTitle={`Actions for ${item.learner_name}`}
                        items={[
                          {
                            label: 'Unenroll Trainee',
                            icon: Trash2,
                            variant: 'danger',
                            onClick: () => handleDeleteAssignment(item.id, item.learner_name),
                          },
                        ]}
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
