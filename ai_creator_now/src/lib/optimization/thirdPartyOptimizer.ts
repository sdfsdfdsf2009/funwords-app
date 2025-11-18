// 第三方库优化配置和管理

// 第三方库分组配置
export const THIRD_PARTY_GROUPS = {
  // 核心UI库 - 需要立即加载
  UI_CORE: {
    libraries: ['react', 'react-dom'],
    priority: 'critical',
    preload: true,
    chunkName: 'ui-core'
  },

  // UI图标库 - 延迟加载
  UI_ICONS: {
    libraries: ['lucide-react'],
    priority: 'high',
    preload: false,
    chunkName: 'ui-icons'
  },

  // 数据处理库 - 按需加载
  DATA_PROCESSING: {
    libraries: ['papaparse', 'csv-parse'],
    priority: 'medium',
    preload: false,
    chunkName: 'data-processing'
  },

  // 视频处理库 - 按需加载
  VIDEO_PROCESSING: {
    libraries: ['wavesurfer.js', 'remotion'],
    priority: 'low',
    preload: false,
    chunkName: 'video-processing'
  },

  // 开发工具库 - 仅开发环境
  DEV_TOOLS: {
    libraries: ['@next/bundle-analyzer'],
    priority: 'development',
    preload: false,
    chunkName: 'dev-tools'
  },

  // 分析和监控库 - 延迟加载
  ANALYTICS: {
    libraries: ['web-vitals'],
    priority: 'medium',
    preload: false,
    chunkName: 'analytics'
  }
} as const;

// 库加载策略
type LoadStrategy = 'eager' | 'lazy' | 'prefetch' | 'preload';

interface LibraryConfig {
  name: string;
  version?: string;
  strategy: LoadStrategy;
  dependencies?: string[];
  chunkName?: string;
  priority: 'critical' | 'high' | 'medium' | 'low' | 'development';
  loadCondition?: () => boolean;
  fallback?: () => void;
}

// 库加载管理器
export class ThirdPartyLibraryManager {
  private static instance: ThirdPartyLibraryManager;
  private loadedLibraries = new Set<string>();
  private loadingPromises = new Map<string, Promise<any>>();
  private libraryConfigs = new Map<string, LibraryConfig>();

  private constructor() {
    this.initializeLibraryConfigs();
  }

  static getInstance(): ThirdPartyLibraryManager {
    if (!ThirdPartyLibraryManager.instance) {
      ThirdPartyLibraryManager.instance = new ThirdPartyLibraryManager();
    }
    return ThirdPartyLibraryManager.instance;
  }

  // 初始化库配置
  private initializeLibraryConfigs() {
    // React相关库
    this.libraryConfigs.set('react', {
      name: 'react',
      version: '18.2.0',
      strategy: 'eager',
      priority: 'critical'
    });

    this.libraryConfigs.set('react-dom', {
      name: 'react-dom',
      version: '18.2.0',
      strategy: 'eager',
      priority: 'critical',
      dependencies: ['react']
    });

    // UI图标库
    this.libraryConfigs.set('lucide-react', {
      name: 'lucide-react',
      version: 'latest',
      strategy: 'lazy',
      priority: 'high',
      chunkName: 'ui-icons'
    });

    // 数据处理库
    this.libraryConfigs.set('papaparse', {
      name: 'papaparse',
      version: 'latest',
      strategy: 'lazy',
      priority: 'medium',
      chunkName: 'data-processing',
      loadCondition: () => {
        // 当需要处理CSV文件时加载
        return window.location.pathname.includes('/import') ||
               window.location.pathname.includes('/csv');
      }
    });

    // 视频处理库
    this.libraryConfigs.set('wavesurfer.js', {
      name: 'wavesurfer.js',
      version: 'latest',
      strategy: 'lazy',
      priority: 'low',
      chunkName: 'video-processing',
      loadCondition: () => {
        return window.location.pathname.includes('/video') ||
               window.location.pathname.includes('/timeline');
      }
    });

    // 性能监控库
    this.libraryConfigs.set('web-vitals', {
      name: 'web-vitals',
      version: 'latest',
      strategy: 'prefetch',
      priority: 'medium',
      chunkName: 'analytics'
    });
  }

