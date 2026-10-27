import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useDialog } from '../../contexts/DialogContext';
import courseService from '../../services/courseService';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import {
  Layers,
  Plus,
  Edit3,
  Trash2,
  FileText,
  Video,
  FileDown,
  Upload,
  CheckCircle,
  Clock,
  ArrowLeft,
  Paperclip,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const CourseBuilder = () => {
  const { showAlert, showConfirm } = useDialog();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const courseIdParam = searchParams.get('courseId');

  const [coursesList, setCoursesList] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(courseIdParam || '');
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(false);

  // View Mode: 'curriculum' | 'lesson_form' | 'material_form'
  const [viewMode, setViewMode] = useState('curriculum');

  // Lesson Form States
  const [editingLesson, setEditingLesson] = useState(null);
  const [lessonForm, setLessonForm] = useState({
    title: '',
    content: '',
    lesson_type: 'text',
    duration_minutes: 15,
    is_mandatory: 1,
    order_index: 1,
  });
  const [lessonSubmitting, setLessonSubmitting] = useState(false);

  // Material Form States
  const [activeLessonForMaterial, setActiveLessonForMaterial] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadingMaterial, setUploadingMaterial] = useState(false);
  const [fileValidationError, setFileValidationError] = useState('');
  const [togglingPublish, setTogglingPublish] = useState(false);

  // Fetch all available courses for dropdown switcher
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await courseService.getCourses();
        if (res.status === 'success') {
          setCoursesList(res.data);
          if (!selectedCourseId && res.data.length > 0) {
            setSelectedCourseId(res.data[0].id);
          }
        }
      } catch (err) {
        console.error('Error fetching courses list:', err);
      }
    };
    fetchCourses();
  }, []);

  // Fetch full curriculum when selectedCourseId changes
  const fetchCurriculum = async (id) => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await courseService.getCourse(id);
      if (res.status === 'success') {
        setCourse(res.data);
      }
    } catch (err) {
      console.error('Error loading course curriculum:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCourseId) {
      fetchCurriculum(selectedCourseId);
    }
  }, [selectedCourseId]);

  // LESSON HANDLERS
  const handleOpenLessonModal = (lesson = null) => {
    if (lesson) {
      setEditingLesson(lesson);
      setLessonForm({
        title: lesson.title,
        content: lesson.content || '',
        lesson_type: lesson.lesson_type || 'text',
        duration_minutes: lesson.duration_minutes || 15,
        is_mandatory: lesson.is_mandatory ?? 1,
        order_index: lesson.order_index || 1,
      });
    } else {
      setEditingLesson(null);
      setLessonForm({
        title: '',
        content: '',
        lesson_type: 'text',
        duration_minutes: 15,
        is_mandatory: 1,
        order_index: (course?.lessons?.length || 0) + 1,
      });
    }
    setViewMode('lesson_form');
  };

  const handleSaveLesson = async (e) => {
    e.preventDefault();
    if (!selectedCourseId) return;
    try {
      setLessonSubmitting(true);
      if (editingLesson) {
        await courseService.updateLesson(editingLesson.id, lessonForm);
      } else {
        await courseService.createLesson(selectedCourseId, lessonForm);
      }
      setViewMode('curriculum');
      fetchCurriculum(selectedCourseId);
    } catch (err) {
      showAlert({
        title: 'Lesson Save Error',
        message: err.response?.data?.message || err.message || 'Error saving lesson',
        type: 'error',
      });
    } finally {
      setLessonSubmitting(false);
    }
  };

  const handleDeleteLesson = async (lessonId, title) => {
    const confirmed = await showConfirm({
      title: 'Delete Lesson',
      message: `Delete lesson "${title}"?`,
      confirmText: 'Delete Lesson',
      type: 'confirm',
    });
    if (!confirmed) return;

    try {
      await courseService.deleteLesson(lessonId);
      fetchCurriculum(selectedCourseId);
    } catch (err) {
      showAlert({
        title: 'Delete Error',
        message: err.message || 'Error deleting lesson',
        type: 'error',
      });
    }
  };

  // MATERIAL UPLOAD HANDLERS
  const handleOpenMaterialModal = (lesson) => {
    setActiveLessonForMaterial(lesson);
    setUploadFile(null);
    setFileValidationError('');
    setViewMode('material_form');
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    setFileValidationError('');
    if (!file) {
      setUploadFile(null);
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    const videoExts = ['mp4', 'webm', 'mkv', 'avi', 'mov'];
    const docExts = ['ppt', 'pptx', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv'];

    const MAX_DOC_BYTES = 200 * 1024 * 1024; // 200 MB
    const MAX_VIDEO_BYTES = 300 * 1024 * 1024; // 300 MB

    if (videoExts.includes(ext)) {
      if (file.size > MAX_VIDEO_BYTES) {
        setFileValidationError(`Video file size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 300 MB limit.`);
        setUploadFile(null);
        e.target.value = '';
        return;
      }
    } else if (docExts.includes(ext)) {
      if (file.size > MAX_DOC_BYTES) {
        setFileValidationError(`Document file size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 200 MB limit.`);
        setUploadFile(null);
        e.target.value = '';
        return;
      }
    } else {
      setFileValidationError('Invalid file format. Allowed formats: PPT, PDF, Word, Excel, and Video (MP4, WEBM, MKV, AVI, MOV).');
      setUploadFile(null);
      e.target.value = '';
      return;
    }

    setUploadFile(file);
  };

  const handleUploadMaterial = async (e) => {
    e.preventDefault();
    if (!activeLessonForMaterial) return;

    if (!uploadFile) {
      showAlert({
        title: 'File Selection Required',
        message: 'Please choose a valid file to upload.',
        type: 'warning',
      });
      return;
    }

    try {
      setUploadingMaterial(true);
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('material_file', uploadFile);
      formData.append('file_name', uploadFile.name);
      formData.append('file_type', uploadFile.type);

      await courseService.uploadMaterial(activeLessonForMaterial.id, formData);
      setUploadFile(null);
      setFileValidationError('');
      setViewMode('curriculum');
      fetchCurriculum(selectedCourseId);
    } catch (err) {
      showAlert({
        title: 'Material Upload Error',
        message: err.response?.data?.message || err.message || 'Error attaching material',
        type: 'error',
      });
    } finally {
      setUploadingMaterial(false);
    }
  };

  const handleDeleteMaterial = async (materialId) => {
    const confirmed = await showConfirm({
      title: 'Delete Material',
      message: 'Delete attached training material?',
      confirmText: 'Delete Material',
      type: 'confirm',
    });
    if (!confirmed) return;

    try {
      await courseService.deleteMaterial(materialId);
      fetchCurriculum(selectedCourseId);
    } catch (err) {
      showAlert({
        title: 'Delete Error',
        message: err.message || 'Error deleting material',
        type: 'error',
      });
    }
  };

  const handleTogglePublish = async () => {
    if (!course) return;
    const isCurrentlyPublished = course.status === 'published';
    try {
      setTogglingPublish(true);
      let res;
      if (isCurrentlyPublished) {
        res = await courseService.unpublishCourse(course.id);
      } else {
        res = await courseService.publishCourse(course.id);
      }

      if (res?.status === 'success' && res?.data) {
        setCourse((prev) => (prev ? { ...prev, ...res.data } : res.data));
      } else {
        const fallbackRes = await courseService.updateCourse(course.id, {
          status: isCurrentlyPublished ? 'draft' : 'published',
        });
        if (fallbackRes?.status === 'success' && fallbackRes?.data) {
          setCourse((prev) => (prev ? { ...prev, ...fallbackRes.data } : fallbackRes.data));
        }
      }

      await fetchCurriculum(selectedCourseId);
      // Synchronize coursesList status in dropdown switcher
      setCoursesList((prev) =>
        prev.map((c) =>
          c.id === course.id ? { ...c, status: isCurrentlyPublished ? 'draft' : 'published' } : c
        )
      );
    } catch (err) {
      try {
        const fallbackRes = await courseService.updateCourse(course.id, {
          status: isCurrentlyPublished ? 'draft' : 'published',
        });
        if (fallbackRes?.status === 'success' && fallbackRes?.data) {
          setCourse((prev) => (prev ? { ...prev, ...fallbackRes.data } : fallbackRes.data));
        }
        await fetchCurriculum(selectedCourseId);
        setCoursesList((prev) =>
          prev.map((c) =>
            c.id === course.id ? { ...c, status: isCurrentlyPublished ? 'draft' : 'published' } : c
          )
        );
      } catch (fallbackErr) {
        showAlert({
          title: 'Publish Status Error',
          message:
            fallbackErr.response?.data?.message ||
            err.response?.data?.message ||
            err.message ||
            'Error updating course status',
          type: 'error',
        });
      }
    } finally {
      setTogglingPublish(false);
    }
  };

  const getLessonTypeIcon = (type) => {
    switch (type) {
      case 'video':
        return <Video className="w-4 h-4 text-[#2C51A2]" />;
      case 'document':
        return <FileDown className="w-4 h-4 text-[#2C51A2]" />;
      default:
        return <FileText className="w-4 h-4 text-[#2C51A2]" />;
    }
  };

  if (viewMode === 'lesson_form') {
    return (
      <div className="space-y-6">
        <div className="clay-card p-6 sm:p-7 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#2C51A2] text-white px-2.5 py-0.5 rounded-full clay-pill">
                Curriculum Studio
              </span>
              <span className="text-xs text-[#64748B]">Lesson Management</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#172B4D] uppercase tracking-wide mt-1.5">
              {editingLesson ? 'Edit Lesson Unit' : 'Create Lesson Unit'}
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5 max-w-2xl leading-relaxed">
              Formulate instruction text, duration, and lesson format.
            </p>
          </div>
          <div>
            <Button variant="secondary" size="md" icon={ArrowLeft} onClick={() => setViewMode('curriculum')}>
              Back to Curriculum
            </Button>
          </div>
        </div>

        <div className="clay-card p-6 sm:p-8 rounded-2xl shadow-sm">
          <form onSubmit={handleSaveLesson} className="space-y-4 w-full">
            <Input
              label="Lesson Title"
              required
              value={lessonForm.title}
              onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
              placeholder="e.g. Stateless Authentication & JWT Validation"
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select
                label="Lesson Type"
                value={lessonForm.lesson_type}
                onChange={(e) => setLessonForm({ ...lessonForm, lesson_type: e.target.value })}
                options={[
                  { value: 'text', label: 'Interactive Text / Guide' },
                  { value: 'video', label: 'Video Lecture (MP4 / Stream)' },
                  { value: 'document', label: 'Technical Document (PDF / PPT)' },
                  { value: 'quiz', label: 'Pre-Quiz Concept Check' },
                ]}
              />

              <Input
                label="Estimated Minutes"
                type="number"
                value={lessonForm.duration_minutes}
                onChange={(e) => setLessonForm({ ...lessonForm, duration_minutes: e.target.value })}
              />

              <div className="flex flex-col justify-end pb-2">
                <label className="flex items-center gap-2 text-xs font-bold text-[#2C51A2] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lessonForm.is_mandatory == 1}
                    onChange={(e) => setLessonForm({ ...lessonForm, is_mandatory: e.target.checked ? 1 : 0 })}
                    className="w-4 h-4 accent-[#2C51A2] cursor-pointer"
                  />
                  Mandatory Unit for Completion
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#172B4D] mb-1.5">
                Lesson Content (Study Material & Instructions)
              </label>
              <textarea
                rows="6"
                value={lessonForm.content}
                onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value })}
                className="w-full text-[#172B4D] font-mono text-xs p-3.5 rounded-xl focus:outline-none clay-input touch-scroll"
                placeholder="Enter markdown or technical training guidelines for the trainee..."
              />
            </div>

            <div className="pt-4 border-t border-[#E2E8F0] flex justify-end gap-2.5">
              <Button variant="secondary" onClick={() => setViewMode('curriculum')}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={lessonSubmitting}>
                Save Lesson
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (viewMode === 'material_form') {
    return (
      <div className="space-y-6">
        <div className="clay-card p-6 sm:p-7 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#2C51A2] text-white px-2.5 py-0.5 rounded-full clay-pill">
                Curriculum Studio
              </span>
              <span className="text-xs text-[#64748B]">Lesson: {activeLessonForMaterial?.title}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#172B4D] uppercase tracking-wide mt-1.5">
              Upload & Attach Training Materials
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5 max-w-2xl leading-relaxed">
              Upload course study materials. Limits are enforced based on the file type.
            </p>
          </div>
          <div>
            <Button variant="secondary" size="md" icon={ArrowLeft} onClick={() => setViewMode('curriculum')}>
              Back to Curriculum
            </Button>
          </div>
        </div>

        <div className="clay-card p-6 sm:p-8 rounded-2xl shadow-sm">
          <form onSubmit={handleUploadMaterial} className="space-y-4 w-full">
            <div className="p-4.5 clay-card rounded-2xl">
              <h4 className="text-xs font-bold uppercase text-[#2C51A2] mb-1">
                Course Material File Upload
              </h4>
              <p className="text-[11px] text-[#64748B] mb-3 leading-relaxed">
                Upload course study materials. Limits are enforced based on the file type.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3.5">
                <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#172B4D]">
                    Documents (PPT, PDF, Word, Excel)
                  </div>
                  <div className="text-xs font-bold text-[#2C51A2] mt-0.5">
                    Limit: 200 MB
                  </div>
                  <div className="text-[10px] text-[#64748B] mt-0.5">
                    ppt, pptx, pdf, doc, docx, xls, xlsx, csv
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#172B4D]">
                    Video Materials
                  </div>
                  <div className="text-xs font-bold text-[#2C51A2] mt-0.5">
                    Limit: 300 MB
                  </div>
                  <div className="text-[10px] text-[#64748B] mt-0.5">
                    mp4, webm, mkv, avi, mov
                  </div>
                </div>
              </div>

              <input
                type="file"
                accept=".ppt,.pptx,.pdf,.doc,.docx,.xls,.xlsx,.csv,.mp4,.webm,.mkv,.avi,.mov"
                onChange={handleFileChange}
                className="w-full text-xs text-[#172B4D] file:mr-4 file:py-2 file:px-4 file:border-0 file:rounded-xl file:text-xs file:font-bold file:bg-[#2C51A2] file:text-white file:uppercase hover:file:bg-[#1E3B78] cursor-pointer"
              />

              {fileValidationError && (
                <div className="mt-3 p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-600">
                  {fileValidationError}
                </div>
              )}

              {uploadFile && (
                <div className="mt-3 p-2.5 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between text-xs text-[#2C51A2]">
                  <span className="font-bold truncate max-w-[260px]">Selected: {uploadFile.name}</span>
                  <span className="font-mono font-semibold shrink-0">
                    {(uploadFile.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-[#E2E8F0] flex justify-end gap-2.5">
              <Button variant="secondary" onClick={() => setViewMode('curriculum')}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={uploadingMaterial} disabled={!uploadFile}>
                Upload & Attach Material
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Course Selector with Minimal Clay Surface */}
      <div className="clay-card p-6 sm:p-7 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#2C51A2] text-white px-2.5 py-0.5 rounded-full clay-pill">
              Curriculum Studio
            </span>
            <span className="text-xs text-[#64748B]">Course & Lesson Hierarchy Builder</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#172B4D] uppercase tracking-wide mt-1.5">
            Course Curriculum Studio
          </h1>
        </div>

        {/* Course Switcher */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
          <label className="text-xs font-bold uppercase tracking-wider text-[#172B4D] shrink-0">
            Active Program:
          </label>
          <div className="min-w-[260px]">
            <Select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              placeholder="Select Course..."
              options={coursesList.map((c) => ({
                value: c.id,
                label: `${c.title} (${c.status})`,
              }))}
            />
          </div>
        </div>
      </div>

      {!course && !loading ? (
        <div className="p-12 text-center clay-card rounded-2xl">
          <Layers className="w-10 h-10 text-[#64748B] mx-auto mb-3" />
          <p className="text-xs text-[#64748B]">Please select a course to build its curriculum.</p>
        </div>
      ) : loading ? (
        <div className="p-12 text-center text-xs font-semibold text-[#64748B] clay-card rounded-2xl">
          Loading curriculum structure...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Course Overview Card */}
          <div className="clay-card p-6 sm:p-7 rounded-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-[#EFF6FF] text-[#2C51A2] px-2.5 py-0.5 rounded-full border border-[#BFDBFE] clay-pill">
                    {course.category}
                  </span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full clay-pill ${
                    course.course_type === 'certified' || !course.course_type
                      ? 'bg-blue-50 text-[#1E3B78] border border-blue-200'
                      : 'bg-slate-100 text-slate-700 border border-slate-300'
                  }`}>
                    {course.course_type === 'non_certified' ? 'Non-Certified Program' : 'Certified Program'}
                  </span>
                  <Badge variant={course.status === 'published' ? 'success' : 'warning'}>
                    {course.status}
                  </Badge>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-[#172B4D] mt-2.5">{course.title}</h2>
                <p className="text-xs text-[#64748B] mt-1 leading-relaxed max-w-3xl">{course.description || 'No description provided.'}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <Button
                  variant={course.status === 'published' ? 'secondary' : 'primary'}
                  size="md"
                  loading={togglingPublish}
                  onClick={handleTogglePublish}
                >
                  {course.status === 'published' ? 'Revert to Draft' : 'Publish Course'}
                </Button>
                <Button variant="primary" size="md" icon={Plus} onClick={() => handleOpenLessonModal()}>
                  Add Lesson
                </Button>
              </div>
            </div>

            {/* Course Meta Info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 text-xs">
              <div className="bg-white/80 p-3.5 rounded-xl border border-[#E2E8F0] clay-pill">
                <span className="text-[#64748B] block font-semibold">Instructor:</span>
                <span className="font-bold text-[#172B4D]">{course.instructor_name}</span>
              </div>
              <div className="bg-white/80 p-3.5 rounded-xl border border-[#E2E8F0] clay-pill">
                <span className="text-[#64748B] block font-semibold">Passing Standard:</span>
                <span className="font-bold text-[#2C51A2] font-mono">{course.passing_percentage}% Required</span>
              </div>
              <div className="bg-white/80 p-3.5 rounded-xl border border-[#E2E8F0] clay-pill">
                <span className="text-[#64748B] block font-semibold">Curriculum Lessons:</span>
                <span className="font-bold text-[#2C51A2] font-mono">{course.lessons?.length || 0} Lessons</span>
              </div>
              <div className="bg-white/80 p-3.5 rounded-xl border border-[#E2E8F0] clay-pill">
                <span className="text-[#64748B] block font-semibold">Total Duration:</span>
                <span className="font-bold text-[#2C51A2] font-mono">{course.estimated_duration_minutes} Minutes</span>
              </div>
            </div>
          </div>

          {/* Curriculum Lessons List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#2C51A2]">
                Curriculum Lessons Tree
              </h3>
              <span className="text-xs text-[#64748B] font-semibold">
                {course.lessons?.length || 0} Lessons formulated
              </span>
            </div>

            {(!course.lessons || course.lessons.length === 0) ? (
              <div className="clay-card p-8 rounded-2xl text-center">
                <Layers className="w-8 h-8 text-[#64748B] mx-auto mb-2" />
                <h4 className="text-xs font-bold uppercase text-[#2C51A2]">No Lessons Added Yet</h4>
                <p className="text-xs text-[#64748B] mt-1 mb-4">
                  Add training lessons directly under this course program.
                </p>
                <Button variant="primary" size="sm" icon={Plus} onClick={() => handleOpenLessonModal()}>
                  Create First Lesson
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {course.lessons.map((lesson, lesIdx) => (
                  <div
                    key={lesson.id}
                    className="clay-card p-4 sm:p-5 rounded-2xl border border-[#E2E8F0] hover:border-[#2C51A2]/50 clay-card-hover bg-white transition-all shadow-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div 
                          className="p-2.5 rounded-xl shrink-0 mt-0.5"
                          style={{
                            background: 'linear-gradient(145deg, #EFF6FF 0%, #DBEAFE 100%)',
                            boxShadow: '0 2px 4px rgba(16, 185, 129, 0.1), inset 0 1px 1px rgba(255, 255, 255, 0.9)'
                          }}
                        >
                          {getLessonTypeIcon(lesson.lesson_type)}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-extrabold text-[#2C51A2] font-mono">
                              {lesIdx + 1}.
                            </span>
                            <h5 className="text-sm font-bold text-[#172B4D]">{lesson.title}</h5>
                            <Badge variant="default" size="sm">
                              {lesson.lesson_type}
                            </Badge>
                            {lesson.is_mandatory == 1 && (
                              <Badge variant="warning" size="sm">
                                Mandatory
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-[11px] text-[#64748B] mt-1.5 font-medium">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-[#2C51A2]" />
                              {lesson.duration_minutes} Minutes
                            </span>
                            <span className="flex items-center gap-1">
                              <Paperclip className="w-3.5 h-3.5 text-[#2C51A2]" />
                              {lesson.materials?.length || 0} Materials Attached
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={Upload}
                          onClick={() => handleOpenMaterialModal(lesson)}
                        >
                          Materials ({lesson.materials?.length || 0})
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={Edit3}
                          onClick={() => handleOpenLessonModal(lesson)}
                        />
                        <Button
                          variant="danger"
                          size="sm"
                          icon={Trash2}
                          onClick={() => handleDeleteLesson(lesson.id, lesson.title)}
                        />
                      </div>
                    </div>

                    {/* Attached Materials Preview Bar */}
                    {lesson.materials && lesson.materials.length > 0 && (
                      <div className="mt-3.5 pt-3 border-t border-[#F1F5F9] flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                          Attached Files:
                        </span>
                        {lesson.materials.map((mat) => (
                          <div
                            key={mat.id}
                            className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-[#CBD5E1] rounded-lg text-[11px] clay-pill"
                          >
                            <Paperclip className="w-3 h-3 text-[#2C51A2]" />
                            <span className="font-bold text-[#172B4D] truncate max-w-[200px]">
                              {mat.file_name}
                            </span>
                            {mat.file_size_kb > 0 && (
                              <span className="text-[#64748B] font-mono">
                                ({Math.round(mat.file_size_kb)} KB)
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteMaterial(mat.id)}
                              className="text-[#DC2626] hover:text-[#991B1B] font-bold ml-1 active:scale-95"
                              title="Remove file"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseBuilder;
