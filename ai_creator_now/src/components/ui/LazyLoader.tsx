import React, { Suspense, lazy, useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

// Enhanced loading component with performance optimizations
const ComponentLoader = ({ size = 'medium', message = '加载中...' }: {
  size?: 'small' | 'medium' | 'large',
  message?: string
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  };

  const paddingClasses = {
    small: 'p-4',
    medium: 'p-8',
    large: 'p-12'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${paddingClasses[size]} animate-fade-in`}>
      <div className={`${sizeClasses[size]} animate-spin text-blue-500 mb-4`} style={{ transform: 'translateZ(0)', willChange: 'transform' }}>
        <Loader2 className="w-full h-full" />
      </div>
      <p className="text-sm text-gray-500 animate-fade-in-up">{message}</p>
    </div>
  );
};

// Enhanced error boundary for lazy loaded components
const LazyLoadError = ({ error, retry }: { error: Error; retry: () => void }) => {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = () => {
    setIsRetrying(true);
    retry();
    setTimeout(() => setIsRetrying(false), 1000);
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center animate-fade-in">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 animate-scale-in">
        <span className="text-2xl text-red-500">⚠️</span>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2 animate-fade-in-up">组件加载失败</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-md animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        {error.message || '请检查网络连接或刷新页面重试'}
      </p>
      <button
        onClick={handleRetry}
        disabled={isRetrying}
        className={`px-6 py-3 bg-blue-500 text-white rounded-lg transition-all duration-200
          hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed btn-smooth animate-fade-in-up
          ${isRetrying ? 'animate-pulse' : ''}`}
        style={{ animationDelay: '0.2s', transform: 'translateZ(0)' }}
      >
        {isRetrying ? '重试中...' : '重试'}
      </button>
    </div>
  );
};

// Lazy load wrapper with error handling
const createLazyComponent = <T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ComponentType<{ size?: 'small' | 'medium' | 'large' }>
) => {
  const LazyComponent = lazy(importFunc);

  return React.forwardRef<any, React.ComponentProps<T>>((props, ref) => (
    <Suspense fallback={fallback ? <fallback /> : <ComponentLoader />}>
      <LazyComponent {...props} ref={ref} />
    </Suspense>
  ));
};

// Lazy loaded components - only including working ones
export const LazyCSVImport = createLazyComponent(
  () => import('../csv-import/CSVImport').then(module => ({ default: module.CSVImport })),
  () => <ComponentLoader size="large" />
);

export const LazyImageGeneration = createLazyComponent(
  () => import('../image-generation/ImageGeneration').then(module => ({ default: module.ImageGeneration })),
  () => <ComponentLoader size="large" />
);

export const LazyVideoGeneration = createLazyComponent(
  () => import('../video-generation/VideoGeneration').then(module => ({ default: module.VideoGeneration })),
  () => <ComponentLoader size="large" />
);

export const LazyVideoEditor = createLazyComponent(
  () => import('../video-editor').then(module => ({ default: module.VideoEditor })),
  () => <ComponentLoader size="large" />
);

export const LazyDebugPage = createLazyComponent(
  () => import('../debug/DebugPage').then(module => ({ default: module.DebugPage })),
  () => <ComponentLoader size="medium" />
);

export const LazyProjectSelector = createLazyComponent(
  () => import('../project/ProjectSelector').then(module => ({ default: module.ProjectSelector })),
  () => <ComponentLoader size="medium" />
);

export const LazyCreativeGenerator = createLazyComponent(
  () => import('../creative-generator/CreativeGenerator').then(module => ({ default: module.CreativeGenerator })),
  () => <ComponentLoader size="large" />
);

// Preload function for critical components
export const preloadComponent = (componentLoader: () => Promise<{ default: any }>) => {
  componentLoader();
};

// Preload critical components
export const preloadCriticalComponents = () => {
  preloadComponent(() => import('../csv-import/CSVImport'));
  preloadComponent(() => import('../project/ProjectSelector'));
};

// Dynamic component loader for conditional rendering
export const useDynamicComponent = <T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  condition: boolean
) => {
  const [Component, setComponent] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (condition && !Component) {
      setLoading(true);
      importFunc()
        .then(module => {
          setComponent(() => module.default);
          setError(null);
        })
        .catch(err => {
          setError(err);
          console.error('Failed to load component:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [condition, Component]);

  return { Component, loading, error };
};

export default ComponentLoader;