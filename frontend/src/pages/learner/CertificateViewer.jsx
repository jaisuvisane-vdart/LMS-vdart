import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import certificateService from '../../services/certificateService';
import {
  exportCertificateAsImage,
  exportCertificateAsPdf,
  generateLinkedInCertUrl,
  generateLinkedInShareUrl,
  generateLinkedInFeedPostUrl,
  formatLinkedInProfileUrl,
  getLinkedInCertificationsUrl,
  generateCelebratoryPostText
} from '../../utils/certificateShareHelper';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import {
  Printer,
  ArrowLeft,
  ShieldCheck,
  Award,
  CheckCircle,
  Copy,
  Clock,
  FileDown,
  Image,
  Share2,
  ExternalLink,
  Check,
  X,
  User,
  Globe
} from 'lucide-react';
import vdartLogo from '../../assets/VDart_Logobg.png';

export const CERTIFICATE_TEMPLATES = {
  classic: {
    outerBorder: 'border-4 border-[#2C51A2]',
    innerBorder: 'border border-[#CBD5E1]/80 bg-[#FAFBFD]/90',
    primaryColor: 'text-[#1E3B78]',
    accentColor: 'text-[#2C51A2]',
    badgeBg: 'bg-[#E2E9F4] text-[#1E3B78] border border-white/60',
    dividerColor: 'border-[#2C51A2]',
    title: 'Certificate of Achievement',
    subtitle: 'Formal Milestone & Competency Certification',
    badgeText: '[Officially Validated Record]',
  },
  modern: {
    outerBorder: 'border-4 border-[#4338CA]',
    innerBorder: 'border border-[#C7D2FE]/80 bg-[#F8FAFC]/95',
    primaryColor: 'text-[#312E81]',
    accentColor: 'text-[#4338CA]',
    badgeBg: 'bg-[#EEF2FF] text-[#4338CA] border border-[#C7D2FE]',
    dividerColor: 'border-[#4338CA]',
    title: 'Certificate of Competency',
    subtitle: 'Verified Technical & Professional Specialization',
    badgeText: '[Digital Competency Credential]',
  },
  gold: {
    outerBorder: 'border-4 border-[#D97706]',
    innerBorder: 'border-2 border-[#FDE68A]/90 bg-gradient-to-b from-[#FFFDF7] to-[#FFFBEB]',
    primaryColor: 'text-[#92400E]',
    accentColor: 'text-[#B45309]',
    badgeBg: 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]',
    dividerColor: 'border-[#D97706]',
    title: 'Executive Certificate of Distinction',
    subtitle: 'Executive Honors & Master Milestone Achievement',
    badgeText: '[Distinguished Honor Record]',
  },
  crest: {
    outerBorder: 'border-4 border-[#047857]',
    innerBorder: 'border border-[#A7F3D0]/80 bg-[#F0FDF4]/90',
    primaryColor: 'text-[#065F46]',
    accentColor: 'text-[#047857]',
    badgeBg: 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]',
    dividerColor: 'border-[#047857]',
    title: 'Academic Certificate of Excellence',
    subtitle: 'Highest Academic & Technical Governance Benchmark',
    badgeText: '[Academic Excellence Record]',
  },
};

