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
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 p-8 sm:p-12 max-w-lg w-full text-center animate-in fade-in zoom-in-95 duration-500">
            <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-red-100">
              <AlertTriangle className="w-12 h-12" />
            </div>
            
            <h1 className="text-3xl font-display font-bold text-gray-900 mb-3 tracking-tight">Oops! Something went wrong</h1>
            <p className="text-gray-500 mb-10 leading-relaxed text-base">
              An unexpected error occurred in the application. Don't worry, we've logged it for investigation.
            </p>
            
            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2 w-full py-4 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl text-base font-semibold transition-all shadow-lg shadow-gray-200 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
              >
                <RefreshCcw className="w-5 h-5" />
                Reload Application
              </button>
              
              <button
                onClick={this.handleReset}
                className="w-full py-4 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 rounded-2xl text-base font-medium transition-all active:bg-gray-100"
              >
                Try Again
              </button>
            </div>
            
            {import.meta.env.DEV && this.state.error && (
              <div className="mt-8 p-4 bg-red-50 border border-red-100 rounded-xl text-left overflow-x-auto text-sm text-red-900 font-mono shadow-sm">
                {this.state.error.message}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
