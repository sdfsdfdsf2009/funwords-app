import React, { Profiler, ProfilerOnRenderCallback } from 'react';

// 组件性能数据接口
export interface ComponentPerformanceData {
  id: string;
  componentName: string;
  renderCount: number;
  totalRenderTime: number;
  averageRenderTime: number;
  maxRenderTime: number;
  minRenderTime: number;
  lastRenderTime: number;
  mountTime: number;
  updateCount: number;
  propsSize: number;
  isExpensive: boolean;
  timestamp: number;
  warnings: string[];
}

// 性能阈值配置
const PERFORMANCE_THRESHOLDS = {
  FAST_RENDER: 16, // 60fps = 16ms per frame
  SLOW_RENDER: 100, // >100ms is considered slow
  VERY_SLOW_RENDER: 500, // >500ms is very slow
  EXPENSIVE_COMPONENT: 10, // Render count threshold
  LARGE_PROPS_SIZE: 10000, // Props size threshold in characters
} as const;

// 组件性能监控器
export class ComponentPerformanceMonitor {
  private static instance: ComponentPerformanceMonitor;
  private componentData = new Map<string, ComponentPerformanceData>();
  private renderCallbacks: ((data: ComponentPerformanceData) => void)[] = [];
  private isEnabled = true;

  private constructor() {}

  static getInstance(): ComponentPerformanceMonitor {
    if (!ComponentPerformanceMonitor.instance) {
      ComponentPerformanceMonitor.instance = new ComponentPerformanceMonitor();
    }
    return ComponentPerformanceMonitor.instance;
  }

  // 获取props大小
  private getPropsSize(props: any): number {
    try {
      return JSON.stringify(props).length;
    } catch {
      return 0;
    }
  }

