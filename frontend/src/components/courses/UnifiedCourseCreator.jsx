import React, { useState, useRef, useEffect } from 'react';
import { useDialog } from '../../contexts/DialogContext';
import courseService from '../../services/courseService';
import assessmentService from '../../services/assessmentService';
import { downloadBlobFile } from '../../utils/downloadHelper';
import categoryService from '../../services/categoryService';
import { DEFAULT_COURSE_CATEGORIES } from '../../config/taxonomy';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';
import Badge from '../common/Badge';
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Paperclip,
  CheckCircle,
  Clock,
  BookOpen,
  Award,
  Layers,
  HelpCircle,
  FileText,
  Upload,
  Calendar,
  Shield,
  FileCheck,
  FileSpreadsheet,
  FileDown
} from 'lucide-react';
import vdartLogo from '../../assets/VDart_Logobg.png';

export const CERTIFICATE_TEMPLATES = [
  {
    id: 'classic',
    name: 'Classic Corporate Executive',
    subtitle: 'Formal Milestone & Competency Certification',
    description: 'Traditional deep navy borders with executive seal and formal signature lines.',
    accent: '#2C51A2',
    borderClass: 'border-4 border-[#2C51A2]',
    bgClass: 'bg-[#FAFBFD]',
    badgeClass: 'bg-[#E2E9F4] text-[#1E3B78]',
  },
  {
    id: 'modern',
    name: 'Modern Tech Distinction',
    subtitle: 'Verified Technical & Professional Specialization',
    description: 'Contemporary indigo framing with high-tech badge and geometric layout.',
    accent: '#4338CA',
    borderClass: 'border-4 border-[#4338CA]',
    bgClass: 'bg-[#F8FAFC]',
    badgeClass: 'bg-[#EEF2FF] text-[#4338CA]',
  },
  {
    id: 'gold',
    name: 'Prestige Gold Distinction',
    subtitle: 'Executive Honors & Master Milestone Achievement',
    description: 'Gilded amber metallic frame with warm background glow and distinction emblem.',
    accent: '#D97706',
    borderClass: 'border-4 border-[#D97706]',
    bgClass: 'bg-gradient-to-b from-[#FFFDF7] to-[#FFFBEB]',
    badgeClass: 'bg-[#FEF3C7] text-[#92400E]',
  },
  {
    id: 'crest',
    name: 'Academic Crest Excellence',
    subtitle: 'Highest Academic & Technical Governance Benchmark',
    description: 'Formal academic emerald double border with classical scrollwork accents.',
    accent: '#047857',
    borderClass: 'border-4 border-[#047857]',
    bgClass: 'bg-[#F0FDF4]',
    badgeClass: 'bg-[#ECFDF5] text-[#065F46]',
  },
];

const DURATION_PRESETS = [7, 14, 30, 60, 90];

export const LESSON_TYPES = [
  {
    value: 'video',
    label: 'Video (MP4)',
    accept: '.mp4,video/mp4',
    extensions: ['mp4'],
    hint: 'Accepts MP4 video files (.mp4)',
  },
  {
    value: 'document',
    label: 'Document (PDF)',
    accept: '.pdf,application/pdf',
    extensions: ['pdf'],
    hint: 'Accepts PDF document files (.pdf)',
  },
  {
    value: 'presentation',
    label: 'Presentation (PPT / PPTX)',
    accept: '.ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation',
    extensions: ['ppt', 'pptx'],
    hint: 'Accepts PowerPoint presentations (.ppt, .pptx)',
  },
  {
    value: 'word',
    label: 'Word Document (DOC / DOCX)',
    accept: '.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    extensions: ['doc', 'docx'],
    hint: 'Accepts Word documents (.doc, .docx)',
  },
  {
    value: 'spreadsheet',
    label: 'Spreadsheet (CSV / XLSX)',
    accept: '.csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    extensions: ['csv', 'xlsx'],
    hint: 'Accepts Spreadsheet data (.csv, .xlsx)',
  },
  {
    value: 'text',
    label: 'Interactive Text / Notes',
    accept: '.txt,.pdf,text/plain,application/pdf',
    extensions: ['txt', 'pdf'],
    hint: 'Accepts text files (.txt) or PDF notes (.pdf)',
  },
];

