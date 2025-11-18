import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';

// 高阶组件：为组件添加错误边界
export function withErrorBoundary<T extends object>(
  Component: React.ComponentType<T>,
  fallbackMessage?: string,
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
) {
  const WrappedComponent = (props: T) => (
    <ErrorBoundary
      fallbackMessage={fallbackMessage}
      onError={onError}
    >
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// 用于特定组件的预设错误边界包装器
export const ProjectSelectorWithErrorBoundary = withErrorBoundary(
  require('../project/ProjectSelector').default,
  '项目选择器遇到错误，请刷新页面重试',
  (error, errorInfo) => {
    console.error('ProjectSelector Error:', error, errorInfo);
  }
);

export const VideoGenerationWithErrorBoundary = withErrorBoundary(
  require('../video-generation/VideoGeneration').default,
  '视频生成组件遇到错误，请检查网络连接后重试',
  (error, errorInfo) => {
    console.error('VideoGeneration Error:', error, errorInfo);
  }
);

export const ImageGenerationWithErrorBoundary = withErrorBoundary(
  require('../image-generation/ImageGeneration').default,
  '图片生成组件遇到错误，请稍后重试',
  (error, errorInfo) => {
    console.error('ImageGeneration Error:', error, errorInfo);
  }
);

// 自定义错误边界类，用于更多控制
export class CustomErrorBoundary extends React.Component<
  {
    children: React.ReactNode;
    fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('CustomErrorBoundary caught an error:', error, errorInfo);

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // 记录到错误监控系统
    if (typeof window !== 'undefined' && window.errorMonitor) {
      window.errorMonitor.logError({
        type: 'react',
        message: error.message,
        source: errorInfo.componentStack || 'Unknown component',
        context: {
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          errorBoundary: 'CustomErrorBoundary'
        }
      });
    }
  }

  retry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback;

      if (FallbackComponent && this.state.error) {
        return <FallbackComponent error={this.state.error} retry={this.retry} />;
      }

      return (
        <div className="flex items-center justify-center min-h-64 bg-gray-50 border border-gray-200 rounded-lg p-8">
          <div className="text-center max-w-md">
            <div className="mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                组件遇到了问题
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {this.state.error?.message || '发生了一个未知错误，请刷新页面重试'}
              </p>
            </div>
            <div className="space-y-2">
              <button
                onClick={this.retry}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                重试
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                刷新页面
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// 用于异步操作的错误边界Hook
export function useAsyncErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null);

  const captureError = React.useCallback((error: Error) => {
    console.error('Async error caught:', error);

    // 记录到错误监控系统
    if (typeof window !== 'undefined' && window.errorMonitor) {
      window.errorMonitor.logError({
        type: 'javascript',
        message: error.message,
        source: 'useAsyncErrorBoundary',
        context: {
          stack: error.stack,
          asyncOperation: true
        }
      });
    }

    setError(error);
  }, []);

  const reset = React.useCallback(() => {
    setError(null);
  }, []);

  if (error) {
    throw error; // 重新抛出错误让错误边界捕获
  }

  return { captureError, reset };
}