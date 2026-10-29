import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDialog } from '../../contexts/DialogContext';
import assessmentService from '../../services/assessmentService';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import AnimatedNumber from '../../components/common/AnimatedNumber';
import {
  Award,
  Clock,
  HelpCircle,
  CheckCircle,
  XCircle,
  PlayCircle,
  Eye,
  AlertCircle,
  BookOpen,
  Calendar,
  Lock
} from 'lucide-react';

const LearnerAssessments = () => {
  const { showAlert } = useDialog();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchMyAssessments = async () => {
    try {
      setLoading(true);
      const res = await assessmentService.getMyAssessments();
      if (res.status === 'success') {
        setAssessments(res.data);
      }
    } catch (err) {
      console.error('Failed to load my assessments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyAssessments();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div data-aos="fade-down" className="clay-card p-6 sm:p-7 rounded-2xl border border-white/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="clay-pill text-[10px] font-bold uppercase tracking-widest bg-[#2C51A2] text-white px-2.5 py-0.5 rounded-full">
              Knowledge Verification
            </span>
            <span className="text-xs text-[#64748B] font-medium">Trainee Certifications</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1E3B78] tracking-tight mt-1.5">
            Mandatory Assessments & Examinations
          </h1>
          <p className="text-xs text-[#64748B] mt-1 max-w-2xl leading-relaxed">
            Complete objective quizzes linked to assigned curriculum to validate competency and earn corporate certifications.
          </p>
        </div>
      </div>

      {/* Assessments List */}
      <div className="space-y-4">
        {loading ? (
          <div className="clay-card p-12 rounded-2xl border border-white/60 text-center text-xs font-semibold text-[#64748B]">
            Loading assigned examination curriculum...
          </div>
        ) : assessments.length === 0 ? (
          <div className="clay-card p-12 rounded-2xl border border-white/60 text-center">
            <Award className="w-12 h-12 text-[#94A3B8] mx-auto mb-3" />
            <h3 className="text-sm font-bold text-[#1E3B78] tracking-wide">
              No Pending Assessments
            </h3>
            <p className="text-xs text-[#64748B] mt-1 mb-4 max-w-md mx-auto">
              Your assigned training curriculum does not currently have active examinations configured.
            </p>
            <Button variant="outline" size="sm" onClick={() => navigate('/learner/courses')}>
              View Assigned Courses
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {assessments.map((a, idx) => {
              const attemptsTaken = parseInt(a.attempts_taken || 0);
              const maxAttempts = 1; // Strict single-attempt policy
              const attemptsRemaining = Math.max(0, maxAttempts - attemptsTaken);
              const isPassed = a.is_passed == 1;
              const hasTaken = attemptsTaken > 0;
              const highestScore = parseFloat(a.highest_score || 0).toFixed(1);
              const isUnlocked = a.is_unlocked == 1 || parseFloat(a.course_progress || 0) >= 100 || a.assignment_status === 'completed';

              return (
                <div
                  key={a.id}
                  data-aos="fade-up"
                  data-aos-delay={idx * 80}
                  className="clay-card clay-card-hover p-6 rounded-2xl border border-white/60"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    {/* Left: Info */}
                    <div className="space-y-2.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="clay-pill text-[10px] font-bold uppercase tracking-wider bg-[#E2E9F4] text-[#1E3B78] px-3 py-1 rounded-full">
                          {a.course_title}
                        </span>
                        {!isUnlocked ? (
                          <Badge variant="warning">Course Incomplete (Locked)</Badge>
                        ) : isPassed ? (
                          <Badge variant="success">Passed & Certified</Badge>
                        ) : hasTaken ? (
                          <Badge variant="error">Attempt Completed</Badge>
                        ) : (
                          <Badge variant="neutral">Pending Attempt</Badge>
                        )}
                        {a.active_attempt_id && (
                          <Badge variant="warning">Exam In Progress</Badge>
                        )}
                      </div>

                      <h3 className="text-base sm:text-lg font-bold text-[#1E3B78] tracking-tight">
                        {a.title}
                      </h3>

                      {a.description && (
                        <p className="text-xs text-[#64748B] line-clamp-2 leading-relaxed">
                          {a.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-5 pt-2 text-xs text-[#64748B]">
                        <span className="flex items-center gap-1.5 font-semibold text-[#172B4D]">
                          <HelpCircle className="w-4 h-4 text-[#2C51A2]" />
                          {a.total_questions || 0} Questions ({a.total_marks || 0} Marks)
                        </span>
                        <span className="flex items-center gap-1.5 font-semibold text-[#172B4D]">
                          <Clock className="w-4 h-4 text-[#2C51A2]" />
                          {a.time_limit_minutes} Minutes
                        </span>
                        <span className="flex items-center gap-1.5 font-semibold text-[#172B4D]">
                          <CheckCircle className="w-4 h-4 text-[#2C51A2]" />
                          Passing Score: {parseFloat(a.passing_percentage).toFixed(0)}%
                        </span>
                        <span className="font-semibold text-[#64748B]">
                          Attempts: <strong className="text-[#172B4D]"><AnimatedNumber value={`${attemptsTaken} / ${maxAttempts}`} /></strong> (Single Attempt)
                        </span>
                        {hasTaken && (
                          <span className="font-semibold text-[#1E3B78]">
                            Final Score: <strong className="text-[#2C51A2]"><AnimatedNumber value={highestScore} suffix="%" /></strong>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-wrap items-center gap-3 shrink-0">
                      {!isUnlocked ? (
                        <button
                          type="button"
                          disabled
                          className="h-10 px-4 bg-[#F1F5F9] text-[#94A3B8] text-xs font-bold uppercase tracking-wider border border-[#CBD5E1] rounded-xl cursor-not-allowed flex items-center gap-1.5"
                          title="Prerequisite Required: You must complete 100% of the course curriculum before taking the certification exam."
                        >
                          <Lock className="w-4 h-4 text-[#94A3B8]" />
                          <span>Locked (Complete Course)</span>
                        </button>
                      ) : a.active_attempt_id ? (
                        <Button
                          variant="navy"
                          size="md"
                          icon={PlayCircle}
                          onClick={() => navigate(`/learner/assessments/${a.id}/take`)}
                        >
                          Resume Active Exam
                        </Button>
                      ) : attemptsRemaining > 0 ? (
                        <Button
                          variant="navy"
                          size="md"
                          icon={PlayCircle}
                          onClick={() => navigate(`/learner/assessments/${a.id}/take`)}
                        >
                          Start Certification Exam
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="md"
                          icon={CheckCircle}
                          onClick={() => {
                            if (a.last_attempt_id) {
                              navigate(`/learner/assessment-attempts/${a.last_attempt_id}/result`);
                            } else {
                              showAlert({
                                title: 'Assessment Attempt',
                                message: 'Attempt recorded. View your scorecard from the assessments history.',
                                type: 'info',
                              });
                            }
                          }}
                        >
                          View Exam Result
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default LearnerAssessments;
