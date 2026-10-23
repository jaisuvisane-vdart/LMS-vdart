import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDialog } from '../../contexts/DialogContext';
import assessmentService from '../../services/assessmentService';
import courseService from '../../services/courseService';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import SmartAssessmentImporter from '../../components/assessment/SmartAssessmentImporter';
import {
  Award,
  Plus,
  Edit,
  Trash2,
  Clock,
  HelpCircle,
  CheckCircle,
  Layers,
  ArrowRight,
  Search,
  BookOpen,
  ArrowLeft,
  Upload
} from 'lucide-react';

const AssessmentBuilder = () => {
  const { showAlert, showConfirm } = useDialog();
  const [searchParams] = useSearchParams();
  const paramCourseId = searchParams.get('courseId');

  const [assessments, setAssessments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCourseFilter, setSelectedCourseFilter] = useState(paramCourseId || '');
  const [searchTerm, setSearchTerm] = useState('');

  // View Mode: 'list' | 'assessment_form' | 'questions'
  const [viewMode, setViewMode] = useState('list');
  const [creationMode, setCreationMode] = useState('import'); // 'import' (primary) | 'manual'
  const [editingAssessment, setEditingAssessment] = useState(null);
  const [importTargetAssessment, setImportTargetAssessment] = useState(null);
  const [formData, setFormData] = useState({
    course_id: paramCourseId || '',
    title: '',
    description: '',
    passing_percentage: 80,
    time_limit_minutes: 30,
    max_attempts: 1,
  });

  // Question Management State
  const [activeAssessment, setActiveAssessment] = useState(null);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [questionFormData, setQuestionFormData] = useState({
    question_type: 'multiple_choice',
    question_text: '',
    marks: 1,
    explanation: '',
    options: [
      { option_text: '', is_correct: 1 },
      { option_text: '', is_correct: 0 },
      { option_text: '', is_correct: 0 },
      { option_text: '', is_correct: 0 },
    ],
  });
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      const res = await assessmentService.getAssessments({
        course_id: selectedCourseFilter,
        search: searchTerm,
      });
      if (res.status === 'success') {
        setAssessments(res.data);
      }
    } catch (err) {
      console.error('Failed to load assessments:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await courseService.getCourses({ my_courses: 1 });
      if (res.status === 'success') {
        setCourses(res.data);
      }
    } catch (err) {
      console.error('Failed to load courses:', err);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    fetchAssessments();
  }, [selectedCourseFilter]);

  const handleOpenCreateModal = (mode = 'import') => {
    setEditingAssessment(null);
    setImportTargetAssessment(null);
    setCreationMode(mode);
    setFormData({
      course_id: selectedCourseFilter || (courses[0]?.id || ''),
      title: '',
      description: '',
      passing_percentage: 80,
      time_limit_minutes: 30,
      max_attempts: 1,
    });
    setViewMode('assessment_form');
  };

  const handleOpenEditModal = (assessment) => {
    setEditingAssessment(assessment);
    setImportTargetAssessment(null);
    setCreationMode('manual');
    setFormData({
      course_id: assessment.course_id,
      title: assessment.title,
      description: assessment.description || '',
      passing_percentage: assessment.passing_percentage,
      time_limit_minutes: assessment.time_limit_minutes,
      max_attempts: assessment.max_attempts,
    });
    setViewMode('assessment_form');
  };

  const handleOpenImportIntoAssessment = (assessment) => {
    setEditingAssessment(null);
    setImportTargetAssessment(assessment);
    setCreationMode('import');
    setViewMode('assessment_form');
  };

  const handleSaveAssessment = async (e) => {
    e.preventDefault();
    try {
      if (editingAssessment) {
        await assessmentService.updateAssessment(editingAssessment.id, formData);
      } else {
        await assessmentService.createAssessment(formData);
      }
      setViewMode('list');
      fetchAssessments();
    } catch (err) {
      showAlert({
        title: 'Save Assessment Error',
        message: err.response?.data?.message || err.message || 'Error saving assessment',
        type: 'error',
      });
    }
  };

  const handleDeleteAssessment = async (assessmentId) => {
    const confirmed = await showConfirm({
      title: 'Delete Assessment',
      message: 'Delete this assessment and all questions?',
      confirmText: 'Delete Assessment',
      type: 'confirm',
    });
    if (!confirmed) return;

    try {
      await assessmentService.deleteAssessment(assessmentId);
      fetchAssessments();
    } catch (err) {
      showAlert({
        title: 'Delete Error',
        message: err.message || 'Error deleting assessment',
        type: 'error',
      });
    }
  };

  // QUESTION BANK HANDLERS
  const handleOpenQuestionsModal = async (assessment) => {
    try {
      const res = await assessmentService.getAssessment(assessment.id);
      if (res.status === 'success') {
        setActiveAssessment(res.data);
      } else {
        setActiveAssessment(assessment);
      }
    } catch (e) {
      setActiveAssessment(assessment);
    }
    resetQuestionForm();
    setViewMode('questions');
  };

  const resetQuestionForm = () => {
    setEditingQuestionId(null);
    setQuestionFormData({
      question_type: 'multiple_choice',
      question_text: '',
      marks: 1,
      explanation: '',
      options: [
        { option_text: '', is_correct: 1 },
        { option_text: '', is_correct: 0 },
        { option_text: '', is_correct: 0 },
        { option_text: '', is_correct: 0 },
      ],
    });
  };

  const handleQuestionTypeChange = (type) => {
    if (type === 'true_false') {
      setQuestionFormData({
        ...questionFormData,
        question_type: 'true_false',
        options: [
          { option_text: 'True', is_correct: 1 },
          { option_text: 'False', is_correct: 0 },
        ],
      });
    } else {
      setQuestionFormData({
        ...questionFormData,
        question_type: 'multiple_choice',
        options: [
          { option_text: '', is_correct: 1 },
          { option_text: '', is_correct: 0 },
          { option_text: '', is_correct: 0 },
          { option_text: '', is_correct: 0 },
        ],
      });
    }
  };

  const handleOptionChange = (index, value) => {
    const updated = [...questionFormData.options];
    updated[index].option_text = value;
    setQuestionFormData({ ...questionFormData, options: updated });
  };

  const handleCorrectOptionSelect = (index) => {
    const updated = questionFormData.options.map((opt, i) => ({
      ...opt,
      is_correct: i === index ? 1 : 0,
    }));
    setQuestionFormData({ ...questionFormData, options: updated });
  };

  const handleAddOption = () => {
    if (questionFormData.options.length < 6) {
      setQuestionFormData({
        ...questionFormData,
        options: [...questionFormData.options, { option_text: '', is_correct: 0 }],
      });
    }
  };

  const handleRemoveOption = (index) => {
    if (questionFormData.options.length > 2) {
      const updated = questionFormData.options.filter((_, i) => i !== index);
      if (!updated.some((opt) => opt.is_correct === 1)) {
        updated[0].is_correct = 1;
      }
      setQuestionFormData({ ...questionFormData, options: updated });
    }
  };

  const handleEditQuestion = (q) => {
    setEditingQuestionId(q.id);
    setQuestionFormData({
      question_type: q.question_type,
      question_text: q.question_text,
      marks: q.marks,
      explanation: q.explanation || '',
      options: q.options?.map((opt) => ({
        id: opt.id,
        option_text: opt.option_text,
        is_correct: opt.is_correct == 1 ? 1 : 0,
      })) || [],
    });
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    if (!questionFormData.question_text.trim()) {
      showAlert({
        title: 'Validation Error',
        message: 'Question text is required.',
        type: 'warning',
      });
      return;
    }

    try {
      setIsSavingQuestion(true);
      if (editingQuestionId) {
        await assessmentService.updateQuestion(editingQuestionId, questionFormData);
      } else {
        await assessmentService.createQuestion(activeAssessment.id, questionFormData);
      }

      const res = await assessmentService.getAssessment(activeAssessment.id);
      if (res.status === 'success') {
        setActiveAssessment(res.data);
      }
      resetQuestionForm();
      fetchAssessments();
    } catch (err) {
      showAlert({
        title: 'Question Save Error',
        message: err.response?.data?.message || err.message || 'Error saving question',
        type: 'error',
      });
    } finally {
      setIsSavingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    const confirmed = await showConfirm({
      title: 'Delete Question',
      message: 'Delete this question item from the bank?',
      confirmText: 'Delete Question',
      type: 'confirm',
    });
    if (!confirmed) return;

    try {
      await assessmentService.deleteQuestion(questionId);
      const res = await assessmentService.getAssessment(activeAssessment.id);
      if (res.status === 'success') {
        setActiveAssessment(res.data);
      }
      fetchAssessments();
    } catch (err) {
      showAlert({
        title: 'Delete Error',
        message: 'Error deleting question',
        type: 'error',
      });
    }
  };

  if (viewMode === 'assessment_form') {
    // Scenario 1: Importing questions directly into an existing active assessment
    if (importTargetAssessment) {
      return (
        <SmartAssessmentImporter
          courses={courses}
          selectedCourseId={importTargetAssessment.course_id}
          targetAssessment={importTargetAssessment}
          onSuccess={() => {
            fetchAssessments();
            handleOpenQuestionsModal(importTargetAssessment);
          }}
          onCancel={() => handleOpenQuestionsModal(importTargetAssessment)}
        />
      );
    }

    // Scenario 2: Primary Creation Mode - Smart Assessment Importer
    if (!editingAssessment && creationMode === 'import') {
      return (
        <SmartAssessmentImporter
          courses={courses}
          selectedCourseId={formData.course_id || selectedCourseFilter}
          onSuccess={(newAssessment) => {
            fetchAssessments();
            if (newAssessment?.id) {
              handleOpenQuestionsModal(newAssessment);
            } else {
              setViewMode('list');
            }
          }}
          onCancel={() => setViewMode('list')}
          onSwitchToManual={() => setCreationMode('manual')}
        />
      );
    }

    // Scenario 3: Manual Assessment Creation or Edit Settings
    return (
      <div className="space-y-6">
        {!editingAssessment ? (
          /* Mode Switcher Banner for Manual Creation */
          <div className="clay-card p-6 sm:p-7 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#2C51A2] text-white px-2.5 py-0.5 rounded-full clay-pill">
                  Assessment Creation Mode
                </span>
                <span className="text-xs text-[#64748B]">Manual Quiz Builder</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#172B4D] uppercase tracking-wide mt-1.5">
                Manual Assessment Creation
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5 max-w-2xl leading-relaxed">
                Prefer to upload a quiz document? Switch to the smart importer to auto-extract questions from Excel, CSV, Word, or PDF.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="primary"
                size="md"
                icon={Upload}
                onClick={() => setCreationMode('import')}
              >
                Switch to Smart Importer (Primary)
              </Button>
              <Button
                variant="secondary"
                size="md"
                icon={ArrowLeft}
                onClick={() => setViewMode('list')}
              >
                Back to Assessments
              </Button>
            </div>
          </div>
        ) : (
          /* Top Header Banner when editing existing assessment */
          <div className="clay-card p-6 sm:p-7 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#2C51A2] text-white px-2.5 py-0.5 rounded-full clay-pill">
                  Evaluation Studio
                </span>
                <span className="text-xs text-[#64748B]">Assessment Configuration</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#172B4D] uppercase tracking-wide mt-1.5">
                Edit Assessment Settings
              </h1>
              <p className="text-xs text-[#64748B] mt-0.5 max-w-2xl leading-relaxed">
                Configure assessment duration, passing benchmark, attempt limits, and course associations.
              </p>
            </div>
            <div>
              <Button variant="secondary" size="md" icon={ArrowLeft} onClick={() => setViewMode('list')}>
                Back to Assessments
              </Button>
            </div>
          </div>
        )}

        {/* Assessment Form Card */}
        <div className="clay-card p-6 sm:p-8 rounded-2xl shadow-sm">
          <form onSubmit={handleSaveAssessment} className="space-y-5 w-full">
            <Select
              label="Associated Training Course"
              value={formData.course_id}
              onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
              options={courses.map((c) => ({ value: c.id, label: c.title }))}
              required
              disabled={!!editingAssessment}
            />

            <Input
              label="Assessment Title"
              placeholder="e.g. Full-Stack PHP & Security Certification Quiz"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#172B4D] mb-1.5">
                Description / Instructions
              </label>
              <textarea
                rows={3}
                className="w-full text-[#172B4D] text-sm p-3.5 rounded-xl focus:outline-none clay-input"
                placeholder="Provide instructions regarding exam duration, passing requirements, and policy."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Passing (%)"
                type="number"
                min="1"
                max="100"
                value={formData.passing_percentage}
                onChange={(e) => setFormData({ ...formData, passing_percentage: e.target.value })}
                required
              />
              <Input
                label="Time Limit (Min)"
                type="number"
                min="5"
                max="180"
                value={formData.time_limit_minutes}
                onChange={(e) => setFormData({ ...formData, time_limit_minutes: e.target.value })}
                required
              />
              <Input
                label="Max Attempts"
                type="number"
                min="1"
                max="10"
                value={formData.max_attempts}
                onChange={(e) => setFormData({ ...formData, max_attempts: e.target.value })}
                required
              />
            </div>

            <div className="pt-4 border-t border-[#E2E8F0] flex justify-end gap-2.5">
              <Button variant="secondary" size="md" type="button" onClick={() => setViewMode('list')}>
                Cancel
              </Button>
              <Button variant="primary" size="md" type="submit">
                {editingAssessment ? 'Save Changes' : 'Create Assessment'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (viewMode === 'questions') {
    return (
      <div className="space-y-6">
        {/* Top Header Banner with Back Button */}
        <div className="clay-card p-6 sm:p-7 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#2C51A2] text-white px-2.5 py-0.5 rounded-full clay-pill">
                Question Bank Studio
              </span>
              <span className="text-xs text-[#64748B]">
                Total Questions: {activeAssessment?.questions?.length || 0} • Passing Standard: {activeAssessment?.passing_percentage}%
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#172B4D] uppercase tracking-wide mt-1.5">
              Question Bank: {activeAssessment?.title || ''}
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5 max-w-2xl leading-relaxed">
              Formulate, edit, and organize examination items, options, and rationale for this assessment.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              icon={Upload}
              onClick={() => handleOpenImportIntoAssessment(activeAssessment)}
            >
              Import Questions from File
            </Button>
            <Button variant="secondary" size="md" icon={ArrowLeft} onClick={() => setViewMode('list')}>
              Back to Assessments
            </Button>
          </div>
        </div>

        {/* Add / Edit Question Form Card */}
        <div className="clay-card p-6 sm:p-8 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b border-[#CBD5E1]/60 pb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#2C51A2]">
              {editingQuestionId ? 'Edit Question Item' : 'Add New Question to Bank'}
            </h4>
            {editingQuestionId && (
              <Button variant="ghost" size="sm" onClick={resetQuestionForm}>
                Cancel Edit
              </Button>
            )}
          </div>

          <form onSubmit={handleSaveQuestion} className="space-y-4 w-full">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#172B4D] mb-1.5">
                  Question Type
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs font-bold text-[#172B4D] cursor-pointer">
                    <input
                      type="radio"
                      name="qtype"
                      value="multiple_choice"
                      checked={questionFormData.question_type === 'multiple_choice'}
                      onChange={() => handleQuestionTypeChange('multiple_choice')}
                      className="accent-[#2C51A2]"
                    />
                    Multiple Choice
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-[#172B4D] cursor-pointer">
                    <input
                      type="radio"
                      name="qtype"
                      value="true_false"
                      checked={questionFormData.question_type === 'true_false'}
                      onChange={() => handleQuestionTypeChange('true_false')}
                      className="accent-[#2C51A2]"
                    />
                    True / False
                  </label>
                </div>
              </div>

              <div>
                <Input
                  label="Marks"
                  type="number"
                  min="1"
                  max="50"
                  value={questionFormData.marks}
                  onChange={(e) => setQuestionFormData({ ...questionFormData, marks: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#172B4D] mb-1.5">
                Question Text <span className="text-[#DC2626]">*</span>
              </label>
              <textarea
                rows={2}
                className="w-full text-[#172B4D] text-sm p-3.5 rounded-xl focus:outline-none clay-input"
                placeholder="Enter the question statement clearly..."
                value={questionFormData.question_text}
                onChange={(e) => setQuestionFormData({ ...questionFormData, question_text: e.target.value })}
                required
              />
            </div>

            {/* Options Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#2C51A2]">
                  Answer Options (Select the correct answer)
                </label>
                {questionFormData.question_type === 'multiple_choice' && (
                  <Button variant="ghost" size="sm" type="button" icon={Plus} onClick={handleAddOption}>
                    Add Option
                  </Button>
                )}
              </div>

              <div className="space-y-2.5">
                {questionFormData.options.map((opt, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 bg-white border border-[#CBD5E1] rounded-xl clay-pill"
                  >
                    <input
                      type="radio"
                      name="correct_option"
                      checked={opt.is_correct === 1}
                      onChange={() => handleCorrectOptionSelect(idx)}
                      className="w-4 h-4 accent-[#2C51A2] cursor-pointer"
                      title="Mark as correct answer"
                    />
                    <input
                      type="text"
                      value={opt.option_text}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                      placeholder={`Option ${idx + 1}`}
                      disabled={questionFormData.question_type === 'true_false'}
                      className="flex-1 bg-transparent text-sm text-[#172B4D] font-bold focus:outline-none"
                      required
                    />
                    {questionFormData.question_type === 'multiple_choice' && questionFormData.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx)}
                        className="text-[#DC2626] hover:text-[#B91C1C] p-1"
                        title="Remove option"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Input
                label="Explanation / Rationale (Optional, shown after exam)"
                placeholder="Provide brief reasoning for the correct response..."
                value={questionFormData.explanation}
                onChange={(e) => setQuestionFormData({ ...questionFormData, explanation: e.target.value })}
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="primary" size="md" type="submit" disabled={isSavingQuestion}>
                {isSavingQuestion ? 'Saving Question...' : editingQuestionId ? 'Update Question' : 'Save Question to Bank'}
              </Button>
            </div>
          </form>
        </div>

        {/* Configured Questions List Card */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#2C51A2]">
            Configured Items ({activeAssessment?.questions?.length || 0})
          </h4>

          {activeAssessment?.questions?.length === 0 ? (
            <div className="p-6 clay-card rounded-2xl text-center space-y-3">
              <p className="text-xs text-[#64748B] italic">
                No questions added to this assessment yet. Use the form above to formulate items or import directly from a quiz file.
              </p>
              <Button
                variant="primary"
                size="sm"
                icon={Upload}
                onClick={() => handleOpenImportIntoAssessment(activeAssessment)}
              >
                Import Questions from File
              </Button>
            </div>
          ) : (
            activeAssessment?.questions?.map((q, idx) => (
              <div
                key={q.id}
                className="clay-card p-5 sm:p-6 rounded-2xl flex flex-col sm:flex-row items-start justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest bg-[#2C51A2] text-white px-2.5 py-0.5 rounded-full clay-pill">
                      Q{idx + 1}
                    </span>
                    <span className="text-xs font-bold text-[#64748B]">
                      {q.question_type === 'true_false' ? 'True / False' : 'Multiple Choice'} • {q.marks} {q.marks > 1 ? 'Marks' : 'Mark'}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-[#172B4D] leading-relaxed">{q.question_text}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1.5">
                    {q.options?.map((opt) => (
                      <div
                        key={opt.id}
                        className={`text-xs px-3.5 py-2 border rounded-xl flex items-center justify-between ${
                          opt.is_correct === 1
                            ? 'bg-[#E2E9F4] border-[#BFDBFE] text-[#1E3B78] font-bold'
                            : 'bg-white/80 border-[#E2E8F0] text-[#64748B]'
                        }`}
                      >
                        <span>{opt.option_text}</span>
                        {opt.is_correct === 1 && <span className="text-[10px] uppercase font-extrabold text-[#1E3B78]">Correct</span>}
                      </div>
                    ))}
                  </div>

                  {q.explanation && (
                    <p className="text-[11px] text-[#64748B] italic pt-1">
                      Rationale: {q.explanation}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="secondary" size="sm" icon={Edit} onClick={() => handleEditQuestion(q)}>
                    Edit
                  </Button>
                  <Button variant="danger" size="sm" icon={Trash2} onClick={() => handleDeleteQuestion(q.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner with Minimal Clay Surface */}
      <div className="clay-card p-6 sm:p-7 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#2C51A2] text-white px-2.5 py-0.5 rounded-full clay-pill">
              Evaluation Studio
            </span>
            <span className="text-xs text-[#64748B]">Knowledge Verification Engine</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#172B4D] uppercase tracking-wide mt-1.5">
            Course Assessments & Question Banks
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5 max-w-2xl leading-relaxed">
            Formulate objective quizzes, configure passing thresholds, establish attempt policies, and maintain item banks.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="primary" size="sm" icon={Upload} onClick={() => handleOpenCreateModal('import')}>
            Import Assessment (Primary)
          </Button>
          <Button variant="secondary" size="sm" icon={Plus} onClick={() => handleOpenCreateModal('manual')}>
            Create Manually
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar with Minimal Clay Surface */}
      <div className="clay-card p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="w-full sm:w-64">
            <Select
              value={selectedCourseFilter}
              onChange={(e) => setSelectedCourseFilter(e.target.value)}
              options={[
                { value: '', label: 'All Authored Courses' },
                ...courses.map((c) => ({ value: c.id, label: c.title })),
              ]}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Input
              placeholder="Search assessments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={Search}
            />
          </div>
          <Button variant="secondary" size="md" onClick={fetchAssessments}>
            Filter
          </Button>
        </div>
      </div>

      {/* Assessments Grid with Minimal Clay Elevation */}
      <div className="space-y-4">
        {loading ? (
          <div className="clay-card p-12 rounded-2xl text-center text-xs font-semibold text-[#64748B]">
            Loading assessment inventory...
          </div>
        ) : assessments.length === 0 ? (
          <div className="clay-card p-12 rounded-2xl text-center">
            <Award className="w-12 h-12 text-[#94A3B8] mx-auto mb-3" />
            <h3 className="text-sm font-bold text-[#172B4D] uppercase tracking-wide">
              No Assessments Configured
            </h3>
            <p className="text-xs text-[#64748B] mt-1 mb-4">
              Create an assessment to attach evaluations to your authored training programs.
            </p>
            <div className="flex items-center justify-center gap-2.5">
              <Button variant="primary" size="sm" icon={Upload} onClick={() => handleOpenCreateModal('import')}>
                Import Assessment (Primary)
              </Button>
              <Button variant="secondary" size="sm" icon={Plus} onClick={() => handleOpenCreateModal('manual')}>
                Create Manually
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {assessments.map((a) => (
              <div
                key={a.id}
                className="clay-card p-6 sm:p-7 rounded-2xl clay-card-hover"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-2 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-[#EFF6FF] text-[#2C51A2] px-2.5 py-0.5 rounded-full border border-[#BFDBFE] clay-pill">
                        {a.course_title}
                      </span>
                      <Badge variant={a.is_active == 1 ? 'success' : 'default'}>
                        {a.is_active == 1 ? 'Active Exam' : 'Draft / Inactive'}
                      </Badge>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-[#172B4D] uppercase tracking-wide">
                      {a.title}
                    </h3>
                    {a.description && (
                      <p className="text-xs text-[#64748B] line-clamp-2 leading-relaxed">
                        {a.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-[#64748B]">
                      <span className="flex items-center gap-1 font-bold text-[#172B4D]">
                        <HelpCircle className="w-3.5 h-3.5 text-[#2C51A2]" />
                        {a.total_questions || 0} Questions ({a.total_marks || 0} Marks)
                      </span>
                      <span className="flex items-center gap-1 font-bold text-[#172B4D]">
                        <Clock className="w-3.5 h-3.5 text-[#2C51A2]" />
                        {a.time_limit_minutes} Min Limit
                      </span>
                      <span className="flex items-center gap-1 font-bold text-[#172B4D]">
                        <CheckCircle className="w-3.5 h-3.5 text-[#2C51A2]" />
                        Passing Standard: {parseFloat(a.passing_percentage).toFixed(0)}%
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-[#64748B]">
                        Max Attempts: {a.max_attempts}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <Button
                      variant="primary"
                      size="sm"
                      icon={Layers}
                      onClick={() => handleOpenQuestionsModal(a)}
                    >
                      Question Bank ({a.total_questions || 0})
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={Edit}
                      onClick={() => handleOpenEditModal(a)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      icon={Trash2}
                      onClick={() => handleDeleteAssessment(a.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AssessmentBuilder;
