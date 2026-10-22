import api from './api';

export const userService = {
  getUsers: (params = {}) => api.get('/users', { params }),
  getRoles: () => api.get('/users/roles'),
  getUser: (id) => api.get(`/users/${id}`),
  createUser: (data) => api.post('/users', data),
  updateUser: (id, data) => api.put(`/users/${id}`, data),
  toggleStatus: (id, status) => api.patch(`/users/${id}/status`, { status }),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
};

export default userService;
