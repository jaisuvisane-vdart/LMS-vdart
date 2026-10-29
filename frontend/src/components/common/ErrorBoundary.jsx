import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import Button from './Button';

/**
 * Enterprise React Error Boundary Component
 * Traps runtime JavaScript exceptions in child component trees,
 * preventing full-page unmounts and white-screen crashes.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-6 sm:p-8 max-w-2xl mx-auto my-8 bg-white border border-[#CBD5E1] shadow-sm rounded-none">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-rose-50 text-rose-600 border border-rose-200 shrink-0 rounded-none">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="text-base font-bold text-[#172B4D] uppercase tracking-wide">
                  Component Display Interruption
                </h3>
                <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                  An unexpected error occurred while rendering this view. Your session and account data remain secure.
                </p>
              </div>

              {this.state.error?.message && (
                <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] font-mono text-[11px] text-rose-700 overflow-x-auto rounded-none">
                  {this.state.error.message}
                </div>
              )}

              <div className="pt-2">
                <Button
                  variant="primary"
                  size="md"
                  icon={RotateCcw}
                  onClick={this.handleReset}
                  className="rounded-none"
                >
                  Reload Component
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
