import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDialog } from '../../contexts/DialogContext';
import courseService from '../../services/courseService';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Pagination from '../../components/common/Pagination';
import {
  BookOpen,
  Plus,
  Trash2,
  Users,
  Layers,
  Search,
  Filter,
  RotateCcw,
  CheckCircle,
  Clock,
  ArrowUpDown,
  ArrowLeft
} from 'lucide-react';

const InstructorCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'create'
  const [submitting, setSubmitting] = useState(false);
  const { showAlert, showConfirm } = useDialog();

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // New course form
  const [formData, setFormData] = useState({
    title: '',
    category: 'Software Engineering',
    course_type: '',
    description: '',
    estimated_duration_minutes: 60,
    passing_percentage: 70,
  });

  const navigate = useNavigate();

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await courseService.getCourses({ my_courses: 1 });
      if (res.status === 'success') {
        setCourses(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load courses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    if (!formData.course_type) {
      showAlert({
        title: 'Validation Notice',
        message: 'Course Type is mandatory. Please select Certified or Non Certified.',
        type: 'warning',
      });
      return;
    }
    try {
      setSubmitting(true);
      const res = await courseService.createCourse(formData);
      if (res.status === 'success') {
        setViewMode('list');
        setFormData({
          title: '',
          category: 'Software Engineering',
          course_type: '',
          description: '',
          estimated_duration_minutes: 60,
          passing_percentage: 70,
        });
        fetchCourses();
        navigate(`/instructor/course-builder?courseId=${res.data.id}`);
      }
    } catch (err) {
      showAlert({
        title: 'Creation Error',
        message: err.response?.data?.message || err.message || 'Error creating course',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePublish = async (course) => {
    const isPublished = course.status === 'published';
    try {
      let res;
      if (isPublished) {
        res = await courseService.unpublishCourse(course.id);
      } else {
        res = await courseService.publishCourse(course.id);
      }
      if (res?.status === 'success') {
        fetchCourses();
      } else {
        await courseService.updateCourse(course.id, { status: isPublished ? 'draft' : 'published' });
        fetchCourses();
      }
    } catch (err) {
      try {
        await courseService.updateCourse(course.id, { status: isPublished ? 'draft' : 'published' });
        fetchCourses();
      } catch (innerErr) {
        showAlert({
          title: 'Status Update Notice',
          message: innerErr.response?.data?.message || err.response?.data?.message || err.message || 'Error updating course status',
          type: 'error',
        });
      }
    }
  };

  const handleDeleteCourse = async (id, title) => {
    const confirmed = await showConfirm({
      title: 'Delete Training Program',
      message: `Are you sure you want to permanently delete "${title}"? All associated modules, lessons, and progress will be erased.`,
      confirmText: 'Delete Course',
      type: 'confirm',
    });
    if (!confirmed) return;

    try {
      const res = await courseService.deleteCourse(id);
      if (res.status === 'success') {
        fetchCourses();
      }
    } catch (err) {
      showAlert({
        title: 'Deletion Error',
        message: err.message || 'Failed to delete course',
        type: 'error',
      });
    }
  };

  // Distinct categories available in current courses plus defaults
  const categories = useMemo(() => {
    const set = new Set([
      'Software Engineering',
      'Frontend Engineering',
      'Information Security',
      'Corporate Compliance',
      'Quality Assurance',
      ...courses.map((c) => c.category).filter(Boolean),
    ]);
    return Array.from(set);
  }, [courses]);

  // Status counts
  const totalCount = courses.length;
  const publishedCount = courses.filter((c) => c.status === 'published').length;
  const draftCount = courses.filter((c) => c.status === 'draft').length;

  // Filtered & sorted courses
  const filteredCourses = useMemo(() => {
    return courses
      .filter((course) => {
        const matchesSearch =
          !searchTerm.trim() ||
          course.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          course.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          course.description?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus =
          !selectedStatus || course.status?.toLowerCase() === selectedStatus.toLowerCase();

        const matchesCategory =
          !selectedCategory || course.category === selectedCategory;

        const matchesType =
          !selectedType || course.course_type === selectedType;

        return matchesSearch && matchesStatus && matchesCategory && matchesType;
      })
      .sort((a, b) => {
        if (sortBy === 'title_asc') {
          return (a.title || '').localeCompare(b.title || '');
        }
        if (sortBy === 'title_desc') {
          return (b.title || '').localeCompare(a.title || '');
        }
        if (sortBy === 'lessons_desc') {
          return (b.lessons_count || 0) - (a.lessons_count || 0);
        }
        if (sortBy === 'passing_desc') {
          return (b.passing_percentage || 0) - (a.passing_percentage || 0);
        }
        // Default newest first
        return (b.id || 0) - (a.id || 0);
      });
  }, [courses, searchTerm, selectedStatus, selectedCategory, selectedType, sortBy]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedStatus, selectedCategory, selectedType, sortBy]);

  // Paginated course slice
  const paginatedCourses = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredCourses.slice(startIndex, startIndex + pageSize);
  }, [filteredCourses, currentPage, pageSize]);

  const hasActiveFilters = Boolean(searchTerm.trim() || selectedStatus || selectedCategory || selectedType || sortBy !== 'newest');

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedStatus('');
    setSelectedCategory('');
    setSelectedType('');
    setSortBy('newest');
    setCurrentPage(1);
  };

  if (viewMode === 'create') {
    return (
      <div className="space-y-6">
        {/* Top Banner Header with Back Button */}
        <div className="clay-card p-6 rounded-2xl border border-white/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="clay-pill text-[10px] font-bold uppercase tracking-widest bg-[#2C51A2] text-white px-2.5 py-0.5 rounded-full">
                Authoring Studio
              </span>
              <span className="text-xs text-[#64748B] font-medium">New Curriculum Page</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#1E3B78] tracking-tight mt-1.5">
              Initialize Training Program
            </h1>
            <p className="text-xs text-[#64748B] mt-1 max-w-2xl leading-relaxed">
              Formulate curriculum title, course type, passing benchmark, and learning outcomes before authoring modules.
            </p>
          </div>
          <div>
            <Button variant="secondary" size="md" icon={ArrowLeft} onClick={() => setViewMode('list')}>
              Back to Courses
            </Button>
          </div>
        </div>

        {/* Full Page Course Creation Card */}
        <div className="clay-card p-6 sm:p-8 rounded-2xl border border-white/60 shadow-sm">
          <form onSubmit={handleCreateCourse} className="space-y-5 max-w-3xl">
            <Input
              label="Course Title"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Modern Full-Stack Web Architecture"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                options={[
                  { value: 'Software Engineering', label: 'Software Engineering' },
                  { value: 'Frontend Engineering', label: 'Frontend Engineering' },
                  { value: 'Information Security', label: 'Information Security' },
                  { value: 'Corporate Compliance', label: 'Corporate Compliance' },
                  { value: 'Quality Assurance', label: 'Quality Assurance' },
                ]}
              />

              <Select
                label="Course Type"
                required
                value={formData.course_type}
                onChange={(e) => setFormData({ ...formData, course_type: e.target.value })}
                options={[
                  { value: '', label: '-- Select Course Type --' },
                  { value: 'certified', label: 'Certified' },
                  { value: 'non_certified', label: 'Non Certified' },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#1E3B78] mb-1.5">
                Course Description & Learning Outcomes
              </label>
              <textarea
                rows="4"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="clay-input w-full bg-white text-[#172B4D] text-sm p-3.5 rounded-xl focus:outline-none"
                placeholder="Describe the technical modules and trainee expectations..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Estimated Duration (Minutes)"
                type="number"
                value={formData.estimated_duration_minutes}
                onChange={(e) => setFormData({ ...formData, estimated_duration_minutes: e.target.value })}
              />
              <Input
                label="Passing Standard (%)"
                type="number"
                value={formData.passing_percentage}
                onChange={(e) => setFormData({ ...formData, passing_percentage: e.target.value })}
              />
            </div>

            <div className="pt-5 border-t border-[#E2E8F0]/60 flex items-center justify-end gap-3">
              <Button variant="secondary" onClick={() => setViewMode('list')}>
                Cancel
              </Button>
              <Button type="submit" variant="navy" loading={submitting}>
                Create Course & Open Studio
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="clay-card p-6 rounded-2xl border border-white/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="clay-pill text-[10px] font-bold uppercase tracking-widest bg-[#2C51A2] text-white px-2.5 py-0.5 rounded-full">
              Authoring Studio
            </span>
            <span className="text-xs text-[#64748B] font-medium">My Assigned Curriculum</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1E3B78] tracking-tight mt-1.5">
            My Authored Courses
          </h1>
          <p className="text-xs text-[#64748B] mt-1 max-w-2xl leading-relaxed">
            Formulate training syllabi, manage lesson reading units, attach technical materials, and publish.
          </p>
        </div>
        <div>
          <Button variant="navy" size="md" icon={Plus} onClick={() => setViewMode('create')}>
            Create New Course
          </Button>
        </div>
      </div>

      {/* Multi-Criteria Filter Bar */}
      <div className="clay-card p-4 sm:p-5 rounded-2xl border border-white/60 space-y-4">
        {/* Quick Segment Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0]/60 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedStatus('')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                selectedStatus === ''
                  ? 'clay-btn-primary text-white shadow-xs'
                  : 'clay-btn-secondary text-[#64748B] hover:text-[#1E3B78]'
              }`}
            >
              All Courses ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus('published')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                selectedStatus === 'published'
                  ? 'clay-btn-primary text-white shadow-xs'
                  : 'clay-btn-secondary text-[#64748B] hover:text-[#1E3B78]'
              }`}
            >
              Published ({publishedCount})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus('draft')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                selectedStatus === 'draft'
                  ? 'clay-btn-primary text-white shadow-xs'
                  : 'clay-btn-secondary text-[#64748B] hover:text-[#1E3B78]'
              }`}
            >
              Drafts ({draftCount})
            </button>
          </div>

          <div className="text-xs text-[#64748B] font-medium">
            Showing <strong className="text-[#1E3B78]">{filteredCourses.length}</strong> of {totalCount} courses
          </div>
        </div>

        {/* Search & Dropdown Filter Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Search Input */}
          <div className="lg:col-span-3">
            <Input
              placeholder="Search course title, keyword..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={Search}
            />
          </div>

          {/* Category Dropdown */}
          <div className="lg:col-span-2">
            <Select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              options={[
                { value: '', label: 'All Categories' },
                ...categories.map((cat) => ({ value: cat, label: cat })),
              ]}
            />
          </div>

          {/* Course Type Dropdown */}
          <div className="lg:col-span-2">
            <Select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              options={[
                { value: '', label: 'All Program Types' },
                { value: 'certified', label: 'Certified' },
                { value: 'non_certified', label: 'Non Certified' },
              ]}
            />
          </div>

          {/* Status Dropdown */}
          <div className="lg:col-span-2">
            <Select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'published', label: 'Published' },
                { value: 'draft', label: 'Draft' },
              ]}
            />
          </div>

          {/* Sort By Dropdown */}
          <div className="lg:col-span-2">
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              options={[
                { value: 'newest', label: 'Newest First' },
                { value: 'title_asc', label: 'Title (A-Z)' },
                { value: 'title_desc', label: 'Title (Z-A)' },
                { value: 'lessons_desc', label: 'Most Lessons' },
                { value: 'passing_desc', label: 'Highest Pass Mark' },
              ]}
            />
          </div>

          {/* Reset Filters Action */}
          <div className="lg:col-span-1 flex justify-end">
            {hasActiveFilters ? (
              <Button
                variant="secondary"
                size="md"
                onClick={handleResetFilters}
                icon={RotateCcw}
                className="w-full justify-center"
                title="Reset all filters"
              >
                Reset
              </Button>
            ) : (
              <div className="w-full text-center text-[11px] text-[#94A3B8] font-medium hidden lg:block">
                Active
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Courses Data Table */}
      <div className="clay-card rounded-2xl border border-white/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto touch-scroll">
          <table className="w-full text-left border-collapse text-xs min-w-[840px]">
            <thead>
              <tr
                className="text-white uppercase tracking-wider font-bold text-[11px]"
                style={{
                  background: 'linear-gradient(160deg, #1E3B78 0%, #2C51A2 100%)',
                  boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.2)',
                }}
              >
                <th className="py-3.5 px-4">Course Details & Category</th>
                <th className="py-3.5 px-4 text-center">Structure</th>
                <th className="py-3.5 px-4 text-center">Duration & Benchmark</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]/70">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-[#64748B]">
                    Loading your authored courses...
                  </td>
                </tr>
              ) : courses.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center">
                    <BookOpen className="w-10 h-10 text-[#64748B] mx-auto mb-3 opacity-60" />
                    <h3 className="text-base font-bold text-[#1E3B78]">No Authored Courses Found</h3>
                    <p className="text-xs text-[#64748B] mt-1 mb-4">You have not created any training programs yet.</p>
                    <Button variant="navy" size="sm" icon={Plus} onClick={() => setViewMode('create')}>
                      Start Authoring Your First Course
                    </Button>
                  </td>
                </tr>
              ) : filteredCourses.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center">
                    <Filter className="w-10 h-10 text-[#64748B] mx-auto mb-3 opacity-60" />
                    <h3 className="text-base font-bold text-[#1E3B78]">No Courses Match Filter Criteria</h3>
                    <p className="text-xs text-[#64748B] mt-1 mb-4">
                      Try adjusting your search terms, status, or category filters.
                    </p>
                    <Button variant="secondary" size="sm" icon={RotateCcw} onClick={handleResetFilters}>
                      Clear All Filters
                    </Button>
                  </td>
                </tr>
              ) : (
                paginatedCourses.map((course) => (
                  <tr key={course.id} className="hover:bg-[#EFF6FF]/60 transition-colors">
                    {/* Course Title & Category */}
                    <td className="py-3.5 px-4 max-w-sm">
                      <div className="font-bold text-sm text-[#172B4D] leading-snug">
                        {course.title}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="clay-pill text-[10px] font-bold uppercase tracking-wider bg-[#E2E9F4] text-[#1E3B78] px-2.5 py-0.5 rounded-full">
                          {course.category}
                        </span>
                        <span className={`clay-pill text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                          course.course_type === 'certified' || !course.course_type
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-300'
                        }`}>
                          {course.course_type === 'non_certified' ? 'Non Certified' : 'Certified'}
                        </span>
                        {course.description && (
                          <span className="text-[11px] text-[#64748B] truncate max-w-xs font-medium">
                            {course.description}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Structure: Modules & Lessons */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="font-bold text-[#1E3B78] font-mono text-xs">
                        {course.modules_count || 0} Modules
                      </div>
                      <div className="text-[11px] text-[#64748B] font-medium mt-0.5">
                        {course.lessons_count || 0} Lessons
                      </div>
                    </td>

                    {/* Duration & Benchmark */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="font-bold text-[#172B4D] font-mono text-xs">
                        {course.estimated_duration_minutes || 60} Mins
                      </div>
                      <div className="text-[11px] text-[#2C51A2] font-bold mt-0.5">
                        Pass Mark: {course.passing_percentage}%
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center">
                      <Badge variant={course.status === 'published' ? 'success' : 'warning'}>
                        {course.status === 'published' ? 'Published' : 'Draft'}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        <Button
                          variant={course.status === 'published' ? 'secondary' : 'primary'}
                          size="sm"
                          onClick={() => handleTogglePublish(course)}
                        >
                          {course.status === 'published' ? 'Unpublish' : 'Publish'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          icon={Users}
                          disabled={course.status !== 'published'}
                          onClick={() => {
                            if (course.status !== 'published') {
                              showAlert({
                                title: 'Publication Required',
                                message: 'This course is in draft. Please publish the course before assigning it to learners.',
                                type: 'warning',
                              });
                              return;
                            }
                            navigate(`/instructor/assignments?courseId=${course.id}&openAssign=1`);
                          }}
                          className={course.status !== 'published' ? 'opacity-50 cursor-not-allowed' : ''}
                          title={course.status !== 'published' ? 'Publish course first to unlock trainee assignment' : 'Assign trainees'}
                        >
                          Assign
                        </Button>
                        <Button
                          variant="navy"
                          size="sm"
                          icon={Layers}
                          onClick={() => navigate(`/instructor/course-builder?courseId=${course.id}`)}
                        >
                          Studio
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          icon={Trash2}
                          onClick={() => handleDeleteCourse(course.id, course.title)}
                          title="Delete Course"
                        />
                      </div>
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
          totalItems={filteredCourses.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[5, 10, 20, 50]}
        />
      </div>
    </div>
  );
};

export default InstructorCourses;
