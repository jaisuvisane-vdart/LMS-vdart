import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
import AnimatedNumber from '../../components/common/AnimatedNumber';
import { DEPARTMENT_OPTIONS } from '../../config/taxonomy';
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
  Trash2,
  GraduationCap,
  FileText,
  ShieldCheck,
  TrendingUp,
  ChevronRight,
  X,
  UserCheck,
  LayoutDashboard,
  LayoutGrid,
  ExternalLink,
  FileCheck,
  RefreshCw,
  Layers
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
  const [dossierActiveTab, setDossierActiveTab] = useState('overview'); // 'overview' | 'courses' | 'timeline' | 'assessments' | 'certificates'
  const [activeDrawer, setActiveDrawer] = useState(null); // null | 'courses' | 'assessments' | 'certificates' | 'timeline'

  // Directory Segregation Tabs: 'trainees' | 'recruiters' | 'staff' | 'all'
  const [directoryTab, setDirectoryTab] = useState('trainees');
  const [batchFilter, setBatchFilter] = useState('');
  const [batchesList, setBatchesList] = useState([]);

  // Google Sheets Sync State
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);

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
    name: '',
    trainee_id: '',
    employee_id: '',
    first_name: '',
    last_name: '',
    email: '',
    role_id: 3,
    learner_type: 'trainee',
    batch: '',
    department: 'Recruitment',
    designation: '',
    status: 'active',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = {
        status: statusFilter,
        search: searchTerm,
      };

      if (directoryTab === 'trainees') {
        params.learner_type = 'trainee';
        params.role_id = 3;
        if (batchFilter) params.batch = batchFilter;
      } else if (directoryTab === 'recruiters') {
        params.learner_type = 'recruiter';
        params.role_id = 3;
      } else if (directoryTab === 'staff') {
        if (roleFilter) params.role_id = roleFilter;
      } else if (directoryTab === 'all') {
        if (roleFilter) params.role_id = roleFilter;
      }

      const res = await userService.getUsers(params);
      if (res.status === 'success') {
        let list = res.data || [];
        if (directoryTab === 'staff') {
          list = list.filter((u) => u.role === 'admin' || u.role === 'instructor');
        }
        setUsers(list);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBatches = async () => {
    try {
      const res = await userService.getBatches();
      if (res.status === 'success') {
        setBatchesList(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load batches:', err);
    }
  };

  const fetchSyncStatus = async () => {
    try {
      const res = await userService.getGoogleSheetsStatus();
      if (res.status === 'success') {
        setSyncStatus(res.data);
      }
    } catch (err) {
      console.error('Failed to load sync status:', err);
    }
  };

  const handleSyncGoogleSheets = async (sheetType = null) => {
    try {
      setSyncLoading(true);
      const res = await userService.syncGoogleSheets(sheetType);
      showAlert({
        title: 'Google Sheet Synchronized',
        message: res.message || 'Users synchronized successfully from Google Sheets.',
        type: 'success',
      });
      await fetchUsers();
      await fetchBatches();
      await fetchSyncStatus();
    } catch (err) {
      showAlert({
        title: 'Sync Failed',
        message: err.response?.data?.message || err.message || 'Failed to sync with Google Sheet. Please check your backend spreadsheet configuration and sharing permissions.',
        type: 'error',
      });
    } finally {
      setSyncLoading(false);
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
    fetchBatches();
    fetchSyncStatus();

    // Automatic Periodic Background Synchronization (Runs every 3 minutes)
    const autoSyncTimer = setInterval(async () => {
      try {
        await userService.syncGoogleSheets();
        fetchUsers();
        fetchBatches();
        fetchSyncStatus();
      } catch (err) {
        // Silent periodic background refresh
      }
    }, 3 * 60 * 1000); // 3 minutes

    return () => clearInterval(autoSyncTimer);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [directoryTab, batchFilter, roleFilter, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [directoryTab, batchFilter, roleFilter, statusFilter, searchTerm]);

  const paginatedUsers = users.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      trainee_id: '',
      employee_id: '',
      first_name: '',
      last_name: '',
      email: '',
      role_id: 3,
      learner_type: directoryTab === 'recruiters' ? 'recruiter' : 'trainee',
      batch: '',
      department: 'Recruitment',
      designation: '',
      status: 'active',
    });
    setViewMode('create');
  };

  const handleOpenEditModal = (user) => {
    setEditingUser(user);
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
    setFormData({
      name: fullName,
      trainee_id: user.trainee_id || user.employee_id || '',
      employee_id: user.employee_id || '',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      role_id: user.role_id,
      learner_type: user.learner_type || 'trainee',
      batch: user.batch || '',
      department: user.department || 'Recruitment',
      designation: user.designation || '',
      status: user.status || 'active',
    });
    setViewMode('edit');
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const nameParts = (formData.name || '').trim().split(/\s+/);
      const payload = {
        ...formData,
        first_name: nameParts[0] || formData.first_name || '',
        last_name: nameParts.slice(1).join(' ') || formData.last_name || '',
      };
      if (editingUser) {
        await userService.updateUser(editingUser.id, payload);
      } else {
        await userService.createUser(payload);
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
      setDossierActiveTab('overview');
      setActiveDrawer(null);
      const res = await userService.getUserDetails(user.id);
      if (res.status === 'success') {
        setDossierData(res.data);
      } else {
        throw new Error(res.message || 'Error loading learner details');
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

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'Not synced yet';
    try {
      const normalizedStr = typeof dateStr === 'string' && dateStr.includes(' ') && !dateStr.includes('T')
        ? dateStr.replace(' ', 'T')
        : dateStr;
      const d = new Date(normalizedStr);
      if (isNaN(d.getTime())) return String(dateStr);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return String(dateStr || 'Not synced yet');
    }
  };

  const configsList = useMemo(() => {
    if (!syncStatus?.configs) return [];
    if (Array.isArray(syncStatus.configs)) return syncStatus.configs;
    if (typeof syncStatus.configs === 'object') return Object.values(syncStatus.configs);
    return [];
  }, [syncStatus]);

  const activeSyncTimestamp = useMemo(() => {
    try {
      if (!configsList || configsList.length === 0) return null;
      if (directoryTab === 'recruiters') {
        const config = configsList.find((c) => c && c.sheet_type === 'recruiters');
        return config?.last_synced_at || configsList[0]?.last_synced_at || null;
      }
      if (directoryTab === 'trainees') {
        const config = configsList.find((c) => c && c.sheet_type === 'trainees');
        return config?.last_synced_at || configsList[0]?.last_synced_at || null;
      }
      const timestamps = configsList
        .filter((c) => c && c.last_synced_at)
        .map((c) => c.last_synced_at)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      return timestamps[0] || configsList[0]?.last_synced_at || null;
    } catch {
      return null;
    }
  }, [configsList, directoryTab]);

  // Metrics
  const totalEmployees = users.length;
  const instructorsCount = users.filter((u) => u.role === 'instructor').length;
  const learnersCount = users.filter((u) => u.role === 'learner').length;
  const activeCount = users.filter((u) => u.status === 'active').length;

  if (viewMode === 'details') {
    if (dossierLoading) {
      return (
        <div className="clay-card p-12 rounded-2xl text-center text-xs font-semibold text-[#64748B]">
          Loading employee learning profile and details...
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

    const {
      user,
      courses = [],
      certificates = [],
      assessments = [],
      timeline = [],
      activity_logs = [],
      stats = {}
    } = dossierData;

    const displayedCourses = courses.filter((c) => {
      if (courseFilterTab === 'completed') return c.status === 'completed';
      if (courseFilterTab === 'pending') return c.status !== 'completed';
      return true;
    });

    // Render course action button (Mark as Completed / Reset Completion)
    const renderCourseActionButton = (c) => {
      if (c.status !== 'completed') {
        return (
          <button
            type="button"
            onClick={() => handleAdminCompleteCourse(c)}
            className="shrink-0 text-xs font-bold bg-[#2C51A2] hover:bg-[#1E3B78] text-white px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-xs transition-all"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Mark as Completed</span>
          </button>
        );
      }
      return (
        <button
          type="button"
          onClick={() => handleAdminResetCourse(c)}
          className="shrink-0 text-xs font-bold bg-amber-50 hover:bg-amber-100 text-[#D97706] border border-amber-300 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-xs transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Completion</span>
        </button>
      );
    };

    return (
      <div className="space-y-6">
        {/* Top Profile Summary Header Card */}
        <div data-aos="fade-down" className="clay-card p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* User Avatar + Identity Info */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#EFF6FF] border-2 border-white shadow-xs flex items-center justify-center font-bold text-xl text-[#2C51A2] uppercase shrink-0">
              {user.first_name?.[0] || 'U'}{user.last_name?.[0] || ''}
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-[#172B4D]">
                  {user.first_name} {user.last_name}
                </h1>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full capitalize ${
                  user.status === 'active'
                    ? 'bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]'
                    : 'bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]'
                }`}>
                  {user.status || 'Active'}
                </span>
              </div>
              <p className="text-xs font-semibold text-[#64748B]">
                {user.learner_type === 'trainee' ? 'Trainee ID' : 'Employee ID'}: <span className="font-mono text-[#172B4D]">{user.trainee_id || user.employee_id}</span>
              </p>
              <p className="text-xs text-[#64748B]">
                {user.email}
              </p>
            </div>
          </div>

          {/* Department & Designation */}
          <div className="flex flex-wrap items-center gap-8 lg:gap-12">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center text-[#2C51A2] shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">
                  Department
                </span>
                <span className="text-sm font-bold text-[#172B4D] block">
                  {user.department || 'Software Development'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center text-[#2C51A2] shrink-0">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">
                  Designation
                </span>
                <span className="text-sm font-bold text-[#172B4D] block">
                  {user.designation || 'Graduate Trainee'}
                </span>
              </div>
            </div>
          </div>

          {/* Back & Action Buttons */}
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
              variant="secondary"
              size="md"
              icon={ArrowLeft}
              onClick={() => setViewMode('list')}
            >
              Back to Directory
            </Button>
          </div>
        </div>

        {/* Main Body: Sidebar + Main Content */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Left Sidebar: Navigation Items from Top Bar (Activity Log Removed) */}
          <div data-aos="fade-right" className="w-full lg:w-64 shrink-0 space-y-4">
            <div className="clay-card p-3 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs">
              <div className="space-y-1.5">
                {[
                  { id: 'overview', label: 'Overview', icon: LayoutGrid },
                  { id: 'courses', label: 'Assigned Courses', icon: BookOpen },
                  { id: 'timeline', label: 'Progress Timeline', icon: TrendingUp },
                  { id: 'assessments', label: 'Assessments', icon: Calendar },
                  { id: 'certificates', label: 'Certificates', icon: Award },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = dossierActiveTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setDossierActiveTab(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                        isActive
                          ? 'bg-[#2C51A2] text-white shadow-xs'
                          : 'text-[#64748B] hover:text-[#172B4D] hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#64748B]'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Main Content Area */}
          <div data-aos="fade-left" className="flex-1 w-full space-y-6">
            {/* TAB CONTENT: Overview */}
            {dossierActiveTab === 'overview' && (
              <div className="space-y-6">
                {/* Current Assigned Courses Card */}
                <div className="clay-card p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <GraduationCap className="w-5 h-5 text-[#2C51A2]" />
                      <h3 className="text-sm font-bold text-[#172B4D]">
                        Current Assigned Courses
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveDrawer('courses')}
                      className="text-xs font-bold text-[#2C51A2] hover:text-[#1E3B78] flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <span>View All ({courses.length})</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {courses.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#64748B] bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                      No courses currently assigned to this learner.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {courses.slice(0, 3).map((c) => {
                        const isMandatory = c.course_type === 'certified';
                        const progress = Math.min(100, Math.max(0, parseFloat(c.progress_percentage || 0)));
                        return (
                          <div
                            key={c.id}
                            className="p-4 bg-[#FAFBFD] hover:bg-[#F1F5F9]/60 border border-[#E2E8F0] rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
                          >
                            {/* Course Title and Badges */}
                            <div className="space-y-1.5 min-w-[180px] max-w-sm">
                              <h4 className="text-xs font-bold text-[#172B4D] line-clamp-1">
                                {c.course_title}
                              </h4>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  isMandatory
                                    ? 'bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]'
                                    : 'bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]'
                                }`}>
                                  {isMandatory ? 'Mandatory' : 'Elective'}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  c.status === 'completed'
                                    ? 'bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]'
                                    : c.status === 'in_progress'
                                    ? 'bg-[#EFF6FF] text-[#2C51A2] border border-[#BFDBFE]'
                                    : c.status === 'overdue'
                                    ? 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]'
                                    : 'bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]'
                                }`}>
                                  {c.status === 'completed'
                                    ? 'Completed'
                                    : c.status === 'in_progress'
                                    ? 'In Progress'
                                    : c.status === 'overdue'
                                    ? 'Overdue'
                                    : 'Not Started'}
                                </span>
                              </div>
                            </div>

                            {/* Progress Bar & Percentage */}
                            <div className="flex items-center gap-3 flex-1 max-w-xs">
                              <div className="flex-1 bg-[#E2E8F0] h-2 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    c.status === 'completed' ? 'bg-[#15803D]' : 'bg-[#2C51A2]'
                                  }`}
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span className="font-mono text-xs font-bold text-[#172B4D] w-10 text-right">
                                {progress.toFixed(0)}%
                              </span>
                            </div>

                            {/* Due Date */}
                            <div className="text-xs font-semibold text-[#DC2626] flex items-center gap-1.5 shrink-0">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>Due: {formatDate(c.due_date)}</span>
                            </div>

                            {/* Action Button: Mark as Completed / Reset Completion */}
                            <div className="shrink-0">
                              {renderCourseActionButton(c)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Middle Row: Recent Assessments + Issued Certificates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Card 2A: Recent Assessments */}
                  <div className="clay-card p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-[#2C51A2]" />
                        <h3 className="text-sm font-bold text-[#172B4D]">
                          Recent Assessments
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveDrawer('assessments')}
                        className="text-xs font-bold text-[#2C51A2] hover:text-[#1E3B78] hover:underline cursor-pointer"
                      >
                        View All
                      </button>
                    </div>

                    {assessments.length === 0 ? (
                      <div className="p-6 text-center text-xs text-[#64748B] bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                        No assessments recorded for this learner.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {assessments.slice(0, 3).map((a, idx) => {
                          const isPassed = Boolean(a.is_passed) || a.is_passed === true || a.is_passed === 1 || a.is_passed === '1';
                          const hasScore = a.highest_score !== null && a.highest_score !== undefined;
                          return (
                            <div
                              key={a.id || idx}
                              className="p-3 bg-[#FAFBFD] border border-[#E2E8F0] rounded-xl flex items-center justify-between gap-3"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg shrink-0 ${
                                  isPassed ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-[#FEE2E2] text-[#DC2626]'
                                }`}>
                                  <FileCheck className="w-4 h-4" />
                                </div>
                                <div>
                                  <h4 className="text-xs font-bold text-[#172B4D] line-clamp-1">
                                    {a.title}
                                  </h4>
                                  <p className="text-[10px] text-[#64748B]">
                                    {formatDate(a.last_attempted_at || a.created_at)}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2.5 shrink-0">
                                <span className="font-mono text-xs font-bold text-[#172B4D]">
                                  {hasScore ? `${Math.round(a.highest_score)}%` : '—'}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  isPassed
                                    ? 'bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]'
                                    : 'bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]'
                                }`}>
                                  {isPassed ? 'Passed' : 'Failed'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Card 2B: Issued Certificates */}
                  <div className="clay-card p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-[#2C51A2]" />
                        <h3 className="text-sm font-bold text-[#172B4D]">
                          Issued Certificates
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveDrawer('certificates')}
                        className="text-xs font-bold text-[#2C51A2] hover:text-[#1E3B78] hover:underline cursor-pointer"
                      >
                        View All
                      </button>
                    </div>

                    {certificates.length === 0 ? (
                      <div className="p-6 text-center text-xs text-[#64748B] bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                        No certificates awarded to this learner yet.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {certificates.slice(0, 3).map((cert) => (
                          <div
                            key={cert.id}
                            className="p-3 bg-[#FAFBFD] border border-[#E2E8F0] rounded-xl flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-[#EFF6FF] text-[#2C51A2] shrink-0">
                                <Award className="w-4 h-4" />
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-[#172B4D] line-clamp-1">
                                  {cert.course_title}
                                </h4>
                                <p className="text-[10px] text-[#64748B]">
                                  Issued on {formatDate(cert.issued_at)}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => window.open('/verify-certificate/' + encodeURIComponent(cert.certificate_code), '_blank')}
                              className="text-[11px] font-bold text-[#2C51A2] hover:bg-[#EFF6FF] border border-[#2C51A2] px-3 py-1 rounded-lg transition-all shrink-0"
                            >
                              View Certificate
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card 3: Training Completion Timeline */}
                <div className="clay-card p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-[#2C51A2]" />
                      <h3 className="text-sm font-bold text-[#172B4D]">
                        Training Completion Timeline
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveDrawer('timeline')}
                      className="text-xs font-bold text-[#2C51A2] hover:text-[#1E3B78] hover:underline cursor-pointer"
                    >
                      View Full Timeline
                    </button>
                  </div>

                  {timeline.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[#64748B] bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                      No timeline events recorded yet.
                    </div>
                  ) : (
                    <div className="space-y-3 relative pl-4 border-l-2 border-[#E2E8F0] ml-2">
                      {timeline.slice(0, 5).map((item, idx) => (
                        <div key={idx} className="flex items-center gap-4 text-xs relative">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#2C51A2] -left-[21px] absolute" />
                          <span className="w-24 shrink-0 font-medium text-[#64748B]">
                            {item.date}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                            item.status === 'Completed' || item.status === 'Passed'
                              ? 'bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]'
                              : item.status === 'Failed'
                              ? 'bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]'
                              : 'bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]'
                          }`}>
                            {item.status}
                          </span>
                          <span className="font-bold text-[#172B4D] truncate">
                            {item.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: Assigned Courses Full View */}
            {dossierActiveTab === 'courses' && (
              <div className="space-y-4">
                <div className="clay-card p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-[#172B4D] uppercase tracking-wide">
                      Registered Training Programs ({courses.length})
                    </h3>
                    <p className="text-xs text-[#64748B]">
                      Track, complete, or reset course progress for this employee.
                    </p>
                  </div>

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
                      All ({courses.length})
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
                    No courses match the current filter.
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
                            {c.due_date && <span>Due Date: <strong>{formatDate(c.due_date)}</strong></span>}
                            {c.completed_at && <span>Completed On: <strong>{formatDate(c.completed_at)}</strong></span>}
                          </div>
                        </div>

                        {/* Admin Action Button */}
                        <div className="flex items-center gap-2 shrink-0 pt-1">
                          {renderCourseActionButton(c)}
                        </div>
                      </div>

                      {/* Progress Bar & Stats */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between text-xs font-semibold text-[#172B4D]">
                          <span>Curriculum Lessons: {c.completed_lessons || 0} of {c.total_lessons || 0} Complete</span>
                          <span className="font-mono text-[#2C51A2] font-bold">{parseFloat(c.progress_percentage || 0).toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-[#E2E8F0] h-2.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${c.status === 'completed' ? 'bg-[#1E3B78]' : 'bg-[#2C51A2]'}`}
                            style={{ width: `${Math.min(100, Math.max(0, parseFloat(c.progress_percentage || 0)))}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB CONTENT: Progress Timeline */}
            {dossierActiveTab === 'timeline' && (
              <div className="clay-card p-6 sm:p-7 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-6">
                <div>
                  <h3 className="text-base font-bold text-[#172B4D] uppercase tracking-wide">
                    Comprehensive Training Timeline
                  </h3>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Chronological milestone progress, course completions, and assessment records.
                  </p>
                </div>

                {timeline.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#64748B] bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                    No historical progress records found for this employee.
                  </div>
                ) : (
                  <div className="space-y-4 relative pl-6 border-l-2 border-[#2C51A2]/30 ml-3">
                    {timeline.map((item, idx) => (
                      <div key={idx} className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 bg-[#FAFBFD] border border-[#E2E8F0] rounded-xl">
                        <span className="w-3.5 h-3.5 rounded-full bg-[#2C51A2] border-2 border-white -left-[31px] absolute shadow-xs" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              item.status === 'Completed' || item.status === 'Passed'
                                ? 'bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]'
                                : item.status === 'Failed'
                                ? 'bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]'
                                : 'bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]'
                            }`}>
                              {item.status}
                            </span>
                            <span className="text-xs font-bold text-[#172B4D]">
                              {item.title}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-[#64748B] shrink-0">
                          {item.date}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: Assessments */}
            {dossierActiveTab === 'assessments' && (
              <div className="clay-card p-6 sm:p-7 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-6">
                <div>
                  <h3 className="text-base font-bold text-[#172B4D] uppercase tracking-wide">
                    Assessment Evaluations ({assessments.length})
                  </h3>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Formal quiz submissions, scores, and passing benchmarks.
                  </p>
                </div>

                {assessments.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#64748B] bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                    No assessments taken by this learner yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {assessments.map((a, idx) => {
                      const isPassed = Boolean(a.is_passed) || a.is_passed === true || a.is_passed === 1 || a.is_passed === '1';
                      return (
                        <div key={a.id || idx} className="p-4 bg-[#FAFBFD] border border-[#E2E8F0] rounded-xl space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#2C51A2] uppercase tracking-wider">
                              {a.course_title || 'General Assessment'}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isPassed
                                ? 'bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]'
                                : 'bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]'
                            }`}>
                              {isPassed ? 'Passed' : 'Failed'}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-[#172B4D]">
                            {a.title}
                          </h4>
                          <div className="grid grid-cols-2 gap-2 text-xs text-[#64748B] pt-2 border-t border-[#E2E8F0]">
                            <div>
                              <span>Highest Score: </span>
                              <strong className="font-mono text-[#172B4D]">{Math.round(a.highest_score || 0)}%</strong>
                            </div>
                            <div>
                              <span>Passing Mark: </span>
                              <strong className="font-mono text-[#172B4D]">{a.passing_percentage}%</strong>
                            </div>
                            <div>
                              <span>Questions: </span>
                              <strong className="text-[#172B4D]">{a.total_questions || 0}</strong>
                            </div>
                            <div>
                              <span>Attempt Date: </span>
                              <strong className="text-[#172B4D]">{formatDate(a.last_attempted_at)}</strong>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: Certificates */}
            {dossierActiveTab === 'certificates' && (
              <div className="clay-card p-6 sm:p-7 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-6">
                <div>
                  <h3 className="text-base font-bold text-[#172B4D] uppercase tracking-wide">
                    Awarded Certifications ({certificates.length})
                  </h3>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Official credentials issued upon completion of certified courses.
                  </p>
                </div>

                {certificates.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#64748B] bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                    No official credentials or certificates awarded to this employee yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {certificates.map((cert) => (
                      <div key={cert.id} className="p-5 bg-[#FAFBFD] border border-[#E2E8F0] rounded-xl space-y-3 border-l-4 border-[#2C51A2]">
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
                        <div className="flex items-center justify-between text-xs text-[#64748B] pt-2 border-t border-[#E2E8F0]">
                          <span>Issued: {formatDate(cert.issued_at)}</span>
                          <span>Score: <strong className="font-mono">{parseFloat(cert.final_score).toFixed(0)}%</strong></span>
                        </div>
                        <button
                          type="button"
                          onClick={() => window.open('/verify-certificate/' + encodeURIComponent(cert.certificate_code), '_blank')}
                          className="w-full text-center text-xs font-bold text-[#2C51A2] hover:bg-[#EFF6FF] border border-[#2C51A2] py-2 rounded-xl transition-all"
                        >
                          View Official Certificate
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Slide-over Side Drawer (Opens Half of the Display: w-full sm:w-1/2) Mounted via Body Portal */}
        {activeDrawer && createPortal(
          <div className="fixed inset-0 z-[100] overflow-hidden">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-[#0F172A]/50 backdrop-blur-xs transition-opacity"
              onClick={() => setActiveDrawer(null)}
            />

            {/* Drawer Container (50% Width) */}
            <div className="fixed inset-y-0 right-0 max-w-full flex">
              <div className="w-screen sm:w-[50vw] max-w-full bg-white shadow-2xl border-l border-[#E2E8F0] flex flex-col z-50">
                {/* Drawer Header */}
                <div className="p-6 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
                  <div>
                    <h3 className="text-base font-bold text-[#172B4D]">
                      {activeDrawer === 'courses' && `All Assigned Courses (${courses.length})`}
                      {activeDrawer === 'assessments' && `All Assessments (${assessments.length})`}
                      {activeDrawer === 'certificates' && `Issued Certificates (${certificates.length})`}
                      {activeDrawer === 'timeline' && `Comprehensive Training Timeline (${timeline.length})`}
                    </h3>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      {activeDrawer === 'courses' && 'Complete list of registered courses with management controls.'}
                      {activeDrawer === 'assessments' && 'Evaluation outcomes, test submissions, and scoring history.'}
                      {activeDrawer === 'certificates' && 'Official credentials and certification verification.'}
                      {activeDrawer === 'timeline' && 'Chronological milestone and audit record.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveDrawer(null)}
                    className="p-2 text-[#64748B] hover:text-[#172B4D] hover:bg-[#E2E8F0] rounded-xl transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Drawer Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {/* COURSES DRAWER */}
                  {activeDrawer === 'courses' && (
                    courses.length === 0 ? (
                      <div className="p-8 text-center text-xs text-[#64748B] bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                        No courses assigned to this learner.
                      </div>
                    ) : (
                      courses.map((c) => {
                        const progress = Math.min(100, Math.max(0, parseFloat(c.progress_percentage || 0)));
                        return (
                          <div key={c.id} className="p-5 bg-[#FAFBFD] border border-[#E2E8F0] rounded-xl space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[10px] font-bold uppercase tracking-wider bg-[#EFF6FF] text-[#2C51A2] px-2 py-0.5 rounded-full border border-[#BFDBFE]">
                                    {c.course_category || 'General'}
                                  </span>
                                  <Badge variant={c.course_type === 'certified' ? 'primary' : 'neutral'}>
                                    {c.course_type === 'certified' ? 'Certified' : 'Elective'}
                                  </Badge>
                                  <Badge variant={c.status === 'completed' ? 'success' : c.status === 'overdue' ? 'error' : c.status === 'in_progress' ? 'warning' : 'default'}>
                                    {c.status === 'completed' ? 'Completed' : c.status === 'in_progress' ? 'In Progress' : c.status === 'overdue' ? 'Overdue' : 'Not Started'}
                                  </Badge>
                                </div>
                                <h4 className="text-sm font-bold text-[#172B4D]">
                                  {c.course_title}
                                </h4>
                                {c.course_description && (
                                  <p className="text-xs text-[#64748B] line-clamp-2">
                                    {c.course_description}
                                  </p>
                                )}
                              </div>

                              <div className="shrink-0 pt-1">
                                {renderCourseActionButton(c)}
                              </div>
                            </div>

                            <div className="space-y-1.5 pt-1">
                              <div className="flex justify-between text-xs font-semibold text-[#172B4D]">
                                <span>Curriculum Lessons: {c.completed_lessons || 0} of {c.total_lessons || 0} Complete</span>
                                <span className="font-mono text-[#2C51A2] font-bold">{progress.toFixed(0)}%</span>
                              </div>
                              <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${c.status === 'completed' ? 'bg-[#15803D]' : 'bg-[#2C51A2]'}`}
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-xs text-[#64748B] pt-2 border-t border-[#E2E8F0]">
                              <span>Instructor: <strong>{c.instructor_name || 'Assigned Lead'}</strong></span>
                              {c.due_date && <span>Due: <strong>{formatDate(c.due_date)}</strong></span>}
                            </div>
                          </div>
                        );
                      })
                    )
                  )}

                  {/* ASSESSMENTS DRAWER */}
                  {activeDrawer === 'assessments' && (
                    assessments.length === 0 ? (
                      <div className="p-8 text-center text-xs text-[#64748B] bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                        No assessment attempts found.
                      </div>
                    ) : (
                      assessments.map((a, idx) => {
                        const isPassed = Boolean(a.is_passed) || a.is_passed === true || a.is_passed === 1 || a.is_passed === '1';
                        return (
                          <div key={a.id || idx} className="p-4 bg-[#FAFBFD] border border-[#E2E8F0] rounded-xl space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-[#2C51A2]">
                                {a.course_title || 'General Course'}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isPassed
                                  ? 'bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]'
                                  : 'bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]'
                              }`}>
                                {isPassed ? 'Passed' : 'Failed'}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-[#172B4D]">
                              {a.title}
                            </h4>
                            <div className="grid grid-cols-2 gap-2 text-xs text-[#64748B] pt-2 border-t border-[#E2E8F0]">
                              <div>Highest Score: <strong className="font-mono text-[#172B4D]">{Math.round(a.highest_score || 0)}%</strong></div>
                              <div>Passing Mark: <strong className="font-mono text-[#172B4D]">{a.passing_percentage}%</strong></div>
                              <div>Attempts: <strong className="text-[#172B4D]">{a.attempts_taken || 0}</strong></div>
                              <div>Attempted On: <strong className="text-[#172B4D]">{formatDate(a.last_attempted_at)}</strong></div>
                            </div>
                          </div>
                        );
                      })
                    )
                  )}

                  {/* CERTIFICATES DRAWER */}
                  {activeDrawer === 'certificates' && (
                    certificates.length === 0 ? (
                      <div className="p-8 text-center text-xs text-[#64748B] bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                        No issued certificates found.
                      </div>
                    ) : (
                      certificates.map((cert) => (
                        <div key={cert.id} className="p-5 bg-[#FAFBFD] border border-[#E2E8F0] rounded-xl space-y-3 border-l-4 border-[#2C51A2]">
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
                          <div className="flex items-center justify-between text-xs text-[#64748B] pt-2 border-t border-[#E2E8F0]">
                            <span>Issued: {formatDate(cert.issued_at)}</span>
                            <span>Score: <strong className="font-mono">{parseFloat(cert.final_score).toFixed(0)}%</strong></span>
                          </div>
                          <button
                            type="button"
                            onClick={() => window.open('/verify-certificate/' + encodeURIComponent(cert.certificate_code), '_blank')}
                            className="w-full text-center text-xs font-bold text-[#2C51A2] hover:bg-[#EFF6FF] border border-[#2C51A2] py-2 rounded-xl transition-all"
                          >
                            View Official Certificate
                          </button>
                        </div>
                      ))
                    )
                  )}

                  {/* TIMELINE DRAWER */}
                  {activeDrawer === 'timeline' && (
                    timeline.length === 0 ? (
                      <div className="p-8 text-center text-xs text-[#64748B] bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                        No timeline milestones found.
                      </div>
                    ) : (
                      <div className="space-y-4 relative pl-6 border-l-2 border-[#2C51A2]/30 ml-2">
                        {timeline.map((item, idx) => (
                          <div key={idx} className="relative p-3.5 bg-[#FAFBFD] border border-[#E2E8F0] rounded-xl flex items-center justify-between gap-3">
                            <span className="w-3 h-3 rounded-full bg-[#2C51A2] border-2 border-white -left-[31px] absolute" />
                            <div className="space-y-1">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                item.status === 'Completed' || item.status === 'Passed'
                                  ? 'bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]'
                                  : item.status === 'Failed'
                                  ? 'bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]'
                                  : 'bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]'
                              }`}>
                                {item.status}
                              </span>
                              <h5 className="text-xs font-bold text-[#172B4D]">
                                {item.title}
                              </h5>
                            </div>
                            <span className="text-xs font-semibold text-[#64748B] shrink-0">
                              {item.date}
                            </span>
                          </div>
                        ))}
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    );
  }

  if (viewMode === 'create' || viewMode === 'edit') {
    const isEdit = viewMode === 'edit';
    return (
      <div className="space-y-6">
        {/* Top Banner Header with Back Button */}
        <div data-aos="fade-down" className="clay-card p-6 sm:p-7 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#2C51A2] text-white px-2.5 py-0.5 rounded-full clay-pill">
                Admin Directory
              </span>
              <span className="text-xs text-[#64748B]">
                {isEdit ? 'Account Modification Page' : 'Create User Account Page'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#172B4D] uppercase tracking-wide mt-1.5">
              {isEdit ? `Edit Profile: ${editingUser?.first_name} ${editingUser?.last_name}` : 'Create User Account'}
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
        <div data-aos="fade-up" data-aos-delay="150" className="clay-card p-6 sm:p-8 rounded-2xl shadow-sm">
          <form onSubmit={handleSaveUser} className="space-y-5 w-full" autoComplete="off">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Sarah Jenkins"
                required
              />
              <Input
                label="Email Address"
                type="email"
                name="new_employee_email"
                autoComplete="off"
                placeholder="e.g. username@vdartinc.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Role"
                value={formData.role_id}
                onChange={(e) => {
                  const newRole = Number(e.target.value);
                  setFormData({
                    ...formData,
                    role_id: newRole,
                    learner_type: newRole === 3 ? (formData.learner_type || 'trainee') : null,
                    batch: newRole === 3 ? formData.batch : '',
                  });
                }}
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

            {/* Non-Learner Roles (Admin / Instructor): Direct Employee ID */}
            {Number(formData.role_id) !== 3 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Employee ID"
                  name="new_employee_id"
                  autoComplete="off"
                  placeholder="e.g. 12615"
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  required
                />
              </div>
            )}

            {/* Learner Specific Section: Learner Type, Trainee ID vs Employee ID, and Batch */}
            {Number(formData.role_id) === 3 && (
              <div className="p-4 sm:p-5 bg-[#EFF6FF]/60 border border-[#BFDBFE] rounded-xl space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select
                    label="Learner Type"
                    value={formData.learner_type || 'trainee'}
                    onChange={(e) => setFormData({
                      ...formData,
                      learner_type: e.target.value,
                      batch: e.target.value === 'recruiter' ? '' : formData.batch
                    })}
                    options={[
                      { value: 'trainee', label: 'Trainee' },
                      { value: 'recruiter', label: 'Recruiter' },
                    ]}
                    required
                  />

                  {formData.learner_type === 'recruiter' && (
                    <Input
                      label="Employee ID"
                      name="new_employee_id"
                      autoComplete="off"
                      placeholder="e.g. 12615"
                      value={formData.employee_id}
                      onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                      required
                    />
                  )}
                </div>

                {formData.learner_type === 'trainee' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Trainee ID"
                      name="new_trainee_id"
                      autoComplete="off"
                      placeholder="e.g. T0308"
                      value={formData.trainee_id || formData.employee_id}
                      onChange={(e) => setFormData({ ...formData, trainee_id: e.target.value, employee_id: e.target.value })}
                      required
                    />
                    <Input
                      label="Assigned Batch"
                      value={formData.batch}
                      onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
                      placeholder="e.g. FTP-B13-2026"
                      required
                    />
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Department"
                required
                value={formData.department || 'Recruitment'}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="Select Department"
                options={DEPARTMENT_OPTIONS}
              />
              <Input
                label="Designation / Title"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                placeholder={
                  Number(formData.role_id) === 3
                    ? formData.learner_type === 'trainee'
                      ? 'e.g. Graduate Trainee'
                      : 'e.g. Technical Recruiter'
                    : 'e.g. Lead Technical Trainer'
                }
              />
            </div>

            <div className="pt-5 border-t border-[#E2E8F0] flex items-center justify-end gap-3">
              <Button variant="secondary" size="md" type="button" onClick={() => setViewMode('list')}>
                Cancel
              </Button>
              <Button variant="primary" size="md" type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : editingUser ? 'Update Account' : 'Create User'}
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
      <div data-aos="fade-down" className="clay-card p-6 sm:p-7 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#2C51A2] text-white px-2.5 py-0.5 rounded-full clay-pill">
              Workforce Directory
            </span>
            <span className="text-xs text-[#64748B]">Directory & Sheet Sync</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#172B4D] uppercase tracking-wide mt-1.5">
            Learner & Employee Directory Governance
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5 max-w-2xl leading-relaxed">
            Manage corporate accounts, oversee Trainee and Recruiter batches, synchronize rosters with Google Sheets, and configure role authorizations.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            onClick={() => handleSyncGoogleSheets(directoryTab === 'trainees' ? 'trainees' : directoryTab === 'recruiters' ? 'recruiters' : null)}
            disabled={syncLoading}
          >
            {syncLoading ? 'Syncing...' : 'Sync Google Sheet'}
          </Button>
          <Button variant="primary" size="sm" icon={UserPlus} onClick={handleOpenCreateModal}>
            Create User
          </Button>
        </div>
      </div>

      {/* Directory Segregation Tabs */}
      <div data-aos="fade-up" data-aos-delay="100" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-2">
        <div className="flex items-center gap-1.5 p-1 bg-[#F1F5F9] rounded-xl border border-[#E2E8F0]/80">
          <button
            type="button"
            onClick={() => { setDirectoryTab('trainees'); setBatchFilter(''); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              directoryTab === 'trainees'
                ? 'bg-[#2C51A2] text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#172B4D] hover:bg-white/60'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Trainees</span>
            {directoryTab === 'trainees' && (
              <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                {users.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => { setDirectoryTab('recruiters'); setBatchFilter(''); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              directoryTab === 'recruiters'
                ? 'bg-[#2C51A2] text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#172B4D] hover:bg-white/60'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Recruiters</span>
            {directoryTab === 'recruiters' && (
              <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                {users.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => { setDirectoryTab('staff'); setBatchFilter(''); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              directoryTab === 'staff'
                ? 'bg-[#2C51A2] text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#172B4D] hover:bg-white/60'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Staff & Admins</span>
            {directoryTab === 'staff' && (
              <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                {users.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => { setDirectoryTab('all'); setBatchFilter(''); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              directoryTab === 'all'
                ? 'bg-[#2C51A2] text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#172B4D] hover:bg-white/60'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>All Directory</span>
            {directoryTab === 'all' && (
              <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                {users.length}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center text-xs text-[#64748B]">
          {configsList && configsList.length > 0 && (
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-none ${configsList[0]?.sync_status === 'error' ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'}`} />
              <span>
                Last Synced:{' '}
                <strong className="text-[#172B4D] font-mono">
                  {formatDateTime(activeSyncTimestamp)}
                </strong>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Sync Error Notice if applicable */}
      {configsList?.[0]?.sync_status === 'error' && configsList[0].sync_message && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-none flex items-start justify-between gap-3 text-xs text-rose-800">
          <div>
            <span className="font-bold block mb-1">Google Sheets Sync Notice:</span>
            <span>{syncStatus.configs[0].sync_message}</span>
          </div>
          <button
            type="button"
            onClick={() => handleSyncGoogleSheets()}
            disabled={syncLoading}
            className="shrink-0 px-3 py-1 bg-white border border-rose-300 hover:bg-rose-100 text-rose-800 font-bold rounded-none text-xs transition-all"
          >
            Retry Sync
          </button>
        </div>
      )}

      {/* KPI Cards Grid with Minimal Clay Elevation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: directoryTab === 'trainees' ? 'Total Trainees' : directoryTab === 'recruiters' ? 'Total Recruiters' : 'Total Accounts',
            value: users.length,
            sub: directoryTab === 'trainees' ? 'Active Trainee Roster' : directoryTab === 'recruiters' ? 'Recruiter Roster' : 'Registered Users',
            icon: directoryTab === 'trainees' ? GraduationCap : directoryTab === 'recruiters' ? Briefcase : Users,
            accent: 'border-t-4 border-[#2C51A2]'
          },
          {
            label: directoryTab === 'trainees' ? 'Active Trainees' : directoryTab === 'recruiters' ? 'Active Recruiters' : 'Instructors',
            value: directoryTab === 'trainees' || directoryTab === 'recruiters' ? users.filter((u) => u.status === 'active').length : instructorsCount,
            sub: directoryTab === 'trainees' || directoryTab === 'recruiters' ? 'Authorized Status' : 'Content Creators',
            icon: directoryTab === 'trainees' || directoryTab === 'recruiters' ? CheckCircle : Briefcase,
            accent: 'border-t-4 border-[#1E3B78]'
          },
          {
            label: directoryTab === 'trainees' ? 'Active Batches' : directoryTab === 'recruiters' ? 'In Training' : 'Learners',
            value: directoryTab === 'trainees' ? batchesList.length : directoryTab === 'recruiters' ? users.filter((u) => (u.assigned_courses_count || 0) > 0).length : learnersCount,
            sub: directoryTab === 'trainees' ? 'Distinct Batches' : directoryTab === 'recruiters' ? 'Enrolled in Courses' : 'Enrolled Users',
            icon: directoryTab === 'trainees' ? Layers : Shield,
            accent: 'border-t-4 border-[#2C51A2]'
          },
          {
            label: directoryTab === 'trainees' || directoryTab === 'recruiters' ? 'Certified Learners' : 'Active Accounts',
            value: directoryTab === 'trainees' || directoryTab === 'recruiters' ? users.filter((u) => (u.completed_courses_count || 0) > 0).length : activeCount,
            sub: directoryTab === 'trainees' || directoryTab === 'recruiters' ? 'Completed Courses' : 'Authorized Access',
            icon: CheckCircle,
            accent: 'border-t-4 border-[#D97706]'
          },
        ].map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              data-aos="fade-up"
              data-aos-delay={idx * 60}
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
                  {loading ? '—' : <AnimatedNumber value={kpi.value} />}
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
      <div data-aos="fade-up" data-aos-delay="200" className="clay-card p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto flex-1">
          {directoryTab === 'trainees' && (
            <div className="w-full sm:w-56">
              <Select
                value={batchFilter}
                onChange={(e) => setBatchFilter(e.target.value)}
                options={[
                  { value: '', label: 'All Batches' },
                  ...batchesList.map((b) => ({
                    value: b.batch,
                    label: `${b.batch} (${b.trainee_count || b.count || 0})`,
                  })),
                ]}
              />
            </div>
          )}

          {(directoryTab === 'staff' || directoryTab === 'all') && (
            <div className="w-full sm:w-48">
              <Select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                options={[
                  { value: '', label: 'All Roles' },
                  ...roles.map((r) => ({ value: r.id, label: r.display_name })),
                ]}
              />
            </div>
          )}

          <div className="w-full sm:w-48">
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
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="w-full sm:w-72">
            <Input
              placeholder={
                directoryTab === 'trainees'
                  ? 'Search by Trainee ID, name, email, batch...'
                  : directoryTab === 'recruiters'
                  ? 'Search by Employee ID, name, email...'
                  : 'Search by name, email, ID...'
              }
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
      <div data-aos="fade-up" data-aos-delay="250" className="clay-card rounded-2xl overflow-hidden">
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
                <th className="py-3.5 px-4 text-left">
                  {directoryTab === 'trainees' ? 'Trainee ID & Name' : 'Employee ID & Name'}
                </th>
                {directoryTab === 'trainees' ? (
                  <th className="py-3.5 px-4 text-center">Batch</th>
                ) : directoryTab === 'staff' || directoryTab === 'all' ? (
                  <th className="py-3.5 px-4 text-center">Role</th>
                ) : null}
                <th className="py-3.5 px-4 text-center">Department & Designation</th>
                <th className="py-3.5 px-4 text-center">Training Progress</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Last Activity</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]/70 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={directoryTab === 'recruiters' ? 6 : 7} className="py-12 text-center text-[#64748B]">
                    Loading directory...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={directoryTab === 'recruiters' ? 6 : 7} className="py-12 text-center text-[#64748B]">
                    No accounts found matching the criteria.
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
                        title="Click to view learning profile and details"
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
                              <span className="text-[10px] text-[#64748B] font-mono">
                                ({directoryTab === 'trainees' ? 'Trainee ID: ' : ''}{u.trainee_id || u.employee_id})
                              </span>
                            </div>
                            <div className="text-[11px] text-[#64748B] flex items-center gap-2">
                              <span>{u.email}</span>
                              {u.sync_source === 'google_sheet' && (
                                <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-mono">
                                  Sheet Synced
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {directoryTab === 'trainees' ? (
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-lg bg-[#EFF6FF] text-[#2C51A2] border border-[#BFDBFE]">
                            {u.batch || 'Unassigned'}
                          </span>
                        </td>
                      ) : directoryTab === 'staff' || directoryTab === 'all' ? (
                        <td className="py-3.5 px-4 text-center">
                          <Badge variant={roleName === 'admin' ? 'navy' : roleName === 'instructor' ? 'primary' : 'default'}>
                            {u.role_display_name || u.role}
                          </Badge>
                        </td>
                      ) : null}

                      <td className="py-3.5 px-4 text-center">
                        <div className="font-bold text-[#172B4D]">{u.designation || 'Unassigned'}</div>
                        <div className="text-[11px] text-[#64748B]">{u.department || 'General'}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {roleName === 'learner' || directoryTab === 'trainees' || directoryTab === 'recruiters' ? (
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
                        {u.last_login_at ? formatDate(u.last_login_at) : 'Never'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <ActionMenu
                          triggerTitle={`Actions for ${u.first_name} ${u.last_name}`}
                          items={[
                            {
                              label: 'View Details',
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
