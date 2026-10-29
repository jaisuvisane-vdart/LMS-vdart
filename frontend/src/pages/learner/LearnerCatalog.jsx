import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useDialog } from '../../contexts/DialogContext';
import enrollmentService from '../../services/enrollmentService';
import categoryService from '../../services/categoryService';
import { DEFAULT_COURSE_CATEGORIES } from '../../config/taxonomy';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import ProgressBar from '../../components/common/ProgressBar';
import Modal from '../../components/common/Modal';
import {
  Compass,
  BookOpen,
  Search,
  Filter,
  CheckCircle,
  Clock,
  Layers,
  Calendar,
  Award,
  AlertCircle,
  Hourglass,
  ArrowRight,
  Send,
  X,
  Unlock,
  Lock,
  ShieldCheck
} from 'lucide-react';

const LearnerCatalog = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showAlert } = useDialog();

  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState(DEFAULT_COURSE_CATEGORIES);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Enrollment Request Modal
  const [selectedCourseForEnroll, setSelectedCourseForEnroll] = useState(null);
  const [requestNotes, setRequestNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load Categories
  const loadCategories = async () => {
    try {
      const list = await categoryService.getCategories(true);
      if (Array.isArray(list) && list.length > 0) {
        setCategories(list);
      }
    } catch (err) {
      console.warn('Failed to load categories:', err);
    }
  };

  // Fetch Catalog
  const fetchCatalog = async () => {
    try {
      setLoading(true);
      const res = await enrollmentService.getCatalog({
        category: selectedCategory,
        course_type: selectedType,
        search: search.trim(),
      });
      if (res.status === 'success') {
        setCatalog(res.data);
      }
    } catch (err) {
      console.error('Failed to load catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    fetchCatalog();
  }, [selectedCategory, selectedType]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCatalog();
  };

  // Filter courses locally by enrollment state if needed
  const filteredCatalog = catalog.filter((course) => {
    if (!statusFilter) return true;
    return course.enrollment_state === statusFilter;
  });

  const openEnrollModal = (course) => {
    setSelectedCourseForEnroll(course);
    setRequestNotes('');
  };

  const closeEnrollModal = () => {
    setSelectedCourseForEnroll(null);
    setRequestNotes('');
  };

  const handleSubmitRequest = async () => {
    if (!selectedCourseForEnroll) return;

    try {
      setSubmitting(true);
      const res = await enrollmentService.requestEnrollment({
        course_id: selectedCourseForEnroll.id,
        notes: requestNotes,
      });

      if (res.status === 'success') {
        const isAuto = res.data?.auto_enrolled;
        showAlert({
          title: isAuto ? 'Successfully Enrolled' : 'Enrollment Request Submitted',
          message: isAuto
            ? 'You have successfully enrolled in "' + selectedCourseForEnroll.title + '". You can start learning immediately!'
            : 'Your request to enroll in "' + selectedCourseForEnroll.title + '" has been submitted for administrative review.',
          type: 'success',
        });
        closeEnrollModal();
        fetchCatalog();
      }
    } catch (err) {
      showAlert({
        title: 'Enrollment Error',
        message: err.response?.data?.message || 'Unable to complete enrollment at this time. Please try again.',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getEnrollmentBadge = (state) => {
    switch (state) {
      case 'completed':
        return (
          <span className="clay-pill text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-emerald-600" /> Completed
          </span>
        );
      case 'enrolled':
        return (
          <span className="clay-pill text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-[#1E3B78] border border-blue-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <BookOpen className="w-3 h-3 text-[#2C51A2]" /> Enrolled
          </span>
        );
      case 'pending':
        return (
          <span className="clay-pill text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <Hourglass className="w-3 h-3 text-amber-600" /> Pending Admin Approval
          </span>
        );
      case 'rejected':
        return (
          <span className="clay-pill text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-rose-600" /> Request Declined
          </span>
        );
      default:
        return (
          <span className="clay-pill text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-[#1E3B78] border border-slate-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
            Available
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div data-aos="fade-down" className="clay-card p-6 rounded-2xl border border-white/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="clay-pill text-[10px] font-bold uppercase tracking-wider bg-[#2C51A2] text-white px-2.5 py-0.5 rounded-full">
              Course Discovery
            </span>
            <span className="text-xs text-[#64748B] font-medium">Organization Catalog</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1E3B78] tracking-tight mt-1.5">
            Course Catalog & Self-Enrollment
          </h1>
          <p className="text-xs text-[#64748B] mt-1 max-w-2xl leading-relaxed">
            Discover available training programs across organizational departments. Submit an enrollment request for administrative approval to expand your skill set.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            icon={BookOpen}
            onClick={() => navigate('/learner/courses')}
          >
            My Assigned Courses
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div data-aos="fade-up" data-aos-delay="100" className="clay-card p-4 rounded-2xl border border-white/60 flex flex-col md:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
          <Input
            placeholder="Search catalog by course title, department, or keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={Search}
          />
          <Button type="submit" variant="primary" size="md">
            Search
          </Button>
        </form>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full md:w-auto">
          <div className="w-full sm:w-44">
            <Select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              placeholder="All Categories"
              options={[
                { value: '', label: 'All Categories' },
                ...categories.map((c) => ({
                  value: c.name || c,
                  label: c.name || c,
                })),
              ]}
            />
          </div>

          <div className="w-full sm:w-36">
            <Select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              placeholder="All Types"
              options={[
                { value: '', label: 'All Types' },
                { value: 'certified', label: 'Certified' },
                { value: 'non_certified', label: 'Non-Certified' },
              ]}
            />
          </div>

          <div className="w-full sm:w-40">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              placeholder="All Statuses"
              options={[
                { value: '', label: 'All Enrollment States' },
                { value: 'available', label: 'Open to Enroll' },
                { value: 'pending', label: 'Pending Approval' },
                { value: 'enrolled', label: 'Already Enrolled' },
                { value: 'completed', label: 'Completed' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Courses Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs font-semibold text-[#64748B] clay-card rounded-2xl border border-white/60">
          Loading course catalog...
        </div>
      ) : filteredCatalog.length === 0 ? (
        <div className="p-12 text-center clay-card rounded-2xl border border-white/60">
          <Compass className="w-10 h-10 text-[#64748B] mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#1E3B78]">No Courses Found</h3>
          <p className="text-xs text-[#64748B] mt-1 mb-4">
            No published curriculum matches your current search or filter criteria.
          </p>
          {(search || selectedCategory || selectedType || statusFilter) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch('');
                setSelectedCategory('');
                setSelectedType('');
                setStatusFilter('');
                fetchCatalog();
              }}
            >
              Reset All Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCatalog.map((course, idx) => (
            <div
              key={course.id}
              data-aos="fade-up"
              data-aos-delay={(idx % 6) * 60}
              className="clay-card clay-card-hover rounded-2xl border border-white/60 flex flex-col justify-between overflow-hidden transition-all duration-200"
            >
              <div className="p-5 sm:p-6">
                {/* Header Tag / State */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="clay-pill text-[10px] font-bold uppercase tracking-wider bg-[#E2E9F4] text-[#1E3B78] px-2.5 py-0.5 rounded-full">
                      {course.category}
                    </span>
                    <span
                      className={`clay-pill text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        course.course_type === 'certified'
                          ? 'bg-blue-50 text-[#1E3B78] border border-blue-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-300'
                      }`}
                    >
                      {course.course_type === 'non_certified' ? 'Non-Certified' : 'Certified'}
                    </span>
                    {course.access_type === 'required_admin_access' ? (
                      <span className="clay-pill text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Lock className="w-3 h-3 text-amber-600" /> Required Admin Access
                      </span>
                    ) : (
                      <span className="clay-pill text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Unlock className="w-3 h-3 text-emerald-600" /> Open for Enrollment
                      </span>
                    )}
                  </div>
                  {getEnrollmentBadge(course.enrollment_state)}
                </div>

                {/* Course Title */}
                <h3 className="text-base font-bold text-[#1E3B78] tracking-tight leading-snug line-clamp-2">
                  {course.title}
                </h3>

                {/* Description */}
                <p className="text-xs text-[#64748B] mt-2 line-clamp-3 leading-relaxed">
                  {course.description || 'No detailed course description provided.'}
                </p>

                {/* Course Metadata */}
                <div className="mt-4 pt-3 border-t border-[#E2E8F0]/60 text-xs text-[#64748B] space-y-1.5 font-medium">
                  {course.instructor_name && (
                    <div>
                      Instructor: <strong className="text-[#172B4D]">{course.instructor_name}</strong>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-[#2C51A2]" />
                      <strong>{course.total_lessons}</strong> lessons
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#2C51A2]" />
                      <strong>{course.duration_days || 30}</strong> days duration
                    </span>
                  </div>
                </div>

                {/* Active Progress if Enrolled */}
                {course.enrollment_state === 'enrolled' && (
                  <div className="mt-4 space-y-1">
                    <div className="flex justify-between text-xs font-bold text-[#1E3B78]">
                      <span>Progress</span>
                      <span>{course.progress_percentage}%</span>
                    </div>
                    <ProgressBar value={course.progress_percentage} height="h-2" />
                  </div>
                )}

                {/* Pending Request Details */}
                {course.enrollment_state === 'pending' && (
                  <div className="mt-4 p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <Hourglass className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      Submitted on {course.requested_at ? new Date(course.requested_at).toLocaleDateString() : 'Recently'}
                    </div>
                    <div className="text-[11px] text-amber-800">
                      An administrator will review and confirm your access shortly.
                    </div>
                  </div>
                )}

                {/* Declined Request Details */}
                {course.enrollment_state === 'rejected' && (
                  <div className="mt-4 p-3 bg-rose-50/80 rounded-xl border border-rose-200 text-xs text-rose-900 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-700 shrink-0" />
                      Request Declined
                    </div>
                    {course.admin_notes && (
                      <div className="text-[11px] text-rose-800">
                        Reason: {course.admin_notes}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Footer */}
              <div className="px-5 sm:px-6 py-4 bg-[#F3F6FB]/80 border-t border-[#E2E8F0]/60 flex items-center justify-between">
                <div className="text-[11px] font-semibold text-[#64748B]">
                  Passing Score: <strong className="text-[#2C51A2]">{course.passing_percentage}%</strong>
                </div>

                <div>
                  {course.enrollment_state === 'available' && (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={course.access_type === 'required_admin_access' ? Send : CheckCircle}
                      onClick={() => openEnrollModal(course)}
                    >
                      {course.access_type === 'required_admin_access' ? 'Request Access' : 'Enroll Now'}
                    </Button>
                  )}

                  {course.enrollment_state === 'pending' && (
                    <Button variant="secondary" size="sm" disabled>
                      Pending Confirmation
                    </Button>
                  )}

                  {course.enrollment_state === 'rejected' && (
                    <Button
                      variant="outline"
                      size="sm"
                      icon={course.access_type === 'required_admin_access' ? Send : CheckCircle}
                      onClick={() => openEnrollModal(course)}
                    >
                      {course.access_type === 'required_admin_access' ? 'Re-apply' : 'Enroll Now'}
                    </Button>
                  )}

                  {course.enrollment_state === 'enrolled' && (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={ArrowRight}
                      onClick={() => navigate(`/learner/courses/${course.id}?resume=true`)}
                    >
                      Continue Learning
                    </Button>
                  )}

                  {course.enrollment_state === 'completed' && (
                    <Button
                      variant="outline"
                      size="sm"
                      icon={CheckCircle}
                      onClick={() => navigate(`/learner/courses/${course.id}`)}
                    >
                      Review Course
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Enrollment Request Modal Mounted via Body Portal */}
      <Modal
        isOpen={!!selectedCourseForEnroll}
        onClose={closeEnrollModal}
        title={
          selectedCourseForEnroll?.access_type === 'required_admin_access'
            ? 'Request Course Access'
            : 'Enroll in Course'
        }
        subtitle={
          selectedCourseForEnroll?.access_type === 'required_admin_access'
            ? 'Required Admin Access: Submit an enrollment request for administrator approval.'
            : 'Open for Enrollment: Register directly to start your training immediately without approval.'
        }
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          {/* Course Summary Box */}
          <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Selected Program</div>
            <div className="text-sm font-bold text-[#172B4D]">{selectedCourseForEnroll?.title}</div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-[#64748B] pt-1">
              <span>Category: <strong className="text-[#172B4D]">{selectedCourseForEnroll?.category}</strong></span>
              <span>Type: <strong className="text-[#172B4D]">{selectedCourseForEnroll?.course_type === 'non_certified' ? 'Non-Certified' : 'Certified'}</strong></span>
              <span>Duration: <strong className="text-[#172B4D]">{selectedCourseForEnroll?.duration_days || 30} days</strong></span>
              <span>
                Access Type:{' '}
                <strong className={selectedCourseForEnroll?.access_type === 'required_admin_access' ? 'text-amber-700' : 'text-emerald-700'}>
                  {selectedCourseForEnroll?.access_type === 'required_admin_access' ? 'Required Admin Access' : 'Open for Enrollment'}
                </strong>
              </span>
            </div>
          </div>

          {selectedCourseForEnroll?.access_type === 'open_enrollment' ? (
            <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Unlock className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>Instant Self-Registration</span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                This course is open for direct enrollment. By confirming below, you will be enrolled immediately without waiting for administrator approval and can start studying right away.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Administrative Approval Required</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  This course requires administrative approval. Your request will be queued for review before access is provisioned.
                </p>
              </div>

              {/* Notes field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#1E3B78]">
                  Request Justification / Notes for Admin (Optional)
                </label>
                <textarea
                  rows="3"
                  className="w-full px-3.5 py-2.5 text-xs text-[#172B4D] bg-white border border-[#CBD5E1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2C51A2]/30 focus:border-[#2C51A2] transition-all"
                  placeholder="Share any context or project justification for taking this course..."
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
            <Button
              variant="outline"
              size="md"
              onClick={closeEnrollModal}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              icon={selectedCourseForEnroll?.access_type === 'required_admin_access' ? Send : CheckCircle}
              onClick={handleSubmitRequest}
              disabled={submitting}
            >
              {submitting
                ? 'Processing...'
                : selectedCourseForEnroll?.access_type === 'required_admin_access'
                ? 'Submit Request'
                : 'Confirm & Start Course'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default LearnerCatalog;
