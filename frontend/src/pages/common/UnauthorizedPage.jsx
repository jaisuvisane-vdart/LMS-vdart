import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/common/Button';
import { ShieldAlert } from 'lucide-react';

const UnauthorizedPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleReturn = () => {
    const role = (user?.role || '').toLowerCase();
    if (role === 'admin') navigate('/admin/dashboard');
    else if (role === 'instructor') navigate('/instructor/dashboard');
    else navigate('/learner/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#F3F6FB] flex flex-col justify-center items-center px-4 font-sans text-center touch-scroll">
      <div className="clay-modal p-8 sm:p-12 border border-white/80 rounded-2xl shadow-2xl max-w-md w-full" data-aos="zoom-in" data-aos-duration="500">
        <div className="w-14 h-14 bg-[#FEE2E2] text-[#DC2626] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner" data-aos="fade-down" data-aos-delay="100">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-bold text-[#1E3B78] tracking-tight">
          Access Restricted
        </h1>
        <p className="text-xs text-[#64748B] mt-2 mb-6 leading-relaxed font-medium">
          Your employee role does not have authorization to view this module. Access events are recorded in security audit logs.
        </p>
        <div data-aos="fade-up" data-aos-delay="200">
          <Button variant="primary" onClick={handleReturn} className="w-full">
            Return to My Workspace
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
