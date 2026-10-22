import api from './api';

export const assessmentService = {
  // Instructor / Admin methods
  getAssessments: (params = {}) => api.get('/assessments', { params }),
  getAssessment: (id) => api.get(`/assessments/${id}`),
  createAssessment: (data) => api.post('/assessments', data),
  updateAssessment: (id, data) => api.put(`/assessments/${id}`, data),
  deleteAssessment: (id) => api.delete(`/assessments/${id}`),

  addQuestion: (assessmentId, data) => api.post(`/assessments/${assessmentId}/questions`, data),
  createQuestion: (assessmentId, data) => api.post(`/assessments/${assessmentId}/questions`, data),
  updateQuestion: (questionId, data) => api.put(`/questions/${questionId}`, data),
  deleteQuestion: (questionId) => api.delete(`/questions/${questionId}`),

  // Smart Assessment Importer methods
  downloadImportTemplate: (format = 'xlsx') => api.get(`/assessments/import/template?format=${format}`, { responseType: 'blob' }),
  uploadQuizFile: (formData) => api.post('/assessments/import/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getImportSession: (token) => api.get(`/assessments/import/session/${token}`),
  updateImportedQuestion: (token, itemNumber, data) => api.put(`/assessments/import/session/${token}/question/${itemNumber}`, data),
  confirmImport: (data) => api.post('/assessments/import/confirm', data),
  cancelImport: (token) => api.post('/assessments/import/cancel', { session_token: token }),

  getAttempts: (params = {}) => api.get('/trainee-performance', { params }),
  getPerformance: (params = {}) => api.get('/trainee-performance', { params }),

  // Learner methods
  getMyAssessments: () => api.get('/my-assessments'),
  startAttempt: (assessmentId) => api.post(`/assessments/${assessmentId}/start`),
  submitAttempt: (attemptId, answers) => api.post(`/assessment-attempts/${attemptId}/submit`, { answers }),
  getAttemptResult: (attemptId) => api.get(`/assessment-attempts/${attemptId}/result`),
};

export default assessmentService;
