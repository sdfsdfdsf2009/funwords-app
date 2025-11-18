import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// 测试动态导入
const TestComponent = dynamic(
  () => Promise.resolve(() => <div className="bg-green-800 p-4 rounded mt-4">✅ 动态导入成功！</div>),
  { ssr: false }
);

// 测试Remotion组件导入
const TestRemotionImport = dynamic(
  () => import('../src/remotion/components/RemotionVideoEditor').catch(err => {
    console.error('Remotion组件导入失败:', err);
    return () => <div className="bg-red-800 p-4 rounded mt-4">❌ Remotion组件导入失败</div>;
  }),
  { ssr: false }
);

const TestRemotionPage: React.FC = () => {
  const [loadingStatus, setLoadingStatus] = useState('正在初始化...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadingStatus('组件加载完成');
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-2xl font-bold mb-4">🎬 Remotion 测试页面</h1>
      <div className="space-y-4">
        <p>这是一个测试页面，用于验证Remotion组件是否能正确加载。</p>
        <p>状态: {loadingStatus}</p>
        {error && <p className="text-red-400">错误: {error}</p>}

        <div className="bg-gray-800 p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">组件状态</h2>
          <ul className="space-y-2 text-sm">
            <li>✅ React组件正常加载</li>
            <li>✅ 页面路由正常工作</li>
            <li>🔄 动态导入测试中...</li>
          </ul>
        </div>

        <TestComponent />

        <div className="bg-gray-800 p-4 rounded mt-4">
          <h2 className="text-xl font-semibold mb-2">Remotion组件测试</h2>
          <TestRemotionImport />
        </div>

        <div className="bg-gray-800 p-4 rounded mt-4">
          <h2 className="text-xl font-semibold mb-2">下一步</h2>
          <p>如果此页面正常显示，说明基础功能正常。问题可能在动态导入的RemotionVideoEditor组件中。</p>
        </div>
      </div>
    </div>
  );
};

export default TestRemotionPage;