  // 创建性能分析回调
  createProfilerCallback(componentName: string): ProfilerOnRenderCallback {
    return (
      id: string,
      phase: 'mount' | 'update',
      actualDuration: number,
      baseDuration: number,
      startTime: number,
      commitTime: number
    ) => {
      if (!this.isEnabled) return;

      const propsSize = this.getPropsSize({}); // 简化的props大小计算
      const key = `${componentName}_${id}`;
      const existing = this.componentData.get(key);

      const data: ComponentPerformanceData = {
        id: key,
        componentName,
        renderCount: (existing?.renderCount || 0) + 1,
        totalRenderTime: (existing?.totalRenderTime || 0) + actualDuration,
        averageRenderTime: existing ?
          ((existing.totalRenderTime + actualDuration) / (existing.renderCount + 1)) :
          actualDuration,
        maxRenderTime: Math.max(existing?.maxRenderTime || 0, actualDuration),
        minRenderTime: existing ?
          Math.min(existing.minRenderTime, actualDuration) :
          actualDuration,
        lastRenderTime: actualDuration,
        mountTime: phase === 'mount' ? actualDuration : (existing?.mountTime || 0),
        updateCount: existing ? (existing.updateCount + (phase === 'update' ? 1 : 0)) : 0,
        propsSize,
        isExpensive: false,
        timestamp: Date.now(),
        warnings: []
      };

      // 分析性能
      this.analyzePerformance(data);

      // 更新数据
      this.componentData.set(key, data);

      // 触发回调
      this.renderCallbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('组件性能监控回调执行失败:', error);
        }
      });

      // 开发环境日志
      if (process.env.NODE_ENV === 'development') {
        this.logPerformanceData(data, phase);
      }
    };
  }

  // 分析组件性能
  private analyzePerformance(data: ComponentPerformanceData): void {
    const warnings: string[] = [];

    // 渲染时间分析
    if (data.lastRenderTime > PERFORMANCE_THRESHOLDS.VERY_SLOW_RENDER) {
      warnings.push(`渲染时间过长: ${data.lastRenderTime}ms`);
      data.isExpensive = true;
    } else if (data.lastRenderTime > PERFORMANCE_THRESHOLDS.SLOW_RENDER) {
      warnings.push(`渲染时间较慢: ${data.lastRenderTime}ms`);
    }

    // 渲染频率分析
    if (data.renderCount > PERFORMANCE_THRESHOLDS.EXPENSIVE_COMPONENT) {
      warnings.push(`渲染次数过多: ${data.renderCount}次`);
      data.isExpensive = true;
    }

    // 更新频率分析
    if (data.updateCount > data.renderCount * 0.8) {
      warnings.push('更新频率过高，可能存在不必要的重渲染');
    }

    // Props大小分析
    if (data.propsSize > PERFORMANCE_THRESHOLDS.LARGE_PROPS_SIZE) {
      warnings.push(`Props对象过大: ${data.propsSize}字符`);
    }

    // 平均渲染时间分析
    if (data.averageRenderTime > PERFORMANCE_THRESHOLDS.FAST_RENDER) {
      warnings.push(`平均渲染时间超过60fps标准: ${data.averageRenderTime.toFixed(2)}ms`);
    }

    // 挂载时间分析
    if (data.mountTime > PERFORMANCE_THRESHOLDS.SLOW_RENDER) {
      warnings.push(`组件挂载时间过长: ${data.mountTime}ms`);
    }

    data.warnings = warnings;
  }

  // 性能数据日志
  private logPerformanceData(data: ComponentPerformanceData, phase: 'mount' | 'update'): void {
    const emoji = data.isExpensive ? '⚠️' : '✅';
    const phaseEmoji = phase === 'mount' ? '🚀' : '🔄';

    console.log(
      `${emoji} ${phaseEmoji} ${data.componentName}: ${data.lastRenderTime}ms ` +
      `(总计: ${data.renderCount}次, 平均: ${data.averageRenderTime.toFixed(2)}ms)`
    );

    if (data.warnings.length > 0) {
      console.warn(`⚠️ ${data.componentName} 性能警告:`, data.warnings);
    }
  }

  // 添加渲染回调
  onRender(callback: (data: ComponentPerformanceData) => void): void {
    this.renderCallbacks.push(callback);
  }

  // 移除渲染回调
  offRender(callback: (data: ComponentPerformanceData) => void): void {
    const index = this.renderCallbacks.indexOf(callback);
    if (index > -1) {
      this.renderCallbacks.splice(index, 1);
    }
  }

  // 获取组件性能数据
  getComponentData(componentName?: string): ComponentPerformanceData[] {
    const allData = Array.from(this.componentData.values());

    if (componentName) {
      return allData.filter(data => data.componentName === componentName);
    }

    return allData;
  }

  // 获取性能统计
  getPerformanceStats(): {
    totalComponents: number;
    expensiveComponents: number;
    averageRenderTime: number;
    slowestComponent: { name: string; time: number } | null;
    mostRendered: { name: string; count: number } | null;
    warnings: string[];
  } {
    const allData = Array.from(this.componentData.values());
    const expensiveComponents = allData.filter(data => data.isExpensive);

    let totalRenderTime = 0;
    let slowestComponent: { name: string; time: number } | null = null;
    let mostRendered: { name: string; count: number } | null = null;
    const allWarnings: string[] = [];

    allData.forEach(data => {
      totalRenderTime += data.averageRenderTime;
      allWarnings.push(...data.warnings);

      // 找出最慢的组件
      if (!slowestComponent || data.maxRenderTime > slowestComponent.time) {
        slowestComponent = {
          name: data.componentName,
          time: data.maxRenderTime
        };
      }

      // 找出渲染次数最多的组件
      if (!mostRendered || data.renderCount > mostRendered.count) {
        mostRendered = {
          name: data.componentName,
          count: data.renderCount
        };
      }
    });

    const averageRenderTime = allData.length > 0 ? totalRenderTime / allData.length : 0;

    return {
      totalComponents: allData.length,
      expensiveComponents: expensiveComponents.length,
      averageRenderTime,
      slowestComponent,
      mostRendered,
      warnings: [...new Set(allWarnings)] // 去重
    };
  }

  // 获取性能报告
  getPerformanceReport(): {
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    score: number;
    stats: ReturnType<typeof this.getPerformanceStats>;
    recommendations: string[];
  } {
    const stats = this.getPerformanceStats();
    let score = 100;
    const recommendations: string[] = [];

    // 根据各种因素扣分
    if (stats.expensiveComponents > 0) {
      score -= stats.expensiveComponents * 10;
      recommendations.push(`${stats.expensiveComponents}个组件需要性能优化`);
    }

    if (stats.averageRenderTime > PERFORMANCE_THRESHOLDS.FAST_RENDER) {
      score -= 20;
      recommendations.push('平均渲染时间超过16ms标准，需要优化');
    }

    if (stats.slowestComponent && stats.slowestComponent.time > PERFORMANCE_THRESHOLDS.VERY_SLOW_RENDER) {
      score -= 15;
      recommendations.push(`${stats.slowestComponent.name} 组件渲染过慢`);
    }

    if (stats.warnings.length > 0) {
      score -= stats.warnings.length * 5;
      recommendations.push(`存在${stats.warnings.length}个性能警告`);
    }

    // 生成评级
    let grade: 'A' | 'B' | 'C' | 'D' | 'F';
    if (score >= 90) grade = 'A';
    else if (score >= 80) grade = 'B';
    else if (score >= 70) grade = 'C';
    else if (score >= 60) grade = 'D';
    else grade = 'F';

    // 生成通用建议
    if (recommendations.length === 0) {
      recommendations.push('组件性能表现优秀！');
    } else {
      recommendations.push('考虑使用React.memo、useMemo、useCallback优化性能');
      recommendations.push('检查props传递是否合理，避免不必要的数据传递');
      recommendations.push('考虑拆分大型组件为更小的子组件');
    }

    return {
      grade,
      score: Math.max(0, score),
      stats,
      recommendations: [...new Set(recommendations)]
    };
  }

  // 清除数据
  clearData(): void {
    this.componentData.clear();
  }

  // 启用/禁用监控
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  // 导出数据
  exportData(): string {
    return JSON.stringify({
      timestamp: Date.now(),
      data: Array.from(this.componentData.values()),
      stats: this.getPerformanceStats()
    }, null, 2);
  }
}

