import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AOS from 'aos';
import Sidebar from './Sidebar';
import Header from './Header';

const DashboardLayout = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const mainScrollRef = useRef(null);
  const scrollTimeoutRef = useRef(null);

  // Close mobile drawer and refresh AOS on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);

    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTop = 0;
    }

    const timer = setTimeout(() => {
      AOS.refreshHard();
    }, 100);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  const handleMainScroll = () => {
    if (scrollTimeoutRef.current) return;
    scrollTimeoutRef.current = setTimeout(() => {
      AOS.refresh();
      scrollTimeoutRef.current = null;
    }, 150);
  };

  const handleToggleSidebar = () => {
    if (window.innerWidth < 1024) {
      setIsMobileMenuOpen((prev) => !prev);
    } else {
      setIsSidebarCollapsed((prev) => !prev);
    }
  };

  return (
    <div className="flex h-screen bg-[#F3F6FB] overflow-hidden font-sans">
      {/* Mobile Drawer Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Role-tailored responsive sidebar */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area with fluid min-w-0 to prevent zoom blowout */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={handleToggleSidebar}
        />

        {/* Dynamic Page Content - Full Width Fluid Canvas */}
        <main
          ref={mainScrollRef}
          onScroll={handleMainScroll}
          className="flex-1 overflow-y-auto p-3.5 sm:p-5 lg:p-6 bg-[#F3F6FB] min-w-0 touch-scroll"
        >
          <div key={location.pathname} className="w-full min-w-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
