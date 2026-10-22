import api from './api';

export const certificateService = {
  getCertificates: (learnerId = null) => api.get('/certificates', { params: learnerId ? { learner_id: learnerId } : {} }),
  getCertificate: (id) => api.get(`/certificates/${id}`),
  verifyCertificate: (code) => api.get(`/certificates/verify/${encodeURIComponent(code)}`),
  checkEligibility: (courseId) => api.post('/certificates/check-eligibility', { course_id: courseId }),
};

export default certificateService;
