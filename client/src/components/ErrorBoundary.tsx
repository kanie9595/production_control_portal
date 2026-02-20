import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw, X } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console for debugging
    console.error("[ErrorBoundary] Caught error:", error);
    console.error("[ErrorBoundary] Component stack:", errorInfo.componentStack);
    
    // Update state with error info
    this.setState({ errorInfo });
    
    // Call optional error handler
    this.props.onError?.(error, errorInfo);
    
    // TODO: Send to error tracking service (Sentry, etc.)
    // if (typeof window !== 'undefined' && (window as any).Sentry) {
    //   (window as any).Sentry.captureException(error);
    // }
  }

  reset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen p-4 sm:p-8 bg-background">
          <div className="flex flex-col items-center w-full max-w-2xl p-4 sm:p-8">
            <AlertTriangle
              size={48}
              className="text-destructive mb-6 flex-shrink-0"
            />

            <h2 className="text-lg sm:text-xl mb-4 text-center">
              Произошла непредвиденная ошибка
            </h2>

            <div className="p-4 w-full rounded bg-muted overflow-auto mb-6 max-h-64">
              <pre className="text-xs sm:text-sm text-muted-foreground whitespace-pre-wrap break-all">
                {this.state.error?.message}
                {"\n\n"}
                {this.state.error?.stack}
              </pre>
            </div>

            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={this.reset}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg",
                  "bg-secondary text-secondary-foreground",
                  "hover:opacity-90 cursor-pointer"
                )}
              >
                <X size={16} />
                Попробовать снова
              </button>
              <button
                onClick={() => window.location.reload()}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg",
                  "bg-primary text-primary-foreground",
                  "hover:opacity-90 cursor-pointer"
                )}
              >
                <RotateCcw size={16} />
                Перезагрузить страницу
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
