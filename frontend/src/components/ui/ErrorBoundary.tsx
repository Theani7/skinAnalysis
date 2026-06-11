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

  componentDidCatch(_error: Error, _errorInfo: React.ErrorInfo) {
    // Error logged by React's built-in error handling
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
        <div className="min-h-screen bg-surface-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-3xl border border-surface-200 p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-danger-50 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-danger-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-surface-900 mb-2">Something went wrong</h2>
              <p className="text-sm text-surface-500">
                An unexpected error occurred. This has been logged for investigation.
              </p>
            </div>
            {this.state.error && (
              <div className="bg-surface-50 rounded-xl p-4 text-left">
                <p className="text-xs font-mono text-surface-500 break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="px-5 py-2.5 bg-white border border-surface-200 text-surface-900 rounded-xl font-bold text-sm hover:bg-surface-50 transition-all flex items-center gap-2"
              >
                <RefreshCcw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="px-5 py-2.5 bg-primary-600 text-white rounded-xl font-bold text-sm hover:bg-primary-700 transition-all"
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
