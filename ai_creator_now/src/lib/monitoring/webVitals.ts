import {
  getCLS,
  getFID,
  getFCP,
  getLCP,
  getTTFB,
  getINP,
  Metric,
  ReportHandler
} from 'web-vitals';

// 性能数据接口
export interface WebVitalsData {
  id: string;
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  navigationType: string;
  timestamp: number;
  userAgent: string;
  url: string;
  sessionId: string;
  userId?: string;
}

// 性能评分阈值
const VITAL_THRESHOLDS = {
  CLS: { good: 0.1, poor: 0.25 },
  FID: { good: 100, poor: 300 },
  FCP: { good: 1800, poor: 3000 },
  LCP: { good: 2500, poor: 4000 },
  TTFB: { good: 800, poor: 1800 },
  INP: { good: 200, poor: 500 }
} as const;

// 性能评级映射
const RATINGS = {
  CLS: (value: number) => {
    if (value <= VITAL_THRESHOLDS.CLS.good) return 'good';
    if (value <= VITAL_THRESHOLDS.CLS.poor) return 'needs-improvement';
    return 'poor';
  },
  FID: (value: number) => {
    if (value <= VITAL_THRESHOLDS.FID.good) return 'good';
    if (value <= VITAL_THRESHOLDS.FID.poor) return 'needs-improvement';
    return 'poor';
  },
  FCP: (value: number) => {
    if (value <= VITAL_THRESHOLDS.FCP.good) return 'good';
    if (value <= VITAL_THRESHOLDS.FCP.poor) return 'needs-improvement';
    return 'poor';
  },
  LCP: (value: number) => {
    if (value <= VITAL_THRESHOLDS.LCP.good) return 'good';
    if (value <= VITAL_THRESHOLDS.LCP.poor) return 'needs-improvement';
    return 'poor';
  },
  TTFB: (value: number) => {
    if (value <= VITAL_THRESHOLDS.TTFB.good) return 'good';
    if (value <= VITAL_THRESHOLDS.TTFB.poor) return 'needs-improvement';
    return 'poor';
  },
  INP: (value: number) => {
    if (value <= VITAL_THRESHOLDS.INP.good) return 'good';
    if (value <= VITAL_THRESHOLDS.INP.poor) return 'needs-improvement';
    return 'poor';
  }
} as const;

// 获取导航类型
function getNavigationType(): string {
  if (typeof window !== 'undefined' && 'navigation' in window) {
    const nav = (window as any).navigation;
    switch (nav.type) {
      case nav.TYPE_NAVIGATE: return 'navigate';
      case nav.TYPE_RELOAD: return 'reload';
      case nav.TYPE_BACK_FORWARD: return 'back_forward';
      default: return 'prerender';
    }
  }
  return 'unknown';
}

// 获取会话ID
function getSessionId(): string {
  if (typeof window !== 'undefined') {
    let sessionId = sessionStorage.getItem('web-vitals-session-id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('web-vitals-session-id', sessionId);
    }
    return sessionId;
  }
  return 'server-side';
}

// Web Vitals监控器
export class WebVitalsMonitor {
  private static instance: WebVitalsMonitor;
  private vitalsData: WebVitalsData[] = [];
  private reportCallbacks: ((data: WebVitalsData) => void)[] = [];
  private isEnabled = true;

  private constructor() {}

  static getInstance(): WebVitalsMonitor {
    if (!WebVitalsMonitor.instance) {
      WebVitalsMonitor.instance = new WebVitalsMonitor();
    }
    return WebVitalsMonitor.instance;
  }

  // 开始监控
  startMonitoring(userId?: string): void {
    if (!this.isEnabled || typeof window === 'undefined') {
      return;
    }

    console.log('🔍 开始Web Vitals性能监控...');

    // CLS - 累积布局偏移
    getCLS((metric: Metric) => {
      this.processMetric(metric, userId);
    });

    // FID - 首次输入延迟
    getFID((metric: Metric) => {
      this.processMetric(metric, userId);
    });

    // FCP - 首次内容绘制
    getFCP((metric: Metric) => {
      this.processMetric(metric, userId);
    });

    // LCP - 最大内容绘制
    getLCP((metric: Metric) => {
      this.processMetric(metric, userId);
    });

    // TTFB - 首字节时间
    getTTFB((metric: Metric) => {
      this.processMetric(metric, userId);
    });

    // INP - 交互到下一次绘制
    getINP((metric: Metric) => {
      this.processMetric(metric, userId);
    });
  }

