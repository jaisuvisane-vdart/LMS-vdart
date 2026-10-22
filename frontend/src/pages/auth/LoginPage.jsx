import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/common/Button';
import {
  Mail,
  Lock,
  ArrowRight,
  BookOpen,
  TrendingUp,
  Award,
  Users,
  Eye,
  EyeOff,
  ShieldCheck
} from 'lucide-react';
import vdartLogo from '../../assets/VDart_Logobg.png';
import loginBg from '../../assets/loginbg.png';

const LoginPage = () => {
  const [email, setEmail] = useState('admin@lms.local');
  const [password, setPassword] = useState('Admin@123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const user = await login(email, password);
      const role = (user.role || '').toLowerCase();

      if (role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (role === 'instructor') {
        navigate('/instructor/dashboard', { replace: true });
      } else {
        navigate('/learner/dashboard', { replace: true });
      }
    } catch (err) {
      setErrorMessage(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const setTestRole = (testEmail) => {
    setEmail(testEmail);
    setPassword('Admin@123');
    setErrorMessage('');
  };

  return (
    <div
      className="min-h-screen w-full bg-cover bg-center bg-no-repeat bg-fixed flex flex-col justify-center items-center py-6 px-4 sm:px-6 lg:px-8 xl:px-12 font-sans select-none relative overflow-y-auto touch-scroll"
      style={{
        backgroundImage: `url(${loginBg})`,
        backgroundColor: '#F3F6FB',
      }}
    >
      <div className="my-auto w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 xl:gap-14 items-center relative z-10 py-4">
        {/* Left Column: Brand & Value Proposition Showcase */}
        <div className="lg:col-span-6 xl:col-span-7 flex flex-col justify-between space-y-6 xl:space-y-8">
          {/* Brand Header */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 clay-card rounded-2xl flex items-center justify-center p-2 border border-white/80 shadow-md">
              <img
                src={vdartLogo}
                alt="VDart Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-baseline">
                <span className="text-xl sm:text-2xl font-extrabold text-[#172B4D] tracking-tight">VDart</span>
                <span className="text-xl sm:text-2xl font-extrabold text-[#2C51A2] tracking-tight">-Learning</span>
              </div>
              <p className="text-[10px] sm:text-[11px] font-bold text-[#64748B] tracking-widest uppercase">
                Enterprise Learning Management
              </p>
            </div>
          </div>

          {/* Main Hero Headline */}
          <div className="space-y-3 sm:space-y-4">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-extrabold text-[#172B4D] leading-[1.18] tracking-tight">
              Enterprise Knowledge <br className="hidden sm:inline" />
              <span className="text-[#2C51A2]">Engineered for Growth</span>
            </h1>
            <p className="text-xs sm:text-sm lg:text-base text-[#64748B] max-w-lg leading-relaxed font-medium">
              Access curated corporate curriculum, verify competencies through assessments, and track organizational compliance with real-time analytics.
            </p>
          </div>

          {/* 4 Feature Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 max-w-md xl:max-w-lg">
            {/* 1. Online Courses */}
            <div className="clay-card p-3.5 rounded-2xl border border-white/80 space-y-1.5">
              <div className="w-8 h-8 bg-[#E2E9F4] text-[#2C51A2] rounded-xl flex items-center justify-center shrink-0 shadow-inner">
                <BookOpen className="w-4 h-4 text-[#2C51A2]" />
              </div>
              <h4 className="text-[11px] font-bold text-[#172B4D] leading-tight">Online Courses</h4>
              <p className="text-[9.5px] text-[#64748B] leading-tight font-medium">
                Self-paced learning paths.
              </p>
            </div>

            {/* 2. Track Progress */}
            <div className="clay-card p-3.5 rounded-2xl border border-white/80 space-y-1.5">
              <div className="w-8 h-8 bg-[#E2E9F4] text-[#2C51A2] rounded-xl flex items-center justify-center shrink-0 shadow-inner">
                <TrendingUp className="w-4 h-4 text-[#2C51A2]" />
              </div>
              <h4 className="text-[11px] font-bold text-[#172B4D] leading-tight">Track Progress</h4>
              <p className="text-[9.5px] text-[#64748B] leading-tight font-medium">
                Continuous compliance logs.
              </p>
            </div>

            {/* 3. Get Certified */}
            <div className="clay-card p-3.5 rounded-2xl border border-white/80 space-y-1.5">
              <div className="w-8 h-8 bg-[#F3E8FF] text-[#7E22CE] rounded-xl flex items-center justify-center shrink-0 shadow-inner">
                <Award className="w-4 h-4 text-[#7E22CE]" />
              </div>
              <h4 className="text-[11px] font-bold text-[#172B4D] leading-tight">Verified Certs</h4>
              <p className="text-[9.5px] text-[#64748B] leading-tight font-medium">
                Authentic credentials.
              </p>
            </div>

            {/* 4. Learn Together */}
            <div className="clay-card p-3.5 rounded-2xl border border-white/80 space-y-1.5">
              <div className="w-8 h-8 bg-[#FEF3C7] text-[#D97706] rounded-xl flex items-center justify-center shrink-0 shadow-inner">
                <Users className="w-4 h-4 text-[#D97706]" />
              </div>
              <h4 className="text-[11px] font-bold text-[#172B4D] leading-tight">Teams</h4>
              <p className="text-[9.5px] text-[#64748B] leading-tight font-medium">
                Departmental groups.
              </p>
            </div>
          </div>

          {/* Bottom Security Tags */}
          <div className="pt-2 flex flex-wrap items-center gap-2 max-w-md xl:max-w-lg">
            <span className="clay-pill bg-[#2C51A2] text-white px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm">
              Enterprise Grade
            </span>
            <span className="clay-pill bg-[#1E3B78] text-white px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm">
              Role-Based Access
            </span>
            <span className="clay-pill bg-[#E2E9F4] text-[#1E3B78] border border-white/60 px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full">
              Audit Traced
            </span>
          </div>
        </div>

        {/* Right Column: Authentication Card */}
        <div className="lg:col-span-6 xl:col-span-5 w-full max-w-md mx-auto lg:max-w-none">
          <div className="clay-modal rounded-2xl border border-white/80 p-6 sm:p-8 xl:p-9 space-y-4 sm:space-y-5 shadow-2xl">
            {/* Card Header */}
            <div>
              <span className="clay-pill text-[10px] sm:text-[11px] font-bold text-[#1E3B78] bg-[#E2E9F4] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Corporate Gateway
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-[#172B4D] tracking-tight mt-2">
                Sign in to your account
              </h2>
              <p className="text-xs text-[#64748B] mt-1 leading-normal font-medium">
                Access your training modules and personal learning workspace.
              </p>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="bg-[#FEE2E2] border border-[#FCA5A5] text-[#DC2626] p-3.5 rounded-xl text-xs font-semibold shadow-xs">
                {errorMessage}
              </div>
            )}

            {/* Form */}
            <form className="space-y-4" onSubmit={handleLogin}>
              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#172B4D]">
                  Corporate Email
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-[#64748B] pointer-events-none">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter corporate email"
                    required
                    className="clay-input w-full pl-10 pr-4 py-2.5 bg-white rounded-xl text-[#172B4D] text-xs transition-all"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#172B4D]">
                  Password
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-[#64748B] pointer-events-none">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                    className="clay-input w-full pl-10 pr-10 py-2.5 bg-white rounded-xl text-[#172B4D] text-xs transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-[#64748B] hover:text-[#2C51A2] focus:outline-none"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Options Row */}
              <div className="flex items-center justify-between text-xs pt-1 font-medium">
                <label className="flex items-center text-[#64748B] cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="mr-2 text-[#2C51A2] border-[#CBD5E1] rounded focus:ring-0 cursor-pointer accent-[#2C51A2]"
                  />
                  <span>Remember me</span>
                </label>
                <span className="text-[#2C51A2] font-semibold hover:underline cursor-pointer">
                  Forgot password?
                </span>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                className="w-full h-11 text-xs font-bold tracking-wider uppercase mt-2 flex items-center justify-center gap-2"
              >
                <span>Sign In to Portal</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>

            {/* Quick Role Fill Testing Panel */}
            <div className="pt-4 border-t border-[#E2E8F0]/70">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                  One-Click Test Accounts
                </span>
                <span className="text-[10px] text-[#1E3B78] bg-[#E2E9F4] px-2.5 py-0.5 rounded-full font-mono font-bold">
                  Admin@123
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTestRole('admin@lms.local')}
                  className={`py-2 px-1 text-center rounded-xl transition-all ${
                    email === 'admin@lms.local'
                      ? 'clay-btn-primary text-white font-bold shadow-sm'
                      : 'clay-btn-secondary text-[#1E3B78] font-semibold'
                  }`}
                >
                  <div className="text-[10px] uppercase tracking-wider">Admin</div>
                </button>

                <button
                  type="button"
                  onClick={() => setTestRole('instructor@lms.local')}
                  className={`py-2 px-1 text-center rounded-xl transition-all ${
                    email === 'instructor@lms.local'
                      ? 'clay-btn-primary text-white font-bold shadow-sm'
                      : 'clay-btn-secondary text-[#1E3B78] font-semibold'
                  }`}
                >
                  <div className="text-[10px] uppercase tracking-wider">Instructor</div>
                </button>

                <button
                  type="button"
                  onClick={() => setTestRole('learner@lms.local')}
                  className={`py-2 px-1 text-center rounded-xl transition-all ${
                    email === 'learner@lms.local'
                      ? 'clay-btn-primary text-white font-bold shadow-sm'
                      : 'clay-btn-secondary text-[#1E3B78] font-semibold'
                  }`}
                >
                  <div className="text-[10px] uppercase tracking-wider">Learner</div>
                </button>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="pt-2 text-center text-xs text-[#64748B] font-medium">
              Need access?{' '}
              <span className="text-[#2C51A2] font-bold hover:underline cursor-pointer">
                Contact Platform Governance
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
