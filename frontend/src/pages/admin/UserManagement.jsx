import React, { useEffect, useState } from 'react';
import { useDialog } from '../../contexts/DialogContext';
import userService from '../../services/userService';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Pagination from '../../components/common/Pagination';
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
  ArrowLeft
} from 'lucide-react';

const UserManagement = () => {
  const { showAlert, showConfirm } = useDialog();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

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
    password: '',
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
      employee_id: `VD-${Math.floor(1000 + Math.random() * 9000)}`,
      first_name: '',
      last_name: '',
      email: '',
      password: '',
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
      employee_id: user.employee_id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      password: '',
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

  // Metrics
  const totalEmployees = users.length;
  const instructorsCount = users.filter((u) => u.role === 'instructor').length;
  const learnersCount = users.filter((u) => u.role === 'learner').length;
  const activeCount = users.filter((u) => u.status === 'active').length;

  if (viewMode !== 'list') {
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
          <form onSubmit={handleSaveUser} className="space-y-5 max-w-3xl">
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
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              <Input
                label="Employee ID"
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
              <Input
                label={editingUser ? 'Reset Password (Leave blank to keep unchanged)' : 'Initial Password'}
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required={!editingUser}
                placeholder={editingUser ? 'Unchanged' : 'Minimum 8 characters'}
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
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr 
                className="text-white text-[11px] font-bold uppercase tracking-wider"
                style={{
                  background: 'linear-gradient(160deg, #1E3B78 0%, #2C51A2 100%)',
                  boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.2)'
                }}
              >
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Department & Designation</th>
                <th className="py-3.5 px-4">Phone</th>
                <th className="py-3.5 px-4 text-center">Training Progress</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4">Last Activity</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
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
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-8 h-8 rounded-full text-white flex items-center justify-center font-bold text-xs shrink-0"
                            style={{
                              background: 'linear-gradient(160deg, #23458B 0%, #1E3B78 100%)',
                              boxShadow: '0 2px 5px rgba(44, 81, 162, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.4)'
                            }}
                          >
                            {u.first_name[0]}{u.last_name[0]}
                          </div>
                          <div>
                            <div className="font-bold text-[#172B4D] flex items-center gap-2">
                              <span>{u.first_name} {u.last_name}</span>
                              <span className="text-[10px] text-[#64748B] font-mono">({u.employee_id})</span>
                            </div>
                            <div className="text-[11px] text-[#64748B]">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant={roleName === 'admin' ? 'navy' : roleName === 'instructor' ? 'primary' : 'default'}>
                          {u.role_display_name || u.role}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#172B4D]">{u.designation || 'Unassigned'}</div>
                        <div className="text-[11px] text-[#64748B]">{u.department || 'General'}</div>
                      </td>
                      <td className="py-3.5 px-4 text-[#64748B] font-mono">
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
                      <td className="py-3.5 px-4 text-[#64748B] text-[11px] font-mono">
                        {u.last_login_at || 'Never'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={Edit}
                            onClick={() => handleOpenEditModal(u)}
                            title="Edit User"
                          >
                            Edit
                          </Button>
                          <Button
                            variant={u.status === 'active' ? 'danger' : 'secondary'}
                            size="sm"
                            icon={Power}
                            onClick={() => handleToggleStatus(u)}
                            title={u.status === 'active' ? 'Deactivate Account' : 'Activate Account'}
                          >
                            {u.status === 'active' ? 'Deactivate' : 'Activate'}
                          </Button>
                        </div>
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
