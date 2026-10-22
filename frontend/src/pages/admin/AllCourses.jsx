import React, { useEffect, useState } from 'react';
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
  Search,
  CheckCircle,
  Clock,
  Layers,
  Edit3,
  Trash2,
  Users,
  Filter,
  ArrowLeft
} from 'lucide-react';

const AllCourses = () => {
  const navigate = useNavigate();
  const { showAlert, showConfirm } = useDialog();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // View Mode: 'list' | 'create'
  const [viewMode, setViewMode] = useState('list');
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: 'Software Engineering',
    course_type: '',
    description: '',
    estimated_duration_minutes: 60,
    passing_percentage: 80,
  });

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
          passing_percentage: 80,
        });
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

  if (viewMode === 'create') {
    return (
      <div className="space-y-6">
        {/* Header Banner with Back Button */}
        <div className="clay-card p-6 sm:p-7 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#2C51A2] text-white px-2.5 py-0.5 rounded-full clay-pill">
                Admin Oversight
              </span>
              <span className="text-xs text-[#64748B]">Curriculum Provisioning Page</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#172B4D] uppercase tracking-wide mt-1.5">
              Create New Training Program
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5 max-w-2xl leading-relaxed">
              Initialize curriculum metadata, duration, category, and passing standard.
            </p>
          </div>
          <div>
            <Button variant="secondary" size="md" icon={ArrowLeft} onClick={() => setViewMode('list')}>
              Back to Catalog
            </Button>
          </div>
        </div>

        {/* Full Page Course Creation Card */}
        <div className="clay-card p-6 sm:p-8 rounded-2xl shadow-sm">
          <form onSubmit={handleCreateCourse} className="space-y-5 max-w-3xl">
            <Input
              label="Course Title"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Advanced Software Engineering & API Security"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Department / Category"
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
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#172B4D] mb-1.5">
                Course Description & Objectives
              </label>
              <textarea
                rows="4"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full text-[#172B4D] text-sm p-3.5 rounded-xl focus:outline-none clay-input"
                placeholder="Outline what trainee employees will master upon completing this curriculum..."
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

            <div className="pt-5 border-t border-[#E2E8F0] flex items-center justify-end gap-3">
              <Button variant="secondary" onClick={() => setViewMode('list')}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={submitting}>
                Save & Open Curriculum Studio
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
        <div>
          <Button variant="primary" size="md" icon={Plus} onClick={() => setViewMode('create')}>
            Create New Course
          </Button>
        </div>
      </div>

      {/* Filter Bar with Minimal Clay Surface */}
      <div className="clay-card p-4 rounded-2xl flex flex-col md:flex-row items-center gap-4">
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
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-11 px-3.5 rounded-xl text-xs font-bold text-[#2C51A2] clay-input cursor-pointer w-full sm:w-auto"
          >
            <option value="">All Types</option>
            <option value="certified">Certified</option>
            <option value="non_certified">Non Certified</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-11 px-3.5 rounded-xl text-xs font-bold text-[#2C51A2] clay-input cursor-pointer w-full sm:w-auto"
          >
            <option value="">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-11 px-3.5 rounded-xl text-xs font-bold text-[#2C51A2] clay-input cursor-pointer w-full sm:w-auto"
          >
            <option value="">All Categories</option>
            <option value="Software Engineering">Software Engineering</option>
            <option value="Frontend Engineering">Frontend Engineering</option>
            <option value="Information Security">Information Security</option>
            <option value="Corporate Compliance">Corporate Compliance</option>
            <option value="Quality Assurance">Quality Assurance</option>
          </select>
        </div>
      </div>

      {/* Courses Data Grid with Minimal Clay Surface */}
      <div className="clay-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto touch-scroll">
          <table className="w-full text-left border-collapse text-xs min-w-[720px]">
            <thead>
              <tr 
                className="text-white uppercase tracking-wider font-bold text-[11px]"
                style={{
                  background: 'linear-gradient(160deg, #1E3B78 0%, #2C51A2 100%)',
                  boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.2)'
                }}
              >
                <th className="py-3.5 px-4">Course Title & Category</th>
                <th className="py-3.5 px-4">Author / Instructor</th>
                <th className="py-3.5 px-4 text-center">Modules & Lessons</th>
                <th className="py-3.5 px-4 text-center">Passing Standard</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]/70">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-[#64748B]">
                    Loading course catalog...
                  </td>
                </tr>
              ) : courses.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-[#64748B]">
                    No training courses found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedCourses.map((course) => (
                  <tr key={course.id} className="hover:bg-[#EFF6FF]/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-sm text-[#172B4D]">{course.title}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#2C51A2]">
                          {course.category}
                        </span>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          course.course_type === 'certified' || !course.course_type
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-300'
                        }`}>
                          {course.course_type === 'non_certified' ? 'Non Certified' : 'Certified'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#172B4D]">{course.instructor_name}</div>
                      <div className="text-[10px] text-[#64748B]">{course.instructor_department}</div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-extrabold text-[#2C51A2] font-mono">{course.modules_count}</span> modules •{' '}
                      <span className="font-bold text-[#2C51A2] font-mono">{course.lessons_count}</span> lessons
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-[#172B4D] font-mono">
                      {course.passing_percentage}%
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Badge variant={course.status === 'published' ? 'success' : 'warning'}>
                        {course.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
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
                          variant="secondary"
                          size="sm"
                          icon={Edit3}
                          onClick={() => navigate(`/instructor/course-builder?courseId=${course.id}`)}
                          title="Edit Curriculum"
                        >
                          Curriculum
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
        <Pagination
          currentPage={currentPage}
          totalItems={courses.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[5, 10, 20, 50]}
        />
      </div>
    </div>
  );
};

export default AllCourses;
