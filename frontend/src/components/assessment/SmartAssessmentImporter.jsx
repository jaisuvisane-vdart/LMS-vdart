import React, { useState, useRef, useEffect } from 'react';
import { useDialog } from '../../contexts/DialogContext';
import assessmentService from '../../services/assessmentService';
import { downloadBlobFile } from '../../utils/downloadHelper';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';
import Badge from '../common/Badge';
import {
  Upload,
  FileSpreadsheet,
  FileText,
  FileDown,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  X,
  Trash2,
  Plus,
  RefreshCw,
  Clock,
  Layers,
  Award,
  BookOpen,
  Filter
} from 'lucide-react';

/**
 * Smart Assessment Importer
 * Four-step enterprise quiz import workflow supporting Excel (.xlsx), CSV (.csv), Word (.docx), and text PDF (.pdf)
 */
const SmartAssessmentImporter = ({
  courses = [],
  selectedCourseId = '',
  targetAssessment = null,
  onSuccess,
  onCancel,
  onSwitchToManual
}) => {
  const { showAlert, showConfirm } = useDialog();

  // Wizard Steps: 1 (Upload) | 2 (Processing) | 3 (Preview & Edit) | 4 (Confirm)
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Upload Configuration
  const [courseId, setCourseId] = useState(
    targetAssessment?.course_id || selectedCourseId || (courses[0]?.id || '')
  );
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Step 2 & 3: Extraction & Preview Data
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingMessage, setProcessingMessage] = useState('Initializing extraction engine...');

  const [sessionToken, setSessionToken] = useState('');
  const [originalFilename, setOriginalFilename] = useState('');
  const [fileFormat, setFileFormat] = useState('');
  const [summary, setSummary] = useState({
    total_questions: 0,
    valid_questions: 0,
    invalid_questions: 0,
    total_marks: 0,
    type_breakdown: { multiple_choice: 0, true_false: 0 }
  });
  const [questions, setQuestions] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'valid' | 'invalid'

  // Step 4: Assessment Metadata Confirmation Form
  const [assessmentMeta, setAssessmentMeta] = useState({
    title: targetAssessment?.title || '',
    description: targetAssessment?.description || '',
    passing_percentage: targetAssessment?.passing_percentage || 80,
    time_limit_minutes: targetAssessment?.time_limit_minutes || 30,
    max_attempts: targetAssessment?.max_attempts || 1
  });
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    if (targetAssessment?.course_id) {
      setCourseId(targetAssessment.course_id);
    } else if (selectedCourseId) {
      setCourseId(selectedCourseId);
    } else if (courses.length > 0 && !courseId) {
      setCourseId(courses[0].id);
    }
  }, [targetAssessment, selectedCourseId, courses]);

  // Handle Drag & Drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleValidateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleValidateAndSetFile(e.target.files[0]);
    }
  };

  const handleValidateAndSetFile = (file) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    const allowed = ['xlsx', 'csv', 'docx', 'pdf'];

    if (!allowed.includes(ext)) {
      showAlert({
        title: 'Unsupported File Format',
        message: 'Please choose an Excel (.xlsx), CSV (.csv), Word (.docx), or searchable PDF (.pdf) file.',
        type: 'warning'
      });
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      showAlert({
        title: 'File Limit Exceeded',
        message: 'The selected file exceeds the 20 MB size limit.',
        type: 'warning'
      });
      return;
    }

    setSelectedFile(file);
  };

  // Download Standard Templates
  const handleDownloadTemplate = async (format) => {
    try {
      const res = await assessmentService.downloadImportTemplate(format);
      const mimeTypes = {
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        csv: 'text/csv;charset=utf-8;'
      };
      const mime = mimeTypes[format] || 'application/octet-stream';
      downloadBlobFile(res, `quiz_import_template.${format}`, mime);
    } catch (err) {
      showAlert({
        title: 'Template Download Failed',
        message: 'Error generating standard quiz template: ' + (err.message || 'Unknown error'),
        type: 'error'
      });
    }
  };

  // Step 1 -> Step 2: Upload and Analyze
  const handleStartAnalysis = async () => {
    if (!courseId) {
      showAlert({
        title: 'Course Selection Required',
        message: 'Please select a training course to associate with this imported assessment.',
        type: 'warning'
      });
      return;
    }

    if (!selectedFile) {
      showAlert({
        title: 'File Required',
        message: 'Please select a quiz file (.xlsx, .csv, .docx, .pdf) to upload.',
        type: 'warning'
      });
      return;
    }

    setCurrentStep(2);
    setIsProcessing(true);
    setProcessingProgress(15);
    setProcessingMessage('Uploading quiz document to secure storage...');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('course_id', targetAssessment ? targetAssessment.course_id : courseId);
      if (targetAssessment?.id) {
        formData.append('assessment_id', targetAssessment.id);
      }

      setProcessingProgress(45);
      setProcessingMessage('Unpacking document and extracting question items...');

      const res = await assessmentService.uploadQuizFile(formData);

      if (res.status === 'success') {
        setProcessingProgress(85);
        setProcessingMessage('Running validation rules and normalizing answer options...');

        setTimeout(() => {
          setProcessingProgress(100);
          setSessionToken(res.data.session_token);
          setOriginalFilename(res.data.original_filename);
          setFileFormat(res.data.file_format);
          setSummary(res.data.summary);
          setQuestions(res.data.items || []);

          if (!targetAssessment) {
            // Generate default title based on filename for new assessment
            const cleanName = res.data.original_filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
            const formattedTitle = cleanName.charAt(0).toUpperCase() + cleanName.slice(1) + ' Quiz';
            setAssessmentMeta((prev) => ({
              ...prev,
              title: formattedTitle,
              description: `Automated smart import from ${res.data.original_filename}.`
            }));
          }

          setIsProcessing(false);
          setCurrentStep(3);
        }, 500);
      } else {
        throw new Error(res.message || 'Error processing document');
      }
    } catch (err) {
      setIsProcessing(false);
      setCurrentStep(1);
      showAlert({
        title: 'Document Analysis Error',
        message: err.response?.data?.message || err.message || 'Unable to parse quiz document.',
        type: 'error'
      });
    }
  };

  // Step 3: Question Review & Inline Editing
  const handleUpdateQuestionField = async (itemNumber, field, value) => {
    // Optimistically update locally
    const updated = questions.map((q) => {
      if (q.item_number === itemNumber) {
        return { ...q, [field]: value };
      }
      return q;
    });
    setQuestions(updated);

    // Synchronize with backend session
    try {
      const targetQ = updated.find((q) => q.item_number === itemNumber);
      const res = await assessmentService.updateImportedQuestion(sessionToken, itemNumber, targetQ);
      if (res.status === 'success') {
        setQuestions(res.data.items);
        setSummary(res.data.summary);
      }
    } catch (err) {
      console.error('Failed to sync question edit with server:', err);
    }
  };

  const handleSelectCorrectOption = async (itemNumber, optionIdx) => {
    const updated = questions.map((q) => {
      if (q.item_number === itemNumber) {
        const newOpts = q.options.map((opt, i) => ({
          ...opt,
          is_correct: i === optionIdx ? 1 : 0
        }));
        return { ...q, options: newOpts };
      }
      return q;
    });
    setQuestions(updated);

    try {
      const targetQ = updated.find((q) => q.item_number === itemNumber);
      const res = await assessmentService.updateImportedQuestion(sessionToken, itemNumber, targetQ);
      if (res.status === 'success') {
        setQuestions(res.data.items);
        setSummary(res.data.summary);
      }
    } catch (err) {
      console.error('Failed to sync correct option with server:', err);
    }
  };

  const handleToggleExclude = async (itemNumber) => {
    const targetQ = questions.find((q) => q.item_number === itemNumber);
    if (!targetQ) return;
    const newExcluded = !targetQ.is_excluded;

    handleUpdateQuestionField(itemNumber, 'is_excluded', newExcluded);
  };

  // Filtered view items
  const filteredQuestions = questions.filter((q) => {
    if (activeFilter === 'valid') return q.is_valid && !q.is_excluded;
    if (activeFilter === 'invalid') return !q.is_valid;
    return true;
  });

  const activeIncludedCount = questions.filter((q) => !q.is_excluded).length;
  const activeBlockingCount = questions.filter((q) => !q.is_excluded && !q.is_valid).length;

  // Step 3 -> Step 4
  const handleProceedToConfirm = () => {
    if (activeIncludedCount === 0) {
      showAlert({
        title: 'No Questions Included',
        message: 'Please include at least one valid question item to import.',
        type: 'warning'
      });
      return;
    }

    if (activeBlockingCount > 0) {
      showAlert({
        title: 'Validation Errors Remaining',
        message: `There are ${activeBlockingCount} question(s) with errors. Please resolve the errors or exclude those questions before confirming.`,
        type: 'warning'
      });
      return;
    }

    setCurrentStep(4);
  };

  // Step 4: Final Confirmation & Persistence
  const handleConfirmImport = async () => {
    const finalTitle = targetAssessment ? targetAssessment.title : assessmentMeta.title.trim();
    if (!finalTitle) {
      showAlert({
        title: 'Title Required',
        message: 'Please provide an assessment title before finalizing the import.',
        type: 'warning'
      });
      return;
    }

    try {
      setIsConfirming(true);
      const payload = {
        session_token: sessionToken,
        assessment_id: targetAssessment?.id || null,
        title: finalTitle,
        description: targetAssessment ? (targetAssessment.description || '') : assessmentMeta.description.trim(),
        passing_percentage: targetAssessment ? targetAssessment.passing_percentage : assessmentMeta.passing_percentage,
        time_limit_minutes: targetAssessment ? targetAssessment.time_limit_minutes : assessmentMeta.time_limit_minutes,
        max_attempts: targetAssessment ? targetAssessment.max_attempts : assessmentMeta.max_attempts
      };

      const res = await assessmentService.confirmImport(payload);
      if (res.status === 'success') {
        showAlert({
          title: 'Import Successful',
          message: targetAssessment
            ? `Successfully appended ${res.data.imported_count} questions into "${targetAssessment.title}".`
            : `Successfully imported ${res.data.imported_count} questions into the assessment. The assessment has been saved in DRAFT status.`,
          type: 'success'
        });
        if (onSuccess) {
          onSuccess(res.data.assessment);
        }
      } else {
        throw new Error(res.message || 'Error confirming assessment import');
      }
    } catch (err) {
      showAlert({
        title: 'Import Confirmation Failed',
        message: err.response?.data?.message || err.message || 'Error saving assessment.',
        type: 'error'
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancelSession = async () => {
    const confirmed = await showConfirm({
      title: 'Cancel Assessment Import',
      message: 'Are you sure you want to discard this import session and all extracted questions?',
      confirmText: 'Discard Import',
      type: 'confirm'
    });
    if (!confirmed) return;

    if (sessionToken) {
      try {
        await assessmentService.cancelImport(sessionToken);
      } catch (e) {
        // ignore
      }
    }
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Creation Mode Selector (Primary: Import from File / Switcher to Manual Entry) */}
      <div className="clay-card p-6 sm:p-7 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#2C51A2] text-white px-2.5 py-0.5 rounded-full clay-pill">
              Assessment Creation Mode
            </span>
            <span className="text-xs text-[#64748B]">Automated Quiz Formulator</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#172B4D] uppercase tracking-wide mt-1.5">
            Smart Assessment Importer (Primary)
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5 max-w-2xl leading-relaxed">
            Upload quiz spreadsheets or documents to automatically extract, validate, and formulate question banks.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            size="md"
            icon={Plus}
            onClick={onSwitchToManual}
            title="Switch to manual step-by-step form entry"
          >
            Switch to Manual Creation
          </Button>
          <Button
            variant="secondary"
            size="md"
            icon={ArrowLeft}
            onClick={onCancel}
          >
            Back to Assessments
          </Button>
        </div>
      </div>

      {/* Stepper Wizard Indicator */}
      <div className="clay-card p-4 sm:p-5 rounded-2xl">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {[
            { num: 1, label: 'Upload Quiz File', sub: 'Select or drop document' },
            { num: 2, label: 'Extraction Engine', sub: 'Automatic question detection' },
            { num: 3, label: 'Review & Edit', sub: 'Validate and refine items' },
            { num: 4, label: 'Confirm & Save', sub: 'Transactional question persistence' }
          ].map((s) => {
            const isPassed = currentStep > s.num;
            const isCurrent = currentStep === s.num;
            return (
              <div
                key={s.num}
                className={`p-3.5 border rounded-xl flex items-center gap-3 transition-all duration-150 ${
                  isCurrent
                    ? 'bg-[#EFF6FF] border-[#2C51A2] text-[#172B4D] shadow-xs'
                    : isPassed
                    ? 'bg-white border-[#CBD5E1] text-[#2C51A2]'
                    : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#94A3B8]'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                    isCurrent
                      ? 'bg-[#2C51A2] text-white shadow-xs'
                      : isPassed
                      ? 'bg-[#1E3B78] text-white'
                      : 'bg-[#E2E8F0] text-[#64748B]'
                  }`}
                >
                  {isPassed ? <CheckCircle className="w-4 h-4" /> : s.num}
                </div>
                <div className="min-w-0">
                  <div className="font-bold uppercase tracking-wider text-[11px] truncate">
                    {s.label}
                  </div>
                  <div className="text-[10px] text-[#64748B] truncate">{s.sub}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP 1: UPLOAD DOCUMENT */}
      {currentStep === 1 && (
        <div className="clay-card p-6 sm:p-8 rounded-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
            <div>
              <h3 className="text-base font-bold text-[#172B4D] uppercase tracking-wide">
                Step 1: Upload Quiz Document
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Supported formats: Microsoft Excel (.xlsx), Comma Separated Values (.csv), Word (.docx), and text PDF (.pdf)
              </p>
            </div>

            {/* Template Download Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mr-1">
                Download Templates:
              </span>
              <button
                type="button"
                onClick={() => handleDownloadTemplate('xlsx')}
                className="text-[11px] font-bold px-3.5 py-1.5 bg-[#EFF6FF] text-[#2C51A2] border border-[#BFDBFE] hover:bg-[#DBEAFE] flex items-center gap-1.5 transition-colors rounded-xl shadow-xs"
                title="Download formatted Excel template"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Excel (.xlsx)
              </button>
              <button
                type="button"
                onClick={() => handleDownloadTemplate('csv')}
                className="text-[11px] font-bold px-3.5 py-1.5 bg-[#EFF6FF] text-[#2C51A2] border border-[#BFDBFE] hover:bg-[#DBEAFE] flex items-center gap-1.5 transition-colors rounded-xl shadow-xs"
                title="Download formatted CSV template"
              >
                <FileText className="w-3.5 h-3.5" />
                CSV (.csv)
              </button>
              <button
                type="button"
                onClick={() => handleDownloadTemplate('docx')}
                className="text-[11px] font-bold px-3.5 py-1.5 bg-[#EFF6FF] text-[#2C51A2] border border-[#BFDBFE] hover:bg-[#DBEAFE] flex items-center gap-1.5 transition-colors rounded-xl shadow-xs"
                title="Download formatted Word template"
              >
                <FileDown className="w-3.5 h-3.5" />
                Word (.docx)
              </button>
            </div>
          </div>

          {/* Target Course / Assessment Indicator */}
          <div className="max-w-md">
            {targetAssessment ? (
              <div className="p-4 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#2C51A2] block">
                  Target Assessment Bank
                </span>
                <p className="text-xs font-bold text-[#172B4D] mt-0.5">
                  {targetAssessment.title}
                </p>
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  Course: {courses.find((c) => String(c.id) === String(targetAssessment.course_id))?.title || targetAssessment.course_title || 'Current Course'}
                </p>
              </div>
            ) : (
              <Select
                label="Associated Training Course"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                options={courses.map((c) => ({ value: c.id, label: c.title }))}
                required
              />
            )}
          </div>

          {/* Drag & Drop Upload Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-colors ${
              isDragging
                ? 'border-[#2C51A2] bg-[#EFF6FF]'
                : selectedFile
                ? 'border-[#2C51A2] bg-[#EFF6FF]'
                : 'border-[#CBD5E1] bg-[#F8FAFC] hover:bg-[#EFF6FF]/50 hover:border-[#2C51A2]'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".xlsx,.csv,.docx,.pdf"
              className="hidden"
            />

            <div className="max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 bg-white border border-[#CBD5E1] rounded-full flex items-center justify-center mx-auto text-[#2C51A2] shadow-xs">
                <Upload className="w-6 h-6" />
              </div>

              {selectedFile ? (
                <div>
                  <span className="text-xs font-bold text-[#2C51A2] block uppercase tracking-wider">
                    Selected File Ready for Analysis
                  </span>
                  <div className="text-sm font-bold text-[#172B4D] mt-1 break-all">
                    {selectedFile.name}
                  </div>
                  <div className="text-xs text-[#64748B] mt-0.5 font-mono">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {selectedFile.name.split('.').pop()?.toUpperCase()}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-sm font-bold text-[#172B4D] uppercase tracking-wide">
                    Drag and drop your quiz file here, or click to browse
                  </div>
                  <p className="text-xs text-[#64748B] mt-1">
                    Accepts Excel (.xlsx), CSV (.csv), Word (.docx), and text-based PDF (.pdf) up to 20 MB.
                  </p>
                </div>
              )}

              <div className="pt-2">
                <Button
                  variant={selectedFile ? 'secondary' : 'primary'}
                  size="sm"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  {selectedFile ? 'Change File' : 'Browse Files'}
                </Button>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between">
            <Button variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              icon={ArrowRight}
              disabled={!selectedFile || !courseId}
              onClick={handleStartAnalysis}
            >
              Upload & Analyze Document
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: EXTRACTION IN PROGRESS */}
      {currentStep === 2 && (
        <div className="clay-card p-10 sm:p-12 rounded-2xl text-center space-y-6 max-w-xl mx-auto shadow-sm">
          <div className="w-14 h-14 bg-[#EFF6FF] border border-[#BFDBFE] rounded-full flex items-center justify-center mx-auto text-[#2C51A2] animate-pulse shadow-xs">
            <RefreshCw className="w-7 h-7 animate-spin" />
          </div>

          <div className="space-y-2">
            <h3 className="text-base font-bold text-[#172B4D] uppercase tracking-wide">
              Document Analysis Engine Running
            </h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              {processingMessage}
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="w-full bg-[#E2E8F0] h-3 rounded-full overflow-hidden">
              <div
                className="bg-[#2C51A2] h-full rounded-full transition-all duration-300"
                style={{ width: `${processingProgress}%` }}
              />
            </div>
            <div className="text-[11px] font-mono text-[#64748B] text-right">
              {processingProgress}% Complete
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: PREVIEW & INTERACTIVE EDITING */}
      {currentStep === 3 && (
        <div className="space-y-6">
          {/* Summary KPI Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="clay-card p-5 rounded-2xl border-t-4 border-[#2C51A2] clay-card-hover">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#64748B] block">
                Total Detected
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#172B4D] mt-1.5">
                {summary.total_questions}
              </div>
              <span className="text-xs text-[#64748B] mt-0.5 block">Document Question Items</span>
            </div>

            <div className="clay-card p-5 rounded-2xl border-t-4 border-[#1E3B78] clay-card-hover">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#1E3B78] block">
                Valid Questions
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#1E3B78] mt-1.5">
                {summary.valid_questions}
              </div>
              <span className="text-xs text-[#64748B] mt-0.5 block">Ready for Import</span>
            </div>

            <div className="clay-card p-5 rounded-2xl border-t-4 border-[#DC2626] clay-card-hover">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#DC2626] block">
                Needs Review
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#DC2626] mt-1.5">
                {summary.invalid_questions}
              </div>
              <span className="text-xs text-[#64748B] mt-0.5 block">Contains Issues</span>
            </div>

            <div className="clay-card p-5 rounded-2xl border-t-4 border-[#D97706] clay-card-hover">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#D97706] block">
                Total Marks
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#D97706] mt-1.5">
                {summary.total_marks}
              </div>
              <span className="text-xs text-[#64748B] mt-0.5 block">Cumulative Score</span>
            </div>
          </div>

          {/* Filter Toolbar & Actions */}
          <div className="clay-card p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider mr-1">
                Filter Items:
              </span>
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-full clay-pill transition-all ${
                  activeFilter === 'all'
                    ? 'bg-[#2C51A2] text-white shadow-xs'
                    : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]'
                }`}
              >
                All ({questions.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('valid')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-full clay-pill transition-all ${
                  activeFilter === 'valid'
                    ? 'bg-[#1E3B78] text-white shadow-xs'
                    : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]'
                }`}
              >
                Valid Only ({summary.valid_questions})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('invalid')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-full clay-pill transition-all ${
                  activeFilter === 'invalid'
                    ? 'bg-[#DC2626] text-white shadow-xs'
                    : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]'
                }`}
              >
                Needs Review ({summary.invalid_questions})
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-[#172B4D] bg-[#EFF6FF] text-[#2C51A2] px-3.5 py-1.5 rounded-full border border-[#BFDBFE] clay-pill">
              <span>Active for Import: <strong>{activeIncludedCount}</strong> Questions</span>
              {activeBlockingCount > 0 && (
                <span className="text-[#DC2626] ml-2 font-semibold">
                  ({activeBlockingCount} blocking error{activeBlockingCount > 1 ? 's' : ''})
                </span>
              )}
            </div>
          </div>

          {/* Questions Review List */}
          <div className="space-y-4">
            {filteredQuestions.length === 0 ? (
              <div className="clay-card p-12 text-center text-xs text-[#64748B]">
                No questions match the current filter criteria.
              </div>
            ) : (
              filteredQuestions.map((q) => {
                const isExcluded = !!q.is_excluded;
                const isValid = !!q.is_valid;

                return (
                  <div
                    key={q.item_number}
                    className={`clay-card p-6 sm:p-7 rounded-2xl transition-all border ${
                      isExcluded
                        ? 'opacity-60 bg-[#F8FAFC] border-[#E2E8F0]'
                        : !isValid
                        ? 'bg-[#FEF2F2]/40 border-[#FECACA]'
                        : 'border-[#CBD5E1]'
                    }`}
                  >
                    {/* Item Top Toolbar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-[#2C51A2] text-white text-[10px] font-extrabold uppercase tracking-widest rounded-full clay-pill">
                          Item #{q.item_number}
                        </span>
                        <Badge variant={isValid ? 'success' : 'error'}>
                          {isValid ? 'Valid' : 'Needs Review'}
                        </Badge>
                        <span className="text-[10px] font-bold text-[#64748B] uppercase px-2.5 py-0.5 rounded-full border border-[#E2E8F0] bg-white clay-pill">
                          {q.question_type === 'true_false' ? 'True / False' : 'Multiple Choice'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-xs font-bold text-[#172B4D] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!isExcluded}
                            onChange={() => handleToggleExclude(q.item_number)}
                            className="w-4 h-4 accent-[#2C51A2] cursor-pointer"
                          />
                          Include in Assessment
                        </label>
                      </div>
                    </div>

                    {/* Validation Warnings */}
                    {!isValid && q.validation_errors?.length > 0 && (
                      <div className="p-3.5 bg-[#FEF2F2] border border-[#FECACA] rounded-xl mb-4 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#DC2626] uppercase">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>Validation Issues (Correction Required):</span>
                        </div>
                        <ul className="list-disc list-inside text-xs text-[#991B1B] pl-1 font-medium space-y-0.5">
                          {q.validation_errors.map((err, errIdx) => (
                            <li key={errIdx}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Question Content Editor */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#172B4D] mb-1.5">
                          Question Text
                        </label>
                        <textarea
                          rows={2}
                          value={q.question_text}
                          onChange={(e) => handleUpdateQuestionField(q.item_number, 'question_text', e.target.value)}
                          disabled={isExcluded}
                          className="w-full text-sm font-semibold text-[#172B4D] p-3.5 border border-[#CBD5E1] bg-white rounded-xl focus:outline-none focus:border-[#2C51A2] clay-input"
                          placeholder="Enter question statement..."
                        />
                      </div>

                      {/* Options & Correct Answer Radio Selection */}
                      <div className="space-y-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#2C51A2]">
                          Options (Select radio button for the correct answer)
                        </label>

                        <div className="space-y-2.5">
                          {q.options?.map((opt, optIdx) => {
                            const isCorrect = opt.is_correct === 1;
                            return (
                              <div
                                key={optIdx}
                                className={`flex items-center gap-3 p-3.5 border rounded-xl clay-pill transition-colors ${
                                  isCorrect
                                    ? 'bg-[#EFF6FF] border-[#2C51A2] shadow-xs'
                                    : 'bg-white border-[#CBD5E1]'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`correct_opt_${q.item_number}`}
                                  checked={isCorrect}
                                  onChange={() => handleSelectCorrectOption(q.item_number, optIdx)}
                                  disabled={isExcluded}
                                  className="w-4 h-4 accent-[#2C51A2] cursor-pointer shrink-0"
                                  title="Mark as correct answer"
                                />

                                <span className="text-xs font-mono font-bold text-[#2C51A2] shrink-0">
                                  {opt.key || String.fromCharCode(65 + optIdx)})
                                </span>

                                <input
                                  type="text"
                                  value={opt.option_text}
                                  onChange={(e) => {
                                    const newOpts = [...q.options];
                                    newOpts[optIdx] = { ...newOpts[optIdx], option_text: e.target.value };
                                    handleUpdateQuestionField(q.item_number, 'options', newOpts);
                                  }}
                                  disabled={isExcluded || q.question_type === 'true_false'}
                                  placeholder={`Option ${opt.key || optIdx + 1} text`}
                                  className="flex-1 bg-transparent text-xs font-semibold text-[#172B4D] focus:outline-none"
                                />

                                {isCorrect && (
                                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#2C51A2] px-2.5 py-0.5 bg-[#DBEAFE] border border-[#BFDBFE] rounded-full clay-pill shrink-0">
                                    Correct Choice
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Marks & Explanation Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-[#172B4D] mb-1">
                            Marks
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="50"
                            value={q.marks}
                            onChange={(e) => handleUpdateQuestionField(q.item_number, 'marks', e.target.value)}
                            disabled={isExcluded}
                            className="w-full text-xs font-bold text-[#172B4D] p-2.5 border border-[#CBD5E1] bg-white rounded-xl focus:outline-none focus:border-[#2C51A2] clay-input"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="block text-xs font-bold uppercase tracking-wider text-[#172B4D] mb-1">
                            Explanation / Rationale (Optional)
                          </label>
                          <input
                            type="text"
                            value={q.explanation || ''}
                            onChange={(e) => handleUpdateQuestionField(q.item_number, 'explanation', e.target.value)}
                            disabled={isExcluded}
                            placeholder="Explanation shown after examination..."
                            className="w-full text-xs text-[#172B4D] p-2.5 border border-[#CBD5E1] bg-white rounded-xl focus:outline-none focus:border-[#2C51A2] clay-input"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Step 3 Navigation Action Bar */}
          <div className="clay-card p-4 sm:p-5 rounded-2xl flex items-center justify-between shadow-xs">
            <Button variant="secondary" onClick={handleCancelSession}>
              Discard Import
            </Button>

            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                size="md"
                icon={ArrowRight}
                disabled={activeIncludedCount === 0 || activeBlockingCount > 0}
                onClick={handleProceedToConfirm}
              >
                Proceed to Confirmation ({activeIncludedCount} Questions)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: CONFIRMATION & ASSESSMENT FORM */}
      {currentStep === 4 && (
        <div className="clay-card p-6 sm:p-8 rounded-2xl space-y-6 max-w-2xl mx-auto shadow-sm">
          <div className="border-b border-[#E2E8F0] pb-4">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#2C51A2] block">
              Step 4: Finalize Import
            </span>
            <h3 className="text-base font-bold text-[#172B4D] uppercase tracking-wide mt-1">
              Configure Assessment Details
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              Review parameters before persisting imported questions into the database question bank.
            </p>
          </div>

          {/* Batch Summary Box */}
          <div className="p-5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl space-y-2.5 text-xs">
            {targetAssessment && (
              <div className="flex justify-between font-bold text-[#172B4D]">
                <span>Target Assessment:</span>
                <span className="text-[#2C51A2]">{targetAssessment.title}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-[#172B4D]">
              <span>Source Document:</span>
              <span className="font-mono text-[#2C51A2]">{originalFilename} ({fileFormat.toUpperCase()})</span>
            </div>
            <div className="flex justify-between font-bold text-[#172B4D]">
              <span>Questions to Import:</span>
              <span>{activeIncludedCount} Questions</span>
            </div>
            <div className="flex justify-between font-bold text-[#172B4D]">
              <span>Cumulative Marks:</span>
              <span>{questions.filter((q) => !q.is_excluded).reduce((acc, q) => acc + (parseInt(q.marks) || 1), 0)} Marks</span>
            </div>
            <div className="flex justify-between font-bold text-[#1E3B78] pt-2 border-t border-[#BFDBFE]">
              <span>Status:</span>
              <span className="uppercase">
                {targetAssessment ? 'Appended to Active Question Bank' : 'Draft (Instructor Publication Required)'}
              </span>
            </div>
          </div>

          {/* Assessment Form Fields (Only for new assessments) */}
          {targetAssessment ? (
            <div className="p-5 bg-white border border-[#CBD5E1] rounded-xl space-y-2 text-xs clay-card">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#2C51A2] block">
                Target Assessment Configuration
              </span>
              <p className="font-bold text-sm text-[#172B4D]">{targetAssessment.title}</p>
              <p className="text-[#64748B]">
                Passing Standard: {targetAssessment.passing_percentage}% | Time Limit: {targetAssessment.time_limit_minutes} Min | Max Attempts: {targetAssessment.max_attempts}
              </p>
              <p className="text-xs text-[#2C51A2] font-semibold pt-1">
                These {activeIncludedCount} questions will be appended to this assessment's question bank.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <Input
                label="Assessment Title"
                value={assessmentMeta.title}
                onChange={(e) => setAssessmentMeta({ ...assessmentMeta, title: e.target.value })}
                required
              />

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#172B4D] mb-1.5">
                  Description / Exam Instructions
                </label>
                <textarea
                  rows={3}
                  value={assessmentMeta.description}
                  onChange={(e) => setAssessmentMeta({ ...assessmentMeta, description: e.target.value })}
                  className="w-full text-xs text-[#172B4D] p-3.5 border border-[#CBD5E1] bg-white rounded-xl focus:outline-none focus:border-[#2C51A2] clay-input"
                  placeholder="Instructions regarding examination duration and requirements..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  label="Passing Benchmark (%)"
                  type="number"
                  min="1"
                  max="100"
                  value={assessmentMeta.passing_percentage}
                  onChange={(e) => setAssessmentMeta({ ...assessmentMeta, passing_percentage: e.target.value })}
                  required
                />
                <Input
                  label="Time Limit (Min)"
                  type="number"
                  min="5"
                  max="180"
                  value={assessmentMeta.time_limit_minutes}
                  onChange={(e) => setAssessmentMeta({ ...assessmentMeta, time_limit_minutes: e.target.value })}
                  required
                />
                <Input
                  label="Max Attempts"
                  type="number"
                  min="1"
                  max="10"
                  value={assessmentMeta.max_attempts}
                  onChange={(e) => setAssessmentMeta({ ...assessmentMeta, max_attempts: e.target.value })}
                  required
                />
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between">
            <Button variant="secondary" onClick={() => setCurrentStep(3)}>
              Back to Review
            </Button>
            <Button
              variant="primary"
              size="md"
              loading={isConfirming}
              onClick={handleConfirmImport}
            >
              {targetAssessment ? 'Confirm & Append Questions' : 'Confirm & Save Assessment'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartAssessmentImporter;