  // 动态加载库
  async loadLibrary(libraryName: string): Promise<any> {
    // 如果已经加载，直接返回
    if (this.loadedLibraries.has(libraryName)) {
      return this.getLoadedLibrary(libraryName);
    }

    // 如果正在加载，返回加载Promise
    if (this.loadingPromises.has(libraryName)) {
      return this.loadingPromises.get(libraryName);
    }

    const config = this.libraryConfigs.get(libraryName);
    if (!config) {
      throw new Error(`Library ${libraryName} not configured`);
    }

    // 检查加载条件
    if (config.loadCondition && !config.loadCondition()) {
      throw new Error(`Load conditions not met for ${libraryName}`);
    }

    // 创建加载Promise
    const loadingPromise = this.createLoadingPromise(config);
    this.loadingPromises.set(libraryName, loadingPromise);

    try {
      const library = await loadingPromise;
      this.loadedLibraries.add(libraryName);
      this.loadingPromises.delete(libraryName);

      console.log(`✅ 库加载成功: ${libraryName}`);
      return library;
    } catch (error) {
      this.loadingPromises.delete(libraryName);
      console.error(`❌ 库加载失败: ${libraryName}`, error);

      // 执行fallback
      if (config.fallback) {
        config.fallback();
      }

      throw error;
    }
  }

  // 创建加载Promise
  private async createLoadingPromise(config: LibraryConfig): Promise<any> {
    switch (config.strategy) {
      case 'eager':
        return this.loadEager(config);
      case 'lazy':
        return this.loadLazy(config);
      case 'prefetch':
        return this.loadPrefetch(config);
      case 'preload':
        return this.loadPreload(config);
      default:
        return this.loadLazy(config);
    }
  }

  // 立即加载
  private async loadEager(config: LibraryConfig): Promise<any> {
    // 先加载依赖
    if (config.dependencies) {
      await Promise.all(config.dependencies.map(dep => this.loadLibrary(dep)));
    }

    return import(/* webpackChunkName: "[request]" */ `../libraries/${config.name}`);
  }

  // 懒加载
  private async loadLazy(config: LibraryConfig): Promise<any> {
    // 先加载依赖
    if (config.dependencies) {
      await Promise.all(config.dependencies.map(dep => this.loadLibrary(dep)));
    }

    return import(/* webpackChunkName: "[request]" */ `../libraries/${config.name}`);
  }

  // 预取
  private async loadPrefetch(config: LibraryConfig): Promise<any> {
    // 预取但不立即执行
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = `/static/chunks/${config.chunkName || config.name}.js`;
    document.head.appendChild(link);

    // 延迟加载
    return new Promise(resolve => {
      setTimeout(() => {
        this.loadLazy(config).then(resolve);
      }, 1000);
    });
  }

  // 预加载
  private async loadPreload(config: LibraryConfig): Promise<any> {
    // 预加载
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'script';
    link.href = `/static/chunks/${config.chunkName || config.name}.js`;
    document.head.appendChild(link);

    // 立即加载
    return this.loadEager(config);
  }

  // 获取已加载的库
  private getLoadedLibrary(libraryName: string): any {
    return (window as any)[libraryName] || require(libraryName);
  }

  // 批量加载库
  async loadLibraries(libraryNames: string[]): Promise<any[]> {
    const loadPromises = libraryNames.map(name => this.loadLibrary(name));
    return Promise.all(loadPromises);
  }

  // 按组加载库
  async loadLibraryGroup(groupName: keyof typeof THIRD_PARTY_GROUPS): Promise<any[]> {
    const group = THIRD_PARTY_GROUPS[groupName];
    return this.loadLibraries(group.libraries);
  }

  // 预加载关键库
  async preloadCriticalLibraries(): Promise<void> {
    const criticalLibraries = Array.from(this.libraryConfigs.entries())
      .filter(([_, config]) => config.priority === 'critical')
      .map(([name]) => name);

    await this.loadLibraries(criticalLibraries);
  }