  // 处理指标数据
  private processMetric(metric: Metric, userId?: string): void {
    const ratingFn = RATINGS[metric.name as keyof typeof RATINGS];
    const rating = ratingFn ? ratingFn(metric.value) : 'needs-improvement';

    const vitalsData: WebVitalsData = {
      id: metric.id,
      name: metric.name,
      value: Math.round(metric.value * 100) / 100, // 保留两位小数
      rating: rating as 'good' | 'needs-improvement' | 'poor',
      delta: Math.round(metric.delta * 100) / 100,
      navigationType: getNavigationType(),
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      sessionId: getSessionId(),
      userId
    };

    // 存储数据
    this.vitalsData.push(vitalsData);

    // 触发回调
    this.reportCallbacks.forEach(callback => {
      try {
        callback(vitalsData);
      } catch (error) {
        console.error('Web Vitals回调执行失败:', error);
      }
    });

    // 控制台输出（开发环境）
    if (process.env.NODE_ENV === 'development') {
      const emoji = this.getMetricEmoji(vitalsData.rating);
      console.log(`${emoji} ${vitalsData.name}: ${vitalsData.value}ms (${vitalsData.rating})`);
    }

    // 异步发送到分析服务
    this.sendToAnalytics(vitalsData);
  }

  // 获取指标表情符号
  private getMetricEmoji(rating: string): string {
    switch (rating) {
      case 'good': return '✅';
      case 'needs-improvement': return '⚠️';
      case 'poor': return '❌';
      default: return '❓';
    }
  }

  // 添加报告回调
  onReport(callback: (data: WebVitalsData) => void): void {
    this.reportCallbacks.push(callback);
  }

  // 移除报告回调
  offReport(callback: (data: WebVitalsData) => void): void {
    const index = this.reportCallbacks.indexOf(callback);
    if (index > -1) {
      this.reportCallbacks.splice(index, 1);
    }
  }

  // 发送数据到分析服务
  private async sendToAnalytics(data: WebVitalsData): Promise<void> {
    // 临时禁用Web Vitals日志以避免速率限制错误
    // try {
    //   // 发送到系统日志API
    //   await fetch('/api/system-logs', {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify({
    //       level: 'info',
    //       message: `Web Vitals: ${data.name} = ${data.value}ms (${data.rating})`,
    //       category: 'performance',
    //       metadata: {
    //         webVitalsData: data,
    //         performanceImpact: this.calculatePerformanceImpact(data)
    //       }
    //     })
    //   });
    // } catch (error) {
    //   console.error('发送Web Vitals数据失败:', error);
    // }
  }

  // 计算性能影响
  private calculatePerformanceImpact(data: WebVitalsData): 'low' | 'medium' | 'high' {
    if (data.rating === 'good') return 'low';
    if (data.rating === 'needs-improvement') return 'medium';
    return 'high';
  }

  // 获取当前会话的所有数据
  getSessionData(): WebVitalsData[] {
    return [...this.vitalsData];
  }

  // 获取性能评分
  getPerformanceScore(): number {
    if (this.vitalsData.length === 0) return 0;

    const latestMetrics = this.getLatestMetrics();
    if (latestMetrics.length === 0) return 0;

    let totalScore = 0;
    let metricCount = 0;

    latestMetrics.forEach(metric => {
      switch (metric.rating) {
        case 'good':
          totalScore += 100;
          break;
        case 'needs-improvement':
          totalScore += 60;
          break;
        case 'poor':
          totalScore += 20;
          break;
      }
      metricCount++;
    });

    return Math.round(totalScore / metricCount);
  }

  // 获取最新的各项指标
  getLatestMetrics(): WebVitalsData[] {
    const latest: { [key: string]: WebVitalsData } = {};

    this.vitalsData.forEach(metric => {
      if (!latest[metric.name] || metric.timestamp > latest[metric.name].timestamp) {
        latest[metric.name] = metric;
      }
    });

    return Object.values(latest);
  }

