import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import certificateService from '../../services/certificateService';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import {
  Printer,
  ArrowLeft,
  ShieldCheck,
  Award,
  CheckCircle,
  Copy,
  Clock
} from 'lucide-react';
import vdartLogo from '../../assets/VDart_Logobg.png';

const CertificateViewer = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchCert = async () => {
      try {
        setLoading(true);
        const res = await certificateService.getCertificate(id);
        if (res.status === 'success') {
          setCertificate(res.data);
        }
      } catch (err) {
        console.error('Failed to load certificate:', err);
        setError(err.response?.data?.message || err.message || 'Error loading certificate');
      } finally {
        setLoading(false);
      }
    };

    fetchCert();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyCode = () => {
    if (certificate?.certificate_code) {
      navigator.clipboard.writeText(certificate.certificate_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="clay-card p-8 rounded-2xl border border-white/60 text-center">
          <Clock className="w-8 h-8 text-[#2C51A2] animate-spin mx-auto mb-3" />
          <h3 className="text-sm font-bold text-[#172B4D] uppercase tracking-wide">
            Rendering Verified Certificate
          </h3>
          <p className="text-xs text-[#64748B] mt-1 font-medium">
            Validating cryptographic credential record...
          </p>
        </div>
      </div>
    );
  }

  if (error || !certificate) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="clay-card p-8 rounded-2xl border border-[#DC2626]/40 shadow-sm max-w-md text-center">
          <ShieldCheck className="w-10 h-10 text-[#DC2626] mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#172B4D] uppercase tracking-wide">
            Certificate Not Found
          </h3>
          <p className="text-xs text-[#64748B] mt-2 mb-5 font-medium">{error || 'The requested certificate could not be located.'}</p>
          <Button variant="navy" size="md" onClick={() => navigate('/learner/certificates')}>
            Return to Certificates
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Action Toolbar (Hidden during print) */}
      <div className="clay-card p-4 sm:p-5 rounded-2xl border border-white/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <button
          onClick={() => navigate('/learner/certificates')}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1E3B78] hover:text-[#2C51A2] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>My Certificates Gallery</span>
        </button>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            icon={Copy}
            onClick={handleCopyCode}
          >
            {copied ? 'Code Copied' : 'Copy Verification ID'}
          </Button>
          <Button
            variant="navy"
            size="sm"
            icon={Printer}
            onClick={handlePrint}
          >
            Print / Save PDF
          </Button>
        </div>
      </div>

      {/* Official Certificate Canvas */}
      <div
        id="printable-certificate"
        className="clay-card p-8 sm:p-14 rounded-2xl border-4 border-[#2C51A2] shadow-2xl relative overflow-hidden select-none print:border-none print:shadow-none print:p-0 print:rounded-none"
      >
        {/* Inner Border Frame */}
        <div className="border border-[#CBD5E1]/80 rounded-2xl p-6 sm:p-10 text-center space-y-6 relative z-10 bg-[#FAFBFD]/80 print:rounded-none">
          {/* Header Seal */}
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-white border border-[#2C51A2]/30 rounded-2xl flex items-center justify-center p-2.5 shadow-md">
              <img src={vdartLogo} alt="VDart" className="w-full h-full object-contain" />
            </div>
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-[#1E3B78] mt-3">
              VDart-Learning
            </div>
            <div className="text-[9px] uppercase tracking-widest text-[#64748B] font-semibold">
              Professional Development & Trainee Governance
            </div>
          </div>

          {/* Certificate Main Title */}
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-4xl font-extrabold uppercase tracking-wider text-[#1E3B78]">
              Certificate of Achievement
            </h1>
            <p className="text-xs uppercase tracking-widest text-[#2C51A2] font-bold">
              Formal Milestone & Competency Certification
            </p>
          </div>

          {/* Recipient Notice */}
          <div className="pt-2">
            <p className="text-xs text-[#64748B] uppercase tracking-wider font-medium">
              This official document confirms and certifies that
            </p>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#172B4D] tracking-tight uppercase mt-2 pb-1 border-b-2 border-[#2C51A2] inline-block px-8">
              {certificate.learner_name}
            </div>
            <p className="text-xs text-[#64748B] font-medium mt-1.5">
              Employee ID: <strong className="text-[#172B4D]">{certificate.learner_employee_id}</strong> • Department: <strong className="text-[#172B4D]">{certificate.learner_department}</strong>
            </p>
          </div>

          {/* Course Details */}
          <div className="max-w-2xl mx-auto space-y-1.5 pt-2">
            <p className="text-xs text-[#64748B] uppercase tracking-wider font-medium">
              Has completed the prescribed curriculum and verified competency standards in
            </p>
            <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wide text-[#1E3B78]">
              {certificate.course_title}
            </h2>
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-[#172B4D] pt-1">
              <span className="clay-pill bg-[#E2E9F4] px-3.5 py-1 rounded-full border border-white/60 text-[#1E3B78]">
                Category: {certificate.course_category || 'Technical Curriculum'}
              </span>
              <span className="clay-pill bg-[#E2E9F4] px-3.5 py-1 rounded-full border border-[#BFDBFE]/70 text-[#1E3B78]">
                Evaluation Grade: {parseFloat(certificate.final_score).toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Signatures & Issue Metadata */}
          <div className="pt-8 sm:pt-12 grid grid-cols-2 gap-8 max-w-2xl mx-auto items-end">
            <div className="text-center space-y-1">
              <div className="font-serif italic text-base text-[#172B4D] border-b border-[#2C51A2] pb-1">
                {certificate.instructor_name || 'Sarah Jenkins'}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#1E3B78]">
                {certificate.instructor_designation || 'Lead Technical Instructor'}
              </div>
              <div className="text-[9px] text-[#64748B] uppercase font-semibold">Curriculum Author</div>
            </div>

            <div className="text-center space-y-1">
              <div className="font-serif italic text-base text-[#172B4D] border-b border-[#2C51A2] pb-1">
                Executive Training Council
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#1E3B78]">
                LMS System Administrator
              </div>
              <div className="text-[9px] text-[#64748B] uppercase font-semibold">Authorized Governing Body</div>
            </div>
          </div>

          {/* Footer Verification Code */}
          <div className="pt-6 border-t border-[#CBD5E1]/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-[#64748B] font-medium">
            <div>
              <span>Issue Date: </span>
              <strong className="text-[#172B4D] font-mono">{certificate.issued_at?.slice(0, 10)}</strong>
            </div>
            <div className="font-mono flex items-center gap-1.5">
              <span>Verification Code: </span>
              <strong className="text-[#1E3B78] bg-[#F1F5F9] px-2.5 py-0.5 rounded-lg border border-[#CBD5E1]">
                {certificate.certificate_code}
              </strong>
            </div>
            <div>
              <span className="text-[#2C51A2] font-bold uppercase">[Officially Validated Record]</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CertificateViewer;
