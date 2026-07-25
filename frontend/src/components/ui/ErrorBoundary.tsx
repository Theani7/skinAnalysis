import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center p-4 sm:p-6">
          <div className="max-w-md w-full bg-[rgba(255,255,255,0.03)] backdrop-blur-xl rounded-3xl border border-[rgba(255,255,255,0.06)] p-5 sm:p-8 text-center space-y-5 sm:space-y-6">
            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
              <p className="text-sm text-gray-400">
                An unexpected error occurred. This has been logged for investigation.
              </p>
            </div>
            {this.state.error && (
              <div className="bg-[rgba(255,255,255,0.04)] rounded-xl p-4 text-left">
                <p className="text-xs font-mono text-gray-500 break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="px-5 py-2.5 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-white rounded-xl font-bold text-sm hover:bg-[rgba(255,255,255,0.08)] transition-all flex items-center gap-2"
              >
                <RefreshCcw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-bold text-sm hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