  // 获取性能报告
  getPerformanceReport(): {
    score: number;
    metrics: WebVitalsData[];
    recommendations: string[];
    status: 'excellent' | 'good' | 'needs-improvement' | 'poor';
  } {
    const metrics = this.getLatestMetrics();
    const score = this.getPerformanceScore();
    const recommendations = this.generateRecommendations(metrics);

    let status: 'excellent' | 'good' | 'needs-improvement' | 'poor';
    if (score >= 90) status = 'excellent';
    else if (score >= 70) status = 'good';
    else if (score >= 50) status = 'needs-improvement';
    else status = 'poor';

    return {
      score,
      metrics,
      recommendations,
      status
    };
  }

  // 生成优化建议
  private generateRecommendations(metrics: WebVitalsData[]): string[] {
    const recommendations: string[] = [];

    metrics.forEach(metric => {
      switch (metric.name) {
        case 'LCP':
          if (metric.rating !== 'good') {
            recommendations.push('优化LCP: 压缩图片、使用CDN、优化服务器响应时间');
          }
          break;
        case 'FID':
          if (metric.rating !== 'good') {
            recommendations.push('优化FID: 减少JavaScript执行时间、分割代码');
          }
          break;
        case 'CLS':
          if (metric.rating !== 'good') {
            recommendations.push('优化CLS: 为图片和广告设置明确尺寸、避免插入内容');
          }
          break;
        case 'TTFB':
          if (metric.rating !== 'good') {
            recommendations.push('优化TTFB: 使用CDN、优化服务器响应、启用缓存');
          }
          break;
        case 'INP':
          if (metric.rating !== 'good') {
            recommendations.push('优化INP: 减少长时间运行的任务、优化交互响应');
          }
          break;
      }
    });

    if (recommendations.length === 0) {
      recommendations.push('性能表现优秀！继续保持。');
    }

    return recommendations;
  }

  // 清除数据
  clearData(): void {
    this.vitalsData = [];
  }

  // 启用/禁用监控
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  // 获取统计信息
  getStatistics(): {
    totalMetrics: number;
    averageScore: number;
    bestMetric: string | null;
    worstMetric: string | null;
    sessionCount: number;
  } {
    const totalMetrics = this.vitalsData.length;
    const latestMetrics = this.getLatestMetrics();
    const averageScore = this.getPerformanceScore();

    let bestMetric: string | null = null;
    let worstMetric: string | null = null;
    let bestScore = -1;
    let worstScore = 101;

    latestMetrics.forEach(metric => {
      let score = 0;
      switch (metric.rating) {
        case 'good': score = 100; break;
        case 'needs-improvement': score = 60; break;
        case 'poor': score = 20; break;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMetric = metric.name;
      }
      if (score < worstScore) {
        worstScore = score;
        worstMetric = metric.name;
      }
    });

    return {
      totalMetrics,
      averageScore,
      bestMetric,
      worstMetric,
      sessionCount: this.getSessionCount()
    };
  }

  // 获取会话数量
  private getSessionCount(): number {
    const sessions = new Set(this.vitalsData.map(data => data.sessionId));
    return sessions.size;
  }
}

// 导出单例实例
export const webVitalsMonitor = WebVitalsMonitor.getInstance();

// React Hook
export function useWebVitals() {
  const [report, setReport] = React.useState(() => webVitalsMonitor.getPerformanceReport());
  const [isMonitoring, setIsMonitoring] = React.useState(false);

  React.useEffect(() => {
    const handleReport = () => {
      setReport(webVitalsMonitor.getPerformanceReport());
    };

    webVitalsMonitor.onReport(handleReport);
    setIsMonitoring(true);

    return () => {
      webVitalsMonitor.offReport(handleReport);
    };
  }, []);

  return {
    report,
    isMonitoring,
    startMonitoring: (userId?: string) => webVitalsMonitor.startMonitoring(userId),
    clearData: () => webVitalsMonitor.clearData()
  };
}

// 自动初始化（开发环境）
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // 等待页面加载完成后开始监控
  if (document.readyState === 'complete') {
    webVitalsMonitor.startMonitoring();
  } else {
    window.addEventListener('load', () => {
      webVitalsMonitor.startMonitoring();
    });
  }
}

export default webVitalsMonitor;