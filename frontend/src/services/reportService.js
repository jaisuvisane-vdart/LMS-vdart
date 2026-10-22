import api from './api';

export const reportService = {
  getOverview: () => api.get('/reports/overview'),
  getCoursesReport: (params = {}) => api.get('/reports/courses', { params }),
  getComplianceReport: (params = {}) => api.get('/reports/compliance', { params }),
};

export default reportService;