export default function UnifiedCourseCreator({ courseId = null, onCancel, onSuccess }) {
  const { showAlert } = useDialog();

  const [activeSection, setActiveSection] = useState('section-fundamentals');
  const [submitting, setSubmitting] = useState(false);
  const [submitStatusText, setSubmitStatusText] = useState('');
  const [loadingInitialData, setLoadingInitialData] = useState(Boolean(courseId));
  const [isParsingTemplate, setIsParsingTemplate] = useState(false);
  const quizFileInputRef = useRef(null);

  // Step 1: Course Fundamentals & Duration
  const [courseForm, setCourseForm] = useState({
    title: '',
    category: 'Fresher Training Program',
    course_type: 'certified',
    access_type: 'open_enrollment',
    duration_days: 30,
    estimated_duration_minutes: 60,
    passing_percentage: 70,
    description: '',
    certificate_template: 'classic',
  });

  const [categoryOptions, setCategoryOptions] = useState(DEFAULT_COURSE_CATEGORIES);

  useEffect(() => {
    let isMounted = true;
    categoryService.getCategories().then((cats) => {
      if (isMounted && Array.isArray(cats) && cats.length > 0) {
        setCategoryOptions(cats);
      }
    }).catch(() => {});
    return () => { isMounted = false; };
  }, []);

  const handleCreateCategoryInDropdown = async (newCategoryName) => {
    try {
      const created = await categoryService.createCategory(newCategoryName);
      setCategoryOptions((prev) => (prev.includes(created) ? prev : [...prev, created]));
      return created;
    } catch (err) {
      showAlert({
        title: 'Category Creation Error',
        message: err.message || 'Failed to create category.',
        type: 'error',
      });
      throw err;
    }
  };

  // Step 2: Lessons List
  const [lessons, setLessons] = useState([]);

  // Step 3: Certification Quiz (If certified)
  const [quizForm, setQuizForm] = useState({
    title: '',
    time_limit_minutes: 30,
    passing_percentage: 70,
    show_score_to_learner: true,
    questions: [],
  });

  // Fetch existing course curriculum if editing
  useEffect(() => {
    if (!courseId) return;

    let isMounted = true;
    const fetchCourseDetails = async () => {
      try {
        setLoadingInitialData(true);
        const res = await courseService.getCourse(courseId);
        if (!isMounted) return;

        if (res.status === 'success' && res.data) {
          const c = res.data;
          setCourseForm({
            title: c.title || '',
            category: c.category || 'Fresher Training Program',
            course_type: c.course_type || 'certified',
            access_type: c.access_type || 'open_enrollment',
            duration_days: parseInt(c.duration_days, 10) || 30,
            estimated_duration_minutes: parseInt(c.estimated_duration_minutes, 10) || 60,
            passing_percentage: parseFloat(c.passing_percentage) || 70,
            description: c.description || '',
            certificate_template: c.certificate_template || 'classic',
          });

          if (c.lessons && Array.isArray(c.lessons)) {
            setLessons(
              c.lessons.map((les) => ({
                id: les.id,
                isNew: false,
                title: les.title || '',
                lesson_type: les.lesson_type || 'document',
                status: les.status || 'active',
                duration_minutes: parseInt(les.duration_minutes, 10) || 15,
                is_mandatory: les.is_mandatory !== undefined ? parseInt(les.is_mandatory, 10) : 1,
                content: les.content || '',
                files: [],
                existingMaterials: les.materials || [],
              }))
            );
          }

          if (c.assessment) {
            const ass = c.assessment;
            setQuizForm({
              id: ass.id,
              title: ass.title || '',
              time_limit_minutes: parseInt(ass.time_limit_minutes, 10) || 30,
              passing_percentage: parseFloat(ass.passing_percentage) || parseFloat(c.passing_percentage) || 70,
              show_score_to_learner: ass.show_score_to_learner !== undefined ? Boolean(parseInt(ass.show_score_to_learner, 10)) : true,
              questions: (ass.questions || []).map((q, qIdx) => ({
                id: q.id || (Date.now() + qIdx),
                isNew: false,
                question_text: q.question_text || '',
                question_type: q.question_type || 'multiple_choice',
                marks: parseInt(q.marks, 10) || 1,
                explanation: q.explanation || '',
                options: (q.options || []).map((opt) => ({
                  id: opt.id,
                  isNew: false,
                  option_text: opt.option_text || '',
                  is_correct: parseInt(opt.is_correct, 10) === 1 ? 1 : 0,
                })),
              })),
            });
          }
        }
      } catch (err) {
        console.error('Failed to load course details for editing:', err);
        showAlert({
          title: 'Curriculum Load Error',
          message: err.response?.data?.message || err.message || 'Failed to retrieve course details for editing.',
          type: 'error',
        });
      } finally {
        if (isMounted) {
          setLoadingInitialData(false);
        }
      }
    };

    fetchCourseDetails();
    return () => {
      isMounted = false;
    };
  }, [courseId]);

  // ----------------------------------------------------
  // Lesson Management Handlers
  // ----------------------------------------------------
  const handleAddLesson = () => {
    setLessons([
      ...lessons,
      {
        id: `new_${Date.now()}_${Math.random()}`,
        isNew: true,
        title: '',
        lesson_type: 'document',
        status: 'active',
        duration_minutes: 15,
        is_mandatory: 1,
        content: '',
        files: [],
        existingMaterials: [],
      },
    ]);
  };

  const handleRemoveLesson = (lessonId) => {
    setLessons(lessons.filter((l) => l.id !== lessonId));
  };

  const handleLessonChange = (lessonId, field, value) => {
    setLessons(
      lessons.map((l) => (l.id === lessonId ? { ...l, [field]: value } : l))
    );
  };

  const handleAttachFile = (lessonId, file) => {
    if (!file) return;
    const lesson = lessons.find((l) => l.id === lessonId);
    if (!lesson) return;

    const typeConfig = LESSON_TYPES.find((t) => t.value === lesson.lesson_type) || LESSON_TYPES[1];
    const ext = file.name.split('.').pop().toLowerCase();

    if (!typeConfig.extensions.includes(ext)) {
      showAlert({
        title: 'Mismatched Material Format',
        message: `This lesson type is configured as "${typeConfig.label}". Please select a matching ${typeConfig.extensions.map((e) => '.' + e).join(' or ')} file, or adjust the Lesson Type.`,
        type: 'warning',
      });
      return;
    }

    setLessons(
      lessons.map((l) => {
        if (l.id === lessonId) {
          return {
            ...l,
            files: [...(l.files || []), file],
          };
        }
        return l;
      })
    );
  };

  const handleRemoveFile = (lessonId, fileIdx) => {
    setLessons(
      lessons.map((l) => {
        if (l.id === lessonId) {
          const updated = [...l.files];
          updated.splice(fileIdx, 1);
          return { ...l, files: updated };
        }
        return l;
      })
    );
  };

  const handleRemoveExistingMaterial = async (lessonId, materialId) => {
    try {
      await courseService.deleteMaterial(materialId);
      setLessons((prev) =>
        prev.map((l) => {
          if (l.id === lessonId) {
            return {
              ...l,
              existingMaterials: (l.existingMaterials || []).filter((m) => m.id !== materialId),
            };
          }
          return l;
        })
      );
      showAlert({
        title: 'Material Removed',
        message: 'The selected lesson material was removed successfully.',
        type: 'success',
      });
    } catch (err) {
      console.error('Failed to delete material:', err);
      showAlert({
        title: 'Material Removal Failed',
        message: err.response?.data?.message || err.message || 'Could not delete lesson material.',
        type: 'error',
      });
    }
  };

  // ----------------------------------------------------
  // Quiz & Questions Handlers
  // ----------------------------------------------------
  const handleAddQuestion = () => {
    setQuizForm({
      ...quizForm,
      questions: [
        ...quizForm.questions,
        {
          id: Date.now() + Math.random(),
          question_text: '',
          question_type: 'multiple_choice',
          marks: 1,
          options: [
            { option_text: '', is_correct: 1 },
            { option_text: '', is_correct: 0 },
            { option_text: '', is_correct: 0 },
            { option_text: '', is_correct: 0 },
          ],
        },
      ],
    });
  };

  const handleRemoveQuestion = (qId) => {
    setQuizForm({
      ...quizForm,
      questions: quizForm.questions.filter((q) => q.id !== qId),
    });
  };

  const handleQuestionTextChange = (qId, text) => {
    setQuizForm({
      ...quizForm,
      questions: quizForm.questions.map((q) =>
        q.id === qId ? { ...q, question_text: text } : q
      ),
    });
  };

  const handleOptionTextChange = (qId, optIdx, text) => {
    setQuizForm({
      ...quizForm,
      questions: quizForm.questions.map((q) => {
        if (q.id === qId) {
          const newOpts = [...q.options];
          newOpts[optIdx] = { ...newOpts[optIdx], option_text: text };
          return { ...q, options: newOpts };
        }
        return q;
      }),
    });
  };

  const handleSelectCorrectOption = (qId, optIdx) => {
    setQuizForm({
      ...quizForm,
      questions: quizForm.questions.map((q) => {
        if (q.id === qId) {
          const newOpts = q.options.map((opt, i) => ({
            ...opt,
            is_correct: i === optIdx ? 1 : 0,
          }));
          return { ...q, options: newOpts };
        }
        return q;
      }),
    });
  };

  // ----------------------------------------------------
  // Quiz Template Importer & Handlers (Word .docx, PDF, CSV)
  // ----------------------------------------------------
  const handleDownloadTemplate = async (format = 'docx') => {
    try {
      const res = await assessmentService.downloadImportTemplate(format);
      const filename = format === 'docx' ? 'quiz_import_template.docx' : 'quiz_import_template.csv';
      const mimeType = format === 'docx'
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'text/csv';
      downloadBlobFile(res, filename, mimeType);
    } catch (err) {
      showAlert({
        title: 'Template Download Notice',
        message: err.message || 'Unable to download template file.',
        type: 'error',
      });
    }
  };

  const handleUploadQuizTemplate = async (file) => {
    if (!file) return;
    const allowed = ['docx', 'pdf', 'csv', 'xlsx'];
    const ext = file.name.split('.').pop().toLowerCase();
    if (!allowed.includes(ext)) {
      showAlert({
        title: 'Unsupported File Format',
        message: 'Please upload a Word (.docx), PDF (.pdf), CSV (.csv), or Excel (.xlsx) quiz template.',
        type: 'warning',
      });
      return;
    }

    try {
      setIsParsingTemplate(true);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('course_id', '0');

      const res = await assessmentService.uploadQuizFile(formData);

      if (res.status === 'success' && res.data) {
        const rawItems = res.data.items || [];
        // Filter readable questions that have text and options
        const validItems = rawItems.filter(
          (item) => item.options && item.options.length >= 2 && item.question_text?.trim()
        );

        if (validItems.length === 0) {
          showAlert({
            title: 'No Questions Detected',
            message: 'No readable questions with answer options were found in this document. Please verify that your template adheres to standard question formatting.',
            type: 'warning',
          });
          return;
        }

        const mapped = validItems.map((item, idx) => ({
          id: Date.now() + idx + Math.random(),
          question_text: item.question_text.trim(),
          question_type: item.question_type || 'multiple_choice',
          marks: parseInt(item.marks, 10) || 1,
          explanation: item.explanation || '',
          options: (item.options || []).map((opt) => ({
            option_text: opt.option_text || '',
            is_correct: opt.is_correct ? 1 : 0,
          })),
        }));

        setQuizForm((prev) => ({
          ...prev,
          title: prev.title || `${courseForm.title || 'Course'} - Certification Examination`,
          questions: mapped,
        }));

        showAlert({
          title: 'Quiz Questions Extracted',
          message: `Successfully fetched and loaded ${mapped.length} question(s) from "${file.name}". You can review, modify, or add questions below.`,
          type: 'success',
        });
      } else {
        throw new Error(res.message || 'Failed to parse quiz file.');
      }
    } catch (err) {
      console.error('Quiz template parsing failed:', err);
      showAlert({
        title: 'Template Import Error',
        message: err.response?.data?.message || err.message || 'Failed to extract questions from the uploaded template file.',
        type: 'error',
      });
    } finally {
      setIsParsingTemplate(false);
      if (quizFileInputRef.current) {
        quizFileInputRef.current.value = '';
      }
    }
  };

  // ----------------------------------------------------
  // Section Navigation & Scroll Spy
  // ----------------------------------------------------
  const scrollToSection = (sectionId) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(sectionId);
    }
  };

  useEffect(() => {
    const sectionIds = ['section-fundamentals', 'section-lessons'];
    if (courseForm.course_type === 'certified') {
      sectionIds.push('section-quiz', 'section-certificate');
    }

    const handleScroll = () => {
      const scrollPos = window.scrollY + 200;
      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const el = document.getElementById(sectionIds[i]);
        if (el) {
          const top = el.getBoundingClientRect().top + window.scrollY;
          if (top <= scrollPos) {
            setActiveSection(sectionIds[i]);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [courseForm.course_type]);

  // Section completion checks
  const isSectionComplete = (stepNum) => {
    if (stepNum === 1) return Boolean(courseForm.title.trim() && courseForm.duration_days > 0);
    if (stepNum === 2) return lessons.length > 0 && lessons.every((l) => l.title?.trim());
    if (stepNum === 3) return quizForm.questions.length > 0 && Boolean(quizForm.title?.trim());
    if (stepNum === 4) return Boolean(courseForm.certificate_template);
    return false;
  };

  // ----------------------------------------------------
  // Unified Form Validation & Final Submission Trigger
  // ----------------------------------------------------
  const handleValidateAndSubmit = () => {
    // 1. Fundamentals Validation
    if (!courseForm.title.trim()) {
      showAlert({
        title: 'Validation Error',
        message: 'Please provide a valid Course Title.',
        type: 'error',
      });
      scrollToSection('section-fundamentals');
      return;
    }
    if (!courseForm.duration_days || courseForm.duration_days < 1) {
      showAlert({
        title: 'Validation Error',
        message: 'Please enter a valid course duration in days (minimum 1 day).',
        type: 'error',
      });
      scrollToSection('section-fundamentals');
      return;
    }

    // 2. Lessons Validation
    if (lessons.length === 0) {
      showAlert({
        title: 'Validation Notice',
        message: 'Please add at least one lesson unit before saving the curriculum.',
        type: 'warning',
      });
      scrollToSection('section-lessons');
      return;
    }

    for (let i = 0; i < lessons.length; i++) {
      if (!lessons[i].title.trim()) {
        showAlert({
          title: 'Validation Error',
          message: `Lesson ${i + 1} requires a valid title.`,
          type: 'error',
        });
        scrollToSection('section-lessons');
        return;
      }
    }

    // 3. Quiz Validation (if certified)
    if (courseForm.course_type === 'certified') {
      if (!quizForm.title.trim()) {
        setQuizForm((prev) => ({
          ...prev,
          title: `${courseForm.title} - Final Certification Examination`,
        }));
      }
      if (quizForm.questions.length === 0) {
        showAlert({
          title: 'Validation Notice',
          message: 'Please add at least one question or upload a Word (.docx) / PDF quiz template to formulate examination questions.',
          type: 'warning',
        });
        scrollToSection('section-quiz');
        return;
      }
      for (let i = 0; i < quizForm.questions.length; i++) {
        const q = quizForm.questions[i];
        if (!q.question_text.trim()) {
          showAlert({
            title: 'Validation Error',
            message: `Question ${i + 1} cannot have an empty question prompt.`,
            type: 'error',
          });
          scrollToSection('section-quiz');
          return;
        }
        const hasValidOption = q.options.some((o) => o.option_text.trim());
        if (!hasValidOption) {
          showAlert({
            title: 'Validation Error',
            message: `Question ${i + 1} must have at least one valid option answer.`,
            type: 'error',
          });
          scrollToSection('section-quiz');
          return;
        }
      }
    }

    handleFinalSubmit();
  };

  // ----------------------------------------------------
  // Final Form Submission & Material Upload Pipeline
  // ----------------------------------------------------
  const handleFinalSubmit = async () => {
    try {
      setSubmitting(true);
      setSubmitStatusText(courseId ? 'Synchronizing course curriculum and lesson structures...' : 'Creating course curriculum and lesson structures...');

      // Build composite payload
      const payload = {
        title: courseForm.title.trim(),
        category: courseForm.category,
        course_type: courseForm.course_type,
        access_type: courseForm.access_type || 'open_enrollment',
        duration_days: parseInt(courseForm.duration_days, 10) || 30,
        estimated_duration_minutes: parseInt(courseForm.estimated_duration_minutes, 10) || 60,
        passing_percentage: parseFloat(courseForm.passing_percentage) || 70,
        description: courseForm.description.trim(),
        certificate_template: courseForm.certificate_template || 'classic',
        lessons: lessons.map((les, idx) => ({
          id: !les.isNew && les.id && !isNaN(les.id) ? parseInt(les.id, 10) : undefined,
          title: les.title.trim(),
          lesson_type: les.lesson_type,
          status: les.status || 'active',
          duration_minutes: parseInt(les.duration_minutes, 10) || 15,
          is_mandatory: les.is_mandatory ? 1 : 0,
          content: les.content || '',
          order_index: idx + 1,
        })),
      };

      // Add assessment if certified
      if (courseForm.course_type === 'certified') {
        payload.assessment = {
          id: quizForm.id || undefined,
          title: quizForm.title.trim() || `${courseForm.title} - Final Certification Examination`,
          passing_percentage: parseFloat(quizForm.passing_percentage) || parseFloat(courseForm.passing_percentage) || 70,
          time_limit_minutes: parseInt(quizForm.time_limit_minutes, 10) || 30,
          show_score_to_learner: quizForm.show_score_to_learner ? 1 : 0,
          questions: quizForm.questions.map((q, idx) => ({
            id: !q.isNew && q.id && !isNaN(q.id) ? parseInt(q.id, 10) : undefined,
            question_text: q.question_text.trim(),
            question_type: q.question_type || 'multiple_choice',
            marks: parseInt(q.marks, 10) || 1,
            order_index: idx + 1,
            options: q.options
              .filter((o) => o.option_text.trim())
              .map((o, optIdx) => ({
                id: !o.isNew && o.id && !isNaN(o.id) ? parseInt(o.id, 10) : undefined,
                option_text: o.option_text.trim(),
                is_correct: o.is_correct ? 1 : 0,
                order_index: optIdx + 1,
              })),
          })),
        };
      }

      let res;
      if (courseId) {
        res = await courseService.updateCourse(courseId, payload);
      } else {
        res = await courseService.createCourse(payload);
      }

      if (res.status !== 'success') {
        throw new Error(res.message || 'Error processing course');
      }

      const savedCourse = res.data;
      const savedLessons = savedCourse?.lessons || [];

      // Sequentially upload newly attached files for each lesson
      let totalFilesToUpload = 0;
      lessons.forEach((les) => {
        totalFilesToUpload += (les.files || []).length;
      });

      if (totalFilesToUpload > 0) {
        setSubmitStatusText(`Uploading ${totalFilesToUpload} lesson material file(s)...`);

        for (let i = 0; i < lessons.length; i++) {
          const originalLesson = lessons[i];
          const matchedSavedLesson =
            savedLessons.find((sl) => !originalLesson.isNew && originalLesson.id && sl.id === parseInt(originalLesson.id, 10)) ||
            savedLessons[i] ||
            savedLessons.find((sl) => sl.title === originalLesson.title);

          if (matchedSavedLesson && originalLesson.files && originalLesson.files.length > 0) {
            for (let f = 0; f < originalLesson.files.length; f++) {
              const file = originalLesson.files[f];
              const formData = new FormData();
              formData.append('material_file', file);
              setSubmitStatusText(`Uploading "${file.name}" to lesson "${matchedSavedLesson.title}"...`);
              try {
                await courseService.uploadMaterial(matchedSavedLesson.id, formData);
              } catch (fileErr) {
                console.error(`Failed to upload ${file.name}:`, fileErr);
              }
            }
          }
        }
      }

      setSubmitStatusText('Curriculum saved successfully.');
      showAlert({
        title: courseId ? 'Course Updated Successfully' : 'Course Created Successfully',
        message: `"${courseForm.title}" has been saved with ${lessons.length} lesson(s) and full curriculum configurations.`,
        type: 'success',
      });

      if (onSuccess) {
        onSuccess(savedCourse);
      }
    } catch (err) {
      console.error('Course processing failed:', err);
      showAlert({
        title: courseId ? 'Course Update Failed' : 'Course Creation Failed',
        message: err.response?.data?.message || err.message || 'An error occurred while saving the course.',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
      setSubmitStatusText('');
    }
  };

  const STEPS = [
    {
      step: 1,
      id: 'section-fundamentals',
      title: 'Fundamentals & Days',
      subtitle: 'Course specifications and duration',
      requiresCertified: false,
    },
    {
      step: 2,
      id: 'section-lessons',
      title: 'Lessons & Materials',
      subtitle: 'Organize lessons and upload learning materials',
      requiresCertified: false,
    },
    {
      step: 3,
      id: 'section-quiz',
      title: 'Certification Quiz',
      subtitle: 'Set up quiz and passing criteria',
      requiresCertified: true,
    },
    {
      step: 4,
      id: 'section-certificate',
      title: 'Certificate Template',
      subtitle: 'Design and configure course certificate',
      requiresCertified: true,
    },
  ];

  const visibleSteps = STEPS.filter(
    (item) => !item.requiresCertified || courseForm.course_type === 'certified'
  );

  if (loadingInitialData) {
    return (
      <div className="clay-card p-12 rounded-2xl border border-white/60 text-center space-y-3">
        <div className="w-10 h-10 border-4 border-[#2C51A2] border-t-transparent rounded-full animate-spin mx-auto" />
        <h3 className="text-sm font-bold text-[#1E3B78]">Loading Course Curriculum Data...</h3>
        <p className="text-xs text-[#64748B]">Retrieving course specifications, lessons, materials, and examination configuration.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Navigation Header */}
      <div data-aos="fade-down" className="clay-card p-6 rounded-2xl border border-white/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="clay-pill text-[10px] font-bold uppercase tracking-widest bg-[#2C51A2] text-white px-2.5 py-0.5 rounded-full">
              {courseId ? 'Course Editor' : 'Unified Curriculum Studio'}
            </span>
            <span className="text-xs text-[#64748B] font-medium">
              {courseId ? 'Edit Existing Curriculum' : 'All-in-One Course Creator'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1E3B78] tracking-tight mt-1.5">
            {courseId ? 'Edit Course Curriculum' : 'Create Complete Course Curriculum'}
          </h1>
          <p className="text-xs text-[#64748B] mt-1 max-w-2xl leading-relaxed">
            {courseId
              ? 'Modify course specifications, adjust completion duration, update lessons and materials, and fine-tune certification examinations.'
              : 'Formulate program details, configure duration in days, author lessons, attach study materials, generate certification quizzes, and select certificate templates in one workflow.'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="secondary" size="md" icon={ArrowLeft} onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        </div>
      </div>

      {/* 2-Column Curriculum Studio Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Connected Vertical Timeline Stepper (Sticky Anchor Spy) */}
        <div data-aos="fade-right" data-aos-delay="100" className="lg:col-span-4 xl:col-span-3 sticky top-6 z-20">
          <div className="clay-card p-4 sm:p-5 rounded-2xl border border-white/60 space-y-2 relative">
            {visibleSteps.map((item, idx) => {
              const isActive = activeSection === item.id;
              const isCompleted = isSectionComplete(item.step);
              const isLast = idx === visibleSteps.length - 1;

              return (
                <div key={item.step} className="relative">
                  {/* Vertical connector line between step badges */}
                  {!isLast && (
                    <div
                      className={`absolute left-[31px] top-12 bottom-[-16px] w-[2px] z-0 ${
                        isCompleted ? 'bg-[#1E3B78]' : 'bg-[#CBD5E1]'
                      }`}
                    />
                  )}

                  <div
                    onClick={() => scrollToSection(item.id)}
                    className={`relative z-10 p-3.5 sm:p-4 rounded-2xl flex items-start gap-3.5 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#1E3B78] text-white shadow-md'
                        : isCompleted
                        ? 'bg-white/60 hover:bg-white'
                        : 'bg-transparent hover:bg-white/40'
                    }`}
                  >
                    {/* Circular Step Badge */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs mt-0.5 shadow-xs transition-all ${
                        isActive
                          ? 'bg-white text-[#1E3B78]'
                          : isCompleted
                          ? 'bg-[#2C51A2] text-white'
                          : 'bg-white border border-[#CBD5E1] text-[#64748B]'
                      }`}
                    >
                      {isCompleted ? <CheckCircle className="w-4 h-4" /> : item.step}
                    </div>

                    {/* Step Title & Subtitle */}
                    <div className="min-w-0 flex-1">
                      <h3
                        className={`text-sm font-bold tracking-tight leading-snug ${
                          isActive ? 'text-white' : 'text-[#172B4D]'
                        }`}
                      >
                        {item.title}
                      </h3>
                      <p
                        className={`text-xs leading-snug mt-1 ${
                          isActive ? 'text-[#E2E9F4]' : 'text-[#64748B]'
                        }`}
                      >
                        {item.subtitle}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Single Unified Container for all Curriculum Sections */}
        <div data-aos="fade-left" data-aos-delay="100" className="lg:col-span-8 xl:col-span-9">
          <div className="clay-card p-6 sm:p-8 rounded-2xl border border-white/60 shadow-sm space-y-8">

            {/* SECTION 1: Course Fundamentals & Duration in Days */}
            <div id="section-fundamentals" className="space-y-6 scroll-mt-6">
        <div className="border-b border-[#E2E8F0] pb-4">
            <h2 className="text-base font-bold text-[#1E3B78] uppercase tracking-wide">
              Step 1: Course Specifications & Duration
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Specify course title, corporate category, credential type, and assignment duration in days.
            </p>
          </div>

          <div className="space-y-4">
            <Input
              label="Course Title"
              required
              value={courseForm.title}
              onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
              placeholder="e.g. Enterprise Cloud Microservices Architecture with Go"
            />

            <div>
              <Select
                label="Category"
                value={courseForm.category}
                onChange={(e) => setCourseForm({ ...courseForm, category: e.target.value })}
                options={categoryOptions.map((cat) => ({ value: cat, label: cat }))}
                allowCreate={true}
                createLabel="Add New Category"
                onCreate={handleCreateCategoryInDropdown}
              />
            </div>

            {/* Course Credential Type and Course Access Type Side-by-Side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#1E3B78] mb-1.5">
                  Course Credential Type <span className="text-[#DC2626]">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCourseForm({ ...courseForm, course_type: 'certified' })}
                    className={`p-3 rounded-xl text-xs font-bold uppercase tracking-wider border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      courseForm.course_type === 'certified'
                        ? 'bg-[#1E3B78] text-white border-[#1E3B78] shadow-md'
                        : 'bg-white text-[#64748B] border-[#CBD5E1] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <Award className="w-4 h-4" />
                    <span>Certified</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCourseForm({ ...courseForm, course_type: 'non_certified' })}
                    className={`p-3 rounded-xl text-xs font-bold uppercase tracking-wider border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      courseForm.course_type === 'non_certified'
                        ? 'bg-[#1E3B78] text-white border-[#1E3B78] shadow-md'
                        : 'bg-white text-[#64748B] border-[#CBD5E1] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Non-Certified</span>
                  </button>
                </div>
              </div>

              <div>
                <Select
                  label="Course Access Type"
                  required
                  value={courseForm.access_type}
                  onChange={(e) => setCourseForm({ ...courseForm, access_type: e.target.value })}
                  options={[
                    {
                      value: 'open_enrollment',
                      label: 'Open for Enrollment',
                    },
                    {
                      value: 'required_admin_access',
                      label: 'Required Admin Access',
                    },
                  ]}
                />
                <p className="text-[11px] text-[#64748B] mt-1.5 leading-snug">
                  {courseForm.access_type === 'open_enrollment'
                    ? 'Open for Enrollment: Trainees can register directly without admin approval and begin learning immediately.'
                    : 'Required Admin Access: Trainees can submit enrollment requests, but access requires administrator approval.'}
                </p>
              </div>
            </div>

            {/* Course Duration in Days Feature */}
            <div className="p-4.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#1E3B78] flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-[#2C51A2]" />
                    <span>Course Duration in Days <span className="text-[#DC2626]">*</span></span>
                  </label>
                  <p className="text-[11px] text-[#64748B] mt-0.5">
                    Governs the allowed completion window and automatically calculates trainee due dates upon enrollment.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-bold uppercase text-[#64748B]">Quick Presets:</span>
                  {DURATION_PRESETS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setCourseForm({ ...courseForm, duration_days: d })}
                      className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg border transition-all cursor-pointer ${
                        courseForm.duration_days === d
                          ? 'bg-[#2C51A2] text-white border-[#2C51A2]'
                          : 'bg-white text-[#172B4D] border-[#CBD5E1] hover:border-[#2C51A2]'
                      }`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
              </div>

              <div className="w-full sm:w-48">
                <Input
                  type="number"
                  min="1"
                  max="365"
                  value={courseForm.duration_days}
                  onChange={(e) => setCourseForm({ ...courseForm, duration_days: parseInt(e.target.value, 10) || 1 })}
                  placeholder="e.g. 30"
                />
              </div>
            </div>
          </div>
        </div>

            {/* SECTION 2: Curriculum Lessons & Attached Materials */}
            <div id="section-lessons" className="pt-8 border-t border-[#E2E8F0] space-y-6 scroll-mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
            <div>
              <h2 className="text-base font-bold text-[#1E3B78] uppercase tracking-wide">
                Step 2: Formulate Lessons & Attach Study Materials
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Define the lessons directly under this course and attach matching learning materials based on the lesson type.
              </p>
            </div>
            <Button variant="primary" size="sm" icon={Plus} onClick={handleAddLesson}>
              {lessons.length === 0 ? 'Add Lesson Unit' : 'Add Another Lesson'}
            </Button>
          </div>

          <div className="space-y-4">
            {lessons.length === 0 && (
              <div className="p-8 border border-dashed border-[#CBD5E1] rounded-2xl text-center space-y-3 bg-[#F8FAFC]">
                <div className="w-12 h-12 rounded-2xl bg-[#E2E9F4] text-[#1E3B78] flex items-center justify-center mx-auto">
                  <BookOpen className="w-6 h-6 text-[#2C51A2]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#172B4D]">No Lesson Units Added</h4>
                  <p className="text-xs text-[#64748B] mt-1 max-w-md mx-auto">
                    Click "Add Lesson Unit" below or in the header above to formulate course lessons, select lesson types, and attach study materials.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <Button variant="primary" size="sm" icon={Plus} onClick={handleAddLesson}>
                    Add Lesson Unit
                  </Button>
                </div>
              </div>
            )}

            {lessons.map((lesson, idx) => {
              const currentTypeConfig =
                LESSON_TYPES.find((t) => t.value === lesson.lesson_type) || LESSON_TYPES[1];

              return (
                <div
                  key={lesson.id}
                  className="p-5 rounded-2xl bg-white border border-[#CBD5E1] shadow-xs space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#1E3B78] text-white flex items-center justify-center font-bold text-xs">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider text-[#1E3B78]">
                        Lesson Unit {idx + 1}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveLesson(lesson.id)}
                      className="text-[#DC2626] hover:text-[#991B1B] text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Lesson</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-6">
                      <Input
                        label="Lesson Name"
                        required
                        value={lesson.title}
                        onChange={(e) => handleLessonChange(lesson.id, 'title', e.target.value)}
                        placeholder="e.g. Microservices Messaging Protocols"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <Select
                        label="Lesson Type"
                        value={lesson.lesson_type}
                        onChange={(e) => handleLessonChange(lesson.id, 'lesson_type', e.target.value)}
                        options={LESSON_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                      />
                    </div>
                    <div className="md:col-span-3">
                      <Select
                        label="Status"
                        value={lesson.status || 'active'}
                        onChange={(e) => handleLessonChange(lesson.id, 'status', e.target.value)}
                        options={[
                          { value: 'active', label: 'Active' },
                          { value: 'inactive', label: 'Inactive' },
                        ]}
                      />
                    </div>
                  </div>

                  <div className="flex items-center py-1">
                    <label className="flex items-center gap-2 text-xs font-bold text-[#172B4D] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={lesson.is_mandatory == 1}
                        onChange={(e) => handleLessonChange(lesson.id, 'is_mandatory', e.target.checked ? 1 : 0)}
                        className="w-4 h-4 text-[#2C51A2] rounded focus:ring-0 cursor-pointer"
                      />
                      <span>Mandatory Lesson (Required for Course Completion)</span>
                    </label>
                  </div>

                  {/* Dynamic Lesson Material Dropzone (Bound to Lesson Type) */}
                  <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-dashed border-[#CBD5E1] space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#1E3B78] flex items-center gap-1.5">
                        <Paperclip className="w-3.5 h-3.5 text-[#2C51A2]" />
                        <span>Lesson Material ({currentTypeConfig.label})</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-[#2C51A2] bg-[#E2E9F4] px-2 py-0.5 rounded-full">
                          {currentTypeConfig.extensions.map((ext) => `.${ext}`).join(', ')}
                        </span>
                        <span className="text-[10px] text-[#64748B] font-mono">
                          {(lesson.files || []).length} File(s) Staged
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-[#64748B]">
                      {currentTypeConfig.hint}
                    </p>

                    <input
                      type="file"
                      accept={currentTypeConfig.accept}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleAttachFile(lesson.id, e.target.files[0]);
                          e.target.value = '';
                        }
                      }}
                      className="w-full text-xs text-[#172B4D] file:mr-3 file:py-1.5 file:px-3 file:border-0 file:rounded-lg file:text-xs file:font-bold file:bg-[#2C51A2] file:text-white file:uppercase hover:file:bg-[#1E3B78] cursor-pointer"
                    />

                    {/* Existing Uploaded Materials (If in Edit Mode) */}
                    {lesson.existingMaterials && lesson.existingMaterials.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-[#E2E8F0]">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block">
                          Current Uploaded Materials ({lesson.existingMaterials.length}):
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          {lesson.existingMaterials.map((mat) => (
                            <div
                              key={mat.id}
                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#F1F5F9] border border-[#CBD5E1] rounded-lg text-xs shadow-xs"
                            >
                              <Paperclip className="w-3.5 h-3.5 text-[#2C51A2]" />
                              <span className="font-bold text-[#172B4D] truncate max-w-[200px]" title={mat.file_name}>
                                {mat.file_name}
                              </span>
                              {mat.file_size && (
                                <span className="text-[10px] text-[#64748B] font-mono">
                                  ({(mat.file_size / (1024 * 1024)).toFixed(2)} MB)
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveExistingMaterial(lesson.id, mat.id)}
                                className="text-[#DC2626] hover:text-[#991B1B] font-bold text-xs ml-1 cursor-pointer"
                                title="Remove uploaded material from lesson"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Staged Files Preview */}
                    {lesson.files && lesson.files.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E2E8F0]">
                        {lesson.files.map((file, fIdx) => (
                          <div
                            key={fIdx}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs shadow-xs"
                          >
                            <Paperclip className="w-3.5 h-3.5 text-[#2C51A2]" />
                            <span className="font-bold text-[#172B4D] truncate max-w-[200px]">{file.name}</span>
                            <span className="text-[10px] text-[#64748B] font-mono">
                              ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(lesson.id, fIdx)}
                              className="text-[#DC2626] hover:text-[#991B1B] font-bold text-xs ml-1 cursor-pointer"
                              title="Remove attached material"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

            {/* SECTION 3: Certification Quiz & Question Generation (Certified Only) */}
            {courseForm.course_type === 'certified' && (
              <div id="section-quiz" className="pt-8 border-t border-[#E2E8F0] space-y-6 scroll-mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
            <div>
              <h2 className="text-base font-bold text-[#1E3B78] uppercase tracking-wide">
                Step 3: Certification Examination & Quiz Formulation
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Set up the final certification exam. You can author questions manually or generate standard questions automatically.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleDownloadTemplate('docx')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#CBD5E1] bg-white text-xs font-bold text-[#1E3B78] hover:bg-[#F1F5F9] transition-all cursor-pointer shadow-xs"
                title="Download Word (.docx) sample quiz template"
              >
                <FileText className="w-3.5 h-3.5 text-[#2C51A2]" />
                <span>Word Template</span>
              </button>
              <button
                type="button"
                onClick={() => handleDownloadTemplate('csv')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#CBD5E1] bg-white text-xs font-bold text-[#1E3B78] hover:bg-[#F1F5F9] transition-all cursor-pointer shadow-xs"
                title="Download CSV sample quiz template"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#047857]" />
                <span>CSV Template</span>
              </button>
              <Button variant="primary" size="sm" icon={Plus} onClick={handleAddQuestion}>
                Add Question
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <Input
              label="Assessment Examination Title"
              required
              value={quizForm.title}
              onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
              placeholder="e.g. Full-Stack Go & Microservices Certification Exam"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Examination Time Limit (Minutes)"
                type="number"
                min="5"
                max="180"
                value={quizForm.time_limit_minutes}
                onChange={(e) => setQuizForm({ ...quizForm, time_limit_minutes: e.target.value })}
              />
              <Input
                label="Passing Benchmark Score (%)"
                type="number"
                min="50"
                max="100"
                value={quizForm.passing_percentage}
                onChange={(e) => setQuizForm({ ...quizForm, passing_percentage: e.target.value })}
              />
            </div>

            {/* Score Visibility Checklist Setting */}
            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] flex items-start gap-3">
              <input
                type="checkbox"
                id="show_score_to_learner_setting"
                checked={quizForm.show_score_to_learner}
                onChange={(e) => setQuizForm({ ...quizForm, show_score_to_learner: e.target.checked })}
                className="w-4 h-4 mt-0.5 text-[#2C51A2] rounded focus:ring-0 cursor-pointer"
              />
              <label htmlFor="show_score_to_learner_setting" className="text-xs text-[#172B4D] cursor-pointer">
                <span className="font-bold text-[#1E3B78] block">
                  Score visibility to the learner after the completion of the courses
                </span>
                <span className="text-[#64748B] block mt-0.5">
                  When enabled, trainees can view their percentage score, total marks achieved, and pass/fail assessment breakdown immediately upon completing this examination.
                </span>
              </label>
            </div>

            {/* Quiz Template Importer Dropzone (Word .docx and PDF) */}
            <div className="p-4.5 rounded-2xl bg-[#F8FAFC] border-2 border-dashed border-[#CBD5E1] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#1E3B78] flex items-center gap-2">
                    <Upload className="w-4 h-4 text-[#2C51A2]" />
                    <span>Upload Quiz Template (Word .docx or PDF)</span>
                  </span>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Upload your completed Word document or searchable PDF. Questions, options, and answers will be fetched automatically.
                  </p>
                </div>
                <div className="text-[11px] font-mono text-[#2C51A2] font-bold shrink-0">
                  Supported: .docx, .pdf, .csv, .xlsx
                </div>
              </div>

              <div className="relative">
                <input
                  ref={quizFileInputRef}
                  type="file"
                  accept=".docx,.pdf,.csv,.xlsx"
                  disabled={isParsingTemplate}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleUploadQuizTemplate(e.target.files[0]);
                    }
                  }}
                  className="w-full text-xs text-[#172B4D] file:mr-3 file:py-2 file:px-4 file:border-0 file:rounded-xl file:text-xs file:font-bold file:bg-[#2C51A2] file:text-white file:uppercase hover:file:bg-[#1E3B78] cursor-pointer disabled:opacity-50"
                />
              </div>

              {isParsingTemplate && (
                <div className="flex items-center gap-2.5 text-xs font-bold text-[#2C51A2] pt-1">
                  <span className="w-4 h-4 border-2 border-[#2C51A2] border-t-transparent animate-spin inline-block rounded-full" />
                  <span>Extracting and validating questions from template document...</span>
                </div>
              )}
            </div>

            {/* Questions List */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#2C51A2]">
                  Examination Questions ({quizForm.questions.length})
                </h3>
                {quizForm.questions.length > 0 && (
                  <span className="text-[11px] text-[#64748B]">
                    Review the fetched questions below. Ensure each question has a prompt and at least one correct answer option.
                  </span>
                )}
              </div>

              {quizForm.questions.length === 0 && (
                <div className="p-8 border border-dashed border-[#CBD5E1] rounded-2xl text-center space-y-3 bg-[#F8FAFC]">
                  <div className="w-12 h-12 rounded-2xl bg-[#E2E9F4] text-[#1E3B78] flex items-center justify-center mx-auto">
                    <FileText className="w-6 h-6 text-[#2C51A2]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#172B4D]">No Examination Questions Added</h4>
                    <p className="text-xs text-[#64748B] mt-1 max-w-md mx-auto">
                      Upload your Word (.docx) or PDF quiz template above to fetch questions automatically, or click "Add Question Manually" to compose your exam questions.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <Button variant="secondary" size="sm" icon={Plus} onClick={handleAddQuestion}>
                      Add Question Manually
                    </Button>
                  </div>
                </div>
              )}

              {quizForm.questions.map((q, qIdx) => (
                <div
                  key={q.id}
                  className="p-5 rounded-2xl bg-white border border-[#CBD5E1] shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#1E3B78]">
                      Question {qIdx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(q.id)}
                      className="text-[#DC2626] hover:text-[#991B1B] text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>

                  <Input
                    label="Question Prompt"
                    required
                    value={q.question_text}
                    onChange={(e) => handleQuestionTextChange(q.id, e.target.value)}
                    placeholder="Enter the examination question text..."
                  />

                  {/* Options List */}
                  <div className="space-y-2 pt-1">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                      Multiple Choice Options (Select radio for correct answer)
                    </label>
                    <div className="space-y-2">
                      {q.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2.5">
                          <input
                            type="radio"
                            name={`correct_q_${q.id}`}
                            checked={opt.is_correct === 1}
                            onChange={() => handleSelectCorrectOption(q.id, optIdx)}
                            className="w-4 h-4 text-[#2C51A2] focus:ring-0 cursor-pointer"
                            title="Mark as correct answer"
                          />
                          <input
                            type="text"
                            value={opt.option_text}
                            onChange={(e) => handleOptionTextChange(q.id, optIdx, e.target.value)}
                            placeholder={`Option ${String.fromCharCode(65 + optIdx)}...`}
                            className="clay-input w-full text-xs p-2 rounded-lg bg-[#FAFBFD] focus:bg-white"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

            {/* SECTION 4: Certificate Template Selection (Certified Only) */}
            {courseForm.course_type === 'certified' && (
              <div id="section-certificate" className="pt-8 border-t border-[#E2E8F0] space-y-6 scroll-mt-6">
          <div className="border-b border-[#E2E8F0] pb-4">
            <h2 className="text-base font-bold text-[#1E3B78] uppercase tracking-wide">
              Step 4: Choose Certificate Credential Template
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Select the official certificate design that will be issued to trainees upon passing this certification program.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {CERTIFICATE_TEMPLATES.map((tmpl) => {
              const isSelected = courseForm.certificate_template === tmpl.id;
              return (
                <div
                  key={tmpl.id}
                  onClick={() => setCourseForm({ ...courseForm, certificate_template: tmpl.id })}
                  className={`p-5 rounded-2xl cursor-pointer transition-all border-2 ${
                    isSelected
                      ? 'border-[#2C51A2] bg-white shadow-lg ring-2 ring-[#2C51A2]/20'
                      : 'border-[#CBD5E1] bg-white/70 hover:border-[#2C51A2]/50 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-[#172B4D] uppercase tracking-wide">
                      {tmpl.name}
                    </span>
                    <input
                      type="radio"
                      name="cert_template_choice"
                      checked={isSelected}
                      onChange={() => setCourseForm({ ...courseForm, certificate_template: tmpl.id })}
                      className="w-4 h-4 text-[#2C51A2] focus:ring-0 cursor-pointer"
                    />
                  </div>

                  {/* Mini Visual Preview Canvas */}
                  <div className={`p-4 rounded-xl text-center space-y-2 select-none ${tmpl.borderClass} ${tmpl.bgClass}`}>
                    <div className="w-8 h-8 mx-auto bg-white rounded-lg flex items-center justify-center p-1 shadow-xs border border-black/10">
                      <img src={vdartLogo} alt="Logo" className="w-full h-full object-contain" />
                    </div>
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#1E3B78]">
                      {tmpl.subtitle}
                    </div>
                    <div className="text-xs font-bold text-[#172B4D] border-b pb-1 border-current inline-block px-4">
                      John Doe
                    </div>
                    <div className="text-[9px] text-[#64748B]">
                      Has verified competency standards in {courseForm.title || 'Course Title'}
                    </div>
                  </div>

                  <p className="text-[11px] text-[#64748B] mt-3 leading-relaxed">
                    {tmpl.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

            {/* Unified Curriculum Actions Toolbar */}
            <div className="pt-6 border-t border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                {submitting ? (
                  <div className="text-xs font-bold text-[#2C51A2] flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2C51A2] animate-ping" />
                    <span>{submitStatusText}</span>
                  </div>
                ) : (
                  <div className="text-xs text-[#64748B]">
                    All curriculum sections are configured and saved simultaneously into the enterprise catalog.
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 ml-auto">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={onCancel}
                  disabled={submitting}
                >
                  Cancel
                </Button>

                <Button
                  variant="primary"
                  size="md"
                  icon={CheckCircle}
                  loading={submitting}
                  onClick={handleValidateAndSubmit}
                >
                  {courseId ? 'Save & Update Course Curriculum' : 'Create Complete Course Curriculum'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
