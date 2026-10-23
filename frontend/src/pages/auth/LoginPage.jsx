import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/common/Button';
import { GOOGLE_CLIENT_ID } from '../../config/google';
import api from '../../services/api';
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
  ShieldCheck,
  KeyRound,
  ArrowLeft,
  RefreshCw,
  CheckCircle,
  Check
} from 'lucide-react';
import vdartLogo from '../../assets/VDart_Logobg.png';
import loginBg from '../../assets/loginbg.png';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);
  const [isAnalyzingEmail, setIsAnalyzingEmail] = useState(false);
  const tokenClientRef = useRef(null);

  // Onboarding flow state: 'login' | 'otp' | 'create_password'
  const [flowStep, setFlowStep] = useState('login');
  const [tempToken, setTempToken] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState(0);

  // New password state
  const [resetToken, setResetToken] = useState('');
  const [userName, setUserName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const otpInputRefs = useRef([]);

  const { login, loginWithGoogle, requestFirstLoginOtp, completeFirstLogin } = useAuth();
  const navigate = useNavigate();

  const isGoogleConfigured = GOOGLE_CLIENT_ID && !GOOGLE_CLIENT_ID.includes('YOUR_GOOGLE_CLIENT_ID');

  // Debounced email analysis: automatically detect if user requires first-time login onboarding
  useEffect(() => {
    if (!email || !email.includes('@')) {
      setIsFirstTimeUser(false);
      setIsAnalyzingEmail(false);
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email.trim())) {
      setIsFirstTimeUser(false);
      setIsAnalyzingEmail(false);
      return;
    }

    setIsAnalyzingEmail(true);
    const debounceTimer = setTimeout(async () => {
      try {
        const res = await api.post('/auth/check-email-status', { email: email.trim() });
        if (res.status === 'success' && res.data?.is_first_login) {
          setIsFirstTimeUser(true);
          setPassword('');
        } else {
          setIsFirstTimeUser(false);
        }
      } catch (err) {
        setIsFirstTimeUser(false);
      } finally {
        setIsAnalyzingEmail(false);
      }
    }, 350);

    return () => clearTimeout(debounceTimer);
  }, [email]);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleGoogleAuthSuccess = async (token) => {
    setErrorMessage('');
    setLoading(true);

    try {
      const user = await loginWithGoogle(token);
      const role = (user.role || '').toLowerCase();

      if (role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (role === 'instructor') {
        navigate('/instructor/dashboard', { replace: true });
      } else {
        navigate('/learner/dashboard', { replace: true });
      }
    } catch (err) {
      setErrorMessage(err.message || 'Google authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isGoogleConfigured) return;

    const initGoogleAuth = () => {
      // 1. Initialize OAuth2 Token Client for custom button trigger
      if (window.google?.accounts?.oauth2) {
        try {
          tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: 'email profile openid',
            callback: async (tokenResponse) => {
              if (tokenResponse?.error) {
                setErrorMessage(tokenResponse.error_description || 'Google sign-in was cancelled.');
                setLoading(false);
                return;
              }
              if (tokenResponse?.access_token) {
                await handleGoogleAuthSuccess(tokenResponse.access_token);
              }
            },
          });
        } catch (err) {
          console.error('Google OAuth client initialization error:', err);
        }
      }

      // 2. Initialize Identity Services for One-Tap / ID token fallback
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: async (credentialResponse) => {
              if (credentialResponse?.credential) {
                await handleGoogleAuthSuccess(credentialResponse.credential);
              }
            },
            auto_select: false,
          });
        } catch (err) {
          console.error('Google ID client initialization error:', err);
        }
      }
    };

    if (window.google?.accounts) {
      initGoogleAuth();
    } else {
      const timer = setInterval(() => {
        if (window.google?.accounts) {
          clearInterval(timer);
          initGoogleAuth();
        }
      }, 200);
      return () => clearInterval(timer);
    }
  }, [isGoogleConfigured, GOOGLE_CLIENT_ID]);

  const handleGoogleSignIn = () => {
    if (!isGoogleConfigured) {
      setErrorMessage('Google Client ID is not configured. Add it in frontend/.env.');
      return;
    }

    setErrorMessage('');

    if (tokenClientRef.current) {
      setLoading(true);
      tokenClientRef.current.requestAccessToken({ prompt: 'select_account' });
    } else if (window.google?.accounts?.oauth2) {
      setLoading(true);
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'email profile openid',
        callback: async (tokenResponse) => {
          if (tokenResponse?.error) {
            setErrorMessage(tokenResponse.error_description || 'Google sign-in was cancelled.');
            setLoading(false);
            return;
          }
          if (tokenResponse?.access_token) {
            await handleGoogleAuthSuccess(tokenResponse.access_token);
          }
        },
      });
      tokenClientRef.current = client;
      client.requestAccessToken({ prompt: 'select_account' });
    } else if (window.google?.accounts?.id) {
      setLoading(true);
      window.google.accounts.id.prompt();
    } else {
      setErrorMessage('Google Identity Services is initializing. Please try again in a moment.');
    }
  };

  const handleFirstTimeActivationRequest = async (e) => {
    if (e) e.preventDefault();
    if (!email || !email.trim()) {
      setErrorMessage('Please enter your corporate email address to receive your activation code.');
      return;
    }

    setErrorMessage('');
    setLoading(true);

    try {
      const result = await requestFirstLoginOtp(email.trim());
      if (result?.requires_first_login_verification) {
        setTempToken(result.temp_token);
        setMaskedEmail(result.masked_email || email);
        setDevOtp(result.dev_otp || '');
        setOtp(['', '', '', '', '', '']);
        setResendCooldown(60);
        setFlowStep('otp');
        setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to dispatch activation code. Please check your email.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // If first-time user detected or password omitted, trigger first-time activation
    if (isFirstTimeUser || (email && !password)) {
      return handleFirstTimeActivationRequest(e);
    }

    setLoading(true);

    try {
      const result = await login(email, password);

      // Check if first-time login verification is required
      if (result?.requires_first_login_verification) {
        setTempToken(result.temp_token);
        setMaskedEmail(result.masked_email || email);
        setDevOtp(result.dev_otp || '');
        setOtp(['', '', '', '', '', '']);
        setResendCooldown(60);
        setFlowStep('otp');
        setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
        return;
      }

      const role = (result.role || '').toLowerCase();
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

  const handleOtpChange = (index, value) => {
    const cleanValue = value.replace(/[^0-9]/g, '');
    if (!cleanValue && value !== '') return;

    const newOtp = [...otp];
    newOtp[index] = cleanValue.slice(-1);
    setOtp(newOtp);

    if (cleanValue && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (!pasted) return;

    const newOtp = [...otp];
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i];
    }
    setOtp(newOtp);

    const focusIndex = Math.min(pasted.length, 5);
    otpInputRefs.current[focusIndex]?.focus();
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const enteredOtp = otp.join('');
    if (enteredOtp.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit verification code.');
      return;
    }

    setErrorMessage('');
    setLoading(true);

    try {
      const res = await api.post('/auth/verify-first-login-otp', {
        temp_token: tempToken,
        otp_code: enteredOtp,
      });

      if (res.status === 'success' && res.data.reset_token) {
        setResetToken(res.data.reset_token);
        setUserName(res.data.user_name || '');
        setNewPassword('');
        setConfirmPassword('');
        setFlowStep('create_password');
      } else {
        throw new Error(res.message || 'OTP verification failed.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    setErrorMessage('');
    setLoading(true);

    try {
      const res = await api.post('/auth/resend-first-login-otp', {
        temp_token: tempToken,
      });

      if (res.status === 'success') {
        setResendCooldown(60);
        if (res.data?.dev_otp) {
          setDevOtp(res.data.dev_otp);
        }
        setOtp(['', '', '', '', '', '']);
        otpInputRefs.current[0]?.focus();
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompletePasswordCreation = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify both inputs.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/auth/complete-first-login', {
        reset_token: resetToken,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      if (res.status === 'success') {
        // Return to normal sign in card as requested
        setResetToken('');
        setTempToken('');
        setDevOtp('');
        setNewPassword('');
        setConfirmPassword('');
        setPassword('');
        setIsFirstTimeUser(false);
        setSuccessMessage('Your new password has been established successfully. Please sign in with your new credentials.');
        setFlowStep('login');
      } else {
        throw new Error(res.message || 'Failed to set corporate password.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error completing account setup.');
    } finally {
      setLoading(false);
    }
  };

  const setTestRole = (testEmail, testPass = 'Admin@123') => {
    setEmail(testEmail);
    setPassword(testPass);
    setErrorMessage('');
    setSuccessMessage('');
    setFlowStep('login');
  };

  return (
    <div
      className="min-h-screen w-full bg-cover bg-center bg-no-repeat bg-fixed flex flex-col justify-center items-center py-6 px-4 sm:px-6 lg:px-8 xl:px-12 font-sans select-none relative overflow-y-auto touch-scroll"
      style={{
        backgroundImage: `url(${loginBg})`,
        backgroundColor: '#F3F6FB',
      }}
    >
      <div className="my-auto w-full max-w-[1660px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 xl:gap-20 2xl:gap-24 items-center relative z-10 py-4">
        {/* Left Column: Brand & Value Proposition Showcase */}
        <div className="lg:col-span-7 xl:col-span-7 flex flex-col justify-between space-y-6 xl:space-y-8">
          {/* Brand Header */}
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 clay-card rounded-2xl flex items-center justify-center p-2.5 border border-white/80 shadow-md">
              <img
                src={vdartLogo}
                alt="VDart Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-baseline">
                <span className="text-2xl sm:text-3xl font-extrabold text-[#172B4D] tracking-tight">VDart</span>
                <span className="text-2xl sm:text-3xl font-extrabold text-[#2C51A2] tracking-tight">-Learning</span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-[#64748B] tracking-widest uppercase mt-0.5">
                Enterprise Learning Management
              </p>
            </div>
          </div>

          {/* Main Hero Headline */}
          <div className="space-y-3 sm:space-y-4">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black text-[#172B4D] leading-[1.12] tracking-tight">
              Enterprise Knowledge <br className="hidden sm:inline" />
              <span className="text-[#2C51A2]">Engineered for Growth</span>
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-[#475569] max-w-2xl xl:max-w-3xl leading-relaxed font-medium">
              Access curated corporate curriculum, verify competencies through assessments, and track organizational compliance with real-time analytics.
            </p>
          </div>

          {/* 4 Feature Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4 pt-1 w-full max-w-2xl xl:max-w-3xl">
            {/* 1. Online Courses */}
            <div className="clay-card p-4 rounded-2xl border border-white/80 space-y-2">
              <div className="w-10 h-10 bg-[#E2E9F4] text-[#2C51A2] rounded-xl flex items-center justify-center shrink-0 shadow-inner">
                <BookOpen className="w-5 h-5 text-[#2C51A2]" />
              </div>
              <h4 className="text-sm sm:text-base font-bold text-[#172B4D] leading-tight">Online Courses</h4>
              <p className="text-xs sm:text-sm text-[#64748B] leading-snug font-medium">
                Self-paced learning paths.
              </p>
            </div>

            {/* 2. Track Progress */}
            <div className="clay-card p-4 rounded-2xl border border-white/80 space-y-2">
              <div className="w-10 h-10 bg-[#E2E9F4] text-[#2C51A2] rounded-xl flex items-center justify-center shrink-0 shadow-inner">
                <TrendingUp className="w-5 h-5 text-[#2C51A2]" />
              </div>
              <h4 className="text-sm sm:text-base font-bold text-[#172B4D] leading-tight">Track Progress</h4>
              <p className="text-xs sm:text-sm text-[#64748B] leading-snug font-medium">
                Continuous compliance logs.
              </p>
            </div>

            {/* 3. Get Certified */}
            <div className="clay-card p-4 rounded-2xl border border-white/80 space-y-2">
              <div className="w-10 h-10 bg-[#F3E8FF] text-[#7E22CE] rounded-xl flex items-center justify-center shrink-0 shadow-inner">
                <Award className="w-5 h-5 text-[#7E22CE]" />
              </div>
              <h4 className="text-sm sm:text-base font-bold text-[#172B4D] leading-tight">Verified Certs</h4>
              <p className="text-xs sm:text-sm text-[#64748B] leading-snug font-medium">
                Authentic credentials.
              </p>
            </div>

            {/* 4. Learn Together */}
            <div className="clay-card p-4 rounded-2xl border border-white/80 space-y-2">
              <div className="w-10 h-10 bg-[#FEF3C7] text-[#D97706] rounded-xl flex items-center justify-center shrink-0 shadow-inner">
                <Users className="w-5 h-5 text-[#D97706]" />
              </div>
              <h4 className="text-sm sm:text-base font-bold text-[#172B4D] leading-tight">Teams</h4>
              <p className="text-xs sm:text-sm text-[#64748B] leading-snug font-medium">
                Departmental groups.
              </p>
            </div>
          </div>

          {/* Bottom Security Tags */}
          <div className="pt-2 flex flex-wrap items-center gap-2.5 w-full max-w-2xl xl:max-w-3xl">
            <span className="clay-pill bg-[#2C51A2] text-white px-4 py-1.5 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-full shadow-sm">
              Enterprise Grade
            </span>
            <span className="clay-pill bg-[#1E3B78] text-white px-4 py-1.5 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-full shadow-sm">
              Role-Based Access
            </span>
            <span className="clay-pill bg-[#E2E9F4] text-[#1E3B78] border border-white/60 px-4 py-1.5 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-full">
              Audit Traced
            </span>
          </div>
        </div>

        {/* Right Column: Authentication Card */}
        <div className="lg:col-span-5 xl:col-span-5 w-full flex justify-center lg:justify-end">
          <div className="clay-modal rounded-2xl border border-white/80 p-7 sm:p-9 xl:p-10 space-y-5 shadow-2xl w-full max-w-lg sm:max-w-xl lg:max-w-[560px] xl:max-w-[600px]">
            {flowStep === 'otp' ? (
              // Step 2: 6-Digit Email OTP Verification Screen
              <div className="space-y-4">
                {/* Header */}
                <div>
                  <span className="clay-pill text-[10px] sm:text-[11px] font-bold text-[#1E3B78] bg-[#E2E9F4] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    First-Time Activation
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-[#172B4D] tracking-tight mt-2">
                    Verify Corporate Email
                  </h2>
                  <p className="text-xs text-[#64748B] mt-1 leading-normal font-medium">
                    A 6-digit verification code was dispatched to <strong className="text-[#172B4D]">{maskedEmail}</strong>. Enter the code below to verify your identity.
                  </p>
                </div>

                {/* Dev Mode OTP Callout for Testing */}
                {devOtp && (
                  <div className="bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E3B78] p-2.5 rounded-xl text-center text-xs">
                    <span className="text-[10px] uppercase font-bold text-[#64748B] block">Development Mode Test Code</span>
                    <span className="font-mono font-extrabold text-sm tracking-widest text-[#2C51A2]">{devOtp}</span>
                  </div>
                )}

                {/* Error Message */}
                {errorMessage && (
                  <div className="bg-[#FEE2E2] border border-[#FCA5A5] text-[#DC2626] p-3.5 rounded-xl text-xs font-semibold shadow-xs">
                    {errorMessage}
                  </div>
                )}

                {/* OTP Input Form */}
                <form className="space-y-5" onSubmit={handleVerifyOtp}>
                  <div className="flex items-center justify-between gap-2 sm:gap-2.5 my-2" onPaste={handleOtpPaste}>
                    {otp.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => (otpInputRefs.current[idx] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className="w-11 h-12 sm:w-12 sm:h-13 text-center text-lg sm:text-xl font-bold font-mono text-[#172B4D] bg-white border border-[#CBD5E1] rounded-xl focus:border-[#2C51A2] focus:ring-2 focus:ring-[#2C51A2]/20 outline-none clay-card transition-all"
                      />
                    ))}
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    loading={loading}
                    className="w-full h-11 text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2"
                  >
                    <span>Verify Activation Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </form>

                {/* Navigation and Resend Options */}
                <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0]/70 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setFlowStep('login');
                      setErrorMessage('');
                    }}
                    className="text-[#64748B] hover:text-[#172B4D] font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Login</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || loading}
                    className="text-[#2C51A2] font-semibold hover:underline disabled:text-[#94A3B8] disabled:no-underline transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    <span>{resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}</span>
                  </button>
                </div>
              </div>
            ) : flowStep === 'create_password' ? (
              // Step 3: Password Creation Screen
              <div className="space-y-4">
                {/* Header */}
                <div>
                  <span className="clay-pill text-[10px] sm:text-[11px] font-bold text-[#1E3B78] bg-[#E2E9F4] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Security Policy
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-[#172B4D] tracking-tight mt-2">
                    Create New Password
                  </h2>
                  <p className="text-xs text-[#64748B] mt-1 leading-normal font-medium">
                    {userName ? `Welcome, ${userName}. ` : ''}Set your personal corporate password for future sign-ins.
                  </p>
                </div>

                {/* Error Message */}
                {errorMessage && (
                  <div className="bg-[#FEE2E2] border border-[#FCA5A5] text-[#DC2626] p-3.5 rounded-xl text-xs font-semibold shadow-xs">
                    {errorMessage}
                  </div>
                )}

                {/* Password Creation Form */}
                <form className="space-y-4" onSubmit={handleCompletePasswordCreation}>
                  {/* New Password */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#172B4D]">
                      New Corporate Password
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 text-[#64748B] pointer-events-none">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimum 8 characters"
                        required
                        className="clay-input w-full pl-10 pr-10 py-2.5 bg-white rounded-xl text-[#172B4D] text-xs transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 text-[#64748B] hover:text-[#2C51A2] focus:outline-none"
                        title={showNewPassword ? 'Hide password' : 'Show password'}
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#172B4D]">
                      Confirm New Password
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 text-[#64748B] pointer-events-none">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        required
                        className="clay-input w-full pl-10 pr-10 py-2.5 bg-white rounded-xl text-[#172B4D] text-xs transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 text-[#64748B] hover:text-[#2C51A2] focus:outline-none"
                        title={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Password Requirements Checklist */}
                  <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-1.5 text-[11px]">
                    <div className="flex items-center gap-2">
                      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${newPassword.length >= 8 ? 'bg-[#2C51A2] text-white' : 'bg-[#E2E8F0] text-[#94A3B8]'}`}>
                        <Check className="w-2.5 h-2.5" />
                      </div>
                      <span className={newPassword.length >= 8 ? 'text-[#2C51A2] font-semibold' : 'text-[#64748B]'}>
                        Minimum 8 characters
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${newPassword && confirmPassword && newPassword === confirmPassword ? 'bg-[#2C51A2] text-white' : 'bg-[#E2E8F0] text-[#94A3B8]'}`}>
                        <Check className="w-2.5 h-2.5" />
                      </div>
                      <span className={newPassword && confirmPassword && newPassword === confirmPassword ? 'text-[#2C51A2] font-semibold' : 'text-[#64748B]'}>
                        Passwords match
                      </span>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    loading={loading}
                    className="w-full h-11 text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2"
                  >
                    <span>Save Password & Confirm</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            ) : (
              // Step 1: Standard Intelligent Login Screen
              <>
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

                {/* Success Message Banner */}
                {successMessage && (
                  <div className="bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] p-3.5 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#059669] shrink-0" />
                    <span>{successMessage}</span>
                  </div>
                )}

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
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#172B4D]">
                        Corporate Email
                      </label>
                      {isAnalyzingEmail && (
                        <span className="text-[10px] text-[#2C51A2] font-semibold flex items-center gap-1">
                          <RefreshCw className="w-3 h-3 animate-spin text-[#2C51A2]" />
                          Analyzing account...
                        </span>
                      )}
                    </div>
                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 text-[#64748B] pointer-events-none">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setErrorMessage('');
                          setSuccessMessage('');
                        }}
                        placeholder="Enter corporate email"
                        required
                        className="clay-input w-full pl-10 pr-4 py-2.5 bg-white rounded-xl text-[#172B4D] text-xs transition-all"
                      />
                    </div>
                  </div>

                  {/* First-Time Trainee Detected Notice */}
                  {isFirstTimeUser && (
                    <div className="bg-[#EFF6FF] border border-[#BFDBFE] p-3.5 rounded-xl text-xs space-y-1 transition-all">
                      <div className="flex items-center gap-1.5 font-bold text-[#1E3B78]">
                        <ShieldCheck className="w-4 h-4 text-[#2C51A2]" />
                        <span>First-Time Trainee Setup Detected</span>
                      </div>
                      <p className="text-[#64748B] text-[11px] leading-relaxed">
                        No temporary password required. Click below to verify your corporate email with a 6-digit OTP and establish your personal password.
                      </p>
                    </div>
                  )}

                  {/* Password Input & Options: Automatically Hidden for First-Time Logins */}
                  {!isFirstTimeUser && (
                    <>
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
                            required={!isFirstTimeUser}
                            className="clay-input w-full pl-10 pr-10 py-2.5 bg-white rounded-xl text-[#172B4D] text-xs transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 text-[#64748B] hover:text-[#2C51A2] focus:outline-none cursor-pointer"
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
                    </>
                  )}

                  {/* Dynamic Action Button */}
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    loading={loading}
                    className="w-full h-11 text-xs font-bold tracking-wider uppercase mt-2 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>{isFirstTimeUser ? 'Verify Email & Set Password' : 'Sign In to Portal'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </form>

                {/* Divider */}
                <div className="relative my-3">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#E2E8F0]" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-[#FFFFFF] px-3 text-[#64748B] font-semibold uppercase tracking-wider text-[10px]">
                      Or authenticate with
                    </span>
                  </div>
                </div>

                {/* Google OAuth Section with UI-Aligned Borders */}
                {isGoogleConfigured ? (
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full h-11 bg-white hover:bg-[#F8FAFC] text-[#172B4D] border border-[#CBD5E1] rounded-xl font-medium text-xs flex items-center justify-center gap-3 transition-all duration-150 clay-card shadow-xs hover:border-[#2C51A2]/50 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed group cursor-pointer"
                    title="Sign in with your corporate Google Account"
                  >
                    <svg className="w-4 h-4 shrink-0 transition-transform group-hover:scale-105" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span className="text-xs font-semibold text-[#172B4D] tracking-wide group-hover:text-[#2C51A2] transition-colors">
                      Sign in with Google
                    </span>
                  </button>
                ) : (
                  <div className="p-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl text-center">
                    <div className="text-[11px] font-bold text-[#1E3B78]">
                      Google Sign-In Ready
                    </div>
                    <p className="text-[10px] text-[#64748B] mt-0.5">
                      Paste your Client ID into <span className="font-mono font-bold text-[#2C51A2]">frontend/.env</span> to activate.
                    </p>
                  </div>
                )}

                {/* Quick Role Fill Testing Panel */}
                <div className="pt-4 border-t border-[#E2E8F0]/70">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                      One-Click Test Accounts
                    </span>
                    <span className="text-[10px] text-[#1E3B78] bg-[#E2E9F4] px-2.5 py-0.5 rounded-full font-mono font-bold">
                      Admin@123 / Welcome@123
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => setTestRole('admin@vdartinc.com')}
                      className={`py-2 px-1 text-center rounded-xl transition-all ${
                        email === 'admin@vdartinc.com'
                          ? 'clay-btn-primary text-white font-bold shadow-sm'
                          : 'clay-btn-secondary text-[#1E3B78] font-semibold'
                      }`}
                    >
                      <div className="text-[10px] uppercase tracking-wider">Admin</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTestRole('instructor@vdartinc.com')}
                      className={`py-2 px-1 text-center rounded-xl transition-all ${
                        email === 'instructor@vdartinc.com'
                          ? 'clay-btn-primary text-white font-bold shadow-sm'
                          : 'clay-btn-secondary text-[#1E3B78] font-semibold'
                      }`}
                    >
                      <div className="text-[10px] uppercase tracking-wider">Instructor</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTestRole('learner@vdartinc.com')}
                      className={`py-2 px-1 text-center rounded-xl transition-all ${
                        email === 'learner@vdartinc.com'
                          ? 'clay-btn-primary text-white font-bold shadow-sm'
                          : 'clay-btn-secondary text-[#1E3B78] font-semibold'
                      }`}
                    >
                      <div className="text-[10px] uppercase tracking-wider">Learner</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEmail('david.chen@vdartinc.com');
                        setPassword('');
                        setErrorMessage('');
                        setSuccessMessage('');
                        setFlowStep('login');
                      }}
                      className={`py-2 px-1 text-center rounded-xl transition-all border border-[#2C51A2]/30 ${
                        email === 'david.chen@vdartinc.com'
                          ? 'clay-btn-primary text-white font-bold shadow-sm'
                          : 'bg-[#EFF6FF] text-[#2C51A2] font-semibold'
                      }`}
                      title="Test automatic first-time detection with OTP"
                    >
                      <div className="text-[10px] uppercase tracking-wider">New Trainee</div>
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
