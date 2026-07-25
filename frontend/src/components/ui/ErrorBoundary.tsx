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
        <div className="min-h-screen t-bg flex items-center justify-center p-4 sm:p-6">
          <div className="max-w-md w-full t-card p-5 sm:p-8 text-center space-y-5 sm:space-y-6">
            <div className="w-16 h-16 t-tint-danger rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-red-500" style={{ color: 'var(--text-danger)' }} />
            </div>
            <div>
              <h2 className="text-xl font-bold t-text mb-2">Something went wrong</h2>
              <p className="text-sm t-text-secondary">
                An unexpected error occurred. This has been logged for investigation.
              </p>
            </div>
            {this.state.error && (
              <div className="t-bg-raised rounded-xl p-4 text-left border t-divider">
                <p className="text-xs font-mono t-text-muted break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="px-5 py-2.5 t-btn-secondary rounded-xl font-bold text-sm flex items-center gap-2"
              >
                <RefreshCcw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="px-5 py-2.5 btn-premium rounded-xl font-bold text-sm"
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