// 导出单例实例
export const componentMonitor = ComponentPerformanceMonitor.getInstance();

// React Profiler包装器
export interface PerformanceProfilerProps {
  id: string;
  children: React.ReactNode;
}

export const PerformanceProfiler: React.FC<PerformanceProfilerProps> = React.memo(({
  id,
  children
}) => {
  const componentName = id.split('_')[0]; // 从ID中提取组件名

  return (
    React.createElement(Profiler, {
      id: id,
      onRender: componentMonitor.createProfilerCallback(componentName)
    }, children)
  );
});

PerformanceProfiler.displayName = 'PerformanceProfiler';

// Hook for component performance monitoring
export function useComponentPerformance(componentName: string) {
  const [performanceData, setPerformanceData] = React.useState<ComponentPerformanceData | null>(null);
  const [isMonitored, setIsMonitored] = React.useState(false);

  React.useEffect(() => {
    const handleRender = (data: ComponentPerformanceData) => {
      if (data.componentName === componentName) {
        setPerformanceData(data);
      }
    };

    componentMonitor.onRender(handleRender);
    setIsMonitored(true);

    return () => {
      componentMonitor.offRender(handleRender);
    };
  }, [componentName]);

  return {
    performanceData,
    isMonitored,
    getReport: () => componentMonitor.getPerformanceReport()
  };
}

// 高阶组件：自动监控组件性能
export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  const WrappedComponent = React.memo((props: P) => {
    const name = componentName || Component.displayName || Component.name || 'Unknown';

    return React.createElement(
      PerformanceProfiler,
      { id: `${name}_${Math.random().toString(36).substr(2, 9)}` },
      React.createElement(Component, props)
    );
  });

  WrappedComponent.displayName = `withPerformanceMonitoring(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// 自动初始化
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // 在开发环境中启用详细日志
  console.log('🔧 组件性能监控已启用');
}

export default componentMonitor;