import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useDialog } from '../../contexts/DialogContext';
import userService from '../../services/userService';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Pagination from '../../components/common/Pagination';
import ActionMenu from '../../components/common/ActionMenu';
import {
  Users,
  UserPlus,
  Search,
  Edit,
  Shield,
  Briefcase,
  Mail,
  CheckCircle,
  XCircle,
  Lock,
  Phone,
  Power,
  ArrowLeft,
  Award,
  BookOpen,
  RotateCcw,
  Eye,
  Clock,
  Calendar,
  Trash2
} from 'lucide-react';

const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const { showAlert, showConfirm } = useDialog();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dossier & Progress Overrides State
  const [dossierData, setDossierData] = useState(null);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [courseFilterTab, setCourseFilterTab] = useState('all'); // 'all' | 'pending' | 'completed'

  // Filters
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // View Mode: 'list' | 'create' | 'edit'
  const [viewMode, setViewMode] = useState('list');
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    employee_id: '',
    first_name: '',
    last_name: '',
    email: '',
    role_id: 3,
    department: '',
    designation: '',
    phone: '',
    status: 'active',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await userService.getUsers({
        role_id: roleFilter,
        status: statusFilter,
        search: searchTerm,
      });
      if (res.status === 'success') {
        setUsers(res.data);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await userService.getRoles();
      if (res.status === 'success') {
        setRoles(res.data);
      }
    } catch (err) {
      console.error('Failed to load roles:', err);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [roleFilter, statusFilter, searchTerm]);

  const paginatedUsers = users.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setFormData({
      employee_id: '',
      first_name: '',
      last_name: '',
      email: '',
      role_id: 3,
      department: '',
      designation: '',
      phone: '',
      status: 'active',
    });
    setViewMode('create');
  };

  const handleOpenEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      employee_id: user.employee_id || '',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      role_id: user.role_id,
      department: user.department || '',
      designation: user.designation || '',
      phone: user.phone || '',
      status: user.status || 'active',
    });
    setViewMode('edit');
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (editingUser) {
        await userService.updateUser(editingUser.id, formData);
      } else {
        await userService.createUser(formData);
      }
      setViewMode('list');
      fetchUsers();
    } catch (err) {
      showAlert({
        title: 'Save Account Error',
        message: err.response?.data?.message || err.message || 'Error saving user',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    const confirmed = await showConfirm({
      title: 'Modify Account Status',
      message: `Are you sure you want to change status of ${user.first_name} to ${newStatus}?`,
      confirmText: 'Change Status',
      type: 'confirm',
    });
    if (!confirmed) return;

    try {
      await userService.updateUser(user.id, { status: newStatus });
      fetchUsers();
    } catch (err) {
      showAlert({
        title: 'Status Update Error',
        message: err.message || 'Error updating user status',
        type: 'error',
      });
    }
  };

  const handleDeleteUser = async (user) => {
    if (currentUser && parseInt(user.id) === parseInt(currentUser.id)) {
      showAlert({
        title: 'Action Prohibited',
        message: 'Administrators cannot delete their own account.',
        type: 'error',
      });
      return;
    }

    const confirmed = await showConfirm({
      title: 'Delete Employee Account',
      message: `Are you sure you want to permanently delete "${user.first_name} ${user.last_name}" (${user.employee_id || user.email})? This action will permanently remove all associated training records and cannot be undone.`,
      confirmText: 'Permanently Delete User',
      type: 'confirm',
    });
    if (!confirmed) return;

    try {
      await userService.deleteUser(user.id);
      showAlert({
        title: 'Account Deleted',
        message: `Account for ${user.first_name} ${user.last_name} has been permanently deleted.`,
        type: 'success',
      });
      if (viewMode === 'details') {
        setViewMode('list');
      }
      fetchUsers();
    } catch (err) {
      showAlert({
        title: 'Deletion Error',
        message: err.response?.data?.message || err.message || 'Error deleting user account',
        type: 'error',
      });
    }
  };

  // Dossier & Course Override Handlers
  const handleViewUserDetails = async (user) => {
    try {
      setDossierLoading(true);
      setViewMode('details');
      setCourseFilterTab('all');
      const res = await userService.getUserDetails(user.id);
      if (res.status === 'success') {
        setDossierData(res.data);
      } else {
        throw new Error(res.message || 'Error loading learner dossier');
      }
    } catch (err) {
      showAlert({
        title: 'Load Error',
        message: err.response?.data?.message || err.message || 'Failed to retrieve learner details',
        type: 'error',
      });
      setViewMode('list');
    } finally {
      setDossierLoading(false);
    }
  };

  const reloadUserDetails = async (userId) => {
    try {
      const res = await userService.getUserDetails(userId);
      if (res.status === 'success') {
        setDossierData(res.data);
      }
    } catch (err) {
      console.error('Error reloading dossier:', err);
    }
  };

  const handleAdminCompleteCourse = async (course) => {
    const isCertified = course.course_type === 'certified';
    const confirmed = await showConfirm({
      title: 'Complete Course for Learner',
      message: `Mark "${course.course_title}" as 100% completed for ${dossierData.user.first_name} ${dossierData.user.last_name}?${isCertified ? ' An official Certificate of Completion will also be automatically issued.' : ''}`,
      confirmText: 'Mark as Completed',
      type: 'confirm',
    });
    if (!confirmed) return;

    try {
      const res = await userService.adminCompleteCourse(course.id);
      showAlert({
        title: 'Course Completed',
        message: res.message || 'Course marked as completed successfully.',
        type: 'success',
      });
      await reloadUserDetails(dossierData.user.id);
      fetchUsers();
    } catch (err) {
      showAlert({
        title: 'Completion Error',
        message: err.response?.data?.message || err.message || 'Error marking course completed',
        type: 'error',
      });
    }
  };

  const handleAdminResetCourse = async (course) => {
    const confirmed = await showConfirm({
      title: 'Reset Course Completion',
      message: `Revert completion status for "${course.course_title}"? Progress will be reset to 0% and any awarded certificate for this course will be revoked.`,
      confirmText: 'Reset Completion',
      type: 'confirm',
    });
    if (!confirmed) return;

    try {
      const res = await userService.adminResetCourseCompletion(course.id);
      showAlert({
        title: 'Completion Reset',
        message: res.message || 'Course completion reset successfully.',
        type: 'success',
      });
      await reloadUserDetails(dossierData.user.id);
      fetchUsers();
    } catch (err) {
      showAlert({
        title: 'Reset Error',
        message: err.response?.data?.message || err.message || 'Error resetting course completion',
        type: 'error',
      });
    }
  };

  // Metrics
  const totalEmployees = users.length;
  const instructorsCount = users.filter((u) => u.role === 'instructor').length;
  const learnersCount = users.filter((u) => u.role === 'learner').length;
  const activeCount = users.filter((u) => u.status === 'active').length;

  if (viewMode === 'details') {
    if (dossierLoading) {
      return (
        <div className="clay-card p-12 rounded-2xl text-center text-xs font-semibold text-[#64748B]">
          Loading employee learning profile and course dossier...
        </div>
      );
    }

    if (!dossierData || !dossierData.user) {
      return (
        <div className="clay-card p-12 rounded-2xl text-center space-y-4">
          <p className="text-xs text-[#DC2626] font-bold">Failed to load user learning records.</p>
          <Button variant="secondary" size="md" icon={ArrowLeft} onClick={() => setViewMode('list')}>
            Back to Directory
          </Button>
        </div>
      );
    }

    const { user, courses = [], certificates = [], stats = {} } = dossierData;
    const roleName = (user.role || '').toLowerCase();

    const displayedCourses = courses.filter((c) => {
      if (courseFilterTab === 'completed') return c.status === 'completed';
      if (courseFilterTab === 'pending') return c.status !== 'completed';
      return true;
    });

    return (
      <div className="space-y-6">
        {/* Top Header Banner */}
        <div className="clay-card p-6 sm:p-7 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#2C51A2] text-white px-2.5 py-0.5 rounded-full clay-pill">
                Admin Directory
              </span>
              <span className="text-xs text-[#64748B]">Employee Learning Profile</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#172B4D] uppercase tracking-wide mt-1.5">
              {user.first_name} {user.last_name} ({user.employee_id})
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5 max-w-2xl leading-relaxed">
              Comprehensive overview of registered training programs, progress benchmarks, and earned certifications.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="secondary"
              size="md"
              icon={Edit}
              onClick={() => handleOpenEditModal(user)}
            >
              Edit Profile
            </Button>
            <Button
              variant="danger"
              size="md"
              icon={Trash2}
              onClick={() => handleDeleteUser(user)}
            >
              Delete User
            </Button>
            <Button
              variant="secondary"
              size="md"
              icon={ArrowLeft}
              onClick={() => setViewMode('list')}
            >
              Back to Directory
            </Button>
          </div>
        </div>

        {/* 4 Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="clay-card p-5 rounded-2xl border-t-4 border-[#2C51A2] clay-card-hover">
            <div className="flex items-center justify-between text-[#64748B] mb-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#2C51A2]">
                Registered Courses
              </span>
              <BookOpen className="w-4 h-4 text-[#2C51A2]" />
            </div>
            <div className="text-2xl font-extrabold text-[#172B4D] font-mono">
              {stats.total_courses || 0}
            </div>
            <span className="text-[10px] text-[#64748B] font-semibold pt-2 border-t border-[#F1F5F9] mt-2 block">
              Assigned Training Programs
            </span>
          </div>

          <div className="clay-card p-5 rounded-2xl border-t-4 border-[#1E3B78] clay-card-hover">
            <div className="flex items-center justify-between text-[#64748B] mb-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#1E3B78]">
                Completed Courses
              </span>
              <CheckCircle className="w-4 h-4 text-[#1E3B78]" />
            </div>
            <div className="text-2xl font-extrabold text-[#1E3B78] font-mono">
              {stats.completed_courses || 0}
            </div>
            <span className="text-[10px] text-[#64748B] font-semibold pt-2 border-t border-[#F1F5F9] mt-2 block">
              100% Curriculum Finished
            </span>
          </div>

          <div className="clay-card p-5 rounded-2xl border-t-4 border-[#D97706] clay-card-hover">
            <div className="flex items-center justify-between text-[#64748B] mb-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#D97706]">
                Pending / In Progress
              </span>
              <Clock className="w-4 h-4 text-[#D97706]" />
            </div>
            <div className="text-2xl font-extrabold text-[#D97706] font-mono">
              {stats.pending_courses || 0}
            </div>
            <span className="text-[10px] text-[#64748B] font-semibold pt-2 border-t border-[#F1F5F9] mt-2 block">
              Awaiting Completion
            </span>
          </div>

          <div className="clay-card p-5 rounded-2xl border-t-4 border-[#1E3B78] clay-card-hover">
            <div className="flex items-center justify-between text-[#64748B] mb-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#1E3B78]">
                Certifications
              </span>
              <Award className="w-4 h-4 text-[#1E3B78]" />
            </div>
            <div className="text-2xl font-extrabold text-[#1E3B78] font-mono">
              {stats.total_certificates || 0}
            </div>
            <span className="text-[10px] text-[#64748B] font-semibold pt-2 border-t border-[#F1F5F9] mt-2 block">
              Earned Credentials
            </span>
          </div>
        </div>

        {/* Employee Profile Information Card */}
        <div className="clay-card p-6 sm:p-7 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#2C51A2]">
              Employee Identity & Corporate Details
            </h3>
            <Badge variant={user.status === 'active' ? 'success' : 'error'}>
              {user.status}
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-[#64748B] block font-semibold">Corporate Email</span>
              <span className="font-bold text-[#172B4D] break-all">{user.email}</span>
            </div>
            <div>
              <span className="text-[#64748B] block font-semibold">Assigned System Role</span>
              <span className="font-bold text-[#172B4D]">{user.role_display_name || user.role}</span>
            </div>
            <div>
              <span className="text-[#64748B] block font-semibold">Department</span>
              <span className="font-bold text-[#172B4D]">{user.department || 'General'}</span>
            </div>
            <div>
              <span className="text-[#64748B] block font-semibold">Designation / Title</span>
              <span className="font-bold text-[#172B4D]">{user.designation || 'Unassigned'}</span>
            </div>
            <div>
              <span className="text-[#64748B] block font-semibold">Contact Phone</span>
              <span className="font-mono text-[#172B4D]">{user.phone || '—'}</span>
            </div>
            <div>
              <span className="text-[#64748B] block font-semibold">Last System Activity</span>
              <span className="font-mono text-[#172B4D]">{user.last_login_at || 'Never'}</span>
            </div>
            <div>
              <span className="text-[#64748B] block font-semibold">Employee ID Code</span>
              <span className="font-mono font-bold text-[#2C51A2]">{user.employee_id}</span>
            </div>
            <div>
              <span className="text-[#64748B] block font-semibold">Account State</span>
              <span className="font-bold uppercase text-[#2C51A2]">{user.status}</span>
            </div>
          </div>
        </div>

        {/* Registered Training Programs Section */}
        <div className="space-y-4">
          <div className="clay-card p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#172B4D] uppercase tracking-wide">
                Registered Training Programs
              </h3>
              <p className="text-xs text-[#64748B]">
                Track, complete, or reset course progress for this employee.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setCourseFilterTab('all')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-full clay-pill transition-all ${
                  courseFilterTab === 'all'
                    ? 'bg-[#2C51A2] text-white shadow-xs'
                    : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]'
                }`}
              >
                All Courses ({courses.length})
              </button>
              <button
                type="button"
                onClick={() => setCourseFilterTab('pending')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-full clay-pill transition-all ${
                  courseFilterTab === 'pending'
                    ? 'bg-[#D97706] text-white shadow-xs'
                    : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]'
                }`}
              >
                Pending ({stats.pending_courses || 0})
              </button>
              <button
                type="button"
                onClick={() => setCourseFilterTab('completed')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-full clay-pill transition-all ${
                  courseFilterTab === 'completed'
                    ? 'bg-[#1E3B78] text-white shadow-xs'
                    : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]'
                }`}
              >
                Completed ({stats.completed_courses || 0})
              </button>
            </div>
          </div>

          {displayedCourses.length === 0 ? (
            <div className="clay-card p-8 rounded-2xl text-center text-xs text-[#64748B]">
              No courses match the current filter tab.
            </div>
          ) : (
            displayedCourses.map((c) => (
              <div key={c.id} className="clay-card p-5 sm:p-6 rounded-2xl space-y-3.5">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-[#EFF6FF] text-[#2C51A2] px-2.5 py-0.5 rounded-full border border-[#BFDBFE] clay-pill">
                        {c.course_category || 'General'}
                      </span>
                      <Badge variant={c.course_type === 'certified' ? 'primary' : 'neutral'}>
                        {c.course_type === 'certified' ? 'Certified Course' : 'Non-Certified Course'}
                      </Badge>
                      <Badge variant={c.status === 'completed' ? 'success' : c.status === 'overdue' ? 'error' : c.status === 'in_progress' ? 'warning' : 'default'}>
                        {c.status === 'completed' ? 'Completed' : c.status === 'in_progress' ? 'In Progress' : c.status === 'overdue' ? 'Overdue' : 'Not Started'}
                      </Badge>
                    </div>

                    <h3 className="text-base font-bold text-[#172B4D] uppercase tracking-wide">
                      {c.course_title}
                    </h3>

                    {c.course_description && (
                      <p className="text-xs text-[#64748B] line-clamp-2 leading-relaxed">
                        {c.course_description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-xs text-[#64748B] pt-1">
                      <span>Instructor: <strong>{c.instructor_name || 'Assigned Lead'}</strong></span>
                      {c.due_date && <span>Due Date: <strong>{new Date(c.due_date).toLocaleDateString()}</strong></span>}
                      {c.completed_at && <span>Completed On: <strong>{new Date(c.completed_at).toLocaleDateString()}</strong></span>}
                    </div>
                  </div>

                  {/* Admin Action Button: Mark as Completed / Reset Completion */}
                  <div className="flex items-center gap-2 shrink-0 pt-1">
                    {c.status !== 'completed' ? (
                      <Button
                        variant="primary"
                        size="sm"
                        icon={CheckCircle}
                        onClick={() => handleAdminCompleteCourse(c)}
                      >
                        Mark as Completed
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={RotateCcw}
                        onClick={() => handleAdminResetCourse(c)}
                      >
                        Reset Completion
                      </Button>
                    )}
                  </div>
                </div>

                {/* Progress Bar & Stats */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs font-semibold text-[#172B4D]">
                    <span>Curriculum Lessons: {c.completed_lessons || 0} of {c.total_lessons || 0} Complete</span>
                    <span className="font-mono text-[#2C51A2] font-bold">{parseFloat(c.progress_percentage).toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-[#E2E8F0] h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${c.status === 'completed' ? 'bg-[#1E3B78]' : 'bg-[#2C51A2]'}`}
                      style={{ width: `${Math.min(100, Math.max(0, parseFloat(c.progress_percentage)))}%` }}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Earned Certifications Section */}
        <div className="space-y-4">
          <div className="clay-card p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#172B4D] uppercase tracking-wide">
                Awarded Certifications ({certificates.length})
              </h3>
              <p className="text-xs text-[#64748B]">
                Official credentials issued upon completion of certified courses.
              </p>
            </div>
          </div>

          {certificates.length === 0 ? (
            <div className="clay-card p-8 rounded-2xl text-center text-xs text-[#64748B]">
              No official credentials or certificates awarded to this employee yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {certificates.map((cert) => (
                <div key={cert.id} className="clay-card p-5 rounded-2xl space-y-2 border-l-4 border-[#2C51A2]">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#2C51A2]">
                      {cert.certificate_code}
                    </span>
                    <Badge variant={cert.status === 'active' ? 'success' : 'error'}>
                      {cert.status === 'active' ? 'Active Credential' : 'Revoked'}
                    </Badge>
                  </div>
                  <h4 className="text-sm font-bold text-[#172B4D]">
                    {cert.course_title}
                  </h4>
                  <div className="flex items-center justify-between text-xs text-[#64748B] pt-1 border-t border-[#F1F5F9]">
                    <span>Issued: {new Date(cert.issued_at).toLocaleDateString()}</span>
                    <span>Final Score: <strong>{parseFloat(cert.final_score).toFixed(0)}%</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (viewMode === 'create' || viewMode === 'edit') {
    const isEdit = viewMode === 'edit';
    return (
      <div className="space-y-6">
        {/* Top Banner Header with Back Button */}
        <div className="clay-card p-6 sm:p-7 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#2C51A2] text-white px-2.5 py-0.5 rounded-full clay-pill">
                Admin Directory
              </span>
              <span className="text-xs text-[#64748B]">
                {isEdit ? 'Account Modification Page' : 'New Employee Provisioning Page'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#172B4D] uppercase tracking-wide mt-1.5">
              {isEdit ? `Edit Profile: ${editingUser?.first_name} ${editingUser?.last_name}` : 'Provision Employee Account'}
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5 max-w-2xl leading-relaxed">
              Manage enterprise access credentials, system role authorizations, and departmental mapping.
            </p>
          </div>
          <div>
            <Button variant="secondary" size="md" icon={ArrowLeft} onClick={() => setViewMode('list')}>
              Back to Directory
            </Button>
          </div>
        </div>

        {/* Full Page User Form Card */}
        <div className="clay-card p-6 sm:p-8 rounded-2xl shadow-sm">
          <form onSubmit={handleSaveUser} className="space-y-5 w-full" autoComplete="off">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="First Name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
              />
              <Input
                label="Last Name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Corporate Email Address"
                type="email"
                name="new_employee_email"
                autoComplete="off"
                placeholder="e.g. employee@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              <Input
                label="Employee ID"
                name="new_employee_id"
                autoComplete="off"
                placeholder="e.g. EMP-1001"
                value={formData.employee_id}
                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Assigned System Role"
                value={formData.role_id}
                onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                options={roles.map((r) => ({ value: r.id, label: r.display_name }))}
                required
              />
              <Select
                label="Account Status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                  { value: 'suspended', label: 'Suspended' },
                ]}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="e.g. Software Engineering"
              />
              <Input
                label="Designation / Title"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                placeholder="e.g. Trainee Backend Developer"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Contact Phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1-555-0100"
              />
            </div>

            <div className="pt-5 border-t border-[#E2E8F0] flex items-center justify-end gap-3">
              <Button variant="secondary" size="md" type="button" onClick={() => setViewMode('list')}>
                Cancel
              </Button>
              <Button variant="primary" size="md" type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : editingUser ? 'Update Account' : 'Provision User'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Header with Minimal Clay Surface */}
      <div className="clay-card p-6 sm:p-7 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#2C51A2] text-white px-2.5 py-0.5 rounded-full clay-pill">
              Access Governance
            </span>
            <span className="text-xs text-[#64748B]">Enterprise Directory</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#172B4D] uppercase tracking-wide mt-1.5">
            Employee Accounts & Role Governance
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5 max-w-2xl leading-relaxed">
            Provision corporate accounts, configure role permissions, govern security status, and oversee employee profiles.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="primary" size="sm" icon={UserPlus} onClick={handleOpenCreateModal}>
            Provision Employee
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid with Minimal Clay Elevation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Accounts', value: totalEmployees, sub: 'Registered Users', icon: Users, accent: 'border-t-4 border-[#2C51A2]' },
          { label: 'Instructors', value: instructorsCount, sub: 'Content Creators', icon: Briefcase, accent: 'border-t-4 border-[#1E3B78]' },
          { label: 'Trainee Learners', value: learnersCount, sub: 'Enrolled Employees', icon: Shield, accent: 'border-t-4 border-[#2C51A2]' },
          { label: 'Active Accounts', value: activeCount, sub: 'Authorized Access', icon: CheckCircle, accent: 'border-t-4 border-[#D97706]' },
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

      {/* Filter and Search Bar with Minimal Clay Surface */}
      <div className="clay-card p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full sm:w-auto flex-1">
          <Select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            options={[
              { value: '', label: 'All Roles' },
              ...roles.map((r) => ({ value: r.id, label: r.display_name })),
            ]}
          />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'active', label: 'Active Only' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'suspended', label: 'Suspended' },
            ]}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="w-full sm:w-72">
            <Input
              placeholder="Search by name, email, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={Search}
            />
          </div>
          <Button variant="secondary" size="md" onClick={fetchUsers}>
            Filter
          </Button>
        </div>
      </div>

      {/* Users Table with touch-scroll container */}
      <div className="clay-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto touch-scroll">
          <table className="w-full text-center border-collapse min-w-[760px]">
            <thead>
              <tr 
                className="text-white text-[11px] font-bold uppercase tracking-wider text-center"
                style={{
                  background: 'linear-gradient(160deg, #1E3B78 0%, #2C51A2 100%)',
                  boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.2)'
                }}
              >
                <th className="py-3.5 px-4 text-center">Employee</th>
                <th className="py-3.5 px-4 text-center">Role</th>
                <th className="py-3.5 px-4 text-center">Department & Designation</th>
                <th className="py-3.5 px-4 text-center">Phone</th>
                <th className="py-3.5 px-4 text-center">Training Progress</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Last Activity</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]/70 text-xs">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-[#64748B]">
                    Loading employee directory...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-[#64748B]">
                    No employee accounts found matching the criteria.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u) => {
                  const roleName = (u.role || '').toLowerCase();
                  return (
                    <tr key={u.id} className="hover:bg-[#EFF6FF]/60 transition-colors">
                      <td
                        className="py-3.5 px-4 cursor-pointer group text-left"
                        onClick={() => handleViewUserDetails(u)}
                        title="Click to view learning profile and course dossier"
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-8 h-8 rounded-full text-white flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform"
                            style={{
                              background: 'linear-gradient(160deg, #23458B 0%, #1E3B78 100%)',
                              boxShadow: '0 2px 5px rgba(44, 81, 162, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.4)'
                            }}
                          >
                            {u.first_name[0]}{u.last_name[0]}
                          </div>
                          <div className="text-left">
                            <div className="font-bold text-[#172B4D] group-hover:text-[#2C51A2] transition-colors flex items-center gap-2">
                              <span>{u.first_name} {u.last_name}</span>
                              <span className="text-[10px] text-[#64748B] font-mono">({u.employee_id})</span>
                            </div>
                            <div className="text-[11px] text-[#64748B]">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge variant={roleName === 'admin' ? 'navy' : roleName === 'instructor' ? 'primary' : 'default'}>
                          {u.role_display_name || u.role}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="font-bold text-[#172B4D]">{u.designation || 'Unassigned'}</div>
                        <div className="text-[11px] text-[#64748B]">{u.department || 'General'}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center text-[#64748B] font-mono">
                        {u.phone || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {roleName === 'learner' ? (
                          <span className="font-bold text-[#2C51A2] font-mono">
                            {u.completed_courses_count || 0} / {u.assigned_courses_count || 0} Done
                          </span>
                        ) : (
                          <span className="text-[#94A3B8]">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge variant={u.status === 'active' ? 'success' : u.status === 'suspended' ? 'error' : 'default'}>
                          {u.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-center text-[#64748B] text-[11px] font-mono">
                        {u.last_login_at || 'Never'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <ActionMenu
                          triggerTitle={`Actions for ${u.first_name} ${u.last_name}`}
                          items={[
                            {
                              label: 'View Dossier',
                              icon: Eye,
                              onClick: () => handleViewUserDetails(u),
                            },
                            {
                              label: 'Edit User',
                              icon: Edit,
                              onClick: () => handleOpenEditModal(u),
                            },
                            {
                              label: u.status === 'active' ? 'Deactivate' : 'Activate',
                              icon: Power,
                              onClick: () => handleToggleStatus(u),
                            },
                            {
                              label: 'Delete User',
                              icon: Trash2,
                              variant: 'danger',
                              disabled: parseInt(u.id) === parseInt(currentUser?.id),
                              title: parseInt(u.id) === parseInt(currentUser?.id) ? 'Administrators cannot delete their own account' : 'Permanently Delete User',
                              onClick: () => handleDeleteUser(u),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalItems={users.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[5, 10, 20, 50]}
        />
      </div>
    </div>
  );
};

export default UserManagement;
