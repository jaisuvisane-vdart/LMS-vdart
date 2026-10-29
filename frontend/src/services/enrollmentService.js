import api from './api';

export const enrollmentService = {
  // Learner Course Catalog & Self-Enrollment
  getCatalog: (params = {}) => api.get('/enrollments/catalog', { params }),
  requestEnrollment: (data) => api.post('/enrollments/request', data),

  // Admin Review & Management
  getRequests: (params = {}) => api.get('/enrollments/requests', { params }),
  getPendingCount: () => api.get('/enrollments/pending-count'),
  approveRequest: (id, data = {}) => api.post(`/enrollments/${id}/approve`, data),
  rejectRequest: (id, data = {}) => api.post(`/enrollments/${id}/reject`, data),
};

export default enrollmentService;
