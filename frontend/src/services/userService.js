import api from './api';

export const userService = {
  getUsers: (params = {}) => api.get('/users', { params }),
  getRoles: () => api.get('/users/roles'),
  getUser: (id) => api.get(`/users/${id}`),
  createUser: (data) => api.post('/users', data),
  updateUser: (id, data) => api.put(`/users/${id}`, data),
  deleteUser: (id) => api.delete(`/users/${id}`),
  toggleStatus: (id, status) => api.patch(`/users/${id}/status`, { status }),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  getUserDetails: (id) => api.get(`/users/${id}/details`),
  adminCompleteCourse: (assignmentId) => api.post(`/course-assignments/${assignmentId}/admin-complete`),
  adminResetCourseCompletion: (assignmentId) => api.post(`/course-assignments/${assignmentId}/admin-reset`),
};

export default userService;
