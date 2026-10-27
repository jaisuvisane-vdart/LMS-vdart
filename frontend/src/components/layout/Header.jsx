import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, Bell, User as UserIcon, ShieldCheck, IdCard, Check, CheckCheck, Menu } from 'lucide-react';
import Badge from '../common/Badge';
import notificationService from '../../services/notificationService';

const Header = ({ onToggleSidebar, isSidebarCollapsed }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await notificationService.getNotifications(false);
      if (res.status === 'success') {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unread_count || 0);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000); // 30s poll
      return () => clearInterval(interval);
    }
  }, [user]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await notificationService.markRead(id);
      fetchNotifications();
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllRead();
      fetchNotifications();
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const getRoleBadgeVariant = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'primary';
      case 'instructor':
        return 'navy';
      case 'learner':
        return 'primary';
      default:
        return 'default';
    }
  };

  return (
    <header 
      className="h-16 border-b border-[#E2E8F0] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 shrink-0"
      style={{
        background: 'linear-gradient(180deg, #FFFFFF 0%, #F9FBFE 100%)',
        boxShadow: '0 4px 12px -2px rgba(30, 59, 120, 0.04), inset 0 1px 0 rgba(255, 255, 255, 1)'
      }}
    >
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="text-[#64748B] hover:text-[#2C51A2] p-2 rounded-xl hover:bg-[#EFF6FF] active:translate-y-0.5 transition-all focus:outline-none"
          title="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[#64748B] block truncate">
            Organization Portal
          </span>
          <h2 className="text-xs sm:text-sm font-bold text-[#2C51A2] leading-none mt-0.5 truncate">
            {user?.department || 'Employee Learning Management System'}
          </h2>
        </div>

        {/* Administrator Master Perspective Switcher */}
        {user?.role === 'admin' && (
          <div className="hidden md:flex items-center p-1 bg-[#F1F5F9] rounded-xl border border-[#CBD5E1]/60 shadow-xs ml-2">
            <button
              onClick={() => navigate('/admin/dashboard')}
              className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                location.pathname.startsWith('/admin')
                  ? 'bg-[#1E3B78] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#1E3B78]'
              }`}
            >
              Admin View
            </button>
            <button
              onClick={() => navigate('/instructor/dashboard')}
              className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                location.pathname.startsWith('/instructor')
                  ? 'bg-[#1E3B78] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#1E3B78]'
              }`}
            >
              Instructor Studio
            </button>
            <button
              onClick={() => navigate('/learner/dashboard')}
              className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                location.pathname.startsWith('/learner')
                  ? 'bg-[#1E3B78] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#1E3B78]'
              }`}
            >
              Learner Experience
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* Interactive Notification Bell & Popover */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="relative p-2 text-[#64748B] hover:text-[#2C51A2] hover:bg-[#EFF6FF] rounded-xl active:translate-y-0.5 transition-all focus:outline-none"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span 
                className="absolute top-1 right-1 bg-[#DC2626] text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded-full leading-tight"
                style={{
                  boxShadow: '0 2px 4px rgba(220, 38, 38, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.5)'
                }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-2 w-72 sm:w-88 md:w-96 clay-modal rounded-2xl z-50 overflow-hidden animate-in fade-in duration-150 border border-[#CBD5E1] shadow-2xl">
              {/* Popover Header */}
              <div 
                className="px-5 py-3.5 text-white flex items-center justify-between"
                style={{
                  background: 'linear-gradient(160deg, #325bb5 0%, #1E3B78 100%)',
                  boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.3)'
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider">System Alerts</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-bold bg-[#DC2626] text-white px-2 py-0.5 rounded-full clay-pill">
                      {unreadCount} Unread
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] font-semibold text-[#E2E9F4] hover:text-white flex items-center gap-1 active:translate-y-0.5 focus:outline-none"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              {/* Popover List */}
              <div className="p-2 space-y-1.5 max-h-80 overflow-y-auto touch-scroll">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#64748B]">
                    No notifications recorded.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleMarkAsRead(n.id)}
                      className={`p-3 text-xs rounded-xl border transition-all cursor-pointer ${
                        n.is_read == 0
                          ? 'bg-[#EFF6FF] border-[#BFDBFE] hover:border-[#2C51A2]'
                          : 'bg-white border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className={`font-bold ${n.is_read == 0 ? 'text-[#2C51A2]' : 'text-[#172B4D]'}`}>
                          {n.title}
                        </span>
                        <span className="text-[10px] text-[#64748B] shrink-0 font-mono">{n.created_at?.slice(0, 16)}</span>
                      </div>
                      <p className="text-[11px] text-[#64748B] mt-1 line-clamp-2">
                        {n.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Identity Display */}
        <div className="flex items-center gap-3">
          {/* Dual-layer halo avatar with online active dot */}
          <div className="relative shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full p-[2px] bg-gradient-to-tr from-blue-300 via-blue-100 to-blue-200 shadow-xs flex items-center justify-center">
              <div
                className="w-full h-full rounded-full text-white flex items-center justify-center font-extrabold text-xs shadow-inner"
                style={{
                  background: 'linear-gradient(145deg, #2563EB 0%, #1D4ED8 50%, #1E3B78 100%)',
                  boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.4)',
                }}
              >
                {user?.first_name?.charAt(0)}{user?.last_name?.charAt(0)}
              </div>
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-[#10B981] rounded-full ring-2 ring-white shadow-xs"></span>
          </div>

          {/* Name & Shielded Role Badge */}
          <div className="hidden md:block text-left">
            <div className="text-xs sm:text-sm font-bold text-[#172B4D] leading-tight">
              {user?.first_name} {user?.last_name}
            </div>
            <div className="mt-1">
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white shadow-xs">
                <ShieldCheck className="w-3 h-3 text-white shrink-0" />
                <span className="text-[10px] font-extrabold tracking-wider uppercase">
                  {(user?.role_display_name || (user?.role === 'admin' ? 'ADMIN' : user?.role) || 'USER').toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Subtle Vertical Divider */}
        <div className="h-6 w-px bg-[#E2E8F0] hidden sm:block mx-1"></div>

        {/* Dedicated Employee ID Pill Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#E2E8F0] bg-white/90 shadow-xs text-xs">
          <IdCard className="w-4 h-4 text-[#2C51A2] shrink-0" />
          <span className="font-semibold text-[#172B4D] font-mono text-xs tracking-wide">
            {user?.employee_id || 'EMP001'}
          </span>
        </div>

        {/* Rounded Logout Pill Button */}
        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-xs font-bold text-[#2C51A2] hover:text-[#DC2626] px-3.5 py-1.5 rounded-full border border-blue-100 hover:border-red-200 bg-white/90 hover:bg-red-50 shadow-xs active:translate-y-0.5 transition-all cursor-pointer"
          title="Sign out of LMS"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
