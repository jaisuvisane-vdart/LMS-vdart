import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

import LoginPage from '../pages/auth/LoginPage';
import UnauthorizedPage from '../pages/common/UnauthorizedPage';

import DashboardLayout from '../components/layout/DashboardLayout';
import RoleGuard from './RoleGuard';
import ErrorBoundary from '../components/common/ErrorBoundary';

import AdminDashboard from '../pages/admin/AdminDashboard';
import AllCourses from '../pages/admin/AllCourses';
import UserManagement from '../pages/admin/UserManagement';
import ReportsAnalytics from '../pages/admin/ReportsAnalytics';
import AuditLogs from '../pages/admin/AuditLogs';
import InstructorDashboard from '../pages/instructor/InstructorDashboard';
import InstructorCourses from '../pages/instructor/InstructorCourses';
import CourseAssignments from '../pages/instructor/CourseAssignments';
import TraineePerformance from '../pages/instructor/TraineePerformance';
import LearnerDashboard from '../pages/learner/LearnerDashboard';
import LearnerCatalog from '../pages/learner/LearnerCatalog';
import LearnerCourses from '../pages/learner/LearnerCourses';
import CoursePlayer from '../pages/learner/CoursePlayer';
import LearnerAssessments from '../pages/learner/LearnerAssessments';
import ExamRunner from '../pages/learner/ExamRunner';
import AssessmentResult from '../pages/learner/AssessmentResult';
import LearnerCertificates from '../pages/learner/LearnerCertificates';
import CertificateViewer from '../pages/learner/CertificateViewer';
import VerifyCertificate from '../pages/common/VerifyCertificate';
import Settings from '../pages/common/Settings';

const RootRedirect = () => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) return null;
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;

  const role = (user.role || '').toLowerCase();
  if (role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  if (role === 'instructor') return <Navigate to="/instructor/dashboard" replace />;
  return <Navigate to="/learner/dashboard" replace />;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Authentication & Verification Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/verify-certificate" element={<VerifyCertificate />} />
      <Route path="/verify-certificate/:code" element={<VerifyCertificate />} />

      {/* Root Dynamic Redirect */}
      <Route path="/" element={<RootRedirect />} />

      {/* Admin Protected Routes */}
      <Route
        path="/admin"
        element={
          <RoleGuard allowedRoles={['admin']}>
            <DashboardLayout />
          </RoleGuard>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="users" element={<ErrorBoundary><UserManagement /></ErrorBoundary>} />
        <Route path="courses" element={<AllCourses />} />
        <Route path="assignments" element={<CourseAssignments />} />
        <Route path="reports" element={<ReportsAnalytics />} />
        <Route path="audit-logs" element={<AuditLogs />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Instructor Protected Routes */}
      <Route
        path="/instructor"
        element={
          <RoleGuard allowedRoles={['instructor', 'admin']}>
            <DashboardLayout />
          </RoleGuard>
        }
      >
        <Route index element={<Navigate to="/instructor/dashboard" replace />} />
        <Route path="dashboard" element={<InstructorDashboard />} />
        <Route path="courses" element={<InstructorCourses />} />
        <Route path="course-builder" element={<Navigate to="/instructor/courses" replace />} />
        <Route path="assignments" element={<CourseAssignments />} />
        <Route path="assessments" element={<Navigate to="/instructor/courses" replace />} />
        <Route path="performance" element={<TraineePerformance />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Learner Protected Routes */}
      <Route
        path="/learner"
        element={
          <RoleGuard allowedRoles={['learner', 'instructor', 'admin']}>
            <DashboardLayout />
          </RoleGuard>
        }
      >
        <Route index element={<Navigate to="/learner/dashboard" replace />} />
        <Route path="dashboard" element={<LearnerDashboard />} />
        <Route path="catalog" element={<LearnerCatalog />} />
        <Route path="courses" element={<LearnerCourses />} />
        <Route path="courses/:courseId" element={<CoursePlayer />} />
        <Route path="assessments" element={<LearnerAssessments />} />
        <Route path="assessments/:assessmentId/take" element={<ExamRunner />} />
        <Route path="assessment-attempts/:attemptId/result" element={<AssessmentResult />} />
        <Route path="certificates" element={<LearnerCertificates />} />
        <Route path="certificates/:id" element={<CertificateViewer />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Fallback wildcard */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
