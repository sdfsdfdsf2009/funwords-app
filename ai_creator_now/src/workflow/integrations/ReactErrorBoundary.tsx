/**
 * 增强的React错误边界
 * 集成错误调试工作流系统
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { workflowManager } from '../WorkflowManager';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  isolate?: boolean; // 是否隔离错误，不向上传播
  maxRetries?: number;
  retryDelay?: number;
  enableWorkflow?: boolean;
  context?: any;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  isRetrying: boolean;
  workflowTaskId: string | null;
}

export class EnhancedErrorBoundary extends Component<Props, State> {
  private retryTimeout: NodeJS.Timeout | null = null;
  private static defaultRetryCount = 3;
  private static defaultRetryDelay = 1000;

  constructor(props: Props) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
      workflowTaskId: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      isRetrying: false
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // 调用自定义错误处理函数
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // 如果启用了工作流集成，处理错误
    if (this.props.enableWorkflow !== false) {
      this.handleWorkflowError(error, errorInfo);
    }

    // 如果不隔离错误，向上传播
    if (!this.props.isolate) {
      // 在控制台记录完整错误信息
      console.error('React Error Boundary caught an error:', error, errorInfo);
    }
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  private async handleWorkflowError(error: Error, errorInfo: ErrorInfo) {
    try {
      const errorData = {
        type: 'react',
        message: error.message,
        stack: error.stack,
        source: 'ReactErrorBoundary',
        component: this.getComponentName(errorInfo),
        timestamp: new Date(),
        context: {
          ...this.props.context,
          componentStack: errorInfo.componentStack,
          boundaryIsolate: this.props.isolate,
          retryCount: this.state.retryCount,
          userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server'
        }
      };

      const taskId = await workflowManager.handleError(errorData);

      this.setState({ workflowTaskId: taskId });

      console.log(`🔧 React错误已提交到工作流: ${taskId}`);

    } catch (workflowError) {
      console.error('Failed to handle error with workflow:', workflowError);
    }
  }

  private getComponentName(errorInfo: ErrorInfo): string {
    const componentStack = errorInfo.componentStack;
    const lines = componentStack.split('\n');

    // 尝试从堆栈中提取组件名
    for (const line of lines) {
      const match = line.match(/in (\w+)/);
      if (match) {
        return match[1];
      }
    }

    return 'UnknownComponent';
  }

  private handleRetry = () => {
    const maxRetries = this.props.maxRetries || EnhancedErrorBoundary.defaultRetryCount;

    if (this.state.retryCount >= maxRetries) {
      console.warn('Max retries reached for error boundary');
      return;
    }

    this.setState({ isRetrying: true });

    const retryDelay = this.props.retryDelay || EnhancedErrorBoundary.defaultRetryDelay;

    this.retryTimeout = setTimeout(() => {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1,
        isRetrying: false
      }));
    }, retryDelay);
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
      workflowTaskId: null
    });
  };

  private renderErrorState() {
    const { fallback } = this.props;
    const { error, errorInfo, isRetrying, workflowTaskId } = this.state;

    // 如果提供了自定义fallback，使用它
    if (fallback) {
      if (typeof fallback === 'function') {
        return fallback({ error, errorInfo, retry: this.handleRetry, reset: this.handleReset });
      }
      return fallback;
    }

    // 默认错误UI
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 m-4">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>

          <h1 className="text-xl font-semibold text-gray-900 text-center mb-2">
            哎呀，出现了一些问题
          </h1>

          <p className="text-gray-600 text-center mb-6">
            应用遇到了意外错误。我们已经记录了这个问题，正在努力修复。
          </p>

          {/* 错误详情（仅在开发环境显示） */}
          {process.env.NODE_ENV === 'development' && error && (
            <details className="mb-6 p-4 bg-gray-100 rounded">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
                错误详情 (开发模式)
              </summary>
              <div className="mt-2 text-xs">
                <p className="font-mono text-red-600 mb-2">{error.toString()}</p>
                {errorInfo && (
                  <pre className="whitespace-pre-wrap text-gray-600">
                    {errorInfo.componentStack}
                  </pre>
                )}
              </div>
            </details>
          )}

          {/* 工作流状态 */}
          {workflowTaskId && (
            <div className="mb-6 p-4 bg-blue-50 rounded">
              <p className="text-sm text-blue-800">
                📋 错误已提交到调试工作流
              </p>
              <p className="text-xs text-blue-600 mt-1">
                任务ID: {workflowTaskId}
              </p>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="space-y-3">
            {this.state.retryCount < (this.props.maxRetries || EnhancedErrorBoundary.defaultRetryCount) && (
              <button
                onClick={this.handleRetry}
                disabled={isRetrying}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isRetrying ? '重试中...' : `重试 (${this.state.retryCount + 1}/${this.props.maxRetries || EnhancedErrorBoundary.defaultRetryCount})`}
              </button>
            )}

            <button
              onClick={this.handleReset}
              className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
              重新加载页面
            </button>
          </div>

          {/* 联系支持 */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              如果问题持续存在，请联系技术支持
            </p>
            {workflowTaskId && (
              <p className="text-xs text-gray-400 mt-1">
                请提供错误ID: {workflowTaskId}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  render() {
    if (this.state.hasError) {
      return this.renderErrorState();
    }

    return this.props.children;
  }
}

// 便捷的高阶组件
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <EnhancedErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </EnhancedErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// Hook for functional components
export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null);
  const [errorInfo, setErrorInfo] = React.useState<ErrorInfo | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
    setErrorInfo(null);
  }, []);

  const captureError = React.useCallback((error: Error, errorInfo?: ErrorInfo) => {
    setError(error);
    if (errorInfo) {
      setErrorInfo(errorInfo);
    }

    // 提交到工作流
    workflowManager.handleError({
      type: 'react',
      message: error.message,
      stack: error.stack,
      source: 'useErrorBoundary'
    }, {
      componentStack: errorInfo?.componentStack,
      hook: 'useErrorBoundary'
    });
  }, []);

  // 如果有错误，抛出它让ErrorBoundary捕获
  if (error) {
    throw error;
  }

  return { captureError, resetError, error, errorInfo };
}

// 默认导出
export default EnhancedErrorBoundary;