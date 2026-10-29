import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import assessmentService from '../../services/assessmentService';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import AnimatedNumber from '../../components/common/AnimatedNumber';
import {
  CheckCircle,
  XCircle,
  Award,
  Clock,
  ArrowLeft,
  RotateCcw,
  BookOpen,
  HelpCircle,
  FileCheck
} from 'lucide-react';

const AssessmentResult = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [scorecard, setScorecard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchResult = async () => {
      try {
        setLoading(true);
        const res = await assessmentService.getAttemptResult(attemptId);
        if (res.status === 'success') {
          setScorecard(res.data);
        }
      } catch (err) {
        console.error('Failed to load assessment result:', err);
        setError(err.response?.data?.message || err.message || 'Error loading scorecard');
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [attemptId]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="clay-card p-8 rounded-2xl border border-white/60 text-center">
          <Clock className="w-8 h-8 text-[#2C51A2] animate-spin mx-auto mb-3" />
          <h3 className="text-sm font-bold text-[#172B4D] uppercase tracking-wide">
            Calculating Scorecard & Analytics
          </h3>
          <p className="text-xs text-[#64748B] mt-1">
            Auditing submitted answer options against server keys...
          </p>
        </div>
      </div>
    );
  }

  if (error || !scorecard) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="clay-card p-8 rounded-2xl border border-[#DC2626]/40 shadow-sm max-w-md text-center">
          <XCircle className="w-10 h-10 text-[#DC2626] mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#172B4D] uppercase tracking-wide">
            Scorecard Not Available
          </h3>
          <p className="text-xs text-[#64748B] mt-2 mb-5 font-medium">{error || 'Attempt result could not be retrieved.'}</p>
          <Button variant="navy" size="md" onClick={() => navigate('/learner/assessments')}>
            Return to Assessments
          </Button>
        </div>
      </div>
    );
  }

  const isPassed = scorecard.is_passed == 1;
  const percentage = parseFloat(scorecard.percentage || 0).toFixed(1);
  const passingPct = parseFloat(scorecard.passing_percentage || 0).toFixed(0);

  return (
    <div className="space-y-6 w-full">
      {/* Top Banner Outcome */}
      <div
        data-aos="zoom-in"
        data-aos-duration="600"
        className={`p-6 sm:p-8 rounded-2xl border shadow-lg ${
          isPassed
            ? 'bg-gradient-to-r from-[#1E3B78] to-[#2C51A2] border-white/10 text-white'
            : 'bg-gradient-to-r from-[#7F1D1D] to-[#991B1B] border-white/10 text-white'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span
                className={`clay-pill text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${
                  isPassed ? 'bg-[#2C51A2] text-white' : 'bg-black/40 text-[#FCA5A5]'
                }`}
              >
                {isPassed ? 'Certification Benchmark Achieved' : 'Benchmark Not Satisfied'}
              </span>
              <span className="text-xs text-[#CBD5E1] font-medium">
                Attempt #{scorecard.attempt_number} of {scorecard.max_attempts}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {isPassed ? 'Examination Passed' : 'Examination Failed'}
            </h1>

            <p className="text-xs text-[#E2E9F4] max-w-xl leading-relaxed font-medium">
              {isPassed
                ? 'Your submission met the competency standard for this training unit. Your permanent learning record has been updated.'
                : `You achieved ${percentage}%, which is below the mandatory passing standard of ${passingPct}%. Review the item explanations below before retaking.`}
            </p>
          </div>

          <div className="text-left md:text-right shrink-0 bg-white/10 p-5 rounded-2xl border border-white/20 backdrop-blur-md shadow-inner">
            <div className="text-4xl sm:text-5xl font-extrabold tracking-tight">
              <AnimatedNumber value={percentage} suffix="%" />
            </div>
            <div className="text-xs text-[#CBD5E1] font-semibold mt-1">
              <AnimatedNumber value={`${scorecard.total_score} / ${scorecard.max_score}`} /> Total Marks
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Score Earned', value: `${scorecard.total_score} / ${scorecard.max_score}`, sub: 'Marks Achieved', icon: Award, iconColor: 'text-[#2C51A2]', iconBg: 'bg-[#E2E9F4]' },
          { label: 'Final Score', value: `${percentage}%`, sub: 'Calculated Grade', icon: isPassed ? CheckCircle : XCircle, iconColor: isPassed ? 'text-[#2C51A2]' : 'text-[#DC2626]', iconBg: isPassed ? 'bg-[#E2E9F4]' : 'bg-[#FEE2E2]' },
          { label: 'Passing Benchmark', value: `${passingPct}%`, sub: 'Required to Pass', icon: CheckCircle, iconColor: 'text-[#1E3B78]', iconBg: 'bg-[#E2E9F4]' },
          { label: 'Attempts Used', value: `${scorecard.attempt_number} of ${scorecard.max_attempts}`, sub: 'Quota Status', icon: Clock, iconColor: 'text-[#D97706]', iconBg: 'bg-[#FEF3C7]' },
        ].map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              data-aos="fade-up"
              data-aos-delay={idx * 60}
              className="clay-card clay-card-hover p-4 sm:p-5 rounded-2xl border border-white/60 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-[#64748B] mb-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#1E3B78]">
                    {kpi.label}
                  </span>
                  <div className={`w-7 h-7 rounded-lg ${kpi.iconBg} flex items-center justify-center shadow-inner`}>
                    <Icon className={`w-4 h-4 ${kpi.iconColor}`} />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-[#172B4D] tracking-tight">
                  <AnimatedNumber value={kpi.value} />
                </div>
              </div>
              <div className="text-[10px] text-[#64748B] font-medium pt-2.5 border-t border-[#E2E8F0]/60 mt-2.5">
                {kpi.sub}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Buttons Bar */}
      <div data-aos="fade-up" data-aos-delay="200" className="clay-card p-4 rounded-2xl border border-white/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="md"
            icon={ArrowLeft}
            onClick={() => navigate('/learner/assessments')}
          >
            All Assessments
          </Button>
          {scorecard.course_id && (
            <Button
              variant="outline"
              size="md"
              icon={BookOpen}
              onClick={() => navigate(`/learner/courses/${scorecard.course_id}`)}
            >
              Back to Course
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isPassed && (
            <Button
              variant="navy"
              size="md"
              icon={Award}
              onClick={() => navigate('/learner/certificates')}
            >
              View Official Certificate
            </Button>
          )}
          {scorecard.attempt_number < scorecard.max_attempts && !isPassed && (
            <Button
              variant="navy"
              size="md"
              icon={RotateCcw}
              onClick={() => navigate(`/learner/assessments/${scorecard.assessment_id}/take`)}
            >
              Retake Examination
            </Button>
          )}
        </div>
      </div>

      {/* Question Review Section */}
      <div data-aos="fade-up" data-aos-delay="250" className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#1E3B78]">
            Question Review & Answer Key Audit ({scorecard.questions?.length || 0} Items)
          </h3>
          <span className="text-xs text-[#64748B] font-medium">Submitted at: {scorecard.submitted_at}</span>
        </div>

        <div className="space-y-4">
          {scorecard.questions?.map((q, idx) => {
            const isCorrect = q.is_correct == 1;
            return (
              <div
                key={q.question_id}
                className="clay-card p-5 sm:p-6 rounded-2xl border border-white/60 space-y-3.5"
              >
                <div className="flex items-center justify-between border-b border-[#E2E8F0]/60 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="clay-pill text-[10px] font-bold bg-[#2C51A2] text-white px-2.5 py-0.5 rounded-full uppercase">
                      Item {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-[#64748B]">
                      {q.marks} {q.marks > 1 ? 'Marks' : 'Mark'}
                    </span>
                  </div>
                  <Badge variant={isCorrect ? 'success' : 'error'}>
                    {isCorrect ? `+${q.score_awarded} Marks` : '0 Marks (Incorrect)'}
                  </Badge>
                </div>

                <p className="text-sm font-bold text-[#172B4D] leading-relaxed">
                  {q.question_text}
                </p>

                {/* Options List */}
                <div className="space-y-2 pt-1">
                  {q.options?.map((opt) => {
                    const isSelected = opt.id == q.selected_option_id;
                    const isCorrectAnswer = opt.is_correct == 1;

                    let cardClass = 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B]';
                    if (isCorrectAnswer) {
                      cardClass = 'bg-[#E2E9F4] border border-[#BFDBFE] text-[#1E3B78] font-bold shadow-xs';
                    } else if (isSelected && !isCorrectAnswer) {
                      cardClass = 'bg-[#FEE2E2] border border-[#FCA5A5] text-[#991B1B] font-bold shadow-xs';
                    }

                    return (
                      <div
                        key={opt.id}
                        className={`p-3 rounded-xl text-xs border flex items-center justify-between gap-3 ${cardClass}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="radio"
                            checked={isSelected}
                            readOnly
                            className="w-4 h-4 accent-[#2C51A2]"
                          />
                          <span>{opt.option_text}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider">
                          {isSelected && <span>[Your Selection]</span>}
                          {isCorrectAnswer && <span>[Correct Answer]</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Explanation note */}
                {q.explanation && (
                  <div className="bg-[#F3F6FB]/80 p-3.5 rounded-xl border border-[#E2E8F0]/70 text-xs text-[#475569] mt-2">
                    <strong className="text-[#1E3B78] uppercase text-[10px] block mb-0.5">Instructor Rationale:</strong>
                    {q.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AssessmentResult;
