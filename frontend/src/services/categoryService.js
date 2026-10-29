import api from './api';
import { DEFAULT_COURSE_CATEGORIES } from '../config/taxonomy';

let cachedCategories = null;

export const categoryService = {
  /**
   * Fetch all course category names from API with fallback to defaults
   */
  async getCategories(forceRefresh = false) {
    if (cachedCategories && !forceRefresh) {
      return cachedCategories;
    }

    try {
      const res = await api.get('/categories');
      if (res.status === 'success' && res.data?.categories) {
        const list = res.data.categories.map((c) => (typeof c === 'string' ? c : c.name));
        cachedCategories = list.length > 0 ? list : DEFAULT_COURSE_CATEGORIES;
        return cachedCategories;
      }
    } catch (err) {
      console.warn('Failed to fetch categories from backend, using default taxonomy:', err);
    }

    cachedCategories = DEFAULT_COURSE_CATEGORIES;
    return cachedCategories;
  },

  /**
   * Fetch full category records { id, name, created_at } from API
   */
  async getFullCategories() {
    try {
      const res = await api.get('/categories');
      if (res.status === 'success' && res.data?.categories) {
        return res.data.categories;
      }
    } catch (err) {
      console.warn('Failed to fetch full categories:', err);
    }
    return DEFAULT_COURSE_CATEGORIES.map((name, i) => ({ id: i + 1, name }));
  },

  /**
   * Add a new category (admin/instructor)
   */
  async createCategory(name) {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Category name cannot be empty.');

    const res = await api.post('/categories', { name: trimmed });
    if (res.status === 'success') {
      const newName = res.data?.category?.name || trimmed;
      if (cachedCategories && !cachedCategories.includes(newName)) {
        cachedCategories = [...cachedCategories, newName];
      }
      return newName;
    }
    throw new Error(res.message || 'Failed to create category.');
  },

  /**
   * Delete a category (admin)
   */
  async deleteCategory(idOrName) {
    // If integer ID
    if (typeof idOrName === 'number' || !isNaN(Number(idOrName))) {
      const res = await api.delete(`/categories/${idOrName}`);
      cachedCategories = null;
      return res;
    }
    cachedCategories = null;
    return { status: 'success' };
  },

  /**
   * Clear cache
   */
  clearCache() {
    cachedCategories = null;
  }
};

export default categoryService;
