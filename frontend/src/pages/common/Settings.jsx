import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import userService from '../../services/userService';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Badge from '../../components/common/Badge';
import {
  User,
  Shield,
  Bell,
  CheckCircle,
  AlertCircle,
  KeyRound,
  Building,
  Briefcase,
  Mail,
  Phone
} from 'lucide-react';

const Settings = () => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'security' | 'notifications'
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Profile Form State
  const [profileData, setProfileData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    employee_id: user?.employee_id || '',
    department: user?.department || '',
    designation: user?.designation || '',
    phone: user?.phone || '',
  });

  // Password Form State
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  // Notification Preferences
  const [notifications, setNotifications] = useState({
    course_assignments: true,
    assessment_results: true,
    system_announcements: true,
    deadline_reminders: true,
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        employee_id: user.employee_id || '',
        department: user.department || '',
        designation: user.designation || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');
    setLoading(true);

    try {
      const res = await userService.updateProfile({
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        phone: profileData.phone,
      });

      if (res.status === 'success') {
        setSuccessMessage('Profile details updated successfully.');
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');

    if (passwordData.new_password !== passwordData.confirm_password) {
      setErrorMessage('New password and confirmation do not match.');
      return;
    }

    if (passwordData.new_password.length < 6) {
      setErrorMessage('New password must contain at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      const res = await userService.updateProfile({
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });

      if (res.status === 'success') {
        setSuccessMessage('Account password updated successfully.');
        setPasswordData({
          current_password: '',
          new_password: '',
          confirm_password: '',
        });
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile Information', icon: User },
    { id: 'security', label: 'Security & Password', icon: KeyRound },
    { id: 'notifications', label: 'Notification Alerts', icon: Bell },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner with Minimal Clay Surface */}
      <div data-aos="fade-down" className="clay-card p-6 sm:p-7 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#2C51A2] text-white px-2.5 py-0.5 rounded-full clay-pill">
              System Settings
            </span>
            <span className="text-xs text-[#64748B]">Personal & Enterprise Configuration</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#172B4D] uppercase tracking-wide mt-1.5">
            Account Preferences & Security
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5 max-w-2xl leading-relaxed">
            Manage your personal profile, secure credentials, and notification alerts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="primary" size="md">
            Role: {user?.role_display_name || user?.role}
          </Badge>
        </div>
      </div>

      {/* Alert Messages */}
      {successMessage && (
        <div 
          className="p-4 bg-[#E2E9F4] border border-[#BFDBFE] text-[#2C51A2] rounded-2xl text-xs font-bold flex items-center gap-2.5"
          style={{
            boxShadow: '0 4px 12px -2px rgba(22, 101, 52, 0.1), inset 0 1px 1px rgba(255, 255, 255, 0.8)'
          }}
        >
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div 
          className="p-4 bg-[#FEE2E2] border border-[#FCA5A5] text-[#DC2626] rounded-2xl text-xs font-bold flex items-center gap-2.5"
          style={{
            boxShadow: '0 4px 12px -2px rgba(220, 38, 38, 0.1), inset 0 1px 1px rgba(255, 255, 255, 0.8)'
          }}
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Settings Grid: Left Tabs, Right Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Navigation Tabs */}
        <div data-aos="fade-right" data-aos-delay="100" className="lg:col-span-1 space-y-1.5 clay-card p-3 rounded-2xl">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSuccessMessage('');
                  setErrorMessage('');
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all duration-150 text-left ${
                  isActive
                    ? 'clay-btn-primary'
                    : 'text-[#64748B] hover:bg-[#EFF6FF] hover:text-[#2C51A2] active:translate-y-0.5'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#2C51A2]'}`} />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Panel */}
        <div data-aos="fade-left" data-aos-delay="100" className="lg:col-span-3">
          {/* Tab 1: Profile Information */}
          {activeTab === 'profile' && (
            <Card title="Personal Information" subtitle="Update your employee profile and communication contact details">
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="First Name"
                    value={profileData.first_name}
                    onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                    required
                  />
                  <Input
                    label="Last Name"
                    value={profileData.last_name}
                    onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Corporate Email"
                    value={profileData.email}
                    disabled
                    helperText="Corporate email address is managed by system administrator."
                    icon={Mail}
                  />
                  <Input
                    label="Employee Identifier"
                    value={profileData.employee_id}
                    disabled
                    helperText="Fixed corporate identifier."
                    icon={Shield}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Assigned Department"
                    value={profileData.department}
                    disabled
                    icon={Building}
                  />
                  <Input
                    label="Corporate Designation"
                    value={profileData.designation}
                    disabled
                    icon={Briefcase}
                  />
                </div>

                <Input
                  label="Contact Phone"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  icon={Phone}
                />

                <div className="pt-2 flex justify-end">
                  <Button type="submit" variant="primary" loading={loading}>
                    Save Changes
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Tab 2: Security & Password */}
          {activeTab === 'security' && (
            <Card title="Security Credentials" subtitle="Update your authentication password to maintain platform safety">
              <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-lg">
                <Input
                  label="Current Password"
                  type="password"
                  value={passwordData.current_password}
                  onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                  required
                  placeholder="Enter current password"
                />

                <Input
                  label="New Password"
                  type="password"
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                  required
                  placeholder="Minimum 6 characters"
                />

                <Input
                  label="Confirm New Password"
                  type="password"
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                  required
                  placeholder="Re-enter new password"
                />

                <div className="pt-2 flex justify-start">
                  <Button type="submit" variant="navy" loading={loading}>
                    Update Password
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Tab 3: Notification Alerts */}
          {activeTab === 'notifications' && (
            <Card title="Notification Preferences" subtitle="Manage when you receive automated system emails and in-app alerts">
              <div className="space-y-4 divide-y divide-[#E2E8F0]">
                <div className="pt-3 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-[#172B4D]">New Course Assignments</h4>
                    <p className="text-xs text-[#64748B]">Receive notifications when an instructor assigns a curriculum</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.course_assignments}
                    onChange={(e) => setNotifications({ ...notifications, course_assignments: e.target.checked })}
                    className="w-4 h-4 accent-[#2C51A2] cursor-pointer"
                  />
                </div>

                <div className="pt-3 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-[#172B4D]">Assessment Results & Certificates</h4>
                    <p className="text-xs text-[#64748B]">Receive instant alerts when exam scorecards and certificates are issued</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.assessment_results}
                    onChange={(e) => setNotifications({ ...notifications, assessment_results: e.target.checked })}
                    className="w-4 h-4 accent-[#2C51A2] cursor-pointer"
                  />
                </div>

                <div className="pt-3 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-[#172B4D]">Upcoming Deadline Reminders</h4>
                    <p className="text-xs text-[#64748B]">Automated alerts 7 days and 48 hours prior to course completion due dates</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.deadline_reminders}
                    onChange={(e) => setNotifications({ ...notifications, deadline_reminders: e.target.checked })}
                    className="w-4 h-4 accent-[#2C51A2] cursor-pointer"
                  />
                </div>

                <div className="pt-3 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-[#172B4D]">System Announcements</h4>
                    <p className="text-xs text-[#64748B]">Platform updates and security advisories from system administrators</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.system_announcements}
                    onChange={(e) => setNotifications({ ...notifications, system_announcements: e.target.checked })}
                    className="w-4 h-4 accent-[#2C51A2] cursor-pointer"
                  />
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
