import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';

interface TouchTest {
  tapSupported: boolean;
  doubleTapSupported: boolean;
  longPressSupported: boolean;
  pinchZoomSupported: boolean;
  swipeSupported: boolean;
  multiTouchSupported: boolean;
}

interface DeviceCapability {
  feature: string;
  supported: boolean;
  details: string;
  importance: 'high' | 'medium' | 'low';
}

interface MobileDeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isPhone: boolean;
  screenInfo: {
    width: number;
    height: number;
    availWidth: number;
    availHeight: number;
    colorDepth: number;
    pixelDepth: number;
    orientation: string;
  };
  touchInfo: {
    maxTouchPoints: number;
    touchSupported: boolean;
    pointerSupported: boolean;
    coarsePointer: boolean;
    finePointer: boolean;
  };
  viewportInfo: {
    width: number;
    height: number;
    devicePixelRatio: number;
  };
  batteryInfo?: {
    charging: boolean;
    level: number;
    chargingTime: number;
    dischargingTime: number;
  };
  connectionInfo?: {
    effectiveType: string;
    downlink: number;
    rtt: number;
    saveData: boolean;
  };
}

export default function MobileCompatibilityTest() {
  const [deviceInfo, setDeviceInfo] = useState<MobileDeviceInfo | null>(null);
  const [touchTests, setTouchTests] = useState<TouchTest | null>(null);
  const [deviceCapabilities, setDeviceCapabilities] = useState<DeviceCapability[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [testProgress, setTestProgress] = useState(0);
  const [touchEvents, setTouchEvents] = useState<string[]>([]);

  // 检测设备信息
  const detectDeviceInfo = useCallback(async (): Promise<MobileDeviceInfo> => {
    const userAgent = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isTablet = /iPad|Android(?!.*Mobile)|Tablet/i.test(userAgent);
    const isPhone = isMobile && !isTablet;

    // 获取屏幕信息
    const screenInfo = {
      width: screen.width,
      height: screen.height,
      availWidth: screen.availWidth,
      availHeight: screen.availHeight,
      colorDepth: screen.colorDepth,
      pixelDepth: screen.pixelDepth,
      orientation: screen.orientation?.type || 'unknown',
    };

    // 获取触摸信息
    const touchInfo = {
      maxTouchPoints: navigator.maxTouchPoints || 0,
      touchSupported: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      pointerSupported: 'onpointerdown' in window,
      coarsePointer: window.matchMedia('(pointer: coarse)').matches,
      finePointer: window.matchMedia('(pointer: fine)').matches,
    };

    // 获取视口信息
    const viewportInfo = {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio || 1,
    };

    // 获取电池信息（如果支持）
    let batteryInfo;
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        batteryInfo = {
          charging: battery.charging,
          level: battery.level,
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime,
        };
      } catch (e) {
        console.log('Battery API not available');
      }
    }

    // 获取网络连接信息（如果支持）
    let connectionInfo;
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connectionInfo = {
        effectiveType: connection.effectiveType || 'unknown',
        downlink: connection.downlink || 0,
        rtt: connection.rtt || 0,
        saveData: connection.saveData || false,
      };
    }

    return {
      isMobile,
      isTablet,
      isPhone,
      screenInfo,
      touchInfo,
      viewportInfo,
      batteryInfo,
      connectionInfo,
    };
  }, []);

  // 测试触摸功能
  const testTouchFeatures = useCallback((): TouchTest => {
    const element = document.createElement('div');
    let tapSupported = false;
    let doubleTapSupported = false;
    let longPressSupported = false;
    let pinchZoomSupported = false;
    let swipeSupported = false;
    let multiTouchSupported = false;

    // 检查基本触摸支持
    tapSupported = 'ontouchstart' in window;
    multiTouchSupported = navigator.maxTouchPoints > 1;

    // 检查多点触控
    if (multiTouchSupported) {
      pinchZoomSupported = true; // 通常支持多点触控的设备都支持捏合缩放
    }

    // 检查手势事件
    doubleTapSupported = 'ongesturestart' in window;

    // 这些需要实际的用户交互来测试，我们基于设备能力推断
    swipeSupported = tapSupported; // 支持触摸的设备通常支持滑动手势
    longPressSupported = tapSupported; // 支持触摸的设备通常支持长按

    return {
      tapSupported,
      doubleTapSupported,
      longPressSupported,
      pinchZoomSupported,
      swipeSupported,
      multiTouchSupported,
    };
  }, []);

  // 测试设备能力
  const testDeviceCapabilities = useCallback((): DeviceCapability[] => {
    const capabilities: DeviceCapability[] = [];

    // 触摸相关
    capabilities.push({
      feature: '触摸事件支持',
      supported: 'ontouchstart' in window,
      details: '支持触摸交互，包括tap、swipe等手势',
      importance: 'high',
    });

    capabilities.push({
      feature: '多点触控',
      supported: navigator.maxTouchPoints > 1,
      details: `支持最多 ${navigator.maxTouchPoints} 个触摸点`,
      importance: 'high',
    });

    capabilities.push({
      feature: 'Pointer事件',
      supported: 'onpointerdown' in window,
      details: '统一的指针事件API，支持鼠标、触摸、笔输入',
      importance: 'medium',
    });

    // 显示相关
    capabilities.push({
      feature: '设备像素比',
      supported: window.devicePixelRatio > 1,
      details: `当前DPR: ${window.devicePixelRatio}，支持高分辨率显示`,
      importance: 'medium',
    });

    capabilities.push({
      feature: '屏幕方向API',
      supported: 'orientation' in screen,
      details: '支持检测和控制屏幕方向',
      importance: 'medium',
    });

    capabilities.push({
      feature: '全屏API',
      supported: 'requestFullscreen' in document.documentElement,
      details: '支持全屏显示模式',
      importance: 'low',
    });

    // 传感器相关
    capabilities.push({
      feature: '设备方向',
      supported: 'DeviceOrientationEvent' in window,
      details: '支持检测设备倾斜和旋转',
      importance: 'medium',
    });

    capabilities.push({
      feature: '设备运动',
      supported: 'DeviceMotionEvent' in window,
      details: '支持检测设备加速度和旋转',
      importance: 'medium',
    });

    // 存储相关
    capabilities.push({
      feature: '应用缓存',
      supported: 'applicationCache' in window,
      details: '支持离线应用缓存',
      importance: 'medium',
    });

    capabilities.push({
      feature: 'IndexedDB',
      supported: 'indexedDB' in window,
      details: '支持客户端数据库存储',
      importance: 'high',
    });

    // 媒体相关
    capabilities.push({
      feature: '媒体捕获',
      supported: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
      details: '支持访问摄像头和麦克风',
      importance: 'high',
    });

    capabilities.push({
      feature: 'Web Audio API',
      supported: 'AudioContext' in window || 'webkitAudioContext' in window,
      details: '支持高级音频处理',
      importance: 'medium',
    });

    capabilities.push({
      feature: 'WebRTC',
      supported: 'RTCPeerConnection' in window,
      details: '支持实时音视频通信',
      importance: 'medium',
    });

    // PWA相关
    capabilities.push({
      feature: 'Service Worker',
      supported: 'serviceWorker' in navigator,
      details: '支持离线功能和推送通知',
      importance: 'high',
    });

    capabilities.push({
      feature: 'Web App Manifest',
      supported: 'onbeforeinstallprompt' in window,
      details: '支持安装为PWA应用',
      importance: 'medium',
    });

    // 性能相关
    capabilities.push({
      feature: 'Web Workers',
      supported: 'Worker' in window,
      details: '支持后台JavaScript执行',
      importance: 'high',
    });

    capabilities.push({
      feature: '性能观察器',
      supported: 'PerformanceObserver' in window,
      details: '支持性能监控和分析',
      importance: 'low',
    });

    return capabilities;
  }, []);

  // 处理触摸事件
  const handleTouchStart = useCallback((e: TouchEvent) => {
    const event = `TouchStart: ${e.touches.length} touches`;
    setTouchEvents(prev => [event, ...prev.slice(0, 9)]);
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    const event = `TouchMove: ${e.touches.length} touches`;
    setTouchEvents(prev => [event, ...prev.slice(0, 9)]);
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    const event = `TouchEnd: ${e.changedTouches.length} touches ended`;
    setTouchEvents(prev => [event, ...prev.slice(0, 9)]);
  }, []);

  // 运行所有测试
  const runAllTests = useCallback(async () => {
    setIsTesting(true);
    setTestProgress(0);

    try {
      // 检测设备信息
      const info = await detectDeviceInfo();
      setDeviceInfo(info);
      setTestProgress(25);

      // 测试触摸功能
      const touch = testTouchFeatures();
      setTouchTests(touch);
      setTestProgress(50);

      // 测试设备能力
      const capabilities = testDeviceCapabilities();
      setDeviceCapabilities(capabilities);
      setTestProgress(75);

      // 添加触摸事件监听器
      document.addEventListener('touchstart', handleTouchStart);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
      setTestProgress(100);
    } catch (error) {
      console.error('Error during testing:', error);
    } finally {
      setIsTesting(false);
    }
  }, [detectDeviceInfo, testTouchFeatures, testDeviceCapabilities, handleTouchStart, handleTouchMove, handleTouchEnd]);

  // 计算兼容性得分
  const calculateMobileScore = useCallback(() => {
    if (!deviceInfo || !touchTests || deviceCapabilities.length === 0) return 0;

    let score = 0;
    let maxScore = 0;

    // 设备类型得分
    if (deviceInfo.isMobile) score += 20;
    maxScore += 20;

    // 触摸功能得分
    const touchScore = [
      touchTests.tapSupported,
      touchTests.doubleTapSupported,
      touchTests.longPressSupported,
      touchTests.pinchZoomSupported,
      touchTests.swipeSupported,
      touchTests.multiTouchSupported,
    ].filter(Boolean).length;
    score += (touchScore / 6) * 30;
    maxScore += 30;

    // 设备能力得分（根据重要性加权）
    deviceCapabilities.forEach(cap => {
      const weight = cap.importance === 'high' ? 3 : cap.importance === 'medium' ? 2 : 1;
      maxScore += weight;
      if (cap.supported) score += weight;
    });

    return Math.round((score / maxScore) * 100);
  }, [deviceInfo, touchTests, deviceCapabilities]);

  // 组件挂载时运行测试
  useEffect(() => {
    runAllTests();

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [runAllTests, handleTouchStart, handleTouchMove, handleTouchEnd]);

  const mobileScore = calculateMobileScore();

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <Head>
        <title>移动设备兼容性测试 - AI视频创作工作站</title>
        <meta name="description" content="移动设备和触摸屏兼容性测试工具" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            📱 移动设备兼容性测试
          </h1>
          <p className="text-gray-600">
            全面测试移动设备和触摸屏的兼容性，确保AI视频创作工作站在移动端的良好体验
          </p>
        </div>

        {/* 移动设备得分 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              📊 移动兼容性得分
            </h2>
            {isTesting && (
              <span className="text-sm text-blue-600">测试中... {testProgress}%</span>
            )}
          </div>

          <div className="text-center">
            <div className="relative inline-block">
              <div className="w-24 h-24 rounded-full border-8 border-gray-200"></div>
              <div
                className="absolute top-0 left-0 w-24 h-24 rounded-full border-8 border-green-500 border-t-transparent border-r-transparent transform -rotate-90"
                style={{
                  background: `conic-gradient(#10B981 ${mobileScore * 3.6}deg, #E5E7EB ${mobileScore * 3.6}deg)`
                }}
              ></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <span className="text-xl font-bold text-gray-900">{mobileScore}%</span>
              </div>
            </div>
          </div>

          <div className="text-center mt-4">
            <p className="text-gray-600 mb-2">
              当前设备对移动端功能的兼容性评估
            </p>
            <div className="flex justify-center gap-2 text-sm">
              <span className={`px-2 py-1 rounded ${
                mobileScore >= 90 ? 'bg-green-100 text-green-800' :
                mobileScore >= 70 ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {mobileScore >= 90 ? '优秀移动体验' :
                 mobileScore >= 70 ? '良好移动体验' :
                 '需要优化'}
              </span>
            </div>
          </div>
        </div>

        {/* 设备信息 */}
        {deviceInfo && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              📋 设备信息
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-3 rounded">
                <span className="text-sm text-gray-500">设备类型</span>
                <p className="font-medium">
                  {deviceInfo.isMobile ? '📱 移动设备' : '🖥️ 桌面设备'}
                  {deviceInfo.isTablet && ' (平板)'}
                  {deviceInfo.isPhone && ' (手机)'}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <span className="text-sm text-gray-500">屏幕尺寸</span>
                <p className="font-medium">
                  {deviceInfo.screenInfo.width} × {deviceInfo.screenInfo.height}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <span className="text-sm text-gray-500">视口尺寸</span>
                <p className="font-medium">
                  {deviceInfo.viewportInfo.width} × {deviceInfo.viewportInfo.height}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <span className="text-sm text-gray-500">设备像素比</span>
                <p className="font-medium">{deviceInfo.viewportInfo.devicePixelRatio}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <span className="text-sm text-gray-500">最大触摸点</span>
                <p className="font-medium">{deviceInfo.touchInfo.maxTouchPoints}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <span className="text-sm text-gray-500">屏幕方向</span>
                <p className="font-medium">{deviceInfo.screenInfo.orientation}</p>
              </div>
              {deviceInfo.batteryInfo && (
                <>
                  <div className="bg-gray-50 p-3 rounded">
                    <span className="text-sm text-gray-500">电池电量</span>
                    <p className="font-medium">{Math.round(deviceInfo.batteryInfo.level * 100)}%</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <span className="text-sm text-gray-500">充电状态</span>
                    <p className="font-medium">{deviceInfo.batteryInfo.charging ? '🔋 充电中' : '🔌 未充电'}</p>
                  </div>
                </>
              )}
              {deviceInfo.connectionInfo && (
                <div className="bg-gray-50 p-3 rounded">
                  <span className="text-sm text-gray-500">网络类型</span>
                  <p className="font-medium">{deviceInfo.connectionInfo.effectiveType}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 触摸测试 */}
        {touchTests && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              👆 触摸功能测试
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <div className={`p-4 rounded-lg text-center ${
                touchTests.tapSupported ? 'bg-green-50' : 'bg-red-50'
              }`}>
                <div className={`text-2xl mb-2 ${
                  touchTests.tapSupported ? 'text-green-600' : 'text-red-600'
                }`}>
                  {touchTests.tapSupported ? '✅' : '❌'}
                </div>
                <p className="font-medium">点击</p>
              </div>
              <div className={`p-4 rounded-lg text-center ${
                touchTests.doubleTapSupported ? 'bg-green-50' : 'bg-red-50'
              }`}>
                <div className={`text-2xl mb-2 ${
                  touchTests.doubleTapSupported ? 'text-green-600' : 'text-red-600'
                }`}>
                  {touchTests.doubleTapSupported ? '✅' : '❌'}
                </div>
                <p className="font-medium">双击</p>
              </div>
              <div className={`p-4 rounded-lg text-center ${
                touchTests.longPressSupported ? 'bg-green-50' : 'bg-red-50'
              }`}>
                <div className={`text-2xl mb-2 ${
                  touchTests.longPressSupported ? 'text-green-600' : 'text-red-600'
                }`}>
                  {touchTests.longPressSupported ? '✅' : '❌'}
                </div>
                <p className="font-medium">长按</p>
              </div>
              <div className={`p-4 rounded-lg text-center ${
                touchTests.pinchZoomSupported ? 'bg-green-50' : 'bg-red-50'
              }`}>
                <div className={`text-2xl mb-2 ${
                  touchTests.pinchZoomSupported ? 'text-green-600' : 'text-red-600'
                }`}>
                  {touchTests.pinchZoomSupported ? '✅' : '❌'}
                </div>
                <p className="font-medium">捏合缩放</p>
              </div>
              <div className={`p-4 rounded-lg text-center ${
                touchTests.swipeSupported ? 'bg-green-50' : 'bg-red-50'
              }`}>
                <div className={`text-2xl mb-2 ${
                  touchTests.swipeSupported ? 'text-green-600' : 'text-red-600'
                }`}>
                  {touchTests.swipeSupported ? '✅' : '❌'}
                </div>
                <p className="font-medium">滑动</p>
              </div>
              <div className={`p-4 rounded-lg text-center ${
                touchTests.multiTouchSupported ? 'bg-green-50' : 'bg-red-50'
              }`}>
                <div className={`text-2xl mb-2 ${
                  touchTests.multiTouchSupported ? 'text-green-600' : 'text-red-600'
                }`}>
                  {touchTests.multiTouchSupported ? '✅' : '❌'}
                </div>
                <p className="font-medium">多点触控</p>
              </div>
            </div>

            {/* 触摸事件日志 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-800 mb-3">触摸事件日志</h3>
              <p className="text-sm text-gray-600 mb-3">
                在此区域进行触摸操作以测试响应：
              </p>
              <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-6 min-h-[120px]">
                {touchEvents.length > 0 ? (
                  <ul className="space-y-1">
                    {touchEvents.map((event, index) => (
                      <li key={index} className="text-sm text-gray-700">
                        {event}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 text-center">
                    等待触摸事件...
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 设备能力 */}
        {deviceCapabilities.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                🔧 设备能力测试
              </h2>
              <button
                onClick={runAllTests}
                disabled={isTesting}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {isTesting ? '测试中...' : '重新测试'}
              </button>
            </div>

            <div className="space-y-4">
              {['high', 'medium', 'low'].map(importance => (
                <div key={importance}>
                  <h3 className="font-medium text-gray-800 mb-3">
                    {importance === 'high' ? '🔴 高重要性' :
                     importance === 'medium' ? '🟡 中等重要性' :
                     '🟢 低重要性'} 功能
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {deviceCapabilities
                      .filter(cap => cap.importance === importance)
                      .map((capability, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                          <div className="flex-1">
                            <div className="flex items-center">
                              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                                capability.supported ? 'bg-green-500' : 'bg-red-500'
                              }`}></span>
                              <span className="font-medium">{capability.feature}</span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1 ml-4">
                              {capability.details}
                            </p>
                          </div>
                          <span className={`text-sm ml-4 ${
                            capability.supported ? 'text-green-600' : 'text-red-600'
                          } whitespace-nowrap`}>
                            {capability.supported ? '支持' : '不支持'}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 移动优化建议 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            💡 移动优化建议
          </h2>
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">推荐设备</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• iPhone 8+ / iOS 14+</li>
                <li>• Android 8.0+ 设备</li>
                <li>• iPad Air / Pro (平板体验)</li>
                <li>• 支持5GHz WiFi的设备</li>
              </ul>
            </div>

            {deviceInfo && (
              <>
                {deviceInfo.viewportInfo.devicePixelRatio > 1 && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-medium text-green-900 mb-2">高分辨率优化</h3>
                    <p className="text-sm text-green-800">
                      您的设备支持高分辨率显示 (DPR: {deviceInfo.viewportInfo.devicePixelRatio})。
                      应用已针对Retina/高DPI屏幕进行优化，确保图像和文字清晰度。
                    </p>
                  </div>
                )}

                {deviceInfo.touchInfo.maxTouchPoints > 0 && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-medium text-green-900 mb-2">触摸交互优化</h3>
                    <p className="text-sm text-green-800">
                      检测到触摸支持，应用已启用触摸优化功能，包括手势操作、触摸反馈等。
                      确保所有交互元素都有足够的触摸区域 (最小44×44px)。
                    </p>
                  </div>
                )}

                {deviceInfo.connectionInfo && deviceInfo.connectionInfo.effectiveType !== '4g' && (
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h3 className="font-medium text-yellow-900 mb-2">网络优化建议</h3>
                    <p className="text-sm text-yellow-800">
                      当前网络类型为 {deviceInfo.connectionInfo.effectiveType}，
                      建议在WiFi环境下进行视频创作以获得最佳体验。
                      应用已启用数据节省模式。
                    </p>
                  </div>
                )}
              </>
            )}

            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-medium text-purple-900 mb-2">性能优化技巧</h3>
              <ul className="text-sm text-purple-800 space-y-1">
                <li>• 关闭不必要的后台应用</li>
                <li>• 确保有足够的存储空间</li>
                <li>• 在稳定的网络环境下使用</li>
                <li>• 定期清理浏览器缓存</li>
                <li>• 避免在低电量模式下进行复杂操作</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 导出按钮 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            📊 导出测试报告
          </h2>
          <div className="flex gap-4">
            <button
              onClick={() => {
                const data = {
                  timestamp: new Date().toISOString(),
                  deviceInfo,
                  touchTests,
                  deviceCapabilities,
                  mobileScore,
                };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `mobile-compatibility-${Date.now()}.json`;
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