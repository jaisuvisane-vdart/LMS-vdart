import api from './api';

export const assignmentService = {
  getAssignments: (params = {}) => api.get('/course-assignments', { params }),
  assignCourse: (data) => api.post('/course-assignments', data),
  getAvailableLearners: () => api.get('/course-assignments/learners'),
  getAvailableBatches: (courseId = null) => api.get('/course-assignments/batches', { params: courseId ? { course_id: courseId } : {} }),
  deleteAssignment: (id) => api.delete(`/course-assignments/${id}`),
  getMyCourses: (status = '') => api.get('/my-courses', { params: { status } }),
};

export default assignmentService;
