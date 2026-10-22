import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDialog } from '../../contexts/DialogContext';
import assessmentService from '../../services/assessmentService';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import {
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  HelpCircle,
  Send,
  ShieldAlert
} from 'lucide-react';

const ExamRunner = () => {
  const { showAlert, showConfirm } = useDialog();
  const { assessmentId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attemptData, setAttemptData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);

  // Answers map: { [questionId]: selectedOptionId }
  const [answers, setAnswers] = useState({});

  // Countdown timer
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initAttempt = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await assessmentService.startAttempt(assessmentId);
      if (res.status === 'success') {
        const data = res.data;
        setAttemptData(data);
        setQuestions(data.assessment?.questions || []);
        setTimeLeft(data.remaining_seconds || 1800);
      }
    } catch (err) {
      console.error('Failed to initialize assessment:', err);
      setError(err.response?.data?.message || err.message || 'Error starting assessment session');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initAttempt();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [assessmentId]);

  // Timer Tick Effect
  useEffect(() => {
    if (timeLeft <= 0 || loading || !attemptData) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading, attemptData]);

  const handleAutoSubmit = () => {
    showAlert({
      title: 'Time Expired',
      message: 'Time has expired! Your exam responses are being submitted automatically.',
      type: 'warning',
    });
    submitAnswers();
  };

  const handleSelectOption = (questionId, optionId) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  const submitAnswers = async () => {
    if (!attemptData) return;
    try {
      setIsSubmitting(true);
      const answersArray = Object.entries(answers).map(([qId, oId]) => ({
        question_id: parseInt(qId),
        selected_option_id: parseInt(oId),
      }));

      const res = await assessmentService.submitAttempt(attemptData.attempt_id, answersArray);
      if (res.status === 'success') {
        navigate(`/learner/assessment-attempts/${attemptData.attempt_id}/result`);
      }
    } catch (err) {
      showAlert({
        title: 'Submission Error',
        message: err.response?.data?.message || err.message || 'Error submitting examination',
        type: 'error',
      });
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleConfirmSubmit = async () => {
    const unansweredMsg = unansweredCount > 0 ? ` (Warning: You have ${unansweredCount} unanswered questions).` : '';
    const confirmed = await showConfirm({
      title: 'Confirm Examination Submission',
      message: `You are about to submit your examination responses (${answeredCount} of ${questions.length} answered)${unansweredMsg}. Once submitted, answers cannot be modified. Proceed with final submission?`,
      confirmText: 'Submit Examination',
      type: 'confirm',
    });
    if (confirmed) {
      submitAnswers();
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl border border-[#E2E8F0] shadow-sm text-center">
          <Clock className="w-8 h-8 text-[#2C51A2] animate-spin mx-auto mb-3" />
          <h3 className="text-sm font-bold text-[#172B4D] uppercase tracking-wide">
            Initializing Examination Environment
          </h3>
          <p className="text-xs text-[#64748B] mt-1">
            Setting up secure timer and fetching randomized item bank...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl border border-[#DC2626] shadow-sm max-w-md text-center">
          <ShieldAlert className="w-10 h-10 text-[#DC2626] mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#172B4D] uppercase tracking-wide">
            Unable to Start Assessment
          </h3>
          <p className="text-xs text-[#64748B] mt-2 mb-5">{error}</p>
          <Button variant="navy" size="md" onClick={() => navigate('/learner/assessments')}>
            Return to Assessments
          </Button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIdx];
  const isLastQuestion = currentIdx === questions.length - 1;
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = questions.length - answeredCount;
  const isTimeCritical = timeLeft < 120; // Under 2 minutes

  return (
    <div className="space-y-6">
      {/* Top Test Control Header Bar */}
      <div className="clay-card p-4 sm:p-5 rounded-2xl border border-white/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-16 z-20">
        <div>
          <div className="flex items-center gap-2">
            <span className="clay-pill text-[10px] font-bold uppercase tracking-widest bg-[#2C51A2] text-white px-2.5 py-0.5 rounded-full">
              Attempt #{attemptData.attempt_number}
            </span>
            <span className="text-xs text-[#64748B] font-semibold">{attemptData.assessment?.course_title}</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-[#1E3B78] tracking-tight mt-1">
            {attemptData.assessment?.title}
          </h1>
        </div>

        {/* Countdown Timer & Submit */}
        <div className="flex items-center gap-4">
          <div
            className={`flex items-center gap-2 px-4 py-2 border rounded-xl font-mono font-bold text-base transition-colors shadow-inner ${
              isTimeCritical
                ? 'bg-[#FEE2E2] border-[#DC2626] text-[#DC2626] animate-pulse'
                : 'bg-[#F3F6FB] border-white/70 text-[#1E3B78]'
            }`}
          >
            <Clock className={`w-5 h-5 ${isTimeCritical ? 'text-[#DC2626]' : 'text-[#2C51A2]'}`} />
            <span>{formatTime(timeLeft)}</span>
          </div>

          <Button
            variant="navy"
            size="md"
            icon={Send}
            onClick={() => setConfirmModalOpen(true)}
          >
            Submit Exam
          </Button>
        </div>
      </div>

      {/* Main Examination Layout: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left 1 Col: Question Navigation Palette */}
        <div className="lg:col-span-1 space-y-4">
          <Card title="Question Palette">
            <div className="space-y-4">
              <div className="grid grid-cols-5 gap-2">
                {questions.map((q, idx) => {
                  const isAnswered = answers[q.id] !== undefined;
                  const isCurrent = idx === currentIdx;

                  let btnStyle = 'clay-btn-secondary text-[#172B4D]';
                  if (isCurrent) {
                    btnStyle = 'clay-btn-primary text-white font-bold shadow-sm';
                  } else if (isAnswered) {
                    btnStyle = 'bg-[#E2E9F4] border border-[#BFDBFE] text-[#1E3B78] font-bold shadow-inner';
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentIdx(idx)}
                      className={`h-10 text-xs font-bold rounded-xl transition-all flex items-center justify-center ${btnStyle}`}
                      title={`Go to Question ${idx + 1}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Status Legend */}
              <div className="pt-3 border-t border-[#E2E8F0]/60 space-y-2 text-[11px] text-[#64748B] font-medium">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 bg-[#E2E9F4] border border-[#BFDBFE] rounded-md shadow-xs"></div>
                  <span>Answered ({answeredCount})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 bg-white border border-[#CBD5E1] rounded-md shadow-xs"></div>
                  <span>Unanswered ({unansweredCount})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 bg-[#2C51A2] rounded-md shadow-xs"></div>
                  <span>Current Question</span>
                </div>
              </div>
            </div>
          </Card>

          <div className="clay-card p-4 rounded-2xl border border-white/60 text-xs text-[#64748B] space-y-1.5">
            <p className="font-bold text-[#1E3B78] uppercase tracking-wide">Examination Rules</p>
            <p className="leading-relaxed font-medium">Answers are saved in memory and evaluated upon clicking "Submit Exam".</p>
            <p className="leading-relaxed font-medium">Ensure all items are reviewed before the countdown clock reaches 00:00.</p>
          </div>
        </div>

        {/* Right 3 Cols: Active Question Display */}
        <div className="lg:col-span-3 space-y-6">
          {currentQ ? (
            <div className="clay-card p-6 sm:p-8 rounded-2xl border border-white/60 space-y-6">
              {/* Question Header */}
              <div className="flex items-center justify-between border-b border-[#E2E8F0]/60 pb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[#1E3B78]">
                  Question {currentIdx + 1} of {questions.length}
                </span>
                <span className="clay-pill text-xs font-bold bg-[#E2E9F4] text-[#1E3B78] px-3.5 py-1 rounded-full border border-white/60">
                  {currentQ.marks} {currentQ.marks > 1 ? 'Marks' : 'Mark'}
                </span>
              </div>

              {/* Question Statement */}
              <div>
                <p className="text-base sm:text-lg font-bold text-[#172B4D] leading-relaxed">
                  {currentQ.question_text}
                </p>
              </div>

              {/* Options List */}
              <div className="space-y-3 pt-2">
                {currentQ.options?.map((opt) => {
                  const isSelected = answers[currentQ.id] === opt.id;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => handleSelectOption(currentQ.id, opt.id)}
                      className={`clay-card p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-3.5 ${
                        isSelected
                          ? 'border-[#2C51A2] bg-[#EFF6FF]/70 shadow-inner ring-2 ring-[#2C51A2]/20'
                          : 'border-white/70 hover:border-[#2C51A2]/40'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q_${currentQ.id}`}
                        checked={isSelected}
                        onChange={() => handleSelectOption(currentQ.id, opt.id)}
                        className="w-4 h-4 accent-[#2C51A2] cursor-pointer shrink-0"
                      />
                      <span className={`text-sm ${isSelected ? 'font-bold text-[#1E3B78]' : 'text-[#172B4D]'}`}>
                        {opt.option_text}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Navigation Footer */}
              <div className="pt-6 border-t border-[#E2E8F0]/60 flex items-center justify-between gap-4">
                <Button
                  variant="outline"
                  size="md"
                  icon={ChevronLeft}
                  disabled={currentIdx === 0}
                  onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
                >
                  Previous Item
                </Button>

                {isLastQuestion ? (
                  <Button
                    variant="navy"
                    size="md"
                    icon={Send}
                    onClick={handleConfirmSubmit}
                  >
                    Finish & Submit
                  </Button>
                ) : (
                  <Button
                    variant="navy"
                    size="md"
                    onClick={() => setCurrentIdx((prev) => Math.min(questions.length - 1, prev + 1))}
                  >
                    <span>Next Item</span>
                    <ChevronRight className="w-4 h-4 ml-1.5" />
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="clay-card p-8 rounded-2xl border border-white/60 text-center text-xs text-[#64748B]">
              No questions found in this assessment.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExamRunner;
