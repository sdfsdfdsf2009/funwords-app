import React, { Suspense, lazy, ComponentType, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

// 加载状态组件接口
interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
  className?: string;
}

// 加载状态组件
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  message = '加载中...',
  className = ''
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  };

  return (
    <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
      <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-600 mb-3`} />
      <p className="text-gray-600 text-sm">{message}</p>
    </div>
  );
};

// 骨架屏组件接口
interface SkeletonProps {
  type?: 'card' | 'list' | 'table' | 'image' | 'text';
  lines?: number;
  className?: string;
}

// 骨架屏组件
const Skeleton: React.FC<SkeletonProps> = ({
  type = 'card',
  lines = 3,
  className = ''
}) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return (
          <div className={`animate-pulse ${className}`}>
            <div className="bg-gray-300 h-48 rounded-lg mb-4"></div>
            <div className="space-y-3">
              <div className="bg-gray-300 h-4 rounded w-3/4"></div>
              <div className="bg-gray-300 h-4 rounded w-1/2"></div>
            </div>
          </div>
        );

      case 'list':
        return (
          <div className={`space-y-4 ${className}`}>
            {Array.from({ length: lines }).map((_, i) => (
              <div key={i} className="animate-pulse flex items-center space-x-4">
                <div className="bg-gray-300 rounded-full h-10 w-10"></div>
                <div className="flex-1 space-y-2">
                  <div className="bg-gray-300 h-4 rounded w-3/4"></div>
                  <div className="bg-gray-300 h-4 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        );

      case 'table':
        return (
          <div className={`animate-pulse ${className}`}>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 h-12"></div>
              {Array.from({ length: lines }).map((_, i) => (
                <div key={i} className="h-16 border-t border-gray-200"></div>
              ))}
            </div>
          </div>
        );

      case 'image':
        return (
          <div className={`animate-pulse ${className}`}>
            <div className="bg-gray-300 h-64 rounded-lg"></div>
          </div>
        );

      case 'text':
        return (
          <div className={`animate-pulse space-y-3 ${className}`}>
            {Array.from({ length: lines }).map((_, i) => (
              <div key={i} className="bg-gray-300 h-4 rounded"></div>
            ))}
          </div>
        );

      default:
        return (
          <div className={`animate-pulse ${className}`}>
            <div className="bg-gray-300 h-32 rounded"></div>
          </div>
        );
    }
  };

  return <>{renderSkeleton()}</>;
};

// 错误边界组件
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<
  { children: ReactNode; fallback?: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('LazyLoad组件错误:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-600 mb-2">组件加载失败</p>
          <p className="text-sm text-gray-500">
            {this.state.error?.message || '未知错误'}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

// 懒加载HOC配置接口
interface LazyLoadOptions {
  loadingComponent?: ReactNode;
  errorFallback?: ReactNode;
  skeletonType?: SkeletonProps['type'];
  skeletonLines?: number;
  delay?: number; // 延迟显示加载状态
  preload?: boolean; // 是否预加载
  rootMargin?: string; // Intersection Observer rootMargin
  threshold?: number; // Intersection Observer threshold
}

// 默认加载组件
const DefaultLoadingComponent = () => (
  <LoadingSpinner size="medium" message="正在加载组件..." />
);

// 创建懒加载组件的高阶函数
export function createLazyComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
) {
  const {
    loadingComponent = <DefaultLoadingComponent />,
    errorFallback,
    skeletonType,
    skeletonLines,
    delay = 200,
    preload = false,
    rootMargin = '50px',
    threshold = 0.1
  } = options;

  // 创建懒加载组件
  const LazyComponent = lazy(importFunc);

  // 如果需要预加载
  if (preload && typeof window !== 'undefined') {
    // 在空闲时间预加载
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => importFunc());
    } else {
      setTimeout(() => importFunc(), 1000);
    }
  }

  // 返回带包装的组件
  return function LazyLoadWrapper(props: React.ComponentProps<T>) {
    const [shouldLoad, setShouldLoad] = React.useState(false);
    const [showLoading, setShowLoading] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    // 设置Intersection Observer进行懒加载
    React.useEffect(() => {
      if (!containerRef.current) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setShouldLoad(true);
              observer.disconnect();
            }
          });
        },
        { rootMargin, threshold }
      );

      observer.observe(containerRef.current);

      return () => observer.disconnect();
    }, [rootMargin, threshold]);

    // 延迟显示加载状态
    React.useEffect(() => {
      if (shouldLoad && delay > 0) {
        const timer = setTimeout(() => setShowLoading(true), delay);
        return () => clearTimeout(timer);
      } else if (shouldLoad) {
        setShowLoading(true);
      }
    }, [shouldLoad, delay]);

    // 决定使用什么作为加载状态
    let loadingElement = loadingComponent;
    if (skeletonType && showLoading) {
      loadingElement = <Skeleton type={skeletonType} lines={skeletonLines} />;
    }

    return (
      <ErrorBoundary fallback={errorFallback}>
        <div ref={containerRef}>
          {shouldLoad ? (
            <Suspense fallback={loadingElement}>
              <LazyComponent {...props} />
            </Suspense>
          ) : (
            loadingElement
          )}
        </div>
      </ErrorBoundary>
    );
  };
}

// 视差懒加载组件
export function ParallaxLazyComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  options: LazyLoadOptions & { parallaxSpeed?: number } = {}
) {
  const { parallaxSpeed = 0.5, ...lazyOptions } = options;
  const LazyComponent = createLazyComponent(importFunc, lazyOptions);

  return function ParallaxWrapper(props: React.ComponentProps<T>) {
    const [scrollY, setScrollY] = React.useState(0);
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      const handleScroll = () => {
        setScrollY(window.scrollY);
      };

      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
      <div
        ref={containerRef}
        style={{
          transform: `translateY(${scrollY * parallaxSpeed}px)`,
          transition: 'transform 0.1s ease-out'
        }}
      >
        <LazyComponent {...props} />
      </div>
    );
  };
}

// 预定义的懒加载组件配置
export const LAZY_COMPONENTS = {
  // 图片生成组件
  ImageGeneration: (options: LazyLoadOptions = {}) =>
    createLazyComponent(
      () => import('@/components/image-generation/ImageGeneration'),
      {
        skeletonType: 'card',
        skeletonLines: 3,
        ...options
      }
    ),

  // 视频生成组件
  VideoGeneration: (options: LazyLoadOptions = {}) =>
    createLazyComponent(
      () => import('@/components/video-generation/VideoGeneration'),
      {
        skeletonType: 'card',
        skeletonLines: 4,
        ...options
      }
    ),

  // CSV导入组件
  CSVImport: (options: LazyLoadOptions = {}) =>
    createLazyComponent(
      () => import('@/components/csv-import/CSVImport'),
      {
        skeletonType: 'list',
        skeletonLines: 5,
        ...options
      }
    ),

  // 场景管理组件
  SceneManager: (options: LazyLoadOptions = {}) =>
    createLazyComponent(
      () => import('@/components/csv-import/SceneManager'),
      {
        skeletonType: 'table',
        skeletonLines: 8,
        ...options
      }
    ),

  // API配置管理组件
  APIConfigManager: (options: LazyLoadOptions = {}) =>
    createLazyComponent(
      () => import('@/components/api-config/APIConfigManager'),
      {
        skeletonType: 'list',
        skeletonLines: 6,
        ...options
      }
    ),

  // 视频编辑器组件
  VideoEditor: (options: LazyLoadOptions = {}) =>
    createLazyComponent(
      () => import('@/components/video-editor').then(module => ({ default: module.VideoEditor })),
      {
        skeletonType: 'image',
        delay: 500,
        ...options
      }
    ),

  // 调试页面组件
  DebugPage: (options: LazyLoadOptions = {}) =>
    createLazyComponent(
      () => import('@/components/debug/DebugPage'),
      {
        skeletonType: 'text',
        skeletonLines: 10,
        ...options
      }
    ),

  // 任务管理组件
  TaskManagement: (options: LazyLoadOptions = {}) =>
    createLazyComponent(
      () => import('@/components/TaskManagement'),
      {
        skeletonType: 'list',
        skeletonLines: 7,
        ...options
      }
    ),

  // 提示词编辑器组件
  PromptEditor: (options: LazyLoadOptions = {}) =>
    createLazyComponent(
      () => import('@/components/prompt-editor/PromptEditor').then(module => ({ default: module.PromptEditor })),
      {
        skeletonType: 'text',
        skeletonLines: 15,
        ...options
      }
    ),

  // 性能监控仪表板
  PerformanceDashboard: (options: LazyLoadOptions = {}) =>
    createLazyComponent(
      () => import('@/components/monitoring/PerformanceDashboard'),
      {
        skeletonType: 'card',
        delay: 100,
        preload: true,
        ...options
      }
    )
};

// 批量预加载函数
export function preloadComponents(...componentKeys: (keyof typeof LAZY_COMPONENTS)[]) {
  componentKeys.forEach(key => {
    if (key in LAZY_COMPONENTS) {
      LAZY_COMPONENTS[key]({ preload: true });
    }
  });
}

// 导出基础组件
export { LoadingSpinner, Skeleton, ErrorBoundary };

// 导出类型
export type { LoadingSpinnerProps, SkeletonProps, LazyLoadOptions };