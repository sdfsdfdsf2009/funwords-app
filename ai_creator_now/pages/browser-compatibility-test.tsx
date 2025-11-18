import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';

interface TestResult {
  feature: string;
  supported: boolean;
  details?: string;
  browser?: string;
  version?: string;
}

interface BrowserInfo {
  name: string;
  version: string;
  platform: string;
  userAgent: string;
  language: string;
  cookieEnabled: boolean;
  onLine: boolean;
}

export default function CrossBrowserCompatibilityTest() {
  const [browserInfo, setBrowserInfo] = useState<BrowserInfo | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [testProgress, setTestProgress] = useState(0);

  // 获取浏览器信息
  const getBrowserInfo = useCallback((): BrowserInfo => {
    const userAgent = navigator.userAgent;
    let name = 'Unknown';
    let version = 'Unknown';

    // 检测浏览器类型和版本
    if (userAgent.indexOf('Chrome') > -1) {
      name = 'Chrome';
      version = userAgent.match(/Chrome\/([0-9.]+)/)?.[1] || 'Unknown';
    } else if (userAgent.indexOf('Firefox') > -1) {
      name = 'Firefox';
      version = userAgent.match(/Firefox\/([0-9.]+)/)?.[1] || 'Unknown';
    } else if (userAgent.indexOf('Safari') > -1) {
      name = 'Safari';
      version = userAgent.match(/Version\/([0-9.]+)/)?.[1] || 'Unknown';
    } else if (userAgent.indexOf('Edge') > -1) {
      name = 'Edge';
      version = userAgent.match(/Edge\/([0-9.]+)/)?.[1] || 'Unknown';
    }

    return {
      name,
      version,
      platform: navigator.platform,
      userAgent,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
    };
  }, []);

  // 测试JavaScript特性支持
  const testJavaScriptFeatures = useCallback((): TestResult[] => {
    const results: TestResult[] = [];

    // ES6+ 特性测试
    try {
      // 箭头函数
      const arrow = () => true;
      results.push({
        feature: 'Arrow Functions',
        supported: typeof arrow === 'function',
        details: 'ES6 arrow function syntax',
      });
    } catch (e) {
      results.push({
        feature: 'Arrow Functions',
        supported: false,
        details: 'ES6 arrow function syntax',
      });
    }

    // Promise 支持
    results.push({
      feature: 'Promise',
      supported: typeof Promise !== 'undefined' && Promise !== null,
      details: 'ES6 Promise for asynchronous operations',
    });

    // async/await 支持
    try {
      eval('async function test() { await true; }');
      results.push({
        feature: 'Async/Await',
        supported: true,
        details: 'ES2017 async/await syntax',
      });
    } catch (e) {
      results.push({
        feature: 'Async/Await',
        supported: false,
        details: 'ES2017 async/await syntax',
      });
    }

    // 模板字符串
    try {
      const template = `Hello ${'World'}`;
      results.push({
        feature: 'Template Literals',
        supported: template === 'Hello World',
        details: 'ES6 template string syntax',
      });
    } catch (e) {
      results.push({
        feature: 'Template Literals',
        supported: false,
        details: 'ES6 template string syntax',
      });
    }

    // 解构赋值
    try {
      const { test } = { test: true };
      results.push({
        feature: 'Destructuring',
        supported: test === true,
        details: 'ES6 destructuring assignment',
      });
    } catch (e) {
      results.push({
        feature: 'Destructuring',
        supported: false,
        details: 'ES6 destructuring assignment',
      });
    }

    // 展开运算符
    try {
      const spread = [...[1, 2, 3]];
      results.push({
        feature: 'Spread Operator',
        supported: Array.isArray(spread) && spread.length === 3,
        details: 'ES6 spread/rest operator',
      });
    } catch (e) {
      results.push({
        feature: 'Spread Operator',
        supported: false,
        details: 'ES6 spread/rest operator',
      });
    }

    // Map 和 Set
    results.push({
      feature: 'Map',
      supported: typeof Map !== 'undefined',
      details: 'ES6 Map data structure',
    });

    results.push({
      feature: 'Set',
      supported: typeof Set !== 'undefined',
      details: 'ES6 Set data structure',
    });

    // 可选链操作符
    try {
      const optional = { test: { value: true } };
      const result = optional?.test?.value;
      results.push({
        feature: 'Optional Chaining',
        supported: result === true,
        details: 'ES2020 optional chaining operator (?.)',
      });
    } catch (e) {
      results.push({
        feature: 'Optional Chaining',
        supported: false,
        details: 'ES2020 optional chaining operator (?.)',
      });
    }

    // 空值合并操作符 - 测试语法支持
    try {
      // 使用Function构造器来测试语法支持，避免TypeScript编译时检查
      const testCode = 'const nullish = null ?? "default";';
      new Function(testCode);
      results.push({
        feature: 'Nullish Coalescing',
        supported: true,
        details: 'ES2020 nullish coalescing operator (??)',
      });
    } catch (e) {
      results.push({
        feature: 'Nullish Coalescing',
        supported: false,
        details: 'ES2020 nullish coalescing operator (??)',
      });
    }

    return results;
  }, []);

  // 测试CSS特性支持
  const testCSSFeatures = useCallback((): TestResult[] => {
    const results: TestResult[] = [];
    const element = document.createElement('div');

    // CSS Grid
    results.push({
      feature: 'CSS Grid',
      supported: CSS.supports('display', 'grid'),
      details: 'CSS Grid Layout support',
    });

    // Flexbox
    results.push({
      feature: 'Flexbox',
      supported: CSS.supports('display', 'flex'),
      details: 'CSS Flexbox Layout support',
    });

    // CSS Variables
    results.push({
      feature: 'CSS Variables',
      supported: CSS.supports('color', 'var(--test)'),
      details: 'CSS Custom Properties (Variables)',
    });

    // CSS Transforms
    results.push({
      feature: 'CSS Transforms',
      supported: CSS.supports('transform', 'rotate(10deg)'),
      details: 'CSS 2D/3D Transforms',
    });

    // CSS Transitions
    results.push({
      feature: 'CSS Transitions',
      supported: 'transition' in element.style,
      details: 'CSS Transitions support',
    });

    // CSS Animations
    results.push({
      feature: 'CSS Animations',
      supported: 'animation' in element.style,
      details: 'CSS Animations support',
    });

    // CSS Filters
    results.push({
      feature: 'CSS Filters',
      supported: CSS.supports('filter', 'blur(5px)'),
      details: 'CSS Filter effects',
    });

    // CSS Backdrop Filter
    results.push({
      feature: 'Backdrop Filter',
      supported: CSS.supports('backdrop-filter', 'blur(10px)'),
      details: 'CSS Backdrop Filter effects',
    });

    // CSS Custom Properties (再次检查，更准确)
    results.push({
      feature: 'CSS Custom Properties',
      supported: window.CSS && CSS.supports('color', 'var(--test)'),
      details: 'CSS Custom Properties support',
    });

    // CSS aspect-ratio
    results.push({
      feature: 'CSS aspect-ratio',
      supported: CSS.supports('aspect-ratio', '16/9'),
      details: 'CSS aspect-ratio property',
    });

    // CSS object-fit
    results.push({
      feature: 'CSS object-fit',
      supported: CSS.supports('object-fit', 'cover'),
      details: 'CSS object-fit property',
    });

    return results;
  }, []);

  // 测试Web API支持
  const testWebAPIs = useCallback((): TestResult[] => {
    const results: TestResult[] = [];

    // Fetch API
    results.push({
      feature: 'Fetch API',
      supported: typeof fetch !== 'undefined',
      details: 'Modern fetch API for HTTP requests',
    });

    // LocalStorage
    results.push({
      feature: 'LocalStorage',
      supported: typeof Storage !== 'undefined' && 'localStorage' in window,
      details: 'Client-side storage mechanism',
    });

    // SessionStorage
    results.push({
      feature: 'SessionStorage',
      supported: typeof Storage !== 'undefined' && 'sessionStorage' in window,
      details: 'Session-based client-side storage',
    });

    // IndexedDB
    results.push({
      feature: 'IndexedDB',
      supported: 'indexedDB' in window,
      details: 'Client-side database for large amounts of data',
    });

    // Web Workers
    results.push({
      feature: 'Web Workers',
      supported: typeof Worker !== 'undefined',
      details: 'Background JavaScript execution',
    });

    // Service Workers
    results.push({
      feature: 'Service Workers',
      supported: 'serviceWorker' in navigator,
      details: 'Offline web applications',
    });

    // Geolocation
    results.push({
      feature: 'Geolocation',
      supported: 'geolocation' in navigator,
      details: 'Device geographical location',
    });

    // Canvas
    results.push({
      feature: 'Canvas API',
      supported: !!document.createElement('canvas').getContext,
      details: '2D drawing and graphics',
    });

    // WebGL
    results.push({
      feature: 'WebGL',
      supported: !!document.createElement('canvas').getContext('webgl'),
      details: '3D graphics rendering',
    });

    // WebRTC
    results.push({
      feature: 'WebRTC',
      supported: 'RTCPeerConnection' in window,
      details: 'Real-time communication',
    });

    // WebSockets
    results.push({
      feature: 'WebSockets',
      supported: 'WebSocket' in window,
      details: 'Real-time bidirectional communication',
    });

    // File API
    results.push({
      feature: 'File API',
      supported: 'File' in window && 'FileReader' in window,
      details: 'File handling and reading',
    });

    // Drag and Drop
    results.push({
      feature: 'Drag and Drop API',
      supported: 'draggable' in document.createElement('div'),
      details: 'HTML5 Drag and Drop interface',
    });

    // Notification API
    results.push({
      feature: 'Notification API',
      supported: 'Notification' in window,
      details: 'System notifications',
    });

    // Clipboard API
    results.push({
      feature: 'Clipboard API',
      supported: 'clipboard' in navigator,
      details: 'Modern clipboard operations',
    });

    // Resize Observer
    results.push({
      feature: 'Resize Observer',
      supported: 'ResizeObserver' in window,
      details: 'Element size change detection',
    });

    // Intersection Observer
    results.push({
      feature: 'Intersection Observer',
      supported: 'IntersectionObserver' in window,
      details: 'Element viewport intersection detection',
    });

    // Mutation Observer
    results.push({
      feature: 'Mutation Observer',
      supported: 'MutationObserver' in window,
      details: 'DOM change observation',
    });

    return results;
  }, []);

  // 测试React和Next.js特性
  const testReactFeatures = useCallback((): TestResult[] => {
    const results: TestResult[] = [];

    // 检查React是否正常工作
    results.push({
      feature: 'React Components',
      supported: typeof React !== 'undefined',
      details: 'React library loaded and functional',
    });

    // 检查是否支持Hooks
    results.push({
      feature: 'React Hooks',
      supported: typeof React.useState === 'function',
      details: 'React Hooks support (useState, useEffect, etc.)',
    });

    // 检查Next.js特性
    results.push({
      feature: 'Next.js Router',
      supported: false, // 需要特殊检查
      details: 'Next.js routing capabilities',
    });

    // 检查Service Worker支持
    results.push({
      feature: 'Service Worker Registration',
      supported: 'serviceWorker' in navigator,
      details: 'Service Worker for PWA functionality',
    });

    return results;
  }, []);

  // 运行所有测试
  const runAllTests = useCallback(async () => {
    setIsTesting(true);
    setTestProgress(0);

    const allResults: TestResult[] = [];

    // 获取浏览器信息
    const info = getBrowserInfo();
    setBrowserInfo(info);

    // 运行不同类型的测试
    const testCategories = [
      { name: 'JavaScript Features', test: testJavaScriptFeatures, weight: 25 },
      { name: 'CSS Features', test: testCSSFeatures, weight: 25 },
      { name: 'Web APIs', test: testWebAPIs, weight: 25 },
      { name: 'React Features', test: testReactFeatures, weight: 25 },
    ];

    for (let i = 0; i < testCategories.length; i++) {
      const category = testCategories[i];
      const results = category.test();
      allResults.push(...results);
      setTestProgress((i + 1) * 25);

      // 添加延迟以显示进度
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setTestResults(allResults);
    setIsTesting(false);
    setTestProgress(100);
  }, [getBrowserInfo, testJavaScriptFeatures, testCSSFeatures, testWebAPIs, testReactFeatures]);

  // 计算兼容性得分
  const calculateCompatibilityScore = useCallback(() => {
    if (testResults.length === 0) return 0;

    const supportedCount = testResults.filter(result => result.supported).length;
    return Math.round((supportedCount / testResults.length) * 100);
  }, [testResults]);

  // 组件挂载时自动运行测试
  useEffect(() => {
    runAllTests();
  }, [runAllTests]);

  const compatibilityScore = calculateCompatibilityScore();

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <Head>
        <title>跨浏览器兼容性测试 - AI视频创作工作站</title>
        <meta name="description" content="全面的跨浏览器兼容性测试工具" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🌐 跨浏览器兼容性测试
          </h1>
          <p className="text-gray-600">
            全面检测当前浏览器的特性支持情况，确保AI视频创作工作站的兼容性
          </p>
        </div>

        {/* 浏览器信息 */}
        {browserInfo && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              📱 浏览器信息
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-3 rounded">
                <span className="text-sm text-gray-500">浏览器</span>
                <p className="font-medium">{browserInfo.name} {browserInfo.version}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <span className="text-sm text-gray-500">平台</span>
                <p className="font-medium">{browserInfo.platform}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <span className="text-sm text-gray-500">语言</span>
                <p className="font-medium">{browserInfo.language}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <span className="text-sm text-gray-500">Cookie支持</span>
                <p className="font-medium">{browserInfo.cookieEnabled ? '✅ 启用' : '❌ 禁用'}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <span className="text-sm text-gray-500">在线状态</span>
                <p className="font-medium">{browserInfo.onLine ? '🌐 在线' : '📵 离线'}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <span className="text-sm text-gray-500">用户代理</span>
                <p className="font-medium text-xs truncate" title={browserInfo.userAgent}>
                  {browserInfo.userAgent.substring(0, 50)}...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 兼容性得分 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              🎯 兼容性得分
            </h2>
            {isTesting && (
              <span className="text-sm text-blue-600">测试中... {testProgress}%</span>
            )}
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-center">
              <div className="relative">
                <div className="w-32 h-32 rounded-full border-8 border-gray-200"></div>
                <div
                  className="absolute top-0 left-0 w-32 h-32 rounded-full border-8 border-blue-500 border-t-transparent border-r-transparent transform -rotate-90"
                  style={{
                    background: `conic-gradient(#3B82F6 ${compatibilityScore * 3.6}deg, #E5E7EB ${compatibilityScore * 3.6}deg)`
                  }}
                ></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <span className="text-2xl font-bold text-gray-900">{compatibilityScore}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <p className="text-gray-600 mb-2">
              当前浏览器对AI视频创作工作站的兼容性评估
            </p>
            <div className="flex justify-center gap-2 text-sm">
              <span className={`px-2 py-1 rounded ${
                compatibilityScore >= 90 ? 'bg-green-100 text-green-800' :
                compatibilityScore >= 75 ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {compatibilityScore >= 90 ? '优秀' :
                 compatibilityScore >= 75 ? '良好' :
                 '需要改进'}
              </span>
            </div>
          </div>
        </div>

        {/* 测试结果 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              🧪 特性测试结果
            </h2>
            <button
              onClick={runAllTests}
              disabled={isTesting}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {isTesting ? '测试中...' : '重新测试'}
            </button>
          </div>

          {testResults.length > 0 && (
            <div className="space-y-6">
              {/* JavaScript 特性 */}
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-3">JavaScript 特性</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {testResults.filter(r =>
                    ['Arrow Functions', 'Promise', 'Async/Await', 'Template Literals',
                     'Destructuring', 'Spread Operator', 'Map', 'Set',
                     'Optional Chaining', 'Nullish Coalescing'].includes(r.feature)
                  ).map((result, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                          result.supported ? 'bg-green-500' : 'bg-red-500'
                        }`}></span>
                        <span className="font-medium">{result.feature}</span>
                      </div>
                      <span className={`text-sm ${
                        result.supported ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {result.supported ? '支持' : '不支持'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CSS 特性 */}
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-3">CSS 特性</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {testResults.filter(r =>
                    r.feature.startsWith('CSS')
                  ).map((result, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                          result.supported ? 'bg-green-500' : 'bg-red-500'
                        }`}></span>
                        <span className="font-medium">{result.feature}</span>
                      </div>
                      <span className={`text-sm ${
                        result.supported ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {result.supported ? '支持' : '不支持'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Web APIs */}
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-3">Web APIs</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {testResults.filter(r =>
                    ['Fetch API', 'LocalStorage', 'SessionStorage', 'IndexedDB', 'Web Workers',
                     'Service Workers', 'Geolocation', 'Canvas API', 'WebGL', 'WebRTC',
                     'WebSockets', 'File API', 'Drag and Drop API', 'Notification API',
                     'Clipboard API', 'Resize Observer', 'Intersection Observer', 'Mutation Observer'].includes(r.feature)
                  ).map((result, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                          result.supported ? 'bg-green-500' : 'bg-red-500'
                        }`}></span>
                        <span className="font-medium">{result.feature}</span>
                      </div>
                      <span className={`text-sm ${
                        result.supported ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {result.supported ? '支持' : '不支持'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 测试建议 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            💡 兼容性建议
          </h2>
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">推荐的浏览器</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Chrome 90+ (推荐，功能最全面)</li>
                <li>• Firefox 88+ (良好兼容性)</li>
                <li>• Safari 14+ (macOS/iOS用户)</li>
                <li>• Edge 90+ (Windows用户)</li>
              </ul>
            </div>

            {testResults.filter(r => !r.supported).length > 0 && (
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="font-medium text-yellow-900 mb-2">不支持的特性</h3>
                <p className="text-sm text-yellow-800">
                  以下特性在当前浏览器中不受支持，可能会影响某些功能：
                </p>
                <ul className="text-sm text-yellow-800 space-y-1 mt-2">
                  {testResults.filter(r => !r.supported).map((result, index) => (
                    <li key={index}>• {result.feature}: {result.details}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-medium text-green-900 mb-2">性能优化建议</h3>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• 确保浏览器已更新到最新版本</li>
                <li>• 关闭不必要的浏览器扩展</li>
                <li>• 清除浏览器缓存和Cookies</li>
                <li>• 使用稳定的网络连接</li>
                <li>• 启用硬件加速（如支持）</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 导出测试结果 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            📊 导出测试结果
          </h2>
          <div className="flex gap-4">
            <button
              onClick={() => {
                const data = {
                  timestamp: new Date().toISOString(),
                  browser: browserInfo,
                  compatibilityScore,
                  testResults,
                };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `compatibility-test-${Date.now()}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              导出JSON报告
            </button>
            <button
              onClick={() => {
                window.print();
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              打印报告
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}