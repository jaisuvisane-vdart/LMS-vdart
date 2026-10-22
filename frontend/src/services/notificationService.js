import api from './api';

export const notificationService = {
  getNotifications: (unreadOnly = false) => api.get('/notifications', { params: { unread_only: unreadOnly ? 1 : 0 } }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
};

export default notificationService;
