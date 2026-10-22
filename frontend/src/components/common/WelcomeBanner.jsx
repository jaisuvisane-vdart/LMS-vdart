import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar } from 'lucide-react';

const WelcomeBanner = ({
  role = 'admin',
  subtitle,
  portalLabel,
  actions,
}) => {
  const { user } = useAuth();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getFormattedDate = () => {
    const options = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
    return new Date().toLocaleDateString('en-US', options);
  };

  const firstName = user?.first_name || '';
  const lastName = user?.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim() || 'Colleague';
  const greeting = getGreeting();

  const roleDefaults = {
    admin: {
      portalLabel: 'System Administration & Governance',
      defaultSubtitle:
        'Here is what is happening across your enterprise learning environment today. You have full administrative oversight of employee directory, course catalog, compliance reports, and audit trails.',
    },
    instructor: {
      portalLabel: 'Curriculum Authoring & Grading Studio',
      defaultSubtitle:
        'Manage your curriculum syllabi, formulate interactive lesson modules, configure assessments, and review trainee performance metrics.',
    },
    learner: {
      portalLabel: 'Employee Professional Development',
      defaultSubtitle:
        'Continue your professional development journey. Review assigned corporate curriculum, complete mandatory assessment modules, and earn certified competency badges.',
    },
  };

  const currentDefaults = roleDefaults[role] || roleDefaults.admin;

  return (
    <div className="clay-card p-6 sm:p-7 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-5">
      {/* User Identity & Personalized Greeting Message */}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#2C51A2] text-white px-2.5 py-0.5 rounded-full clay-pill">
            {user?.role_display_name || user?.role || 'Enterprise User'}
          </span>
          <span className="text-xs text-[#64748B] font-medium hidden sm:inline">
            {portalLabel || currentDefaults.portalLabel}
          </span>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-[#172B4D] tracking-tight mt-1 truncate">
          {greeting}, <span className="text-[#2C51A2]">{fullName}</span>!
        </h1>

        <p className="text-xs text-[#64748B] mt-1 max-w-2xl leading-relaxed">
          {subtitle || currentDefaults.defaultSubtitle}
        </p>
      </div>

      {/* Date Pill & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-3 shrink-0">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#64748B] bg-white/80 border border-[#E2E8F0] px-3 py-1.5 rounded-xl shadow-xs">
          <Calendar className="w-3.5 h-3.5 text-[#2C51A2]" />
          <span>{getFormattedDate()}</span>
        </div>

        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
};

export default WelcomeBanner;
