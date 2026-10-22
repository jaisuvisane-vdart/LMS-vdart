import api from './api';

export const progressService = {
  completeLesson: (lessonId, timeSpentSeconds = 60) =>
    api.post(`/lessons/${lessonId}/complete`, { time_spent_seconds: timeSpentSeconds }),
  uncompleteLesson: (lessonId) =>
    api.post(`/lessons/${lessonId}/uncomplete`),
  recordTimeSpent: (lessonId, timeSpentSeconds) =>
    api.post(`/lessons/${lessonId}/time-spent`, { time_spent_seconds: timeSpentSeconds }),
  recordMaterialView: (lessonId) =>
    api.post(`/lessons/${lessonId}/view-material`),
  getCourseProgress: (courseId) =>
    api.get(`/courses/${courseId}/progress`),
};

export default progressService;