const CertificateViewer = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Download & Export state
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingImage, setDownloadingImage] = useState(false);

  // LinkedIn Integration modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareTab, setShareTab] = useState('add_to_profile'); // 'add_to_profile' | 'share_post'
  const [personalLinkedInUrl, setPersonalLinkedInUrl] = useState(() => localStorage.getItem('user_linkedin_url') || '');
  const [postMessage, setPostMessage] = useState('');
  const [copiedPostText, setCopiedPostText] = useState(false);
  const [copiedVerifyUrl, setCopiedVerifyUrl] = useState(false);

  const publicVerifyUrl = certificate
    ? `${window.location.origin}/verify-certificate/${certificate.certificate_code}`
    : '';

  const tmpl = CERTIFICATE_TEMPLATES[certificate?.certificate_template || 'classic'] || CERTIFICATE_TEMPLATES.classic;

  useEffect(() => {
    const fetchCert = async () => {
      try {
        setLoading(true);
        const res = await certificateService.getCertificate(id);
        if (res.status === 'success') {
          setCertificate(res.data);
          const verifyUrl = `${window.location.origin}/verify-certificate/${res.data.certificate_code}`;
          setPostMessage(generateCelebratoryPostText(res.data, verifyUrl));
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

  const handleDownloadPdf = async () => {
    if (!certificate) return;
    try {
      setDownloadingPdf(true);
      const cleanCourseTitle = (certificate.course_title || 'Certificate').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `${certificate.certificate_code}_${cleanCourseTitle}.pdf`;
      await exportCertificateAsPdf('printable-certificate', filename);
    } catch (err) {
      console.error('PDF generation failure:', err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!certificate) return;
    try {
      setDownloadingImage(true);
      const cleanCourseTitle = (certificate.course_title || 'Certificate').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `${certificate.certificate_code}_${cleanCourseTitle}.png`;
      await exportCertificateAsImage('printable-certificate', filename);
    } catch (err) {
      console.error('Image generation failure:', err);
    } finally {
      setDownloadingImage(false);
    }
  };

  const handlePersonalUrlChange = (e) => {
    const val = e.target.value;
    setPersonalLinkedInUrl(val);
    if (val && val.trim()) {
      localStorage.setItem('user_linkedin_url', val.trim());
    } else {
      localStorage.removeItem('user_linkedin_url');
    }
  };

  const handleOpenLinkedInCert = () => {
    if (!certificate) return;
    if (personalLinkedInUrl && personalLinkedInUrl.trim()) {
      localStorage.setItem('user_linkedin_url', personalLinkedInUrl.trim());
    }
    const url = generateLinkedInCertUrl(certificate, publicVerifyUrl);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleOpenLinkedInShare = () => {
    if (!certificate) return;
    if (personalLinkedInUrl && personalLinkedInUrl.trim()) {
      localStorage.setItem('user_linkedin_url', personalLinkedInUrl.trim());
    }
    if (postMessage) {
      navigator.clipboard.writeText(postMessage);
      setCopiedPostText(true);
      setTimeout(() => setCopiedPostText(false), 2500);
    }
    const url = generateLinkedInFeedPostUrl(postMessage);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleOpenWebShareDialog = () => {
    if (!certificate) return;
    const url = generateLinkedInShareUrl(publicVerifyUrl);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyPostMessage = () => {
    if (postMessage) {
      navigator.clipboard.writeText(postMessage);
      setCopiedPostText(true);
      setTimeout(() => setCopiedPostText(false), 2500);
    }
  };

  const handleCopyVerifyUrl = () => {
    if (publicVerifyUrl) {
      navigator.clipboard.writeText(publicVerifyUrl);
      setCopiedVerifyUrl(true);
      setTimeout(() => setCopiedVerifyUrl(false), 2500);
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

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            icon={Copy}
            onClick={handleCopyCode}
          >
            {copied ? 'Code Copied' : 'Copy Verification ID'}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={Image}
            loading={downloadingImage}
            onClick={handleDownloadImage}
          >
            Download PNG
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={FileDown}
            loading={downloadingPdf}
            onClick={handleDownloadPdf}
          >
            Download PDF
          </Button>

          <Button
            variant="navy"
            size="sm"
            onClick={() => setShowShareModal(true)}
            className="gap-2 bg-[#0A66C2] hover:bg-[#004182] text-white shadow-sm border-none font-bold"
            title="Share verified certificate to LinkedIn"
          >
            <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
              <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
            </svg>
            <span>Share to LinkedIn</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            icon={Printer}
            onClick={handlePrint}
          >
            Print
          </Button>
        </div>
      </div>

      {/* Official Certificate Canvas */}
      <div
        id="printable-certificate"
        className={`clay-card p-8 sm:p-14 rounded-2xl ${tmpl.outerBorder} shadow-2xl relative overflow-hidden select-none print:border-none print:shadow-none print:p-0 print:rounded-none`}
      >
        {/* Inner Border Frame */}
        <div className={`rounded-2xl p-6 sm:p-10 text-center space-y-6 relative z-10 ${tmpl.innerBorder} print:rounded-none`}>
          {/* Header Seal */}
          <div className="flex flex-col items-center">
            <div className={`w-16 h-16 bg-white border ${tmpl.dividerColor}/30 rounded-2xl flex items-center justify-center p-2.5 shadow-md`}>
              <img src={vdartLogo} alt="VDart" className="w-full h-full object-contain" />
            </div>
            <div className={`text-[11px] font-extrabold uppercase tracking-widest ${tmpl.primaryColor} mt-3`}>
              VDart-Learning
            </div>
            <div className="text-[9px] uppercase tracking-widest text-[#64748B] font-semibold">
              Professional Development & Trainee Governance
            </div>
          </div>

          {/* Certificate Main Title */}
          <div className="space-y-1">
            <h1 className={`text-2xl sm:text-4xl font-extrabold uppercase tracking-wider ${tmpl.primaryColor}`}>
              {tmpl.title}
            </h1>
            <p className={`text-xs uppercase tracking-widest ${tmpl.accentColor} font-bold`}>
              {tmpl.subtitle}
            </p>
          </div>

          {/* Recipient Notice */}
          <div className="pt-2">
            <p className="text-xs text-[#64748B] uppercase tracking-wider font-medium">
              This official document confirms and certifies that
            </p>
            <div className={`text-2xl sm:text-3xl font-extrabold text-[#172B4D] tracking-wider uppercase mt-3 mb-2 pb-3.5 border-b-2 ${tmpl.dividerColor} inline-block px-12 leading-normal`}>
              {certificate.learner_name}
            </div>
            <p className="text-xs text-[#64748B] font-medium mt-1">
              Employee ID: <strong className="text-[#172B4D]">{certificate.learner_employee_id}</strong> • Department: <strong className="text-[#172B4D]">{certificate.learner_department}</strong>
            </p>
          </div>

          {/* Course Details */}
          <div className="max-w-2xl mx-auto space-y-1.5 pt-2">
            <p className="text-xs text-[#64748B] uppercase tracking-wider font-medium">
              Has completed the prescribed curriculum and verified competency standards in
            </p>
            <h2 className={`text-lg sm:text-xl font-bold uppercase tracking-wide ${tmpl.primaryColor}`}>
              {certificate.course_title}
            </h2>
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-[#172B4D] pt-1">
              <span className={`clay-pill px-3.5 py-1 rounded-full ${tmpl.badgeBg}`}>
                Category: {certificate.course_category || 'Technical Curriculum'}
              </span>
              <span className={`clay-pill px-3.5 py-1 rounded-full ${tmpl.badgeBg}`}>
                Evaluation Grade: {parseFloat(certificate.final_score).toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Signatures & Issue Metadata */}
          <div className="pt-8 sm:pt-12 grid grid-cols-2 gap-8 max-w-2xl mx-auto items-end">
            <div className="text-center space-y-1.5">
              <div className={`font-serif italic text-base sm:text-lg text-[#172B4D] border-b ${tmpl.dividerColor} pb-2.5 leading-relaxed`}>
                {certificate.instructor_name || 'Sarah Jenkins'}
              </div>
              <div className={`text-[10px] font-bold uppercase tracking-wider ${tmpl.primaryColor}`}>
                {certificate.instructor_designation || 'Lead Technical Instructor'}
              </div>
              <div className="text-[9px] text-[#64748B] uppercase font-semibold">Curriculum Author</div>
            </div>

            <div className="text-center space-y-1.5">
              <div className={`font-serif italic text-base sm:text-lg text-[#172B4D] border-b ${tmpl.dividerColor} pb-2.5 leading-relaxed`}>
                Executive Training Council
              </div>
              <div className={`text-[10px] font-bold uppercase tracking-wider ${tmpl.primaryColor}`}>
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
              <strong className={`${tmpl.primaryColor} bg-[#F1F5F9] px-2.5 py-0.5 rounded-lg border border-[#CBD5E1]`}>
                {certificate.certificate_code}
              </strong>
            </div>
            <div>
              <span className={`${tmpl.accentColor} font-bold uppercase`}>{tmpl.badgeText}</span>
            </div>
          </div>
        </div>
      </div>

      {/* LinkedIn Share & Credential Modal */}
      <Modal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title="Share Verified Certificate"
        subtitle="Official LinkedIn Profile Integration & Social Post Distribution"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-5">
          {/* Personal LinkedIn Profile URL Widget */}
          <div className="clay-card p-4 rounded-xl border border-white/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-[#1E3B78] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#2C51A2]" />
                <span>Your LinkedIn Profile URL</span>
              </label>
              {personalLinkedInUrl && (
                <span className="clay-pill text-[10px] font-bold uppercase tracking-widest bg-[#E2E9F4] text-[#1E3B78] px-2.5 py-0.5 rounded-full">
                  URL Saved
                </span>
              )}
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <input
                type="url"
                value={personalLinkedInUrl}
                onChange={handlePersonalUrlChange}
                placeholder="https://www.linkedin.com/in/your-username"
                className="clay-input w-full px-3.5 py-2 text-xs text-[#172B4D] rounded-xl focus:border-[#2C51A2]"
              />
              {personalLinkedInUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  icon={ExternalLink}
                  onClick={() => window.open(formatLinkedInProfileUrl(personalLinkedInUrl), '_blank', 'noopener,noreferrer')}
                  className="shrink-0 text-xs font-bold whitespace-nowrap"
                >
                  Visit Profile
                </Button>
              )}
            </div>
            <p className="text-[11px] text-[#64748B] font-medium leading-relaxed">
              Providing your LinkedIn profile URL connects your verified credential and provides one-click navigation to your Licenses &amp; Certifications section.
            </p>
          </div>

          {/* Modal Tabs */}
          <div className="flex items-center gap-2 border-b border-[#E2E8F0]/80 pb-2">
            <button
              type="button"
              onClick={() => setShareTab('add_to_profile')}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                shareTab === 'add_to_profile'
                  ? 'bg-[#1E3B78] text-white shadow-md'
                  : 'text-[#64748B] hover:text-[#172B4D] hover:bg-[#E2E9F4]/40'
              }`}
            >
              Add to Profile Certifications
            </button>
            <button
              type="button"
              onClick={() => setShareTab('share_post')}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                shareTab === 'share_post'
                  ? 'bg-[#1E3B78] text-white shadow-md'
                  : 'text-[#64748B] hover:text-[#172B4D] hover:bg-[#E2E9F4]/40'
              }`}
            >
              Share Post to Feed
            </button>
          </div>

          {/* Tab 1: Add to Profile Certifications */}
          {shareTab === 'add_to_profile' && (
            <div className="space-y-4">
              <p className="text-xs text-[#64748B] leading-relaxed font-medium">
                This launches LinkedIn with your course title, issuing organization (VDart Inc.), credential ID, and public verification link pre-filled into your profile Licenses &amp; Certifications section.
              </p>

              {/* Metadata Preview Box */}
              <div className="clay-card p-4.5 rounded-xl border border-white/80 text-xs space-y-2.5">
                <div className="flex justify-between items-center pb-1.5 border-b border-[#E2E8F0]/60">
                  <span className="text-[#64748B] font-semibold">Certification Name:</span>
                  <span className="text-[#172B4D] font-bold text-right max-w-xs truncate">{certificate.course_title}</span>
                </div>
                <div className="flex justify-between items-center pb-1.5 border-b border-[#E2E8F0]/60">
                  <span className="text-[#64748B] font-semibold">Issuing Organization:</span>
                  <span className="text-[#1E3B78] font-bold">VDart Inc.</span>
                </div>
                <div className="flex justify-between items-center pb-1.5 border-b border-[#E2E8F0]/60">
                  <span className="text-[#64748B] font-semibold">Issue Date:</span>
                  <span className="text-[#172B4D] font-mono font-medium">{certificate.issued_at?.slice(0, 10)}</span>
                </div>
                <div className="flex justify-between items-center pb-1.5 border-b border-[#E2E8F0]/60">
                  <span className="text-[#64748B] font-semibold">Credential ID:</span>
                  <span className="text-[#2C51A2] font-mono font-bold">{certificate.certificate_code}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#64748B] font-semibold">Verification URL:</span>
                  <span className="text-[#64748B] font-mono text-[11px] truncate max-w-xs">{publicVerifyUrl}</span>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-end gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowShareModal(false)}
                >
                  Cancel
                </Button>
                {personalLinkedInUrl && (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={ExternalLink}
                    onClick={() => window.open(getLinkedInCertificationsUrl(personalLinkedInUrl), '_blank', 'noopener,noreferrer')}
                  >
                    View My Certifications
                  </Button>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  icon={ExternalLink}
                  onClick={handleOpenLinkedInCert}
                  className="bg-[#0A66C2] hover:bg-[#004182] text-white border-none shadow-sm font-bold"
                >
                  Add to LinkedIn Profile
                </Button>
              </div>
            </div>
          )}

          {/* Tab 2: Share Post to Feed */}
          {shareTab === 'share_post' && (
            <div className="space-y-4">
              <p className="text-xs text-[#64748B] leading-relaxed font-medium">
                Announce your new milestone on LinkedIn. We have crafted a professional celebratory post pre-populated with your verified credential.
              </p>

              {/* Celebratory Post Textarea */}
              <div className="clay-card p-4 rounded-xl border border-white/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#1E3B78]">
                    Post Announcement Message
                  </label>
                  <button
                    type="button"
                    onClick={handleCopyPostMessage}
                    className="text-[11px] font-bold text-[#2C51A2] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedPostText ? <Check className="w-3.5 h-3.5 text-[#059669]" /> : <Copy className="w-3.5 h-3.5 text-[#2C51A2]" />}
                    <span>{copiedPostText ? 'Message Copied' : 'Copy Message'}</span>
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={postMessage}
                  onChange={(e) => setPostMessage(e.target.value)}
                  className="clay-input w-full p-3 text-xs text-[#172B4D] leading-relaxed font-sans rounded-xl focus:border-[#2C51A2]"
                />
              </div>

              {/* Verification Link Copy Bar */}
              <div className="clay-card p-3 rounded-xl border border-white/80 flex items-center justify-between gap-2 text-xs">
                <span className="font-mono text-[#64748B] text-[11px] truncate mr-2">
                  {publicVerifyUrl}
                </span>
                <button
                  type="button"
                  onClick={handleCopyVerifyUrl}
                  className="clay-pill px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#1E3B78] bg-[#E2E9F4] hover:bg-[#D4E0F0] shrink-0 transition-colors cursor-pointer rounded-full"
                >
                  {copiedVerifyUrl ? 'Link Copied' : 'Copy Link'}
                </button>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-end gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowShareModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={Share2}
                  onClick={handleOpenWebShareDialog}
                >
                  Web Share Dialog
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={ExternalLink}
                  onClick={handleOpenLinkedInShare}
                  className="bg-[#0A66C2] hover:bg-[#004182] text-white border-none shadow-sm font-bold"
                >
                  Post to LinkedIn Feed
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default CertificateViewer;
