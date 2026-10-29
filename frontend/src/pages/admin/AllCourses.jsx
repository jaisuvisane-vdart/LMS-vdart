import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDialog } from '../../contexts/DialogContext';
import courseService from '../../services/courseService';
import enrollmentService from '../../services/enrollmentService';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Pagination from '../../components/common/Pagination';
import ActionMenu from '../../components/common/ActionMenu';
import AnimatedNumber from '../../components/common/AnimatedNumber';
import UnifiedCourseCreator from '../../components/courses/UnifiedCourseCreator';
import CategoryManagerModal from '../../components/courses/CategoryManagerModal';
import EnrollmentRequestsTable from '../../components/admin/EnrollmentRequestsTable';
import categoryService from '../../services/categoryService';
import { DEFAULT_COURSE_CATEGORIES } from '../../config/taxonomy';
import {
  BookOpen,
  Plus,
  Search,
  CheckCircle,
  Clock,
  Layers,
  Edit3,
  Trash2,
  Users,
  Filter,
  FolderTree,
  UserCheck,
  Lock,
  Unlock
} from 'lucide-react';

const AllCourses = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showAlert, showConfirm } = useDialog();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Tab State: 'courses' | 'requests'
  const [activeTab, setActiveTab] = useState('courses');
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Category Manager modal & options
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoriesList, setCategoriesList] = useState(DEFAULT_COURSE_CATEGORIES);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('tab') === 'requests') {
      setActiveTab('requests');
    }
  }, [location.search]);

  const loadPendingCount = async () => {
    try {
      const res = await enrollmentService.getPendingCount();
      if (res.status === 'success') {
        setPendingRequestsCount(res.data.pending_count);
      }
    } catch (err) {
      console.warn('Failed to fetch pending count:', err);
    }
  };

  useEffect(() => {
    loadPendingCount();
  }, []);

  const loadCategoryList = async () => {
    try {
      const list = await categoryService.getCategories(true);
      if (Array.isArray(list) && list.length > 0) {
        setCategoriesList(list);
      }
    } catch (err) {
      console.warn('Failed to fetch categories in AllCourses:', err);
    }
  };

  useEffect(() => {
    loadCategoryList();
  }, []);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // View Mode: 'list' | 'create' | 'edit'
  const [viewMode, setViewMode] = useState('list');
  const [editingCourseId, setEditingCourseId] = useState(null);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await courseService.getCourses({
        search,
        status: statusFilter,
        category: categoryFilter,
        course_type: typeFilter,
      });
      if (res.status === 'success') {
        setCourses(res.data);
      }
    } catch (err) {
      console.error('Error loading all courses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [statusFilter, categoryFilter, typeFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, categoryFilter, typeFilter]);

  const paginatedCourses = courses.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCourses();
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

  const handleDeleteCourse = async (courseId, title) => {
    const confirmed = await showConfirm({
      title: 'Delete Training Program',
      message: `Are you sure you want to delete course "${title}"? This cannot be undone.`,
      confirmText: 'Delete Course',
      type: 'confirm',
    });
    if (!confirmed) return;

    try {
      await courseService.deleteCourse(courseId);
      fetchCourses();
    } catch (err) {
      showAlert({
        title: 'Deletion Error',
        message: err.response?.data?.message || err.message || 'Error deleting course',
        type: 'error',
      });
    }
  };

  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <UnifiedCourseCreator
        courseId={viewMode === 'edit' ? editingCourseId : null}
        onCancel={() => {
          setViewMode('list');
          setEditingCourseId(null);
        }}
        onSuccess={() => {
          setViewMode('list');
          setEditingCourseId(null);
          fetchCourses();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner with Minimal Clay Surface */}
      <div data-aos="fade-down" className="clay-card p-6 sm:p-7 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#2C51A2] text-white px-2.5 py-0.5 rounded-full clay-pill">
              Admin Oversight
            </span>
            <span className="text-xs text-[#64748B]">Organization Curriculum</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#172B4D] uppercase tracking-wide mt-1.5">
            Global Course Catalog Management
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5 max-w-2xl leading-relaxed">
            Oversee all training curriculum authored across organizational departments.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="md"
            icon={FolderTree}
            onClick={() => setShowCategoryModal(true)}
          >
            Manage Categories
          </Button>
          <Button variant="primary" size="md" icon={Plus} onClick={() => setViewMode('create')}>
            Create New Course
          </Button>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div data-aos="fade-up" data-aos-delay="100" className="flex items-center gap-2 border-b border-[#E2E8F0] pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('courses')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all rounded-xl ${
            activeTab === 'courses'
              ? 'clay-btn-primary text-white shadow-sm'
              : 'clay-btn-secondary text-[#64748B] hover:text-[#1E3B78]'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Course Directory</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
            activeTab === 'courses' ? 'bg-white/25 text-white' : 'bg-slate-200 text-[#172B4D]'
          }`}>
            <AnimatedNumber value={courses.length} />
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('requests')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all rounded-xl relative ${
            activeTab === 'requests'
              ? 'clay-btn-primary text-white shadow-sm'
              : 'clay-btn-secondary text-[#64748B] hover:text-[#1E3B78]'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Enrollment Requests</span>
          {pendingRequestsCount > 0 && (
            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-amber-500 text-white animate-pulse">
              <AnimatedNumber value={pendingRequestsCount} /> Pending
            </span>
          )}
        </button>
      </div>

      {activeTab === 'requests' ? (
        <EnrollmentRequestsTable onCountChange={setPendingRequestsCount} />
      ) : (
        <>
          {/* Filter Bar with Minimal Clay Surface */}
          <div data-aos="fade-up" data-aos-delay="150" className="clay-card p-4 rounded-2xl flex flex-col md:flex-row items-center gap-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
          <Input
            placeholder="Search courses by title, category, description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={Search}
          />
          <Button type="submit" variant="primary" size="md">
            Search
          </Button>
        </form>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full md:w-auto">
          <div className="w-full sm:w-36">
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              placeholder="All Types"
              options={[
                { value: '', label: 'All Types' },
                { value: 'certified', label: 'Certified' },
                { value: 'non_certified', label: 'Non Certified' },
              ]}
            />
          </div>

          <div className="w-full sm:w-40">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              placeholder="All Statuses"
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'published', label: 'Published' },
                { value: 'draft', label: 'Draft' },
                { value: 'archived', label: 'Archived' },
              ]}
            />
          </div>

          <div className="w-full sm:w-56">
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              placeholder="All Categories"
              options={[
                { value: '', label: 'All Categories' },
                ...categoriesList.map((cat) => ({ value: cat, label: cat })),
              ]}
            />
          </div>
        </div>
      </div>

      {/* Courses Data Grid with Minimal Clay Surface */}
      <div data-aos="fade-up" data-aos-delay="200" className="clay-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto touch-scroll">
          <table className="w-full text-center border-collapse text-xs min-w-[720px]">
            <thead>
              <tr 
                className="text-white uppercase tracking-wider font-bold text-[11px] text-center"
                style={{
                  background: 'linear-gradient(160deg, #1E3B78 0%, #2C51A2 100%)',
                  boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.2)'
                }}
              >
                <th className="py-3.5 px-4 text-center">Course Title & Category</th>
                <th className="py-3.5 px-4 text-center">Course Type</th>
                <th className="py-3.5 px-4 text-center">Author / Instructor</th>
                <th className="py-3.5 px-4 text-center">Lessons</th>
                <th className="py-3.5 px-4 text-center">Passing Standard</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]/70">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-[#64748B]">
                    Loading course catalog...
                  </td>
                </tr>
              ) : courses.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-[#64748B]">
                    No training courses found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedCourses.map((course) => (
                  <tr key={course.id} className="hover:bg-[#EFF6FF]/60 transition-colors">
                    <td className="py-3.5 px-4 text-left">
                      <div className="font-bold text-sm text-[#172B4D]">{course.title}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#2C51A2]">
                          {course.category}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`clay-pill text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full inline-flex items-center ${
                        course.course_type === 'certified' || !course.course_type
                          ? 'bg-blue-50 text-[#1E3B78] border border-blue-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-300'
                      }`}>
                        {course.course_type === 'non_certified' ? 'Non-Certified' : 'Certified'}
                      </span>
                      <div className="mt-1">
                        {course.access_type === 'required_admin_access' ? (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full inline-flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" /> Gated Access
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full inline-flex items-center gap-1">
                            <Unlock className="w-2.5 h-2.5" /> Open Access
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-left">
                      <div className="font-semibold text-[#172B4D]">{course.instructor_name}</div>
                      <div className="text-[10px] text-[#64748B]">{course.instructor_department}</div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-bold text-[#2C51A2] font-mono">{course.lessons_count || 0}</span> lessons
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-[#172B4D] font-mono">
                      {course.passing_percentage}%
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Badge variant={course.status === 'published' ? 'success' : 'warning'}>
                        {course.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <ActionMenu
                        triggerTitle={`Actions for ${course.title}`}
                        items={[
                          {
                            label: course.status === 'published' ? 'Unpublish Course' : 'Publish Course',
                            icon: course.status === 'published' ? Clock : CheckCircle,
                            onClick: () => handleTogglePublish(course),
                          },
                          {
                            label: 'Assign Trainees',
                            icon: Users,
                            disabled: course.status !== 'published',
                            title: course.status !== 'published' ? 'Publish course first to unlock trainee assignment' : 'Assign trainees',
                            onClick: () => {
                              if (course.status !== 'published') {
                                showAlert({
                                  title: 'Publication Required',
                                  message: 'This course is in draft. Please publish the course before assigning it to learners.',
                                  type: 'warning',
                                });
                                return;
                              }
                              navigate(`/admin/assignments?courseId=${course.id}&openAssign=1`);
                            },
                          },
                          {
                            label: 'Edit Course',
                            icon: Edit3,
                            onClick: () => {
                              setEditingCourseId(course.id);
                              setViewMode('edit');
                            },
                          },
                          {
                            label: 'Delete Course',
                            icon: Trash2,
                            variant: 'danger',
                            onClick: () => handleDeleteCourse(course.id, course.title),
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
        <Pagination
          currentPage={currentPage}
          totalItems={courses.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[5, 10, 20, 50]}
        />
      </div>
      </>
      )}

      {/* Category Manager Modal */}
      <CategoryManagerModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onCategoriesUpdated={() => {
          categoryService.clearCache();
          loadCategoryList();
          fetchCourses();
        }}
      />
    </div>
  );
};

export default AllCourses;
