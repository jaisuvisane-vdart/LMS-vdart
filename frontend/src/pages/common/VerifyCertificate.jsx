import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import certificateService from '../../services/certificateService';
import Button from '../../components/common/Button';
import { ShieldCheck, CheckCircle, XCircle, Search, ArrowLeft } from 'lucide-react';
import vdartLogo from '../../assets/VDart_Logobg.png';

const VerifyCertificate = () => {
  const { code: urlCode } = useParams();
  const [code, setCode] = useState(urlCode || '');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const performVerification = async (verifyCode) => {
    if (!verifyCode.trim()) return;
    try {
      setLoading(true);
      setResult(null);
      const res = await certificateService.verifyCertificate(verifyCode.trim());
      if (res.status === 'success') {
        setResult({ valid: true, data: res.data });
      }
    } catch (err) {
      setResult({ valid: false, message: err.response?.data?.message || 'Certificate code not found or invalid' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (urlCode) {
      performVerification(urlCode);
    }
  }, [urlCode]);

  const handleSubmit = (e) => {
    e.preventDefault();
    performVerification(code);
  };

  return (
    <div className="min-h-screen bg-[#F3F6FB] flex flex-col justify-between p-4 sm:p-8 touch-scroll">
      {/* Top Header */}
      <div className="max-w-3xl mx-auto w-full flex items-center justify-between pb-6" data-aos="fade-down">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 clay-card rounded-2xl shadow-sm flex items-center justify-center p-1.5 border border-white/80">
            <img src={vdartLogo} alt="VDart" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-baseline">
              <span className="text-sm font-extrabold text-[#172B4D]">VDart</span>
              <span className="text-sm font-extrabold text-[#2C51A2]">-Learning</span>
            </div>
            <p className="text-[10px] text-[#64748B] uppercase tracking-wider font-semibold">Public Credential Verification Service</p>
          </div>
        </div>
        <Link to="/login" className="text-xs font-bold uppercase tracking-wider text-[#1E3B78] hover:text-[#2C51A2] flex items-center gap-1.5 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Portal Login</span>
        </Link>
      </div>

      {/* Main Verification Card */}
      <div className="max-w-xl mx-auto w-full clay-modal rounded-2xl border border-white/80 p-6 sm:p-10 space-y-6 shadow-2xl" data-aos="zoom-in" data-aos-duration="600">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-[#E2E9F4] text-[#1E3B78] rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-inner">
            <ShieldCheck className="w-7 h-7 text-[#2C51A2]" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[#1E3B78]">
            Verify Certificate of Completion
          </h2>
          <p className="text-xs text-[#64748B] max-w-md mx-auto leading-relaxed font-medium">
            Confirm the official authenticity of training accreditations issued by our corporate learning council.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#172B4D] mb-1.5">
              Certificate Code
            </label>
            <input
              type="text"
              placeholder="e.g. LMS-CERT-2026-XXXXXXXX"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="clay-input w-full bg-white text-[#172B4D] font-mono text-sm rounded-xl h-11 px-3.5"
              required
            />
          </div>

          <Button variant="primary" size="md" type="submit" disabled={loading} className="w-full h-11">
            {loading ? 'Verifying with Council...' : 'Verify Credential Authenticity'}
          </Button>
        </form>

        {result && (
          <div
            data-aos="fade-up"
            data-aos-delay="150"
            className={`p-5 rounded-2xl border text-xs shadow-sm ${
              result.valid
                ? 'bg-gradient-to-br from-[#EFF6FF] to-[#E2E9F4] border-[#BCD0EC] text-[#172B4D]'
                : 'bg-gradient-to-br from-[#FEF2F2] to-[#FEE2E2] border-[#FECACA] text-[#991B1B]'
            }`}
          >
            {result.valid ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 font-bold text-sm tracking-wide">
                  <CheckCircle className="w-5 h-5 text-[#2C51A2] shrink-0" />
                  <span>Valid & Authenticated Credential</span>
                </div>
                <div className="divide-y divide-[#BFDBFE]/60 pt-2 text-xs space-y-2">
                  <div className="flex justify-between pt-1">
                    <span className="font-semibold text-[#172B4D]">Recipient Trainee:</span>
                    <span className="font-bold">{result.data.learner_name}</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="font-semibold text-[#172B4D]">Department:</span>
                    <span>{result.data.learner_department}</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="font-semibold text-[#172B4D]">Curriculum:</span>
                    <span className="font-bold">{result.data.course_title}</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="font-semibold text-[#172B4D]">Awarded Score:</span>
                    <span className="font-bold">{result.data.final_score}%</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="font-semibold text-[#172B4D]">Issue Date:</span>
                    <span className="font-mono">{result.data.issued_at?.slice(0, 10)}</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="font-semibold text-[#172B4D]">Credential ID:</span>
                    <span className="font-mono font-bold">{result.data.certificate_code}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 font-bold tracking-wide">
                <XCircle className="w-5 h-5 text-[#991B1B] shrink-0" />
                <span>{result.message}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="max-w-3xl mx-auto text-center text-xs text-[#64748B] pt-6 font-medium">
        Official LMS Credential Verification Council • Cryptographic Integrity Guaranteed
      </div>
    </div>
  );
};

export default VerifyCertificate;
