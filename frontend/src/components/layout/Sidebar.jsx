import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutGrid,
  Users,
  BookOpen,
  FileCheck,
  PieChart,
  Activity,
  Award,
  Settings,
  X,
  LogOut
} from 'lucide-react';
import vdartLogo from '../../assets/VDart_Logobg.png';

const ITEM_HEIGHT = 44; // w-11 height in px (2.75rem = 44px)
const SLOT_GAP = 8; // space-y-2 gap in px (0.5rem = 8px)
const PADDING_TOP = 6; // py-1.5 top padding in px

const Sidebar = ({ isCollapsed, isMobileOpen, onCloseMobile }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const navItems = {
    admin: [
      { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutGrid },
      { name: 'User Directory', path: '/admin/users', icon: Users },
      { name: 'Course Catalog', path: '/admin/courses', icon: BookOpen },
      { name: 'Reports & Analytics', path: '/admin/reports', icon: PieChart },
      { name: 'System Audit Logs', path: '/admin/audit', icon: Activity },
      { name: 'Portal Settings', path: '/admin/settings', icon: Settings },
    ],
    instructor: [
      { name: 'Instructor Dashboard', path: '/instructor/dashboard', icon: LayoutGrid },
      { name: 'My Created Courses', path: '/instructor/courses', icon: BookOpen },
      { name: 'Trainee Assignments', path: '/instructor/assignments', icon: Users },
      { name: 'Trainee Performance', path: '/instructor/performance', icon: Activity },
      { name: 'Portal Settings', path: '/instructor/settings', icon: Settings },
    ],
    learner: [
      { name: 'My Learning Dashboard', path: '/learner/dashboard', icon: LayoutGrid },
      { name: 'Assigned Courses', path: '/learner/courses', icon: BookOpen },
      { name: 'Assessments', path: '/learner/assessments', icon: FileCheck },
      { name: 'My Certificates', path: '/learner/certificates', icon: Award },
      { name: 'Account Settings', path: '/learner/settings', icon: Settings },
    ],
  };

  // Master Admin Context: Dynamically project navigation according to active portal section
  let currentNav = navItems[user?.role] || navItems.learner;
  if (user?.role === 'admin') {
    if (location.pathname.startsWith('/instructor')) {
      currentNav = navItems.instructor;
    } else if (location.pathname.startsWith('/learner')) {
      currentNav = navItems.learner;
    } else {
      currentNav = navItems.admin;
    }
  }

  // Determine active item index for animated sliding tile
  const activeIndex = currentNav.findIndex((item) => {
    if (location.pathname === item.path) return true;
    if (item.path !== '/' && location.pathname.startsWith(item.path + '/')) return true;
    return false;
  });

  return (
    <aside
      className={`text-white flex flex-col items-center select-none shrink-0 border-r border-[#E2E8F0] shadow-sm bg-white/95 backdrop-blur-md transition-all duration-300 z-40 ${
        isMobileOpen
          ? 'fixed inset-y-0 left-0 translate-x-0 shadow-2xl w-[84px]'
          : 'fixed -translate-x-full lg:static lg:translate-x-0'
      } ${isCollapsed ? 'lg:w-0 lg:overflow-hidden lg:border-r-0 lg:opacity-0' : 'lg:w-[84px] lg:opacity-100'}`}
    >
      {/* Brand Header / Mobile Close */}
      <div className="pt-4 pb-3 flex flex-col items-center gap-2 shrink-0">
        <div 
          className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1.5 shadow-md shadow-slate-200 border border-slate-100 transition-transform duration-200 hover:scale-105"
        >
          <img src={vdartLogo} alt="VDart" className="w-full h-full object-contain" />
        </div>

        {isMobileOpen && (
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-[#64748B] hover:text-[#172B4D] rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Aerodynamic Custom Silhouette Dock Container */}
      <div className="flex-1 flex flex-col justify-center items-center py-2 w-full">
        <div className="relative aerodynamic-dock-shadow flex flex-col items-center select-none">
          {/* Top Chamfer Cap (SVG with C1-continuous fillet) */}
          <svg
            width="68"
            height="46"
            viewBox="0 0 68 46"
            className="w-[68px] h-[46px] block shrink-0"
            style={{ shapeRendering: 'geometricPrecision' }}
          >
            <defs>
              <linearGradient id="dock-grad-top" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2277CF" />
                <stop offset="100%" stopColor="#1E6EC4" />
              </linearGradient>
            </defs>
            <path d="M 0 0 L 52 28 Q 68 36 68 46 L 0 46 Z" fill="url(#dock-grad-top)" />
          </svg>

          {/* Middle Body with Navigation Items & Sliding Indicator */}
          <div
            className="w-[68px] flex flex-col items-center relative py-1.5"
            style={{
              background: 'linear-gradient(180deg, #1E6EC4 0%, #1754B4 100%)',
            }}
          >
            {/* Sliding Active White Tile Indicator */}
            {activeIndex !== -1 && (
              <div
                className="absolute left-1/2 -translate-x-1/2 w-11 h-11 bg-white rounded-2xl pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] z-0"
                style={{
                  transform: `translate(-50%, ${activeIndex * (ITEM_HEIGHT + SLOT_GAP) + PADDING_TOP}px) ${
                    hoveredIndex === activeIndex ? 'scale(1.16) translateX(2px)' : 'scale(1)'
                  }`,
                  boxShadow:
                    hoveredIndex === activeIndex
                      ? '0 10px 24px rgba(0, 0, 0, 0.22), inset 0 1px 1px rgba(255, 255, 255, 1)'
                      : '0 6px 16px rgba(0, 0, 0, 0.18), inset 0 1px 1px rgba(255, 255, 255, 0.95)',
                }}
              />
            )}

            {/* Navigation Item Stack */}
            <nav className="flex flex-col items-center relative z-10 space-y-2">
              {currentNav.map((item, idx) => {
                const Icon = item.icon;
                const isActive = idx === activeIndex;

                return (
                  <div
                    key={item.path}
                    className="relative group flex items-center justify-center z-10 hover:z-40"
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    <NavLink
                      to={item.path}
                      onClick={() => {
                        if (isMobileOpen && onCloseMobile) {
                          onCloseMobile();
                        }
                      }}
                      className="dock-item-zoom relative w-11 h-11 rounded-2xl flex items-center justify-center focus:outline-none active:scale-95 cursor-pointer"
                    >
                      {/* Translucent Hover Backdrop for Inactive Items */}
                      {!isActive && (
                        <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 group-hover:opacity-100 group-hover:scale-110 backdrop-blur-xs transition-all duration-200 pointer-events-none shadow-[0_0_15px_rgba(255,255,255,0.35)]" />
                      )}

                      {/* Icon with Active Color Shift */}
                      <Icon
                        className={`w-5 h-5 transition-all duration-200 ${
                          isActive
                            ? 'text-[#1E6EC4] scale-105'
                            : 'text-white/90 group-hover:text-white'
                        }`}
                        strokeWidth={isActive ? 2.3 : 1.9}
                      />
                    </NavLink>

                    {/* Floating Page Name Pill (Zoom-In & Slide Entrance on Hover) */}
                    <div className="absolute left-full ml-3 px-3.5 py-1.5 bg-[#0E2042] text-white text-xs font-bold rounded-xl shadow-2xl border border-white/20 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200 z-50 flex items-center gap-1 group-hover:animate-pagename-zoom select-none">
                      {/* Directional Pointer Arrow Notch */}
                      <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-[#0E2042]" />
                      <span className="tracking-wide text-white">{item.name}</span>
                    </div>
                  </div>
                );
              })}
            </nav>
          </div>

          {/* Bottom Chamfer Cap (SVG with C1-continuous fillet) */}
          <svg
            width="68"
            height="46"
            viewBox="0 0 68 46"
            className="w-[68px] h-[46px] block shrink-0"
            style={{ shapeRendering: 'geometricPrecision' }}
          >
            <defs>
              <linearGradient id="dock-grad-bottom" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1754B4" />
                <stop offset="100%" stopColor="#124190" />
              </linearGradient>
            </defs>
            <path d="M 0 0 L 68 0 L 68 8 Q 68 18 52 26 L 0 46 Z" fill="url(#dock-grad-bottom)" />
          </svg>
        </div>
      </div>

      {/* Footer Profile / Logout Quick Action */}
      <div className="pb-4 pt-2 flex flex-col items-center gap-2 shrink-0">
        <div className="relative group z-10 hover:z-40">
          <button
            onClick={logout}
            className="dock-item-zoom w-10 h-10 rounded-xl bg-slate-50 hover:bg-red-50 text-[#64748B] hover:text-[#DC2626] border border-[#CBD5E1] flex items-center justify-center transition-all duration-200 active:scale-95 shadow-xs focus:outline-none cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>

          {/* Logout Floating Page Name Pill */}
          <div className="absolute left-full ml-3 px-3.5 py-1.5 bg-[#0E2042] text-white text-xs font-bold rounded-xl shadow-2xl border border-white/20 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200 z-50 flex items-center group-hover:animate-pagename-zoom select-none">
            <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-[#0E2042]" />
            <span className="tracking-wide text-white">Sign Out ({user?.first_name || 'Account'})</span>
          </div>
        </div>

        <div className="text-[9px] font-mono text-[#94A3B8] font-bold uppercase tracking-widest text-center">
          {user?.role === 'admin'
            ? location.pathname.startsWith('/instructor')
              ? 'STUDIO'
              : location.pathname.startsWith('/learner')
              ? 'LEARNER'
              : 'ADMIN'
            : 'LMS'}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
