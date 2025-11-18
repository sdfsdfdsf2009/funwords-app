import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Download } from 'lucide-react';
import { errorMonitor } from '../../utils/errorMonitor';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
  errorId: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    const errorId = `react-error-${Date.now()}`;

    this.setState({
      errorInfo,
      errorId
    });

    // Log to error monitor
    errorMonitor.logReactError(error, errorInfo, this.props.componentName);

    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to console for debugging
    console.error(`[ErrorBoundary: ${this.props.componentName || 'Unknown'}]`, error, errorInfo);
  }

  handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null
      });
    }
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleDownloadReport = () => {
    errorMonitor.downloadErrorReport();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>

            <h1 className="text-xl font-semibold text-gray-900 text-center mb-2">
              出现了错误
            </h1>

            <p className="text-gray-600 text-center mb-6">
              {this.props.componentName ? `${this.props.componentName} 组件` : '应用'}遇到了意外错误。
              {this.retryCount > 0 && ` (重试次数: ${this.retryCount}/${this.maxRetries})`}
            </p>

            {/* Error Details (Development Only) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 p-3 bg-gray-50 rounded border border-gray-200">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
                  错误详情
                </summary>
                <div className="text-xs text-gray-600 space-y-2">
                  <div>
                    <strong>错误:</strong> {this.state.error.message}
                  </div>
                  {this.state.errorId && (
                    <div>
                      <strong>错误ID:</strong> {this.state.errorId}
                    </div>
                  )}
                  {this.props.componentName && (
                    <div>
                      <strong>组件:</strong> {this.props.componentName}
                    </div>
                  )}
                </div>
              </details>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {this.retryCount < this.maxRetries && (
                <button
                  onClick={this.handleRetry}
                  className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  重试
                </button>
              )}

              <button
                onClick={this.handleGoHome}
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Home className="w-4 h-4 mr-2" />
                返回首页
              </button>

              <button
                onClick={this.handleDownloadReport}
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                <Download className="w-4 h-4 mr-2" />
                下载错误报告
              </button>
            </div>

            {/* Help Text */}
            <div className="mt-6 p-3 bg-blue-50 rounded border border-blue-200">
              <p className="text-sm text-blue-700 text-center">
                如果问题持续存在，请下载错误报告并联系技术支持。
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string,
  fallback?: ReactNode
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary componentName={componentName} fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// Hook for manual error logging
export function useErrorMonitor() {
  return {
    logError: errorMonitor.logError.bind(errorMonitor),
    logApiError: errorMonitor.logApiError.bind(errorMonitor),
    logStateError: errorMonitor.logStateError.bind(errorMonitor),
    getErrors: errorMonitor.getErrors.bind(errorMonitor),
    downloadReport: errorMonitor.downloadErrorReport.bind(errorMonitor),
    clearErrors: errorMonitor.clearErrors.bind(errorMonitor)
  };
}