import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Role-Based Route Guard
 * Enforces authentication and matches current user's role against permitted roles
 */
const RoleGuard = ({ allowedRoles = [], children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F3F6FB]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#2C51A2] border-t-transparent animate-spin mx-auto mb-4"></div>
          <p className="text-sm font-medium text-[#64748B]">Authenticating session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0) {
    const userRole = (user.role || '').toLowerCase();
    const normalizedAllowed = allowedRoles.map((r) => r.toLowerCase());

    // Admin has master access across all instructor and learner portals
    if (userRole === 'admin') {
      return children;
    }

    if (!normalizedAllowed.includes(userRole)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children;
};

export default RoleGuard;
