import React, { useState, useEffect } from 'react';
import { useDialog } from '../../contexts/DialogContext';
import categoryService from '../../services/categoryService';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import { Plus, Trash2, Search, FolderTree, AlertCircle, Loader2 } from 'lucide-react';

/**
 * Enterprise Course Category Management Modal
 * Allows administrators and instructors to view, search, add, and delete course categories.
 */
const CategoryManagerModal = ({ isOpen, onClose, onCategoriesUpdated }) => {
  const { showAlert, showConfirm } = useDialog();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const data = await categoryService.getFullCategories();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load categories:', err);
      setErrorMsg('Failed to load categories from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      setNewCategoryName('');
      setSearchFilter('');
      setErrorMsg('');
    }
  }, [isOpen]);

  const handleCreateCategory = async (e) => {
    if (e) e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      setErrorMsg('Category name cannot be empty.');
      return;
    }

    try {
      setCreating(true);
      setErrorMsg('');
      await categoryService.createCategory(trimmed);
      setNewCategoryName('');
      await fetchCategories();
      if (onCategoriesUpdated) {
        onCategoriesUpdated();
      }
      showAlert({
        title: 'Category Created',
        message: `Category "${trimmed}" has been successfully added.`,
        type: 'success',
      });
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create category.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCategory = async (cat) => {
    showConfirm({
      title: 'Delete Category',
      message: `Are you sure you want to delete category "${cat.name}"? If any courses are currently assigned to this category, deletion will be prevented.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
      onConfirm: async () => {
        try {
          setDeletingId(cat.id);
          const res = await categoryService.deleteCategory(cat.id);
          if (res && res.status === 'error') {
            throw new Error(res.message);
          }
          await fetchCategories();
          if (onCategoriesUpdated) {
            onCategoriesUpdated();
          }
          showAlert({
            title: 'Category Deleted',
            message: `Category "${cat.name}" was successfully removed.`,
            type: 'success',
          });
        } catch (err) {
          showAlert({
            title: 'Deletion Prevented',
            message: err.message || 'Failed to delete category.',
            type: 'error',
          });
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(searchFilter.trim().toLowerCase())
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Course Categories Management"
      subtitle="Configure enterprise curriculum categories available across course creator and catalogs"
      maxWidth="max-w-2xl"
    >
      <div className="p-6 space-y-5">
        {/* Create Form */}
        <form onSubmit={handleCreateCategory} className="space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-[#172B4D]">
            Add New Course Category
          </label>
          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            <div className="flex-1 w-full">
              <Input
                placeholder="e.g. Assessment – Fresher, Artificial Intelligence, etc."
                value={newCategoryName}
                onChange={(e) => {
                  setNewCategoryName(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                disabled={creating}
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              size="md"
              icon={Plus}
              loading={creating}
              disabled={!newCategoryName.trim()}
              className="w-full sm:w-auto shrink-0"
            >
              Add Category
            </Button>
          </div>
          {errorMsg && (
            <div className="flex items-center gap-1.5 text-xs text-[#DC2626] font-medium">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </form>

        {/* Search & List Overview */}
        <div className="pt-3 border-t border-[#E2E8F0] space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-[#2C51A2]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#172B4D]">
                Configured Categories ({categories.length})
              </span>
            </div>
            <div className="w-full sm:w-64">
              <Input
                placeholder="Search categories..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                icon={Search}
              />
            </div>
          </div>

          {/* List Display */}
          <div className="border border-[#E2E8F0] rounded-xl overflow-hidden bg-[#F8FAFC]">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-[#64748B]">
                <Loader2 className="w-6 h-6 animate-spin text-[#2C51A2]" />
                <span className="text-xs font-medium">Loading course categories...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-10 text-center text-xs text-[#64748B]">
                No categories match your search.
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto divide-y divide-[#E2E8F0] bg-white">
                {filtered.map((cat, idx) => (
                  <div
                    key={cat.id || idx}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-[#F8FAFC] transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[11px] font-mono text-[#94A3B8] w-6 shrink-0">
                        #{cat.id || idx + 1}
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-[#172B4D] truncate">
                        {cat.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat)}
                        disabled={deletingId === cat.id}
                        title={`Delete ${cat.name}`}
                        className="p-1.5 text-[#94A3B8] hover:text-[#DC2626] hover:bg-[#FEE2E2] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {deletingId === cat.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-[#DC2626]" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-[#E2E8F0] flex justify-end">
          <Button variant="outline" size="md" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CategoryManagerModal;
