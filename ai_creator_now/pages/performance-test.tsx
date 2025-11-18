import React, { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  description: string;
  threshold?: {
    good: number;
    needsImprovement: number;
    poor: number;
  };
}

interface LoadTest {
  name: string;
  duration: number;
  iterations: number;
  averageTime: number;
  success: boolean;
}

interface MemoryUsage {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  timestamp: number;
}

export default function PerformanceTest() {
  const [isRunning, setIsRunning] = useState(false);
  const [testProgress, setTestProgress] = useState(0);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([]);
  const [loadTests, setLoadTests] = useState<LoadTest[]>([]);
  const [memoryUsage, setMemoryUsage] = useState<MemoryUsage[]>([]);
  const [webVitals, setWebVitals] = useState<any>({});
  const intervalRef = useRef<NodeJS.Timeout>();

  // 计算性能得分
  const calculatePerformanceScore = useCallback(() => {
    if (performanceMetrics.length === 0) return 0;

    let totalScore = 0;
    let maxScore = 0;

    performanceMetrics.forEach(metric => {
      if (metric.threshold) {
        maxScore += 100;
        if (metric.value <= metric.threshold.good) {
          totalScore += 100;
        } else if (metric.value <= metric.threshold.needsImprovement) {
          totalScore += 70;
        } else if (metric.value <= metric.threshold.poor) {
          totalScore += 40;
        } else {
          totalScore += 10;
        }
      }
    });

    return maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  }, [performanceMetrics]);

  // 获取Core Web Vitals
  const getWebVitals = useCallback(() => {
    return new Promise((resolve) => {
      // First Contentful Paint (FCP)
      const fcp = performance.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint');

      // Largest Contentful Paint (LCP)
      let lcp = 0;
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        lcp = lastEntry.startTime;
      });
      observer.observe({ entryTypes: ['largest-contentful-paint'] });

      setTimeout(() => {
        observer.disconnect();

        // First Input Delay (FID)
        const fidEntries = performance.getEntriesByType('first-input');
        const fid = fidEntries.length > 0 ?
          (fidEntries[0] as PerformanceEventTiming).processingStart - fidEntries[0].startTime : 0;

        // Cumulative Layout Shift (CLS)
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const layoutShift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
            if (!layoutShift.hadRecentInput) {
              clsValue += layoutShift.value;
            }
          }
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });

        setTimeout(() => {
          clsObserver.disconnect();

          resolve({
            fcp: fcp ? Math.round(fcp.startTime) : 0,
            lcp: Math.round(lcp),
            fid: Math.round(fid),
            cls: Math.round(clsValue * 1000) / 1000,
          });
        }, 1000);
      }, 2000);
    });
  }, []);

  // 获取性能指标
  const getPerformanceMetrics = useCallback(async () => {
    const metrics: PerformanceMetric[] = [];

    // 导航时序
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      metrics.push({
        name: 'DOM Content Loaded',
        value: Math.round(navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart),
        unit: 'ms',
        description: 'DOM内容加载完成时间',
        threshold: { good: 1000, needsImprovement: 2000, poor: 3000 },
      });

      metrics.push({
        name: '页面完全加载',
        value: Math.round(navigation.loadEventEnd - navigation.loadEventStart),
        unit: 'ms',
        description: '页面所有资源加载完成时间',
        threshold: { good: 2000, needsImprovement: 4000, poor: 6000 },
      });

      metrics.push({
        name: '首字节时间 (TTFB)',
        value: Math.round(navigation.responseStart - navigation.requestStart),
        unit: 'ms',
        description: '服务器响应时间',
        threshold: { good: 200, needsImprovement: 500, poor: 1000 },
      });

      metrics.push({
        name: 'DNS查询时间',
        value: Math.round(navigation.domainLookupEnd - navigation.domainLookupStart),
        unit: 'ms',
        description: 'DNS解析时间',
        threshold: { good: 50, needsImprovement: 150, poor: 300 },
      });

      metrics.push({
        name: 'TCP连接时间',
        value: Math.round(navigation.connectEnd - navigation.connectStart),
        unit: 'ms',
        description: '建立TCP连接时间',
        threshold: { good: 100, needsImprovement: 200, poor: 500 },
      });
    }

    // 绘制时序
    const paintEntries = performance.getEntriesByType('paint');
    paintEntries.forEach(entry => {
      if (entry.name === 'first-contentful-paint') {
        metrics.push({
          name: '首次内容绘制 (FCP)',
          value: Math.round(entry.startTime),
          unit: 'ms',
          description: '首次绘制内容的时间',
          threshold: { good: 1000, needsImprovement: 2000, poor: 3000 },
        });
      }
    });

    // 资源加载统计
    const resources = performance.getEntriesByType('resource');
    const totalResources = resources.length;
    const imageResources = resources.filter(r => r.initiatorType === 'img').length;
    const scriptResources = resources.filter(r => r.initiatorType === 'script').length;
    const cssResources = resources.filter(r => r.initiatorType === 'link').length;

    metrics.push({
      name: '总资源数量',
      value: totalResources,
      unit: '个',
      description: '页面加载的资源总数',
      threshold: { good: 50, needsImprovement: 100, poor: 200 },
    });

    metrics.push({
      name: '图片资源',
      value: imageResources,
      unit: '个',
      description: '图片资源数量',
    });

    metrics.push({
      name: '脚本资源',
      value: scriptResources,
      unit: '个',
      description: 'JavaScript文件数量',
    });

    metrics.push({
      name: 'CSS资源',
      value: cssResources,
      unit: '个',
      description: 'CSS文件数量',
    });

    // 网络信息
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      metrics.push({
        name: '网络类型',
        value: connection.effectiveType || 'unknown',
        unit: '',
        description: '当前网络连接类型',
      });

      if (connection.downlink) {
        metrics.push({
          name: '下载速度',
          value: Math.round(connection.downlink * 10) / 10,
          unit: 'Mbps',
          description: '网络下载速度',
        });
      }
    }

    return metrics;
  }, []);

  // 运行负载测试
  const runLoadTests = useCallback(() => {
    const tests: LoadTest[] = [];

    // DOM操作测试
    const domTestStart = performance.now();
    for (let i = 0; i < 1000; i++) {
      const div = document.createElement('div');
      div.textContent = `Test element ${i}`;
      document.body.appendChild(div);
      document.body.removeChild(div);
    }
    const domTestEnd = performance.now();
    tests.push({
      name: 'DOM操作测试',
      duration: domTestEnd - domTestStart,
      iterations: 1000,
      averageTime: (domTestEnd - domTestStart) / 1000,
      success: true,
    });

    // 数组操作测试
    const arrayTestStart = performance.now();
    const testArray = Array.from({ length: 10000 }, (_, i) => i);
    for (let i = 0; i < 1000; i++) {
      testArray.sort((a, b) => Math.random() - 0.5);
    }
    const arrayTestEnd = performance.now();
    tests.push({
      name: '数组排序测试',
      duration: arrayTestEnd - arrayTestStart,
      iterations: 1000,
      averageTime: (arrayTestEnd - arrayTestStart) / 1000,
      success: true,
    });

    // 字符串操作测试
    const stringTestStart = performance.now();
    for (let i = 0; i < 10000; i++) {
      const str = `Test string ${i}`;
      str.toUpperCase();
      str.toLowerCase();
      str.includes('Test');
    }
    const stringTestEnd = performance.now();
    tests.push({
      name: '字符串操作测试',
      duration: stringTestEnd - stringTestStart,
      iterations: 10000,
      averageTime: (stringTestEnd - stringTestStart) / 10000,
      success: true,
    });

    // JSON序列化测试
    const jsonData = { test: 'data', array: Array.from({ length: 1000 }, (_, i) => ({ id: i, value: Math.random() })) };
    const jsonTestStart = performance.now();
    for (let i = 0; i < 100; i++) {
      const serialized = JSON.stringify(jsonData);
      JSON.parse(serialized);
    }
    const jsonTestEnd = performance.now();
    tests.push({
      name: 'JSON序列化测试',
      duration: jsonTestEnd - jsonTestStart,
      iterations: 100,
      averageTime: (jsonTestEnd - jsonTestStart) / 100,
      success: true,
    });

    return tests;
  }, []);

  // 监控内存使用
  const monitorMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usage: MemoryUsage = {
        usedJSHeapSize: Math.round(memory.usedJSHeapSize / 1024 / 1024 * 100) / 100,
        totalJSHeapSize: Math.round(memory.totalJSHeapSize / 1024 / 1024 * 100) / 100,
        jsHeapSizeLimit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024 * 100) / 100,
        timestamp: Date.now(),
      };
      setMemoryUsage(prev => [...prev.slice(-29), usage]);
    }
  }, []);

  // 运行完整的性能测试
  const runPerformanceTest = useCallback(async () => {
    setIsRunning(true);
    setTestProgress(0);

    try {
      // 1. 获取基础性能指标
      setTestProgress(20);
      const metrics = await getPerformanceMetrics();
      setPerformanceMetrics(metrics);

      // 2. 获取Web Vitals
      setTestProgress(40);
      const vitals = await getWebVitals();
      setWebVitals(vitals);

      // 3. 运行负载测试
      setTestProgress(60);
      const tests = runLoadTests();
      setLoadTests(tests);

      // 4. 开始监控内存使用
      setTestProgress(80);
      monitorMemoryUsage();
      intervalRef.current = setInterval(monitorMemoryUsage, 1000);

      setTimeout(() => {
        setTestProgress(100);
        setIsRunning(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      }, 5000);

    } catch (error) {
      console.error('性能测试失败:', error);
      setIsRunning(false);
      setTestProgress(0);
    }
  }, [getPerformanceMetrics, getWebVitals, runLoadTests, monitorMemoryUsage]);

  // 组件挂载时自动运行测试
  useEffect(() => {
    runPerformanceTest();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [runPerformanceTest]);

  const performanceScore = calculatePerformanceScore();

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <Head>
        <title>性能测试 - AI视频创作工作站</title>
        <meta name="description" content="全面的性能测试和优化建议" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            ⚡ 性能测试
          </h1>
          <p className="text-gray-600">
            全面测试AI视频创作工作站的性能表现，识别性能瓶颈并提供优化建议
          </p>
        </div>

        {/* 性能得分 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              📊 性能得分
            </h2>
            <button
              onClick={runPerformanceTest}
              disabled={isRunning}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {isRunning ? `测试中... ${testProgress}%` : '重新测试'}
            </button>
          </div>

          <div className="text-center">
            <div className="relative inline-block">
              <div className="w-32 h-32 rounded-full border-8 border-gray-200"></div>
              <div
                className={`absolute top-0 left-0 w-32 h-32 rounded-full border-8 border-t-transparent border-r-transparent transform -rotate-90 ${
                  performanceScore >= 90 ? 'border-green-500' :
                  performanceScore >= 70 ? 'border-yellow-500' :
                  'border-red-500'
                }`}
                style={{
                  background: `conic-gradient(${
                    performanceScore >= 90 ? '#10B981' :
                    performanceScore >= 70 ? '#F59E0B' :
                    '#EF4444'
                  } ${performanceScore * 3.6}deg, #E5E7EB ${performanceScore * 3.6}deg)`
                }}
              ></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <span className="text-3xl font-bold text-gray-900">{performanceScore}</span>
              </div>
            </div>
          </div>

          <div className="text-center mt-4">
            <p className="text-gray-600 mb-2">
              当前页面性能综合评估
            </p>
            <div className="flex justify-center gap-2 text-sm">
              <span className={`px-3 py-1 rounded-full ${
                performanceScore >= 90 ? 'bg-green-100 text-green-800' :
                performanceScore >= 70 ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {performanceScore >= 90 ? '优秀' :
                 performanceScore >= 70 ? '良好' :
                 '需要优化'}
              </span>
            </div>
          </div>
        </div>

        {/* Web Vitals */}
        {Object.keys(webVitals).length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              🎯 Core Web Vitals
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-800 mb-2">首次内容绘制 (FCP)</h3>
                <p className="text-2xl font-bold text-blue-600">{webVitals.fcp}ms</p>
                <p className={`text-sm mt-1 ${
                  webVitals.fcp <= 1000 ? 'text-green-600' :
                  webVitals.fcp <= 2000 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {webVitals.fcp <= 1000 ? '优秀' :
                   webVitals.fcp <= 2000 ? '需要改进' :
                   '较差'}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-800 mb-2">最大内容绘制 (LCP)</h3>
                <p className="text-2xl font-bold text-blue-600">{webVitals.lcp}ms</p>
                <p className={`text-sm mt-1 ${
                  webVitals.lcp <= 2500 ? 'text-green-600' :
                  webVitals.lcp <= 4000 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {webVitals.lcp <= 2500 ? '优秀' :
                   webVitals.lcp <= 4000 ? '需要改进' :
                   '较差'}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-800 mb-2">首次输入延迟 (FID)</h3>
                <p className="text-2xl font-bold text-blue-600">{webVitals.fid}ms</p>
                <p className={`text-sm mt-1 ${
                  webVitals.fid <= 100 ? 'text-green-600' :
                  webVitals.fid <= 300 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {webVitals.fid <= 100 ? '优秀' :
                   webVitals.fid <= 300 ? '需要改进' :
                   '较差'}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-800 mb-2">累积布局偏移 (CLS)</h3>
                <p className="text-2xl font-bold text-blue-600">{webVitals.cls}</p>
                <p className={`text-sm mt-1 ${
                  webVitals.cls <= 0.1 ? 'text-green-600' :
                  webVitals.cls <= 0.25 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {webVitals.cls <= 0.1 ? '优秀' :
                   webVitals.cls <= 0.25 ? '需要改进' :
                   '较差'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 性能指标详情 */}
        {performanceMetrics.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              📈 详细性能指标
            </h2>
            <div className="space-y-3">
              {performanceMetrics.map((metric, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-800">{metric.name}</span>
                      <span className="text-lg font-bold text-blue-600">
                        {metric.value} {metric.unit}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{metric.description}</p>
                    {metric.threshold && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>优秀: ≤{metric.threshold.good}{metric.unit}</span>
                          <span>一般: ≤{metric.threshold.needsImprovement}{metric.unit}</span>
                          <span>较差: &gt;{metric.threshold.poor}{metric.unit}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              metric.value <= metric.threshold.good ? 'bg-green-500' :
                              metric.value <= metric.threshold.needsImprovement ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${Math.min((metric.value / metric.threshold.poor) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 负载测试结果 */}
        {loadTests.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              ⚙️ 负载测试结果
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {loadTests.map((test, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-800 mb-2">{test.name}</h3>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">总耗时:</span>
                      <span className="font-medium">{test.duration.toFixed(2)}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">迭代次数:</span>
                      <span className="font-medium">{test.iterations}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">平均耗时:</span>
                      <span className="font-medium">{test.averageTime.toFixed(4)}ms</span>
                    </div>
                  </div>
                  <div className={`mt-2 text-sm ${
                    test.averageTime < 0.1 ? 'text-green-600' :
                    test.averageTime < 1 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {test.averageTime < 0.1 ? '🚀 极快' :
                     test.averageTime < 1 ? '✅ 良好' :
                     '⚠️ 需要优化'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 内存使用情况 */}
        {memoryUsage.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              💾 内存使用情况
            </h2>
            {memoryUsage.length > 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-medium text-blue-800 mb-2">已使用堆内存</h3>
                    <p className="text-2xl font-bold text-blue-600">
                      {memoryUsage[memoryUsage.length - 1]?.usedJSHeapSize || 0} MB
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-medium text-green-800 mb-2">总堆内存</h3>
                    <p className="text-2xl font-bold text-green-600">
                      {memoryUsage[memoryUsage.length - 1]?.totalJSHeapSize || 0} MB
                    </p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="font-medium text-purple-800 mb-2">堆内存限制</h3>
                    <p className="text-2xl font-bold text-purple-600">
                      {memoryUsage[memoryUsage.length - 1]?.jsHeapSizeLimit || 0} MB
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-800 mb-2">内存使用趋势</h3>
                  <div className="h-32 flex items-end justify-between gap-1">
                    {memoryUsage.map((usage, index) => (
                      <div
                        key={index}
                        className="bg-blue-500 rounded-t"
                        style={{
                          height: `${(usage.usedJSHeapSize / usage.jsHeapSizeLimit) * 100}%`,
                          flex: 1,
                        }}
                        title={`${usage.usedJSHeapSize} MB`}
                      ></div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 优化建议 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            💡 性能优化建议
          </h2>
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">通用优化建议</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• 启用Gzip压缩减少传输大小</li>
                <li>• 使用CDN加速静态资源加载</li>
                <li>• 优化图片格式和大小</li>
                <li>• 减少HTTP请求数量</li>
                <li>• 启用浏览器缓存</li>
              </ul>
            </div>

            {performanceScore < 70 && (
              <div className="bg-red-50 p-4 rounded-lg">
                <h3 className="font-medium text-red-900 mb-2">紧急优化事项</h3>
                <ul className="text-sm text-red-800 space-y-1">
                  <li>• 压缩和合并CSS/JavaScript文件</li>
                  <li>• 移除未使用的代码和依赖</li>
                  <li>• 实施代码分割和懒加载</li>
                  <li>• 优化关键渲染路径</li>
                  <li>• 减少主线程工作量</li>
                </ul>
              </div>
            )}

            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-medium text-green-900 mb-2">监控和测试</h3>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• 定期进行性能测试</li>
                <li>• 监控真实用户体验数据</li>
                <li>• 设置性能预算和告警</li>
                <li>• 使用性能分析工具</li>
                <li>• 持续优化和改进</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}