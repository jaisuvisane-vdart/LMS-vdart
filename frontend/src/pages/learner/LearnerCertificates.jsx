import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import certificateService from '../../services/certificateService';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import AnimatedNumber from '../../components/common/AnimatedNumber';
import {
  Award,
  ShieldCheck,
  Search,
  ExternalLink,
  Printer,
  Calendar,
  CheckCircle,
  Copy,
  BookOpen
} from 'lucide-react';

const LearnerCertificates = () => {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifyCode, setVerifyCode] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const navigate = useNavigate();

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      const res = await certificateService.getCertificates();
      if (res.status === 'success') {
        setCertificates(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load certificates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, []);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!verifyCode.trim()) return;

    try {
      setVerifying(true);
      setVerificationResult(null);
      const res = await certificateService.verifyCertificate(verifyCode.trim());
      if (res.status === 'success') {
        setVerificationResult({ valid: true, data: res.data });
      }
    } catch (err) {
      setVerificationResult({ valid: false, message: err.response?.data?.message || 'Certificate verification failed' });
    } finally {
      setVerifying(false);
    }
  };

  const handleCopy = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div data-aos="fade-down" className="clay-card p-6 sm:p-7 rounded-2xl border border-white/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="clay-pill text-[10px] font-bold uppercase tracking-widest bg-[#2C51A2] text-white px-2.5 py-0.5 rounded-full">
              Verified Credentials
            </span>
            <span className="text-xs text-[#64748B] font-medium">Professional Accreditations</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1E3B78] tracking-tight mt-1.5">
            My Earned Training Certificates
          </h1>
          <p className="text-xs text-[#64748B] mt-1 max-w-2xl leading-relaxed">
            Access official certificates awarded upon completing course milestones and satisfying examination benchmarks.
          </p>
        </div>
      </div>

      {/* Verification Query Widget */}
      <div data-aos="fade-up" data-aos-delay="100" className="bg-gradient-to-r from-[#1E3B78] to-[#2C51A2] text-white p-6 sm:p-7 rounded-2xl border border-white/10 shadow-lg">
        <div className="max-w-2xl space-y-2">
          <span className="clay-pill text-[10px] font-bold uppercase tracking-widest bg-white/20 text-white px-3 py-1 rounded-full border border-white/20">
            Credential Authenticity Audit
          </span>
          <h3 className="text-base font-bold tracking-tight text-white">
            Verify Corporate Certificate by Code
          </h3>
          <p className="text-xs text-[#E2E9F4] leading-relaxed font-medium">
            Enter any certificate code (e.g., LMS-CERT-2026-XXXXXXXX) to verify recipient, course, and date.
          </p>
          <form onSubmit={handleVerify} className="flex flex-col sm:flex-row items-center gap-2 pt-2">
            <input
              type="text"
              placeholder="Enter Certificate Code..."
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value)}
              className="clay-input bg-white text-[#172B4D] text-xs font-mono h-11 px-3.5 w-full sm:w-80 rounded-xl"
              required
            />
            <Button
              variant="secondary"
              size="sm"
              type="submit"
              disabled={verifying}
              className="bg-white text-[#1E3B78] hover:bg-[#F3F6FB] border-none font-bold h-11 px-5 rounded-xl shadow-md"
            >
              {verifying ? 'Verifying...' : 'Verify Credential'}
            </Button>
          </form>

          {verificationResult && (
            <div
              className={`mt-4 p-4 rounded-xl border text-xs shadow-sm ${
                verificationResult.valid
                  ? 'bg-gradient-to-br from-[#EFF6FF] to-[#E2E9F4] border-[#BCD0EC] text-[#172B4D]'
                  : 'bg-gradient-to-br from-[#FEF2F2] to-[#FEE2E2] border-[#FECACA] text-[#991B1B]'
              }`}
            >
              {verificationResult.valid ? (
                <div>
                  <div className="font-bold flex items-center gap-1.5 uppercase tracking-wide">
                    <CheckCircle className="w-4 h-4 text-[#2C51A2]" />
                    <span>Verified Active Credential: {verificationResult.data.certificate_code}</span>
                  </div>
                  <div className="mt-1.5 text-[11px] space-y-0.5 text-[#172B4D] font-medium">
                    <p>Awarded to: <strong>{verificationResult.data.learner_name}</strong> ({verificationResult.data.learner_department})</p>
                    <p>Curriculum: <strong>{verificationResult.data.course_title}</strong></p>
                    <p>Issued Date: <strong>{verificationResult.data.issued_at?.slice(0, 10)}</strong> • Score: <strong>{verificationResult.data.final_score}%</strong></p>
                  </div>
                </div>
              ) : (
                <div className="font-bold uppercase tracking-wide">
                  {verificationResult.message}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Certificates Gallery Grid */}
      <div className="space-y-4">
        {loading ? (
          <div className="clay-card p-12 rounded-2xl border border-white/60 text-center text-xs font-semibold text-[#64748B]">
            Loading your earned certificates...
          </div>
        ) : certificates.length === 0 ? (
          <div className="clay-card p-12 rounded-2xl border border-white/60 text-center">
            <Award className="w-12 h-12 text-[#94A3B8] mx-auto mb-3" />
            <h3 className="text-sm font-bold text-[#1E3B78] tracking-wide">
              No Certificates Earned Yet
            </h3>
            <p className="text-xs text-[#64748B] mt-1 mb-4 max-w-md mx-auto leading-relaxed">
              Complete all lessons and pass the mandatory evaluation quiz for assigned courses to be awarded your official credential.
            </p>
            <Button variant="outline" size="sm" onClick={() => navigate('/learner/courses')}>
              Go to Assigned Courses
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {certificates.map((cert, idx) => (
              <div
                key={cert.id}
                data-aos="fade-up"
                data-aos-delay={idx * 80}
                className="clay-card clay-card-hover p-6 rounded-2xl border border-white/60 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 border-b border-[#E2E8F0]/60 pb-2.5">
                    <span className="clay-pill text-[10px] font-bold uppercase tracking-widest text-[#1E3B78] bg-[#E2E9F4] px-3 py-1 rounded-full">
                      {cert.course_category || 'Technical Curriculum'}
                    </span>
                    <Badge variant="success">Officially Validated</Badge>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-[#1E3B78] tracking-tight">
                      {cert.course_title}
                    </h3>
                    <p className="text-xs text-[#64748B] mt-0.5 font-medium">
                      Lead Instructor: {cert.instructor_name || 'Sarah Jenkins'}
                    </p>
                  </div>

                  <div className="clay-card p-4 rounded-xl border border-white/80 text-xs space-y-2">
                    <div className="flex justify-between font-mono">
                      <span className="text-[#64748B]">Verification ID:</span>
                      <div className="flex items-center gap-1.5 font-bold text-[#1E3B78]">
                        <span>{cert.certificate_code}</span>
                        <button
                          onClick={() => handleCopy(cert.certificate_code, cert.id)}
                          className="text-[#64748B] hover:text-[#2C51A2] transition-colors"
                          title="Copy Code"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {copiedId === cert.id && (
                      <div className="text-[10px] text-[#2C51A2] text-right font-bold">
                        Copied to clipboard!
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Issue Date:</span>
                      <span className="font-semibold text-[#172B4D]">{cert.issued_at?.slice(0, 10)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Evaluation Grade:</span>
                      <span className="font-bold text-[#2C51A2]">
                        <AnimatedNumber value={parseFloat(cert.final_score).toFixed(1)} suffix="%" />
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end">
                  <Button
                    variant="navy"
                    size="sm"
                    icon={ExternalLink}
                    onClick={() => navigate(`/learner/certificates/${cert.id}`)}
                  >
                    View, Download & Share
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LearnerCertificates;
