import api from './api';

export const courseService = {
  // Courses
  getCourses: (params = {}) => api.get('/courses', { params }),
  getMyCourses: (params = {}) => api.get('/courses', { params: { ...params, my_courses: 1 } }),
  getCourse: (id) => api.get(`/courses/${id}`),
  createCourse: (data) => api.post('/courses', data),
  updateCourse: (id, data) => api.put(`/courses/${id}`, data),
  deleteCourse: (id) => api.delete(`/courses/${id}`),
  publishCourse: (id) => api.post(`/courses/${id}/publish`),
  unpublishCourse: (id) => api.post(`/courses/${id}/unpublish`),

  // Modules
  createModule: (courseId, data) => api.post(`/courses/${courseId}/modules`, data),
  updateModule: (id, data) => api.put(`/modules/${id}`, data),
  deleteModule: (id) => api.delete(`/modules/${id}`),

  // Lessons
  createLesson: (courseId, data) => api.post(`/courses/${courseId}/lessons`, data),
  createLessonForCourse: (courseId, data) => api.post(`/courses/${courseId}/lessons`, data),
  getLesson: (id) => api.get(`/lessons/${id}`),
  updateLesson: (id, data) => api.put(`/lessons/${id}`, data),
  deleteLesson: (id) => api.delete(`/lessons/${id}`),

  // Materials
  getMaterialPreview: (id) => api.get(`/materials/${id}/preview`),
  uploadMaterial: (lessonId, formData) =>
    api.post(`/lessons/${lessonId}/materials`, formData),
  deleteMaterial: (id) => api.delete(`/materials/${id}`),
};

export default courseService;