  // 获取库状态
  getLibraryStatus(libraryName: string): 'not-loaded' | 'loading' | 'loaded' {
    if (this.loadedLibraries.has(libraryName)) {
      return 'loaded';
    }
    if (this.loadingPromises.has(libraryName)) {
      return 'loading';
    }
    return 'not-loaded';
  }

  // 获取所有库状态
  getAllLibraryStatus(): Record<string, string> {
    const status: Record<string, string> = {};
    this.libraryConfigs.forEach((_, name) => {
      status[name] = this.getLibraryStatus(name);
    });
    return status;
  }

  // 添加自定义库配置
  addLibraryConfig(config: LibraryConfig): void {
    this.libraryConfigs.set(config.name, config);
  }

  // 移除库配置
  removeLibraryConfig(libraryName: string): void {
    this.libraryConfigs.delete(libraryName);
  }
}

// 导出单例实例
export const libraryManager = ThirdPartyLibraryManager.getInstance();

// 便捷的动态导入函数
export function dynamicImport(libraryName: string) {
  return libraryManager.loadLibrary(libraryName);
}

// 按需导入Hook
export function useDynamicImport<T = any>(libraryName: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadLibrary = async () => {
      setLoading(true);
      setError(null);

      try {
        const library = await libraryManager.loadLibrary(libraryName);
        if (!cancelled) {
          setData(library);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadLibrary();

    return () => {
      cancelled = true;
    };
  }, [libraryName]);

  return { data, loading, error };
}

// 条件导入Hook
export function useConditionalImport<T = any>(
  libraryName: string,
  condition: boolean,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!condition) return;

    let cancelled = false;

    const loadLibrary = async () => {
      setLoading(true);
      setError(null);

      try {
        const library = await libraryManager.loadLibrary(libraryName);
        if (!cancelled) {
          setData(library);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadLibrary();

    return () => {
      cancelled = true;
    };
  }, [libraryName, condition, ...dependencies]);

  return { data, loading, error };
}

// 预加载策略
export const PRELOAD_STRATEGIES = {
  // 立即预加载关键库
  critical: () => {
    libraryManager.preloadCriticalLibraries();
  },

  // 预加载高优先级库
  highPriority: () => {
    libraryManager.loadLibraryGroup('UI_ICONS');
  },

  // 预加载常用功能库
  commonFeatures: () => {
    libraryManager.loadLibraryGroup('DATA_PROCESSING');
  },

  // 在用户交互时预加载
  onInteraction: () => {
    const handleInteraction = () => {
      libraryManager.loadLibraryGroup('VIDEO_PROCESSING');
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('scroll', handleInteraction);
    };

    document.addEventListener('click', handleInteraction);
    document.addEventListener('scroll', handleInteraction);
  },

  // 在空闲时间预加载
  onIdle: () => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        libraryManager.loadLibraryGroup('ANALYTICS');
      });
    } else {
      setTimeout(() => {
        libraryManager.loadLibraryGroup('ANALYTICS');
      }, 2000);
    }
  }
};

// 开发环境调试工具
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  (window as any).__libraryManager = libraryManager;
  (window as any).__libraryDebug = {
    getStatus: () => libraryManager.getAllLibraryStatus(),
    preload: PRELOAD_STRATEGIES,
    load: (name: string) => libraryManager.loadLibrary(name),
    loadGroup: (group: keyof typeof THIRD_PARTY_GROUPS) =>
      libraryManager.loadLibraryGroup(group)
  };

  console.log('🔧 第三方库管理器已启用');
  console.log('💡 使用 window.__libraryDebug 访问调试工具');
}

// 初始化库管理器
if (typeof window !== 'undefined') {
  // 预加载关键库
  PRELOAD_STRATEGIES.critical();

  // 设置交互预加载
  PRELOAD_STRATEGIES.onInteraction();

  // 设置空闲时间预加载
  PRELOAD_STRATEGIES.onIdle();
}

export default libraryManager;