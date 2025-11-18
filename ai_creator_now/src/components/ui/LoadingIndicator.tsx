import React from 'react';
import { Loader2 } from 'lucide-react';

// 加载指示器类型定义
export type LoadingSize = 'small' | 'medium' | 'large';
export type LoadingVariant = 'spinner' | 'dots' | 'pulse' | 'skeleton';

interface LoadingIndicatorProps {
  size?: LoadingSize;
  variant?: LoadingVariant;
  color?: string;
  message?: string;
  fullScreen?: boolean;
  overlay?: boolean;
  className?: string;
}

// 加载指示器组件
export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  size = 'medium',
  variant = 'spinner',
  color = 'blue',
  message,
  fullScreen = false,
  overlay = false,
  className = ''
}) => {
  const sizeClasses = {
    small: {
      spinner: 'w-4 h-4',
      dots: 'w-8 h-4',
      pulse: 'w-4 h-4',
      skeleton: 'h-4'
    },
    medium: {
      spinner: 'w-8 h-8',
      dots: 'w-12 h-6',
      pulse: 'w-8 h-8',
      skeleton: 'h-6'
    },
    large: {
      spinner: 'w-12 h-12',
      dots: 'w-16 h-8',
      pulse: 'w-12 h-12',
      skeleton: 'h-8'
    }
  };

  const colorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    red: 'text-red-600',
    yellow: 'text-yellow-600',
    gray: 'text-gray-600',
    white: 'text-white'
  };

  const LoadingContent = () => (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {variant === 'spinner' && (
        <Loader2 className={`${sizeClasses[size].spinner} ${colorClasses[color]} animate-spin`} />
      )}

      {variant === 'dots' && (
        <div className="flex space-x-1">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className={`${colorClasses[color]} rounded-full animate-bounce`}
              style={{
                width: size === 'small' ? '8px' : size === 'medium' ? '12px' : '16px',
                height: size === 'small' ? '8px' : size === 'medium' ? '12px' : '16px',
                animationDelay: `${index * 0.1}s`
              }}
            />
          ))}
        </div>
      )}

      {variant === 'pulse' && (
        <div className={`${sizeClasses[size].pulse} ${colorClasses[color]} rounded-full animate-pulse`} />
      )}

      {variant === 'skeleton' && (
        <div className="w-full">
          <div className={`${sizeClasses[size].skeleton} bg-gray-200 rounded animate-pulse`} />
          {size !== 'small' && (
            <div className={`mt-2 h-3 bg-gray-200 rounded animate-pulse w-3/4`} />
          )}
        </div>
      )}

      {message && (
        <p className={`mt-2 text-sm ${
          color === 'white' ? 'text-white' : `text-${color}-600`
        } text-center`}>
          {message}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-90">
        <LoadingContent />
      </div>
    );
  }

  if (overlay) {
    return (
      <div className="relative">
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white bg-opacity-75 rounded-lg">
          <LoadingContent />
        </div>
      </div>
    );
  }

  return <LoadingContent />;
};

// 页面级加载组件
export const PageLoading: React.FC<{ message?: string }> = ({ message = '加载中...' }) => (
  <div className="min-h-screen flex items-center justify-center">
    <LoadingIndicator size="large" message={message} />
  </div>
);

// 按钮加载组件
export const ButtonLoading: React.FC<{ size?: LoadingSize; color?: string }> = ({
  size = 'small',
  color = 'white'
}) => (
  <LoadingIndicator size={size} variant="spinner" color={color} />
);

// 进度条组件
interface ProgressProps {
  value: number;
  max?: number;
  size?: 'small' | 'medium' | 'large';
  color?: string;
  showPercentage?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressProps> = ({
  value,
  max = 100,
  size = 'medium',
  color = 'blue',
  showPercentage = false,
  className = ''
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizeClasses = {
    small: 'h-1',
    medium: 'h-2',
    large: 'h-3'
  };

  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    red: 'bg-red-600',
    yellow: 'bg-yellow-600',
    gray: 'bg-gray-600'
  };

  return (
    <div className={`w-full ${className}`}>
      <div className={`${sizeClasses[size]} bg-gray-200 rounded-full overflow-hidden`}>
        <div
          className={`${sizeClasses[size]} ${colorClasses[color]} transition-all duration-300 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showPercentage && (
        <p className="text-sm text-gray-600 mt-1 text-center">
          {Math.round(percentage)}%
        </p>
      )}
    </div>
  );
};

// 步骤指示器组件
interface StepProps {
  steps: string[];
  currentStep: number;
  completed?: number[];
  className?: string;
}

export const StepIndicator: React.FC<StepProps> = ({
  steps,
  currentStep,
  completed = [],
  className = ''
}) => {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      {steps.map((step, index) => {
        const isCompleted = completed.includes(index);
        const isCurrent = index === currentStep;
        const isPending = index > currentStep;

        return (
          <React.Fragment key={index}>
            <div className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  isCompleted
                    ? 'bg-green-600 text-white'
                    : isCurrent
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {isCompleted ? '✓' : index + 1}
              </div>
              <span className="ml-2 text-sm text-gray-600 hidden sm:block">{step}</span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-px mx-4 transition-colors ${
                  isCompleted ? 'bg-green-600' : 'bg-gray-200'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// 加载状态管理Hook
interface LoadingState {
  isLoading: boolean;
  message?: string;
  progress?: number;
}

export const useLoading = () => {
  const [loadingStates, setLoadingStates] = React.useState<Record<string, LoadingState>>({});

  const setLoading = React.useCallback((key: string, state: LoadingState) => {
    setLoadingStates(prev => ({ ...prev, [key]: state }));
  }, []);

  const clearLoading = React.useCallback((key: string) => {
    setLoadingStates(prev => {
      const newState = { ...prev };
      delete newState[key];
      return newState;
    });
  }, []);

  const isLoading = React.useCallback((key: string) => {
    return Boolean(loadingStates[key]?.isLoading);
  }, [loadingStates]);

  const getLoadingState = React.useCallback((key: string) => {
    return loadingStates[key];
  }, [loadingStates]);

  return {
    loadingStates,
    setLoading,
    clearLoading,
    isLoading,
    getLoadingState
  };
};

// 全局加载指示器Context
interface LoadingContextValue {
  globalLoading: boolean;
  setGlobalLoading: (loading: boolean, message?: string) => void;
}

const LoadingContext = React.createContext<LoadingContextValue | undefined>(undefined);

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [globalLoading, setGlobalLoadingState] = React.useState(false);
  const [globalMessage, setGlobalMessage] = React.useState<string>();

  const setGlobalLoading = React.useCallback((loading: boolean, message?: string) => {
    setGlobalLoadingState(loading);
    setGlobalMessage(message);
  }, []);

  return (
    <LoadingContext.Provider value={{ globalLoading, setGlobalLoading }}>
      {children}
      {globalLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 flex flex-col items-center">
            <LoadingIndicator size="large" message={globalMessage} />
          </div>
        </div>
      )}
    </LoadingContext.Provider>
  );
};

export const useGlobalLoading = () => {
  const context = React.useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useGlobalLoading must be used within a LoadingProvider');
  }
  return context;
};

export default LoadingIndicator;