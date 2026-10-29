import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useDialog } from '../../contexts/DialogContext';
import courseService from '../../services/courseService';
import progressService from '../../services/progressService';
import assessmentService from '../../services/assessmentService';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import ProgressBar from '../../components/common/ProgressBar';
import AnimatedNumber from '../../components/common/AnimatedNumber';
import {
  ArrowLeft,
  CheckCircle,
  Circle,
  Clock,
  Paperclip,
  Video,
  FileText,
  FileDown,
  ArrowRight,
  ShieldCheck,
  Award,
  Eye,
  Lock,
  ChevronLeft,
  ChevronRight,
  X,
  ExternalLink,
  AlertCircle,
  Check,
  Menu,
  BookOpen,
  Search,
  Table,
  FileSpreadsheet,
  Send,
  ShieldAlert,
  HelpCircle,
  XCircle,
  FileCheck
} from 'lucide-react';

const CoursePlayer = () => {
  const { showAlert, showConfirm } = useDialog();
  const { courseId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [progressData, setProgressData] = useState({ progress_map: {}, assignment: null });
  const [activeLesson, setActiveLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [showMobileSyllabus, setShowMobileSyllabus] = useState(false);

  // In-Page Secure Certification Quiz State
  const [isQuizActive, setIsQuizActive] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState('');
  const [quizAttemptData, setQuizAttemptData] = useState(null);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizCurrentIdx, setQuizCurrentIdx] = useState(0);
  const [quizTimeLeft, setQuizTimeLeft] = useState(0);
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState(null);
  const [tabViolations, setTabViolations] = useState(0);
  const [unansweredHighlighted, setUnansweredHighlighted] = useState(false);

  // Proctoring and Timer Refs
  const tabViolationsRef = useRef(0);
  const lastViolationTimeRef = useRef(0);
  const isSubmittingQuizRef = useRef(false);
  const quizTimerRef = useRef(null);

  // In-Page Material Viewer State
  const [previewMaterial, setPreviewMaterial] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [currentSheetIndex, setCurrentSheetIndex] = useState(0);
  const [sheetSearch, setSheetSearch] = useState('');
  const [videoSpeed, setVideoSpeed] = useState(1);
  const videoRef = useRef(null);
  const [sessionViewedLessons, setSessionViewedLessons] = useState(new Set());

  // Flatten all lessons into linear sequence for next/prev navigation
  const [allLessons, setAllLessons] = useState([]);

  // Active 60-Second Timer State (starts after user starts viewing material)
  const [hasStartedViewingMaterial, setHasStartedViewingMaterial] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(60);
  const [timeSpent, setTimeSpent] = useState(0);
  const timerRef = useRef(null);

  const loadCourseData = async () => {
    try {
      setLoading(true);
      const [courseRes, progRes] = await Promise.all([
        courseService.getCourse(courseId),
        progressService.getCourseProgress(courseId),
      ]);

      if (courseRes.status === 'success' && progRes.status === 'success') {
        const c = courseRes.data;
        const p = progRes.data;
        setCourse(c);
        setProgressData(p);

        // Linear curriculum lessons
        let linear = [];
        if (c.lessons && Array.isArray(c.lessons) && c.lessons.length > 0) {
          linear = c.lessons;
        } else if (c.modules && Array.isArray(c.modules)) {
          c.modules.forEach((mod) => {
            (mod.lessons || []).forEach((les) => {
              linear.push({ ...les, module_title: mod.title });
            });
          });
        }
        setAllLessons(linear);

        // Determine Initial / Resumed Lesson
        const explicitLessonId = searchParams.get('lessonId');
        let initialLesson = null;

        if (explicitLessonId) {
          initialLesson = linear.find((l) => String(l.id) === String(explicitLessonId));
        }

        // Automatic smart resume: pick first incomplete lesson
        if (!initialLesson) {
          if (p.resumed_lesson_id) {
            initialLesson = linear.find((l) => l.id === p.resumed_lesson_id);
          }
          if (!initialLesson) {
            initialLesson = linear.find((l) => p.progress_map?.[l.id]?.is_completed !== 1) || linear[0];
          }
        }

        if (linear.length > 0) {
          setActiveLesson(initialLesson || linear[0]);
        }
      }
    } catch (err) {
      console.error('Error loading course player:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (courseId) {
      loadCourseData();
    }
  }, [courseId]);

  // When active lesson changes, reset preview viewer and check material status
  useEffect(() => {
    setPreviewMaterial(null);
    setPreviewData(null);
    setCurrentSlideIndex(0);
    setCurrentSheetIndex(0);
    setSheetSearch('');
    setVideoSpeed(1);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (!activeLesson) return;

    const isAlreadyCompleted = progressData.progress_map?.[activeLesson.id]?.is_completed === 1;
    const recordedTime = progressData.progress_map?.[activeLesson.id]?.time_spent_seconds || 0;
    const lessonHasMaterials = (activeLesson.materials || []).length > 0;

    if (isAlreadyCompleted) {
      setSecondsRemaining(0);
      setTimeSpent(Math.max(60, recordedTime));
      setHasStartedViewingMaterial(true);
      return;
    }

    const initialRemaining = Math.max(0, 60 - recordedTime);
    setSecondsRemaining(initialRemaining);
    setTimeSpent(recordedTime);

    // If lesson has NO materials, learner can begin timer immediately upon reading content.
    // If lesson HAS materials, the timer starts ONLY after user starts viewing the material.
    if (!lessonHasMaterials) {
      setHasStartedViewingMaterial(true);
    } else {
      setHasStartedViewingMaterial(false);
    }
  }, [activeLesson?.id, progressData.progress_map?.[activeLesson?.id]?.is_completed]);

  // Active Timer Effect: Runs ONLY when user has started viewing the material
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (!activeLesson || !hasStartedViewingMaterial) return;

    const isAlreadyCompleted = progressData.progress_map?.[activeLesson.id]?.is_completed === 1;
    if (isAlreadyCompleted) return;

    if (secondsRemaining <= 0) return;

    let currentSecs = secondsRemaining;
    let currentTotal = timeSpent;

    timerRef.current = setInterval(() => {
      currentSecs -= 1;
      currentTotal += 1;

      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });

      setTimeSpent((prev) => prev + 1);

      // Periodically sync study duration with server every 15 seconds
      if (currentTotal > 0 && currentTotal % 15 === 0) {
        progressService.recordTimeSpent(activeLesson.id, currentTotal).catch(() => {});
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [hasStartedViewingMaterial, activeLesson?.id]);

  // --------------------------------------------------------------------------
  // In-Page Certification Examination Proctoring & Tab Switch Lockdown
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!isQuizActive || !quizAttemptData || quizResult) return;

    const handleTabViolation = () => {
      if (isSubmittingQuizRef.current || !isQuizActive || !quizAttemptData || quizResult) return;

      const now = Date.now();
      // Debounce rapid multi-events firing simultaneously within 2000ms
      if (now - lastViolationTimeRef.current < 2000) return;
      lastViolationTimeRef.current = now;

      tabViolationsRef.current += 1;
      const count = tabViolationsRef.current;
      setTabViolations(count);

      if (count === 1) {
        // Attempt 1: Warn the user that tab switching is prohibited
        showAlert({
          title: 'Proctoring Warning: Tab Switch Prohibited',
          message: 'You are not allowed to switch tabs or leave the examination window during the test. If you attempt to switch tabs a second time, the test will be immediately closed and submitted.',
          type: 'warning',
        });
      } else if (count >= 2) {
        // Attempt 2: Test is immediately closed and submitted
        showAlert({
          title: 'Examination Terminated: Tab Switch Violation',
          message: 'You attempted to switch tabs a second time. In accordance with examination rules, your test has been closed and automatically submitted.',
          type: 'error',
        });

        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }

        executeQuizSubmission(true, count);
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleTabViolation();
      }
    };

    const onWindowBlur = () => {
      handleTabViolation();
    };

    const onFullscreenChange = () => {
      // If user exits fullscreen while exam is active and not submitted
      if (!document.fullscreenElement && isQuizActive && !quizResult && !isSubmittingQuizRef.current) {
        handleTabViolation();
      }
    };

    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onWindowBlur);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onWindowBlur);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [isQuizActive, quizAttemptData, quizResult]);

  // Content Copy & Tab-Switching Keyboard Prevention Listener
  useEffect(() => {
    if (!isQuizActive || !quizAttemptData || quizResult) return;

    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();

      // Block tab switching hotkeys (Ctrl+Tab, Ctrl+Shift+Tab, Ctrl+PageUp, Ctrl+PageDown)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'Tab' || e.key === 'PageUp' || e.key === 'PageDown')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Block new tab (Ctrl+T), new window (Ctrl+N), close tab (Ctrl+W)
      if ((e.ctrlKey || e.metaKey) && ['t', 'n', 'w'].includes(key)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Block browser reload (F5, Ctrl+R)
      if (e.key === 'F5' || ((e.ctrlKey || e.metaKey) && key === 'r')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Block Escape and F11 to preserve locked fullscreen examination
      if (e.key === 'F11' || e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Block browser history traversal (Alt+Left, Alt+Right)
      if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Block copy, cut, paste, save, print, view-source, select-all shortcuts
      if ((e.ctrlKey || e.metaKey) && ['c', 'x', 'v', 'u', 'p', 's', 'a'].includes(key)) {
        e.preventDefault();
        e.stopPropagation();
        showAlert({
          title: 'Action Prohibited',
          message: 'Copying, pasting, saving, printing, or inspecting examination content is disabled by exam security policy.',
          type: 'warning',
        });
        return false;
      }

      // Block F12 and DevTools shortcuts
      if (
        e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].includes(key))
      ) {
        e.preventDefault();
        e.stopPropagation();
        showAlert({
          title: 'Action Prohibited',
          message: 'Developer inspection tools are strictly disabled during the examination.',
          type: 'warning',
        });
        return false;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isQuizActive, quizAttemptData, quizResult]);

  // Examination Countdown Clock Effect
  useEffect(() => {
    if (quizTimerRef.current) {
      clearInterval(quizTimerRef.current);
      quizTimerRef.current = null;
    }

    if (!isQuizActive || !quizAttemptData || quizResult || quizTimeLeft <= 0) return;

    quizTimerRef.current = setInterval(() => {
      setQuizTimeLeft((prev) => {
        if (prev <= 1) {
          if (quizTimerRef.current) {
            clearInterval(quizTimerRef.current);
            quizTimerRef.current = null;
          }
          showAlert({
            title: 'Time Expired',
            message: 'Examination time has expired! Your responses are being submitted automatically.',
            type: 'warning',
          });
          executeQuizSubmission(true, tabViolationsRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (quizTimerRef.current) {
        clearInterval(quizTimerRef.current);
        quizTimerRef.current = null;
      }
    };
  }, [isQuizActive, quizAttemptData, quizResult, quizTimeLeft]);

  // Examination Launch & Submission Handlers
  const handleStartInPageExam = async () => {
    if (!courseAssessment) return;
    if (currentProgressPercent < 100) {
      showAlert({
        title: 'Examination Locked',
        message: 'Prerequisite Required: You must complete 100% of the course curriculum before taking the certification examination.',
        type: 'warning',
      });
      return;
    }
    try {
      setQuizLoading(true);
      setQuizError('');
      setIsQuizActive(true);
      setShowMobileSyllabus(false);

      // Enter fullscreen lockdown mode to conceal browser tabs and UI chrome
      if (document.documentElement.requestFullscreen) {
        try {
          await document.documentElement.requestFullscreen();
        } catch (fsErr) {
          console.warn('Fullscreen request bypassed or prohibited by client:', fsErr);
        }
      }

      const res = await assessmentService.startAttempt(courseAssessment.id);
      if (res.status === 'success') {
        const data = res.data;
        setQuizAttemptData(data);
        const fetchedQuestions = data.assessment?.questions || [];
        setQuizQuestions(fetchedQuestions);
        setQuizTimeLeft(data.remaining_seconds || (courseAssessment.time_limit_minutes * 60) || 1800);
        setQuizCurrentIdx(0);
        setQuizAnswers({});
        setUnansweredHighlighted(false);
        tabViolationsRef.current = 0;
        setTabViolations(0);
        isSubmittingQuizRef.current = false;
      } else {
        throw new Error(res.message || 'Failed to start examination');
      }
    } catch (err) {
      console.error('Failed to start in-page exam:', err);
      setQuizError(err.response?.data?.message || err.message || 'Error starting examination session');
      showAlert({
        title: 'Unable to Start Exam',
        message: err.response?.data?.message || err.message || 'Error initializing examination session.',
        type: 'error',
      });
    } finally {
      setQuizLoading(false);
    }
  };

  const handleViewInPageExamScorecard = async () => {
    if (!courseAssessment?.last_attempt_id) {
      navigate('/learner/assessments');
      return;
    }
    try {
      setQuizLoading(true);
      setQuizError('');
      setIsQuizActive(true);
      setShowMobileSyllabus(false);

      const res = await assessmentService.getAttemptResult(courseAssessment.last_attempt_id);
      if (res.status === 'success') {
        setQuizResult(res.data);
      } else {
        throw new Error(res.message || 'Failed to fetch scorecard');
      }
    } catch (err) {
      console.error('Failed to load scorecard:', err);
      showAlert({
        title: 'Scorecard Notice',
        message: err.response?.data?.message || err.message || 'Unable to load examination scorecard.',
        type: 'error',
      });
    } finally {
      setQuizLoading(false);
    }
  };

  const executeQuizSubmission = async (isForced = false, violationsCount = 0) => {
    if (!quizAttemptData || isSubmittingQuizRef.current) return;
    try {
      isSubmittingQuizRef.current = true;
      setQuizSubmitting(true);

      // Release fullscreen lockdown on examination completion
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }

      const answersArray = Object.entries(quizAnswers).map(([qId, oId]) => ({
        question_id: parseInt(qId, 10),
        selected_option_id: parseInt(oId, 10),
      }));

      const res = await assessmentService.submitAttempt(
        quizAttemptData.attempt_id,
        answersArray,
        violationsCount || tabViolationsRef.current
      );

      if (res.status === 'success') {
        setQuizResult(res.data);
        const progRes = await progressService.getCourseProgress(courseId);
        if (progRes.status === 'success') {
          setProgressData(progRes.data);
        }
        const courseRes = await courseService.getCourse(courseId);
        if (courseRes.status === 'success') {
          setCourse(courseRes.data);
        }
      } else {
        throw new Error(res.message || 'Error submitting examination');
      }
    } catch (err) {
      console.error('Quiz submission error:', err);
      showAlert({
        title: 'Submission Error',
        message: err.response?.data?.message || err.message || 'An error occurred while evaluating your examination.',
        type: 'error',
      });
    } finally {
      isSubmittingQuizRef.current = false;
      setQuizSubmitting(false);
    }
  };

  const handleQuizSubmitClick = async () => {
    if (!quizAttemptData || quizSubmitting) return;

    const answeredCount = Object.keys(quizAnswers).length;
    const totalQuestions = quizQuestions.length;

    // Strict Mandatory Question Rule: Every question must have an answer
    if (answeredCount < totalQuestions) {
      setUnansweredHighlighted(true);
      const firstUnansweredIdx = quizQuestions.findIndex(
        (q) => quizAnswers[q.id] === undefined
      );
      if (firstUnansweredIdx !== -1) {
        setQuizCurrentIdx(firstUnansweredIdx);
      }
      showAlert({
        title: 'All Questions Are Mandatory',
        message: `You have answered ${answeredCount} of ${totalQuestions} questions. Every question in this certification examination is mandatory. Please answer question ${firstUnansweredIdx + 1} and all remaining questions before submitting.`,
        type: 'warning',
      });
      return;
    }

    const confirmed = await showConfirm({
      title: 'Confirm Examination Submission',
      message: `You have answered all ${totalQuestions} mandatory questions. Once submitted, your examination responses will be audited and cannot be modified. Proceed with final submission?`,
      confirmText: 'Submit Examination',
      type: 'confirm',
    });

    if (confirmed) {
      executeQuizSubmission(false, tabViolationsRef.current);
    }
  };

  const formatQuizTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentLessonIndex = allLessons.findIndex((l) => l.id === activeLesson?.id);
  const isLessonCompleted = activeLesson ? progressData.progress_map?.[activeLesson.id]?.is_completed === 1 : false;
  const currentProgressPercent = progressData.assignment?.progress_percentage ?? 0;
  const courseAssessment = progressData?.assessment || course?.assessment;

  // Material Requirement Check
  const hasMaterials = (activeLesson?.materials || []).length > 0;
  const isMaterialViewed =
    progressData.progress_map?.[activeLesson?.id]?.material_viewed === 1 ||
    sessionViewedLessons.has(activeLesson?.id) ||
    isLessonCompleted;

  // Sequential Gating Check: A lesson at index `idx` is unlocked iff all preceding lessons (0..idx-1) are completed
  const isLessonUnlocked = (lessonIndex) => {
    if (lessonIndex <= 0) return true;
    for (let i = 0; i < lessonIndex; i++) {
      const prior = allLessons[i];
      if (!prior) continue;
      const isPriorComplete = progressData.progress_map?.[prior.id]?.is_completed === 1;
      if (!isPriorComplete) {
        return false;
      }
    }
    return true;
  };

  // Lesson Completion Eligibility: timer must be satisfied (0s left, material view started) AND material viewed (if applicable)
  const isTimerSatisfied = (secondsRemaining === 0 && hasStartedViewingMaterial) || isLessonCompleted;
  const isMaterialSatisfied = !hasMaterials || isMaterialViewed;
  const canCompleteLesson = isTimerSatisfied && isMaterialSatisfied;

  const handleToggleLessonComplete = async () => {
    if (!activeLesson) return;
    const isCurrentlyCompleted = progressData.progress_map?.[activeLesson.id]?.is_completed === 1;

    if (!isCurrentlyCompleted) {
      if (hasMaterials && !hasStartedViewingMaterial) {
        showAlert({
          title: 'Prerequisite Required',
          message: 'You must view the attached material first to start the 60-second study duration.',
          type: 'warning',
        });
        return;
      }
      if (secondsRemaining > 0) {
        showAlert({
          title: 'Duration Required',
          message: `Please spend at least ${secondsRemaining} more seconds reviewing the lesson material.`,
          type: 'info',
        });
        return;
      }
      if (hasMaterials && !isMaterialViewed) {
        showAlert({
          title: 'Prerequisite Required',
          message: 'You must open and view the attached technical material before completing this lesson.',
          type: 'warning',
        });
        return;
      }
    }

    setCompleting(true);

    try {
      let res;
      if (isCurrentlyCompleted) {
        res = await progressService.uncompleteLesson(activeLesson.id);
      } else {
        const finalSpent = Math.max(60, timeSpent);
        res = await progressService.completeLesson(activeLesson.id, finalSpent);
      }

      if (res.status === 'success') {
        const progRes = await progressService.getCourseProgress(courseId);
        if (progRes.status === 'success') {
          setProgressData(progRes.data);
        }
      } else {
        showAlert({
          title: 'Progress Update',
          message: res.message || 'Error updating lesson progress',
          type: 'error',
        });
      }
    } catch (err) {
      showAlert({
        title: 'Progress Error',
        message: err.response?.data?.message || err.message || 'Error updating lesson progress',
        type: 'error',
      });
    } finally {
      setCompleting(false);
    }
  };

  const handleCompleteAndNext = async () => {
    if (!activeLesson) return;
    if (!canCompleteLesson) return;

    setCompleting(true);
    try {
      const finalSpent = Math.max(60, timeSpent);
      const res = await progressService.completeLesson(activeLesson.id, finalSpent);

      if (res.status === 'success') {
        const progRes = await progressService.getCourseProgress(courseId);
        if (progRes.status === 'success') {
          setProgressData(progRes.data);
        }

        // Advance to next lesson in sequence
        const curIdx = allLessons.findIndex((l) => l.id === activeLesson.id);
        if (curIdx < allLessons.length - 1) {
          setActiveLesson(allLessons[curIdx + 1]);
        }
      } else {
        showAlert({
          title: 'Progress Update',
          message: res.message || 'Error updating lesson progress',
          type: 'error',
        });
      }
    } catch (err) {
      showAlert({
        title: 'Navigation Error',
        message: err.response?.data?.message || err.message || 'Error advancing lesson',
        type: 'error',
      });
    } finally {
      setCompleting(false);
    }
  };

  const handleViewMaterial = async (mat) => {
    setPreviewMaterial(mat);
    setCurrentSlideIndex(0);
    setCurrentSheetIndex(0);
    setSheetSearch('');
    setVideoSpeed(1);
    setPreviewLoading(true);

    // Starting to view the material triggers the 60-second study countdown
    setHasStartedViewingMaterial(true);

    try {
      await progressService.recordMaterialView(activeLesson.id);
      setSessionViewedLessons((prev) => new Set([...prev, activeLesson.id]));

      setProgressData((prev) => ({
        ...prev,
        progress_map: {
          ...prev.progress_map,
          [activeLesson.id]: {
            ...(prev.progress_map?.[activeLesson.id] || {}),
            material_viewed: 1,
          },
        },
      }));
    } catch (err) {
      console.warn('Failed to record material view on server:', err);
    }

    try {
      const res = await courseService.getMaterialPreview(mat.id);
      if (res.status === 'success') {
        setPreviewData(res.data);
      }
    } catch (err) {
      console.error('Failed to load material preview:', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleCloseViewer = () => {
    setPreviewMaterial(null);
    setPreviewData(null);
    setCurrentSheetIndex(0);
    setSheetSearch('');
    setVideoSpeed(1);
  };

  const handleNextLesson = () => {
    if (!activeLesson || allLessons.length === 0) return;
    if (!isLessonCompleted) {
      showAlert({
        title: 'Prerequisite Required',
        message: 'You must complete the current lesson before advancing to the next lesson.',
        type: 'warning',
      });
      return;
    }
    const currentIndex = allLessons.findIndex((l) => l.id === activeLesson.id);
    if (currentIndex < allLessons.length - 1) {
      setActiveLesson(allLessons[currentIndex + 1]);
    }
  };

  const handlePrevLesson = () => {
    if (!activeLesson || allLessons.length === 0) return;
    const currentIndex = allLessons.findIndex((l) => l.id === activeLesson.id);
    if (currentIndex > 0) {
      setActiveLesson(allLessons[currentIndex - 1]);
    }
  };

  const handleSelectLesson = async (lesson, index) => {
    if (isQuizActive && quizAttemptData && !quizResult) {
      const confirmLeave = await showConfirm({
        title: 'Active Examination in Progress',
        message: 'You have an active examination session in progress. Navigating away will leave your exam session. Do you wish to return to this lesson unit?',
        confirmText: 'Leave Examination',
        type: 'confirm',
      });
      if (!confirmLeave) return;
    }
    if (!isLessonUnlocked(index)) {
      showAlert({
        title: 'Prerequisite Required',
        message: 'You must complete all prior lessons in sequence before accessing this lesson.',
        type: 'warning',
      });
      return;
    }
    setIsQuizActive(false);
    setActiveLesson(lesson);
    setShowMobileSyllabus(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation Bar */}
      <div data-aos="fade-down" className="clay-card p-4 sm:p-5 rounded-2xl border border-white/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/learner/courses')}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1E3B78] hover:text-[#2C51A2] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Assigned Courses</span>
          </button>

          {/* Mobile Syllabus Toggle Button */}
          <button
            onClick={() => setShowMobileSyllabus((prev) => !prev)}
            className="lg:hidden ml-2 flex items-center gap-1.5 px-3 py-1.5 clay-btn-secondary text-[#1E3B78] rounded-xl text-xs font-bold uppercase tracking-wider"
          >
            <Menu className="w-3.5 h-3.5" />
            <span>{showMobileSyllabus ? 'Hide Syllabus' : 'View Syllabus'}</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wide">Overall Progress:</span>
            <span className="text-xs font-extrabold text-[#1E3B78]"><AnimatedNumber value={currentProgressPercent} suffix="%" /></span>
            <div className="w-24 sm:w-32">
              <ProgressBar value={currentProgressPercent} height="h-2" />
            </div>
          </div>
          {course?.course_type === 'non_certified' ? (
            currentProgressPercent >= 100 ? (
              <div className="clay-pill text-[10px] font-bold uppercase tracking-wider text-[#1E3B78] bg-[#E2E9F4] px-3 py-1.5 rounded-full border border-[#BCD0EC] flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-[#2C51A2]" />
                <span>Training Completed</span>
              </div>
            ) : (
              <div className="clay-pill text-[10px] font-bold uppercase tracking-wider text-[#64748B] bg-[#F1F5F9] px-3 py-1.5 rounded-full border border-[#CBD5E1]">
                Non-Certified Program
              </div>
            )
          ) : currentProgressPercent < 100 ? (
            <Button
              variant="outline"
              size="sm"
              icon={Lock}
              disabled
              className="opacity-75 cursor-not-allowed text-[#64748B] border-[#CBD5E1]"
              title="Prerequisite Required: Complete 100% of the course curriculum to unlock the certification exam."
            >
              Exam Locked (Complete Course)
            </Button>
          ) : courseAssessment ? (
            courseAssessment.attempts_taken > 0 || quizResult ? (
              <Button
                variant="outline"
                size="sm"
                icon={CheckCircle}
                onClick={handleViewInPageExamScorecard}
              >
                View Exam Scorecard
              </Button>
            ) : (
              <Button
                variant="navy"
                size="sm"
                icon={Award}
                onClick={handleStartInPageExam}
              >
                Take Certification Exam
              </Button>
            )
          ) : (
            <div className="clay-pill text-[10px] font-bold uppercase tracking-wider text-[#1E3B78] bg-[#E2E9F4] px-3 py-1.5 rounded-full border border-[#CBD5E1]">
              Curriculum Complete
            </div>
          )}
        </div>
      </div>

      {/* Non-Certified Course 100% Completed Banner */}
      {!loading && course && course.course_type === 'non_certified' && currentProgressPercent >= 100 && (
        <div className="clay-card p-5 rounded-2xl border border-[#BCD0EC] bg-gradient-to-r from-[#EFF6FF] to-[#E2E9F4] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#2C51A2] text-white flex items-center justify-center shrink-0 shadow-sm">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1E3B78] uppercase tracking-wide">
                Training Completed
              </h3>
              <p className="text-xs text-[#2C51A2] mt-0.5">
                You have successfully completed all curriculum lessons for {course.title}. This course is non-certified; no exam or certificate is issued.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/learner/courses')}
            className="shrink-0 text-[#1E3B78] border-[#BCD0EC] hover:bg-[#E2E9F4]"
          >
            Return to Courses
          </Button>
        </div>
      )}

      {/* Certified Course 100% Completed & Certification Exam Ready / Scorecard Banner */}
      {!loading && course && course.course_type !== 'non_certified' && currentProgressPercent >= 100 && courseAssessment && (
        courseAssessment.attempts_taken > 0 ? (
          <div className="clay-card p-5 rounded-2xl border border-[#CBD5E1] bg-[#F8FAFC] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#E2E9F4] text-[#1E3B78] flex items-center justify-center shrink-0">
                <CheckCircle className="w-6 h-6 text-[#2C51A2]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1E3B78] uppercase tracking-wide">
                  Certification Exam Completed (1 of 1 Attempt Used)
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  You have completed your single allowed attempt for {course.title}. Click below to review your performance scorecard.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={CheckCircle}
              onClick={handleViewInPageExamScorecard}
              className="shrink-0"
            >
              View Exam Scorecard
            </Button>
          </div>
        ) : (
          <div className="clay-card p-5 rounded-2xl border border-[#2C51A2]/30 bg-gradient-to-r from-[#EFF6FF] to-[#DBEAFE] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#2C51A2] text-white flex items-center justify-center shrink-0 shadow-md">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1E3B78] uppercase tracking-wide">
                  Curriculum Completed - Certification Exam Unlocked
                </h3>
                <p className="text-xs text-[#475569] mt-0.5">
                  You have fulfilled all curriculum requirements. Proceed to your single-attempt certification examination ({courseAssessment.time_limit_minutes} minutes, {courseAssessment.passing_percentage}% pass benchmark).
                </p>
              </div>
            </div>
            <Button
              variant="navy"
              size="md"
              icon={Award}
              onClick={handleStartInPageExam}
              className="shrink-0 shadow-sm"
            >
              Launch Certification Exam
            </Button>
          </div>
        )
      )}

      {loading ? (
        <div className="p-12 text-center text-xs font-semibold text-[#64748B] clay-card rounded-2xl border border-white/60">
          Loading course curriculum...
        </div>
      ) : !course ? (
        <div className="p-12 text-center clay-card rounded-2xl border border-white/60">
          Course not found.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* LEFT SYLLABUS ACCORDION (1 Col on Desktop, Collapsible on Mobile) */}
          <div data-aos="fade-right" data-aos-delay="150" className={`lg:block ${showMobileSyllabus ? 'block' : 'hidden'} clay-card rounded-2xl border border-white/60 overflow-hidden`}>
            <div className="p-4 sm:p-5 bg-gradient-to-r from-[#1E3B78] to-[#2C51A2] text-white">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#93C5FD]">
                  {course.category}
                </span>
                <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  course.course_type === 'certified' || !course.course_type
                    ? 'bg-blue-400/30 text-blue-100 border border-blue-300/40'
                    : 'bg-white/20 text-white/90 border border-white/30'
                }`}>
                  {course.course_type === 'non_certified' ? 'Non-Certified' : 'Certified'}
                </span>
              </div>
              <h2 className="text-sm font-bold text-white mt-1 leading-snug">
                {course.title}
              </h2>
              <div className="mt-3 pt-3 border-t border-white/20 space-y-1">
                <div className="flex justify-between text-[11px] font-semibold text-[#CBD5E1]">
                  <span>Curriculum Completed</span>
                  <span><AnimatedNumber value={currentProgressPercent} suffix="%" /></span>
                </div>
                <ProgressBar value={currentProgressPercent} height="h-2" />
              </div>
            </div>

            <div className="p-3.5 bg-[#F3F6FB]/80 border-b border-[#E2E8F0]/60 text-[11px] font-bold uppercase tracking-wider text-[#1E3B78] flex items-center justify-between">
              <span>Course Syllabus ({allLessons.length} Lessons)</span>
              <BookOpen className="w-3.5 h-3.5 text-[#2C51A2]" />
            </div>

            {/* Direct Curriculum Lessons List */}
            <div className="divide-y divide-[#E2E8F0]/60 max-h-[600px] overflow-y-auto touch-scroll p-2.5 space-y-1">
              {allLessons.map((lesson, lessonGlobalIdx) => {
                const isComplete = progressData.progress_map?.[lesson.id]?.is_completed === 1;
                const isActive = activeLesson?.id === lesson.id && !isQuizActive;
                const isUnlocked = isLessonUnlocked(lessonGlobalIdx);
                const isLocked = !isUnlocked;

                return (
                  <button
                    key={lesson.id}
                    onClick={() => handleSelectLesson(lesson, lessonGlobalIdx)}
                    className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between text-xs transition-all ${
                      isActive
                        ? 'bg-[#E2E9F4] text-[#1E3B78] font-bold shadow-inner'
                        : isLocked
                        ? 'text-[#94A3B8] bg-[#F8FAFC]/50 cursor-not-allowed opacity-75'
                        : 'text-[#172B4D] hover:bg-[#F3F6FB] font-medium'
                    }`}
                    title={isLocked ? 'Prerequisite Required: Complete previous lessons in sequence to unlock' : lesson.title}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span className="text-[10px] font-mono font-bold text-[#64748B] w-4 shrink-0">
                        {lessonGlobalIdx + 1}.
                      </span>
                      {isComplete ? (
                        <CheckCircle className="w-4 h-4 shrink-0 text-[#2C51A2]" />
                      ) : isLocked ? (
                        <Lock className="w-3.5 h-3.5 shrink-0 text-[#94A3B8]" />
                      ) : (
                        <Circle className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#2C51A2]' : 'text-[#94A3B8]'}`} />
                      )}
                      <span className="truncate">{lesson.title}</span>
                    </div>
                    <span className={`text-[10px] shrink-0 font-medium ${isActive ? 'text-[#1E3B78] font-bold' : 'text-[#64748B]'}`}>
                      {lesson.duration_minutes}m
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Final Certification Examination Milestone in Syllabus */}
            {course?.course_type !== 'non_certified' && courseAssessment && (
              <div className="p-2.5 pt-3 border-t border-[#E2E8F0]/60">
                <button
                  type="button"
                  onClick={() => {
                    if (currentProgressPercent < 100) {
                      showAlert({
                        title: 'Certification Examination Locked',
                        message: 'Prerequisite Required: Complete 100% of the course curriculum lessons and study materials to unlock the certification examination.',
                        type: 'warning',
                      });
                      return;
                    }
                    if (courseAssessment.attempts_taken > 0 || quizResult) {
                      handleViewInPageExamScorecard();
                    } else {
                      handleStartInPageExam();
                    }
                  }}
                  className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between text-xs transition-all cursor-pointer ${
                    isQuizActive
                      ? 'bg-[#1E3B78] text-white font-bold shadow-md'
                      : currentProgressPercent < 100
                      ? 'text-[#94A3B8] bg-[#F8FAFC]/50 cursor-not-allowed opacity-75'
                      : 'bg-[#EFF6FF] text-[#1E3B78] hover:bg-[#DBEAFE] font-bold border border-[#BFDBFE]'
                  }`}
                  title={
                    currentProgressPercent < 100
                      ? 'Prerequisite Required: Complete 100% of curriculum to unlock'
                      : 'Final Certification Examination'
                  }
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    {courseAssessment.attempts_taken > 0 || quizResult ? (
                      <CheckCircle className={`w-4 h-4 shrink-0 ${isQuizActive ? 'text-white' : 'text-[#2C51A2]'}`} />
                    ) : currentProgressPercent < 100 ? (
                      <Lock className="w-3.5 h-3.5 shrink-0 text-[#94A3B8]" />
                    ) : (
                      <Award className={`w-4 h-4 shrink-0 ${isQuizActive ? 'text-white' : 'text-[#2C51A2]'}`} />
                    )}
                    <span className="truncate">Certification Examination</span>
                  </div>
                  <span
                    className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      isQuizActive
                        ? 'bg-white text-[#1E3B78]'
                        : currentProgressPercent < 100
                        ? 'bg-[#E2E9F4] text-[#64748B]'
                        : courseAssessment.attempts_taken > 0 || quizResult
                        ? 'bg-[#E2E9F4] text-[#1E3B78]'
                        : 'bg-[#2C51A2] text-white'
                    }`}
                  >
                    {courseAssessment.attempts_taken > 0 || quizResult
                      ? 'Completed'
                      : currentProgressPercent < 100
                      ? 'Locked'
                      : 'Unlocked'}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* RIGHT MAIN LEARNING STAGE (3 Cols) */}
          <div data-aos="fade-left" data-aos-delay="150" className="lg:col-span-3 space-y-6">
            {isQuizActive ? (
              <div className="space-y-6">
                {quizLoading ? (
                  <div className="clay-card p-12 rounded-2xl border border-white/60 text-center">
                    <Clock className="w-8 h-8 text-[#2C51A2] animate-spin mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-[#1E3B78] uppercase tracking-wide">
                      Initializing Secure Examination Environment
                    </h3>
                    <p className="text-xs text-[#64748B] mt-1">
                      Generating randomized questions and options for this certification session...
                    </p>
                  </div>
                ) : quizResult ? (
                  /* IN-PAGE SCORECARD VIEW */
                  <div className="clay-card p-6 sm:p-8 rounded-2xl border border-white/60 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
                      <div>
                        <span className="clay-pill text-[10px] font-bold uppercase tracking-widest bg-[#2C51A2] text-white px-2.5 py-0.5 rounded-full">
                          Examination Scorecard
                        </span>
                        <h2 className="text-xl font-bold text-[#1E3B78] mt-1">
                          {courseAssessment?.title || 'Certification Examination Result'}
                        </h2>
                        <p className="text-xs text-[#64748B] mt-0.5">
                          Official performance audit for {course.title}
                        </p>
                      </div>
                      <Badge
                        variant={quizResult.is_passed ? 'success' : 'danger'}
                        size="md"
                      >
                        {quizResult.is_passed ? 'PASSED & CERTIFIED' : 'BENCHMARK NOT MET'}
                      </Badge>
                    </div>

                    {/* Outcome Banner */}
                    <div
                      className={`p-5 rounded-2xl border ${
                        quizResult.is_passed
                          ? 'bg-[#F0FDF4] border-[#86EFAC] text-[#166534]'
                          : 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
                      } flex items-start gap-4`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-white shadow-xs flex items-center justify-center shrink-0 mt-0.5">
                        {quizResult.is_passed ? (
                          <CheckCircle className="w-6 h-6 text-[#16A34A]" />
                        ) : (
                          <XCircle className="w-6 h-6 text-[#DC2626]" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider">
                          {quizResult.is_passed
                            ? 'Congratulations! Examination Successfully Passed'
                            : 'Certification Benchmark Not Achieved'}
                        </h3>
                        <p className="text-xs mt-1 leading-relaxed opacity-90">
                          {quizResult.is_passed
                            ? `You achieved ${quizResult.percentage}%, satisfying the ${quizResult.passing_percentage}% benchmark. Your official credential has been registered.`
                            : `You achieved ${quizResult.percentage}%, which is below the mandatory ${quizResult.passing_percentage}% passing benchmark.`}
                        </p>
                      </div>
                    </div>

                    {/* Score Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="p-4 rounded-xl bg-white border border-[#CBD5E1] text-center shadow-xs">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Score Percentage</div>
                        <div className={`text-xl font-mono font-bold mt-1 ${quizResult.is_passed ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                          <AnimatedNumber value={quizResult.percentage} suffix="%" />
                        </div>
                      </div>
                      <div className="p-4 rounded-xl bg-white border border-[#CBD5E1] text-center shadow-xs">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Passing Benchmark</div>
                        <div className="text-xl font-mono font-bold text-[#1E3B78] mt-1">
                          <AnimatedNumber value={quizResult.passing_percentage} suffix="%" />
                        </div>
                      </div>
                      <div className="p-4 rounded-xl bg-white border border-[#CBD5E1] text-center shadow-xs">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Points Awarded</div>
                        <div className="text-xl font-mono font-bold text-[#1E3B78] mt-1">
                          <AnimatedNumber value={`${quizResult.total_score} / ${quizResult.max_score}`} />
                        </div>
                      </div>
                      <div className="p-4 rounded-xl bg-white border border-[#CBD5E1] text-center shadow-xs">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Proctoring Audit</div>
                        <div className={`text-sm font-mono font-bold mt-1 ${quizResult.tab_switch_count >= 2 ? 'text-[#DC2626]' : quizResult.tab_switch_count === 1 ? 'text-[#D97706]' : 'text-[#16A34A]'}`}>
                          {quizResult.tab_switch_count >= 2
                            ? 'Closed on 2nd Tab Switch'
                            : quizResult.tab_switch_count === 1
                            ? '1 Warning Issued'
                            : 'Verified Secure'}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#E2E8F0]">
                      <Button
                        variant="secondary"
                        size="md"
                        icon={BookOpen}
                        onClick={() => setIsQuizActive(false)}
                      >
                        Return to Course Curriculum
                      </Button>

                      <div className="flex items-center gap-2">
                        {quizResult.is_passed && (
                          <Button
                            variant="primary"
                            size="md"
                            icon={Award}
                            onClick={() => navigate('/learner/certificates')}
                          >
                            View Official Certificate
                          </Button>
                        )}
                        {quizResult.attempt_id && (
                          <Button
                            variant="outline"
                            size="md"
                            icon={FileCheck}
                            onClick={() => navigate(`/learner/assessment-attempts/${quizResult.attempt_id}/result`)}
                          >
                            Detailed Question Breakdown
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : !quizAttemptData ? (
                  <div className="clay-card p-8 rounded-2xl border border-white/60 text-center space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#E2E9F4] text-[#1E3B78] flex items-center justify-center mx-auto">
                      <Award className="w-6 h-6 text-[#2C51A2]" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#172B4D]">
                        {courseAssessment?.title || 'Final Certification Examination'}
                      </h3>
                      <p className="text-xs text-[#64748B] mt-1 max-w-md mx-auto">
                        This is a single-attempt, timed examination. Questions and options are randomized per learner. Tab switching and content copying are strictly prohibited.
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      size="md"
                      icon={Award}
                      onClick={handleStartInPageExam}
                    >
                      Begin Examination Now
                    </Button>
                  </div>
                ) : (
                  /* ACTIVE IN-PAGE SECURE QUIZ RUNNER */
                  <div
                    onCopy={(e) => {
                      e.preventDefault();
                      showAlert({
                        title: 'Action Prohibited',
                        message: 'Copying examination questions and options is strictly disabled by exam security policy.',
                        type: 'warning',
                      });
                    }}
                    onCut={(e) => e.preventDefault()}
                    onPaste={(e) => e.preventDefault()}
                    onContextMenu={(e) => e.preventDefault()}
                    className="select-none space-y-6"
                  >
                    {/* Top Examination Control Bar */}
                    <div className="clay-card p-4 sm:p-5 rounded-2xl border border-white/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="clay-pill text-[10px] font-bold uppercase tracking-widest bg-[#2C51A2] text-white px-2.5 py-0.5 rounded-full">
                            Attempt #{quizAttemptData.attempt_number || 1}
                          </span>
                          <span className="text-[10px] font-mono text-[#64748B]">
                            {quizQuestions.length} Questions (All Mandatory)
                          </span>
                          {tabViolations === 1 ? (
                            <span className="clay-pill text-[10px] font-bold uppercase tracking-wider bg-[#FEF3C7] text-[#92400E] px-2.5 py-0.5 rounded-full border border-[#FDE68A]">
                              1 Tab Switch Warning (Attempt 2 Closes Test)
                            </span>
                          ) : (
                            <span className="clay-pill text-[10px] font-bold uppercase tracking-wider bg-[#E2E9F4] text-[#1E3B78] px-2.5 py-0.5 rounded-full border border-[#CBD5E1]">
                              Fullscreen Lockdown Active
                            </span>
                          )}
                        </div>
                        <h2 className="text-lg font-bold text-[#1E3B78] mt-1">
                          {quizAttemptData.assessment?.title || 'Certification Examination'}
                        </h2>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Countdown Clock */}
                        <div
                          className={`flex items-center gap-2 px-3.5 py-2 border rounded-xl font-mono font-bold text-sm shadow-inner ${
                            quizTimeLeft < 120
                              ? 'bg-[#FEE2E2] border-[#DC2626] text-[#DC2626] animate-pulse'
                              : 'bg-white border-[#CBD5E1] text-[#1E3B78]'
                          }`}
                        >
                          <Clock className={`w-4 h-4 ${quizTimeLeft < 120 ? 'text-[#DC2626]' : 'text-[#2C51A2]'}`} />
                          <span>{formatQuizTime(quizTimeLeft)}</span>
                        </div>

                        <Button
                          variant="navy"
                          size="md"
                          icon={Send}
                          loading={quizSubmitting}
                          onClick={handleQuizSubmitClick}
                        >
                          Submit Exam ({Object.keys(quizAnswers).length}/{quizQuestions.length})
                        </Button>
                      </div>
                    </div>

                    {/* Examination Body: 4-Column Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                      {/* Left 1 Col: Question Navigator Palette */}
                      <div className="lg:col-span-1 space-y-4">
                        <Card title="Question Palette">
                          <div className="space-y-4">
                            <div className="grid grid-cols-5 gap-2">
                              {quizQuestions.map((q, idx) => {
                                const isAnswered = quizAnswers[q.id] !== undefined;
                                const isCurrent = idx === quizCurrentIdx;
                                const isMissing = unansweredHighlighted && !isAnswered;

                                let btnStyle = 'bg-white border border-[#CBD5E1] text-[#172B4D] hover:bg-[#F8FAFC]';
                                if (isCurrent) {
                                  btnStyle = 'bg-[#1E3B78] text-white font-bold shadow-md border-[#1E3B78]';
                                } else if (isAnswered) {
                                  btnStyle = 'bg-[#E2E9F4] border border-[#BFDBFE] text-[#1E3B78] font-bold shadow-xs';
                                } else if (isMissing) {
                                  btnStyle = 'bg-[#FEE2E2] border-2 border-[#DC2626] text-[#DC2626] font-bold animate-pulse';
                                }

                                return (
                                  <button
                                    key={q.id}
                                    type="button"
                                    onClick={() => setQuizCurrentIdx(idx)}
                                    className={`h-9 text-xs font-bold rounded-xl transition-all flex items-center justify-center cursor-pointer ${btnStyle}`}
                                    title={`Go to Question ${idx + 1}${!isAnswered ? ' (Unanswered)' : ' (Answered)'}`}
                                  >
                                    {idx + 1}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Status Legend */}
                            <div className="pt-3 border-t border-[#E2E8F0] space-y-1.5 text-[11px] text-[#64748B]">
                              <div className="flex items-center gap-2">
                                <div className="w-3.5 h-3.5 bg-[#E2E9F4] border border-[#BFDBFE] rounded-md" />
                                <span>Answered ({Object.keys(quizAnswers).length})</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-3.5 h-3.5 bg-white border border-[#CBD5E1] rounded-md" />
                                <span>Unanswered ({quizQuestions.length - Object.keys(quizAnswers).length})</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-3.5 h-3.5 bg-[#1E3B78] rounded-md" />
                                <span>Current Question</span>
                              </div>
                            </div>
                          </div>
                        </Card>

                        <div className="clay-card p-4 rounded-2xl border border-white/60 text-xs text-[#64748B] space-y-2">
                          <p className="font-bold text-[#1E3B78] uppercase tracking-wider text-[11px]">
                            Examination Integrity Rules
                          </p>
                          <p className="leading-relaxed">
                            1. All questions are mandatory. You cannot submit until every question is answered.
                          </p>
                          <p className="leading-relaxed">
                            2. Questions and options are randomized for each learner.
                          </p>
                          <p className="leading-relaxed">
                            3. Tab switching is strictly prohibited. If you attempt to switch tabs, you will receive a warning that you are not allowed to switch tabs. If you attempt a second time, the test will be immediately closed and submitted.
                          </p>
                          <p className="leading-relaxed">
                            4. Content copying and right-clicking are prohibited.
                          </p>
                        </div>
                      </div>

                      {/* Right 3 Cols: Active Question Display */}
                      <div className="lg:col-span-3">
                        {quizQuestions[quizCurrentIdx] && (() => {
                          const currentQ = quizQuestions[quizCurrentIdx];
                          const isAnswered = quizAnswers[currentQ.id] !== undefined;

                          return (
                            <div className="clay-card p-6 sm:p-7 rounded-2xl border border-white/60 space-y-5">
                              {/* Question Header */}
                              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                                <div className="flex items-center gap-2">
                                  <span className="clay-pill text-[10px] font-bold uppercase tracking-wider bg-[#2C51A2] text-white px-2.5 py-0.5 rounded-full">
                                    Question {quizCurrentIdx + 1} of {quizQuestions.length}
                                  </span>
                                  <Badge variant="warning" size="sm">
                                    Mandatory
                                  </Badge>
                                </div>
                                <span className="text-xs font-mono font-bold text-[#2C51A2]">
                                  {currentQ.marks} Point{currentQ.marks > 1 ? 's' : ''}
                                </span>
                              </div>

                              {/* Question Prompt */}
                              <div className="text-sm sm:text-base font-bold text-[#172B4D] leading-relaxed">
                                {currentQ.question_text}
                              </div>

                              {/* Options List (Shuffled for Learner) */}
                              <div className="space-y-2.5 pt-2">
                                {(currentQ.options || []).map((opt, optIdx) => {
                                  const isSelected = quizAnswers[currentQ.id] === opt.id;

                                  return (
                                    <div
                                      key={opt.id}
                                      onClick={() => {
                                        setQuizAnswers((prev) => ({
                                          ...prev,
                                          [currentQ.id]: opt.id,
                                        }));
                                      }}
                                      className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3.5 cursor-pointer ${
                                        isSelected
                                          ? 'border-[#2C51A2] bg-[#EFF6FF] shadow-xs'
                                          : 'border-[#CBD5E1] bg-white hover:border-[#2C51A2]/60 hover:bg-[#FAFBFD]'
                                      }`}
                                    >
                                      <input
                                        type="radio"
                                        name={`in_page_q_${currentQ.id}`}
                                        checked={isSelected}
                                        onChange={() => {
                                          setQuizAnswers((prev) => ({
                                            ...prev,
                                            [currentQ.id]: opt.id,
                                          }));
                                        }}
                                        className="w-4 h-4 text-[#2C51A2] focus:ring-0 cursor-pointer"
                                      />
                                      <div className="flex items-center gap-2.5 text-xs sm:text-sm text-[#172B4D] font-medium select-none">
                                        <span className="w-5 h-5 rounded-full bg-[#E2E9F4] text-[#1E3B78] font-bold text-[10px] flex items-center justify-center shrink-0">
                                          {String.fromCharCode(65 + optIdx)}
                                        </span>
                                        <span>{opt.option_text}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Question Bottom Navigation Controls */}
                              <div className="flex items-center justify-between pt-4 border-t border-[#E2E8F0]">
                                <Button
                                  variant="secondary"
                                  size="md"
                                  icon={ChevronLeft}
                                  disabled={quizCurrentIdx === 0}
                                  onClick={() => setQuizCurrentIdx((prev) => Math.max(0, prev - 1))}
                                >
                                  Previous Question
                                </Button>

                                <div className="flex items-center gap-2">
                                  {quizCurrentIdx < quizQuestions.length - 1 ? (
                                    <Button
                                      variant="primary"
                                      size="md"
                                      icon={ChevronRight}
                                      onClick={() => setQuizCurrentIdx((prev) => Math.min(quizQuestions.length - 1, prev + 1))}
                                    >
                                      Next Question
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="navy"
                                      size="md"
                                      icon={Send}
                                      loading={quizSubmitting}
                                      onClick={handleQuizSubmitClick}
                                    >
                                      Submit Examination
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : !activeLesson ? (
              <div className="p-12 text-center clay-card rounded-2xl border border-white/60">
                Please select a lesson from the syllabus.
              </div>
            ) : (
              <div className="clay-card rounded-2xl border border-white/60 overflow-hidden flex flex-col justify-between">
                {/* Lesson Top Stage Header */}
                <div className="p-6 border-b border-[#E2E8F0]/60 bg-[#F3F6FB]/80">
                  <div className="flex flex-wrap items-center gap-2 mb-2.5">
                    <span className="clay-pill text-[10px] font-bold uppercase tracking-wider bg-[#2C51A2] text-white px-2.5 py-0.5 rounded-full">
                      Lesson {allLessons.findIndex((l) => l.id === activeLesson.id) + 1} of {allLessons.length}
                    </span>
                    <Badge variant="default" size="sm">
                      {activeLesson.lesson_type}
                    </Badge>
                    {activeLesson.is_mandatory == 1 && (
                      <Badge variant="warning" size="sm">
                        Mandatory
                      </Badge>
                    )}
                    {isMaterialViewed && (
                      <span className="clay-pill text-[10px] font-bold uppercase tracking-wider bg-[#E2E9F4] text-[#2C51A2] px-2.5 py-0.5 rounded-full border border-[#BFDBFE]/60 flex items-center gap-1">
                        <Check className="w-3 h-3 text-[#2C51A2]" />
                        Material Reviewed
                      </span>
                    )}
                    <span className="text-xs text-[#64748B] font-medium flex items-center gap-1 ml-auto">
                      <Clock className="w-3.5 h-3.5 text-[#2C51A2]" />
                      Estimated Duration: {activeLesson.duration_minutes} Minutes
                    </span>
                  </div>

                  <h1 className="text-xl sm:text-2xl font-bold text-[#1E3B78] tracking-tight leading-snug">
                    {activeLesson.title}
                  </h1>

                  {/* ACTIVE STUDY DURATION & PROGRESSION STATUS BAR */}
                  <div className="mt-4 p-4 rounded-xl border bg-white/70 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-[#E2E8F0]">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isLessonCompleted
                          ? 'bg-[#E2E9F4] text-[#2C51A2]'
                          : !hasStartedViewingMaterial && hasMaterials
                          ? 'bg-[#FEF3C7] text-[#92400E]'
                          : secondsRemaining === 0
                          ? 'bg-[#DEF7EC] text-[#03543F]'
                          : 'bg-[#EFF6FF] text-[#2C51A2]'
                      }`}>
                        {isLessonCompleted || secondsRemaining === 0 ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : !hasStartedViewingMaterial && hasMaterials ? (
                          <Eye className="w-5 h-5 text-[#D97706]" />
                        ) : (
                          <Clock className="w-5 h-5 animate-pulse text-[#2C51A2]" />
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#172B4D] flex items-center gap-2">
                          <span>
                            {isLessonCompleted
                              ? 'Lesson Completed'
                              : !hasStartedViewingMaterial && hasMaterials
                              ? 'Study Timer: Waiting for Material Review'
                              : secondsRemaining === 0
                              ? 'Minimum Study Duration Fulfilled (60s Met)'
                              : `Minimum Study Duration: ${secondsRemaining}s Remaining (Active)`}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#64748B] mt-0.5 font-medium">
                          {isLessonCompleted
                            ? 'You have completed this lesson. You may review or advance to the next unit.'
                            : !hasStartedViewingMaterial && hasMaterials
                            ? 'The 60-second study timer will begin as soon as you click "View Material" below.'
                            : secondsRemaining === 0
                            ? hasMaterials && !isMaterialViewed
                              ? 'Duration satisfied. Please inspect the attached material below to unlock completion.'
                              : 'Requirements satisfied. You can mark this lesson completed and proceed.'
                            : 'Study session in progress. Please review the material until the timer completes.'}
                        </div>
                      </div>
                    </div>

                    {!isLessonCompleted && hasStartedViewingMaterial && (
                      <div className="w-full sm:w-44 shrink-0 flex flex-col gap-1 sm:text-right">
                        <div className="flex justify-between sm:justify-end gap-2 text-[11px] font-bold text-[#1E3B78]">
                          <span>Elapsed: {Math.min(60, 60 - secondsRemaining)}s</span>
                          <span>/ 60s</span>
                        </div>
                        <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-1000 ${
                              secondsRemaining === 0 ? 'bg-[#1E3B78]' : 'bg-[#2C51A2]'
                            }`}
                            style={{ width: `${Math.min(100, ((60 - secondsRemaining) / 60) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Lesson Main Content Area */}
                <div className="p-6 sm:p-8 space-y-6 min-h-[350px]">
                  {activeLesson.content ? (
                    <div className="prose max-w-none text-sm text-[#172B4D] leading-relaxed whitespace-pre-line font-sans">
                      {activeLesson.content}
                    </div>
                  ) : (
                    <div className="p-8 border border-dashed border-[#CBD5E1] rounded-2xl text-center text-xs text-[#64748B] bg-[#F3F6FB]/60">
                      No written study guide for this unit. Please inspect and view the attached documents and materials below.
                    </div>
                  )}

                  {/* Attached Materials Section */}
                  {activeLesson.materials && activeLesson.materials.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-[#E2E8F0]/60">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#1E3B78] flex items-center gap-1.5">
                          <Paperclip className="w-4 h-4 text-[#2C51A2]" />
                          Attached Technical Materials & Downloads
                        </h4>
                        {!isMaterialViewed ? (
                          <span className="clay-pill text-[10px] font-bold uppercase tracking-wider text-[#D97706] bg-[#FEF3C7] px-2.5 py-0.5 rounded-full border border-[#FDE68A]/70">
                            Prerequisite: Click "View Material" to start 60s study timer
                          </span>
                        ) : (
                          <span className="clay-pill text-[10px] font-bold uppercase tracking-wider text-[#2C51A2] bg-[#E2E9F4] px-2.5 py-0.5 rounded-full border border-[#BFDBFE]/70">
                            Material Verified
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        {activeLesson.materials.map((mat) => {
                          const isCurrentlyViewing = previewMaterial?.id === mat.id;
                          return (
                            <div
                              key={mat.id}
                              className={`clay-card p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                isCurrentlyViewing
                                  ? 'border-[#2C51A2] bg-[#EFF6FF]/60 shadow-md'
                                  : 'border-white/70 hover:border-[#2C51A2]/40'
                              }`}
                            >
                              <div className="flex items-center gap-3 truncate pr-2">
                                <div className="w-10 h-10 rounded-xl bg-white border border-[#CBD5E1]/60 flex items-center justify-center shrink-0 shadow-inner">
                                  <FileText className="w-5 h-5 text-[#2C51A2]" />
                                </div>
                                <div className="truncate">
                                  <div className="text-xs font-bold text-[#172B4D] truncate">
                                    {mat.file_name}
                                  </div>
                                  <div className="text-[10px] text-[#64748B] flex items-center gap-2 mt-0.5 font-medium">
                                    <span>{mat.file_size_kb > 0 ? `${Math.round(mat.file_size_kb)} KB` : 'External Resource'}</span>
                                    <span>•</span>
                                    <span className="uppercase font-semibold">{mat.file_name.split('.').pop()}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {/* PRIMARY ACTION: VIEW IN-PAGE (STARTS 60s TIMER) */}
                                <Button
                                  variant={isCurrentlyViewing ? 'navy' : 'primary'}
                                  size="sm"
                                  icon={Eye}
                                  onClick={() => handleViewMaterial(mat)}
                                >
                                  {isCurrentlyViewing ? 'Viewing Now' : 'View Material'}
                                </Button>

                                {/* SECONDARY ACTION: DOWNLOAD / OPEN LINK */}
                                {mat.external_url ? (
                                  <a
                                    href={mat.external_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={() => {
                                      setHasStartedViewingMaterial(true);
                                      progressService.recordMaterialView(activeLesson.id).catch(() => {});
                                      setSessionViewedLessons((prev) => new Set([...prev, activeLesson.id]));
                                    }}
                                    className="px-3 py-1.5 clay-btn-secondary text-[#1E3B78] text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-[#F1F5F9] flex items-center gap-1 transition-colors"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    <span>Open Link</span>
                                  </a>
                                ) : (
                                  <a
                                    href={`/api/materials/${mat.id}/download`}
                                    target="_blank"
                                    rel="noreferrer"
                                    download
                                    onClick={() => {
                                      setHasStartedViewingMaterial(true);
                                      progressService.recordMaterialView(activeLesson.id).catch(() => {});
                                      setSessionViewedLessons((prev) => new Set([...prev, activeLesson.id]));
                                    }}
                                    className="px-3 py-1.5 clay-btn-secondary text-[#1E3B78] text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-[#F1F5F9] flex items-center gap-1 transition-colors"
                                    title="Download file for offline study"
                                  >
                                    <FileDown className="w-3.5 h-3.5 text-[#2C51A2]" />
                                    <span>Download</span>
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* IN-PAGE DOCUMENT & SLIDE VIEWER WORKSPACE */}
                      {previewMaterial && (
                        <div className="mt-5 rounded-2xl border border-[#2C51A2]/30 bg-white shadow-lg overflow-hidden">
                          {/* Viewer Header */}
                          <div className="p-4 bg-gradient-to-r from-[#1E3B78] to-[#2C51A2] text-white flex items-center justify-between">
                            <div className="flex items-center gap-2 truncate pr-2">
                              <Eye className="w-4 h-4 text-[#93C5FD] shrink-0" />
                              <span className="font-bold text-xs uppercase tracking-wide truncate">
                                In-Page Document Viewer: {previewMaterial.file_name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <a
                                href={previewData?.download_url || `/api/materials/${previewMaterial.id}/download`}
                                target="_blank"
                                rel="noreferrer"
                                download
                                className="px-3 py-1 clay-pill bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider rounded-full hover:bg-white hover:text-[#1E3B78] transition-colors inline-flex items-center gap-1"
                              >
                                <FileDown className="w-3 h-3" />
                                <span>Download Copy</span>
                              </a>
                              <button
                                onClick={handleCloseViewer}
                                className="p-1 hover:bg-white/20 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                                title="Close Viewer"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Viewer Body */}
                          <div className="p-4 sm:p-6 bg-[#F3F6FB]/70">
                            {previewLoading ? (
                              <div className="py-12 text-center text-xs font-semibold text-[#64748B]">
                                Loading material content and formatting slides...
                              </div>
                            ) : previewData?.preview_type === 'pptx' && previewData?.slides?.length > 0 ? (
                              /* PRESENTATION SLIDES VIEWER */
                              <div className="space-y-4">
                                {/* Slide Stage Controls */}
                                <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]/60">
                                  <div className="text-xs font-bold uppercase tracking-wider text-[#1E3B78]">
                                    Slide {currentSlideIndex + 1} of {previewData.slides.length}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setCurrentSlideIndex((prev) => Math.max(0, prev - 1))}
                                      disabled={currentSlideIndex === 0}
                                      className="px-3 py-1.5 clay-btn-secondary text-xs font-bold text-[#1E3B78] rounded-xl disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                                    >
                                      <ChevronLeft className="w-3.5 h-3.5" />
                                      <span>Prev Slide</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setCurrentSlideIndex((prev) => Math.min(previewData.slides.length - 1, prev + 1))}
                                      disabled={currentSlideIndex === previewData.slides.length - 1}
                                      className="px-3 py-1.5 clay-btn-primary text-white text-xs font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                                    >
                                      <span>Next Slide</span>
                                      <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Active Slide Presentation Canvas */}
                                {(() => {
                                  const currentSlide = previewData.slides[currentSlideIndex];
                                  return (
                                    <div className="p-6 sm:p-8 clay-card rounded-2xl border border-white/80 min-h-[260px] flex flex-col justify-between">
                                      <div>
                                        <div className="flex items-center gap-2 mb-3">
                                          <span className="clay-pill text-[10px] font-bold uppercase tracking-widest bg-[#2C51A2] text-white px-2.5 py-0.5 rounded-full">
                                            Slide {currentSlide.slide_number}
                                          </span>
                                          <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                                            Course Material Presentation
                                          </span>
                                        </div>
                                        <h3 className="text-lg sm:text-xl font-bold text-[#172B4D] leading-snug">
                                          {currentSlide.title}
                                        </h3>

                                        <div className="mt-4 space-y-2.5">
                                          {currentSlide.paragraphs.map((p, pIdx) => (
                                            <div key={pIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-[#172B4D] leading-relaxed">
                                              <span className="w-2 h-2 rounded-full bg-[#2C51A2] shrink-0 mt-2" />
                                              <span>{p}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>

                                      <div className="mt-6 pt-3 border-t border-[#E2E8F0]/60 flex items-center justify-between text-[10px] text-[#64748B] font-medium">
                                        <span className="font-bold text-[#1E3B78] uppercase tracking-wider">{previewMaterial.file_name}</span>
                                        <span>Use slide buttons to navigate all units</span>
                                      </div>
                                    </div>
                                  );
                                })()}

                                {/* Slide Thumbnails / Jump Bar */}
                                <div className="flex flex-wrap items-center gap-1.5 pt-2">
                                  <span className="text-[10px] font-bold text-[#64748B] uppercase mr-1">Jump to:</span>
                                  {previewData.slides.map((s, idx) => (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => setCurrentSlideIndex(idx)}
                                      className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all ${
                                        currentSlideIndex === idx
                                          ? 'clay-btn-primary text-white shadow-xs'
                                          : 'clay-btn-secondary text-[#1E3B78]'
                                      }`}
                                    >
                                      Slide {idx + 1}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ) : previewData?.preview_type === 'pdf' ? (
                              /* PDF EMBEDDED VIEWER */
                              <div className="space-y-3">
                                <div className="text-xs font-bold uppercase tracking-wider text-[#1E3B78] pb-2 border-b border-[#E2E8F0]/60 flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="clay-pill text-[10px] font-bold uppercase tracking-widest bg-[#2C51A2] text-white px-2.5 py-0.5 rounded-full">
                                      PDF Document
                                    </span>
                                    <span className="truncate max-w-sm sm:max-w-md">{previewMaterial.file_name}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <a
                                      href={previewData.file_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-[11px] font-bold text-[#1E3B78] hover:text-[#2C51A2] inline-flex items-center gap-1 transition-colors px-2.5 py-1 bg-white rounded-lg border border-[#CBD5E1]"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                      <span>Open in New Tab</span>
                                    </a>
                                    <a
                                      href={previewData.download_url || `/api/materials/${previewMaterial.id}/download`}
                                      download
                                      className="text-[11px] font-bold text-[#2C51A2] hover:text-[#1E3B78] inline-flex items-center gap-1 transition-colors px-2.5 py-1 bg-white rounded-lg border border-[#CBD5E1]"
                                    >
                                      <FileDown className="w-3.5 h-3.5" />
                                      <span>Download PDF</span>
                                    </a>
                                  </div>
                                </div>
                                <iframe
                                  src={`${previewData.file_url}#toolbar=1`}
                                  className="w-full h-[620px] rounded-xl border border-[#CBD5E1] bg-white shadow-inner"
                                  title={previewMaterial.file_name}
                                />
                              </div>
                            ) : previewData?.preview_type === 'docx' ? (
                              /* WORD DOCUMENT IN-PAGE READER */
                              <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]/80">
                                  <div className="flex items-center gap-2">
                                    <span className="clay-pill text-[10px] font-bold uppercase tracking-widest bg-[#2C51A2] text-white px-2.5 py-0.5 rounded-full">
                                      Word Document
                                    </span>
                                    <span className="text-xs font-bold text-[#1E3B78] uppercase tracking-wider truncate max-w-md">
                                      {previewData.title || previewMaterial.file_name}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-[11px] text-[#64748B]">
                                    <span className="font-semibold">{previewData.total_elements || 0} Content Units</span>
                                    <span>•</span>
                                    <a
                                      href={previewData?.download_url || `/api/materials/${previewMaterial.id}/download`}
                                      download
                                      className="text-[#2C51A2] hover:text-[#1E3B78] font-bold inline-flex items-center gap-1 transition-colors"
                                    >
                                      <FileDown className="w-3.5 h-3.5" />
                                      <span>Download Copy</span>
                                    </a>
                                  </div>
                                </div>

                                {/* Paper-Style Document Body */}
                                <div className="p-6 sm:p-10 bg-white rounded-2xl border border-[#CBD5E1]/70 shadow-sm space-y-4 max-w-4xl mx-auto">
                                  {previewData.elements && previewData.elements.length > 0 ? (
                                    previewData.elements.map((el, elIdx) => {
                                      if (el.type === 'title') {
                                        return (
                                          <div key={elIdx} className="pb-4 mb-2 border-b border-[#E2E8F0]">
                                            <h1 className="text-xl sm:text-2xl font-bold text-[#172B4D] tracking-tight leading-snug">
                                              {el.text}
                                            </h1>
                                          </div>
                                        );
                                      }

                                      if (el.type === 'heading') {
                                        const isH1 = el.level === 1;
                                        const isH2 = el.level === 2;
                                        return (
                                          <div
                                            key={elIdx}
                                            className={
                                              isH1
                                                ? 'pt-4 pb-1.5 border-b border-[#E2E8F0]/70'
                                                : isH2
                                                ? 'pt-3 pb-1'
                                                : 'pt-2'
                                            }
                                          >
                                            <h2
                                              className={
                                                isH1
                                                  ? 'text-base sm:text-lg font-bold text-[#1E3B78] uppercase tracking-wide'
                                                  : isH2
                                                  ? 'text-sm sm:text-base font-bold text-[#2C51A2]'
                                                  : 'text-xs sm:text-sm font-bold text-[#172B4D]'
                                              }
                                            >
                                              {el.text}
                                            </h2>
                                          </div>
                                        );
                                      }

                                      if (el.type === 'bullet') {
                                        return (
                                          <div key={elIdx} className="flex items-start gap-3 pl-2 sm:pl-4 py-0.5">
                                            <span className="w-2 h-2 rounded-full bg-[#2C51A2] shrink-0 mt-2" />
                                            <p className="text-xs sm:text-sm text-[#172B4D] leading-relaxed">
                                              {el.text}
                                            </p>
                                          </div>
                                        );
                                      }

                                      if (el.type === 'table') {
                                        return (
                                          <div key={elIdx} className="my-4 overflow-x-auto rounded-xl border border-[#CBD5E1] shadow-xs">
                                            <table className="w-full text-center text-xs border-collapse">
                                              <tbody>
                                                {el.rows.map((row, rIdx) => (
                                                  <tr
                                                    key={rIdx}
                                                    className={
                                                      rIdx === 0
                                                        ? 'bg-[#F1F5F9] font-bold text-[#1E3B78] border-b border-[#CBD5E1]'
                                                        : 'border-b border-[#E2E8F0] even:bg-[#F8FAFC] hover:bg-blue-50/40 transition-colors'
                                                    }
                                                  >
                                                    {row.map((cell, cIdx) => (
                                                      <td
                                                        key={cIdx}
                                                        className={`p-3 text-[#172B4D] text-center border-r border-[#E2E8F0] last:border-r-0 ${
                                                          rIdx === 0
                                                            ? 'font-bold uppercase tracking-wider text-[11px] bg-[#F1F5F9] text-center'
                                                            : ''
                                                        }`}
                                                      >
                                                        {cell}
                                                      </td>
                                                    ))}
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        );
                                      }

                                      // Standard Paragraph
                                      return (
                                        <p key={elIdx} className="text-xs sm:text-sm text-[#334155] leading-relaxed py-0.5">
                                          {el.text}
                                        </p>
                                      );
                                    })
                                  ) : (
                                    <div className="text-center py-10 text-xs font-semibold text-[#64748B]">
                                      No readable text sections detected in this document. Use the download button above to review original file.
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : previewData?.preview_type === 'spreadsheet' ? (
                              /* SPREADSHEET IN-PAGE GRID VIEWER */
                              <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]/80">
                                  <div className="flex items-center gap-2">
                                    <span className="clay-pill text-[10px] font-bold uppercase tracking-widest bg-[#0D9488] text-white px-2.5 py-0.5 rounded-full">
                                      Spreadsheet Grid
                                    </span>
                                    <span className="text-xs font-bold text-[#1E3B78] uppercase tracking-wider truncate max-w-md">
                                      {previewMaterial.file_name}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-[11px] text-[#64748B]">
                                    <span className="font-semibold">
                                      {previewData.sheets?.[currentSheetIndex || 0]?.rows?.length || 0} Data Rows
                                    </span>
                                    <span>•</span>
                                    <a
                                      href={previewData?.download_url || `/api/materials/${previewMaterial.id}/download`}
                                      download
                                      className="text-[#2C51A2] hover:text-[#1E3B78] font-bold inline-flex items-center gap-1 transition-colors"
                                    >
                                      <FileDown className="w-3.5 h-3.5" />
                                      <span>Download Original</span>
                                    </a>
                                  </div>
                                </div>

                                {/* Controls Bar: Sheet Tabs & Cell Filter */}
                                {previewData.sheets && previewData.sheets.length > 0 && (
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                                      {previewData.sheets.map((sh, sIdx) => (
                                        <button
                                          key={sIdx}
                                          type="button"
                                          onClick={() => setCurrentSheetIndex(sIdx)}
                                          className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                                            (currentSheetIndex || 0) === sIdx
                                              ? 'clay-btn-primary text-white shadow-xs'
                                              : 'clay-btn-secondary text-[#1E3B78]'
                                          }`}
                                        >
                                          {sh.name || `Sheet ${sIdx + 1}`}
                                        </button>
                                      ))}
                                    </div>

                                    <div className="relative w-full sm:w-64">
                                      <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-2.5 pointer-events-none" />
                                      <input
                                        type="text"
                                        placeholder="Filter spreadsheet cells..."
                                        value={sheetSearch}
                                        onChange={(e) => setSheetSearch(e.target.value)}
                                        className="w-full text-xs text-[#172B4D] pl-9 pr-3 py-1.5 rounded-xl border border-[#CBD5E1] bg-white focus:outline-none focus:ring-1 focus:ring-[#2C51A2]"
                                      />
                                    </div>
                                  </div>
                                )}

                                {/* Interactive Sheet Grid Table */}
                                {(() => {
                                  const activeSheet = previewData.sheets?.[currentSheetIndex || 0];
                                  if (!activeSheet) {
                                    return (
                                      <div className="p-8 text-center text-xs text-[#64748B] bg-white rounded-2xl border border-[#CBD5E1]">
                                        No spreadsheet data available for preview.
                                      </div>
                                    );
                                  }

                                  const filteredRows =
                                    activeSheet.rows?.filter((row) => {
                                      if (!sheetSearch) return true;
                                      return row.some((c) =>
                                        String(c).toLowerCase().includes(sheetSearch.toLowerCase())
                                      );
                                    }) || [];

                                  return (
                                    <div className="rounded-2xl border border-[#CBD5E1] overflow-hidden shadow-xs bg-white">
                                      <div className="max-h-[520px] overflow-auto">
                                        <table className="w-full text-center text-xs border-collapse">
                                          <thead className="sticky top-0 bg-[#F1F5F9] text-[#1E3B78] border-b border-[#CBD5E1] z-10">
                                            <tr>
                                              <th className="p-2.5 w-12 text-center text-[10px] font-bold text-[#64748B] uppercase tracking-wider border-r border-[#CBD5E1] bg-[#E2E8F0]">
                                                #
                                              </th>
                                              {activeSheet.headers?.map((h, hIdx) => (
                                                <th
                                                  key={hIdx}
                                                  className="p-2.5 text-center font-bold uppercase tracking-wider text-[11px] border-r border-[#CBD5E1] last:border-r-0 whitespace-nowrap"
                                                >
                                                  {h || `Col ${String.fromCharCode(65 + (hIdx % 26))}`}
                                                </th>
                                              ))}
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {filteredRows.length > 0 ? (
                                              filteredRows.map((row, rIdx) => (
                                                <tr
                                                  key={rIdx}
                                                  className="border-b border-[#E2E8F0] even:bg-[#F8FAFC] hover:bg-blue-50/40 transition-colors"
                                                >
                                                  <td className="p-2 text-center font-mono text-[10px] text-[#64748B] border-r border-[#E2E8F0] bg-[#F8FAFC] font-bold">
                                                    {rIdx + 1}
                                                  </td>
                                                  {row.map((cell, cIdx) => (
                                                    <td
                                                      key={cIdx}
                                                      className="p-2.5 text-center text-[#172B4D] border-r border-[#E2E8F0] last:border-r-0 whitespace-nowrap font-sans"
                                                    >
                                                      {cell}
                                                    </td>
                                                  ))}
                                                </tr>
                                              ))
                                            ) : (
                                              <tr>
                                                <td
                                                  colSpan={(activeSheet.headers?.length || 1) + 1}
                                                  className="p-8 text-center text-xs text-[#64748B]"
                                                >
                                                  {sheetSearch
                                                    ? 'No matching rows found for search query.'
                                                    : 'This sheet has no data rows.'}
                                                </td>
                                              </tr>
                                            )}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            ) : previewData?.preview_type === 'video' || previewMaterial.file_name.match(/\.(mp4|webm|mkv|avi|mov)$/i) ? (
                              /* VIDEO PLAYER WITH SPEED CONTROLS */
                              <div className="space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E2E8F0]/60">
                                  <div className="flex items-center gap-2">
                                    <span className="clay-pill text-[10px] font-bold uppercase tracking-widest bg-[#2C51A2] text-white px-2.5 py-0.5 rounded-full">
                                      Video Player
                                    </span>
                                    <span className="text-xs font-bold text-[#1E3B78] uppercase tracking-wider truncate max-w-md">
                                      {previewMaterial.file_name}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="text-[11px] text-[#64748B] font-semibold">Speed:</span>
                                    {[0.75, 1, 1.25, 1.5, 2].map((spd) => (
                                      <button
                                        key={spd}
                                        type="button"
                                        onClick={() => {
                                          setVideoSpeed(spd);
                                          if (videoRef.current) videoRef.current.playbackRate = spd;
                                        }}
                                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                                          videoSpeed === spd
                                            ? 'bg-[#2C51A2] text-white'
                                            : 'bg-gray-100 text-[#1E3B78] hover:bg-gray-200'
                                        }`}
                                      >
                                        {spd}x
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <div className="p-3 bg-black rounded-2xl overflow-hidden shadow-inner">
                                  <video
                                    ref={videoRef}
                                    controls
                                    className="w-full max-h-[520px] rounded-xl mx-auto"
                                    src={previewData?.file_url || `/api/materials/${previewMaterial.id}/stream`}
                                  >
                                    Your browser does not support HTML5 video playback.
                                  </video>
                                </div>
                              </div>
                            ) : previewData?.preview_type === 'text' ? (
                              /* TEXT / MARKDOWN PREVIEW */
                              <div className="space-y-3">
                                <div className="text-xs font-bold uppercase tracking-wider text-[#1E3B78] pb-2 border-b border-[#E2E8F0]/60 flex items-center justify-between">
                                  <span>Text Reference Document</span>
                                  <a
                                    href={previewData?.download_url || `/api/materials/${previewMaterial.id}/download`}
                                    download
                                    className="text-[11px] font-bold text-[#2C51A2] hover:text-[#1E3B78] inline-flex items-center gap-1 transition-colors"
                                  >
                                    <FileDown className="w-3.5 h-3.5" />
                                    <span>Download File</span>
                                  </a>
                                </div>
                                <div className="p-4 sm:p-6 bg-white rounded-xl border border-[#CBD5E1] font-mono text-xs text-[#172B4D] overflow-x-auto whitespace-pre-wrap max-h-[520px] overflow-y-auto leading-relaxed">
                                  {previewData.raw_content || 'No text content available.'}
                                </div>
                              </div>
                            ) : (
                              /* FALLBACK FOR IMAGES / MEDIA */
                              <div className="space-y-3">
                                {previewMaterial.file_name.match(/\.(png|jpg|jpeg|svg|webp)$/i) ? (
                                  <div className="text-center p-4 bg-white rounded-2xl border border-[#E2E8F0] shadow-sm">
                                    <img
                                      src={previewData?.file_url || `/api/materials/${previewMaterial.id}/stream`}
                                      alt={previewMaterial.file_name}
                                      className="max-h-[500px] mx-auto object-contain rounded-xl"
                                    />
                                  </div>
                                ) : (
                                  <div className="p-8 text-center clay-card rounded-2xl border border-white/70">
                                    <FileText className="w-10 h-10 text-[#2C51A2] mx-auto mb-2" />
                                    <div className="text-xs font-bold text-[#1E3B78] uppercase">Document File Ready</div>
                                    <p className="text-xs text-[#64748B] mt-1 mb-3">
                                      {previewMaterial.file_name} is active. Use the download link to review on your computer.
                                    </p>
                                    <a
                                      href={previewData?.download_url || `/api/materials/${previewMaterial.id}/download`}
                                      download
                                      className="px-4 py-2 clay-btn-primary text-white text-xs font-bold uppercase tracking-wider rounded-xl inline-flex items-center gap-1.5 transition-colors"
                                    >
                                      <FileDown className="w-4 h-4" />
                                      <span>Download File</span>
                                    </a>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Action / Lesson Navigation Bar */}
                <div className="p-4 sm:p-6 bg-[#F3F6FB]/80 border-t border-[#E2E8F0]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={handlePrevLesson}
                    disabled={currentLessonIndex <= 0}
                  >
                    Previous Lesson
                  </Button>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      variant={isLessonCompleted ? 'outline' : 'navy'}
                      size="md"
                      icon={isLessonCompleted ? CheckCircle : Circle}
                      onClick={handleToggleLessonComplete}
                      loading={completing}
                      disabled={!isLessonCompleted && !canCompleteLesson}
                      className={isLessonCompleted ? 'text-[#2C51A2] border-[#2C51A2] hover:bg-[#E2E9F4]' : ''}
                    >
                      {isLessonCompleted
                        ? 'Completed (Click to Reopen)'
                        : !hasStartedViewingMaterial && hasMaterials
                        ? 'View Material to Start 60s Timer'
                        : secondsRemaining > 0
                        ? `Complete Lesson (${secondsRemaining}s remaining)`
                        : hasMaterials && !isMaterialViewed
                        ? 'View Material to Complete'
                        : 'Mark as Completed'}
                    </Button>

                    {!isLessonCompleted && canCompleteLesson && currentLessonIndex < allLessons.length - 1 && (
                      <Button
                        variant="primary"
                        size="md"
                        icon={ArrowRight}
                        onClick={handleCompleteAndNext}
                        loading={completing}
                      >
                        Complete & Next Lesson
                      </Button>
                    )}
                  </div>

                  {isLessonCompleted ? (
                    <Button
                      variant="primary"
                      size="md"
                      onClick={handleNextLesson}
                      disabled={currentLessonIndex >= allLessons.length - 1}
                    >
                      Next Lesson
                    </Button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="h-10 px-5 bg-[#E2E8F0] text-[#94A3B8] text-xs font-bold uppercase tracking-wider border border-[#CBD5E1] rounded-xl cursor-not-allowed flex items-center justify-center gap-2"
                      title="You must complete the current lesson before moving to the next lesson"
                    >
                      <Lock className="w-4 h-4 text-[#94A3B8]" />
                      <span>Next Lesson (Locked)</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CoursePlayer;
