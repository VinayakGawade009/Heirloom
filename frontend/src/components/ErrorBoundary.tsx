import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircleIcon } from './icons';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public override componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {
    // Unhandled error captured by boundary
  }

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center p-8">
          <div
            role="alert"
            className="bg-panel border border-rule rounded-panel p-8 max-w-lg w-full flex flex-col gap-4 text-ink"
          >
            <div className="flex items-start gap-3">
              <AlertCircleIcon width={22} height={22} className="text-danger flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h2 className="font-serif text-xl font-bold text-ink leading-snug">
                  Something went wrong
                </h2>
                <p className="text-sm text-muted mt-1 leading-relaxed">
                  An unexpected error occurred while displaying this page.
                </p>
              </div>
            </div>
            <div className="flex items-center pt-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center justify-center bg-marigold hover:bg-marigold-hover active:bg-marigold-active text-ink font-sans text-sm font-semibold px-5 py-2.5 rounded-btn transition-colors cursor-pointer"
              >
                Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
