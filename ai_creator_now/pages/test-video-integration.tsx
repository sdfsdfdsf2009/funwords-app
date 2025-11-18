import React, { useState } from 'react';

export default function VideoIntegrationTest() {
  const [testResults, setTestResults] = useState<string[]>([]);

  const addTestResult = (message: string, isSuccess: boolean = true) => {
    setTestResults(prev => [...prev, `${isSuccess ? '✅' : '❌'} ${message}`]);
  };

  const testVideoIntegration = async () => {
    setTestResults([]);

    try {
      // 测试1：检查页面加载
      addTestResult('开始测试视频整合功能...');

      // 测试2：检查localStorage数据
      const projectData = localStorage.getItem('project-storage');
      if (projectData) {
        const parsedData = JSON.parse(projectData);
        const projectCount = parsedData.state?.projects?.length || 0;
        addTestResult(`找到 ${projectCount} 个项目数据`);

        if (projectCount > 0) {
          // 测试3：检查视频数据
          const firstProject = parsedData.state.projects[0];
          const videoCount = firstProject.scenes?.reduce((total: number, scene: any) => {
            const videos = scene.generatedVideos || (scene.generatedVideo ? [scene.generatedVideo] : []);
            return total + videos.length;
          }, 0) || 0;
          addTestResult(`第一个项目包含 ${videoCount} 个视频`);

          if (videoCount > 0) {
            addTestResult('✅ 数据检查完成，可以进行功能测试');
          } else {
            addTestResult('⚠️ 项目中没有视频数据，将使用示例数据', false);
          }
        } else {
          addTestResult('⚠️ 没有项目数据，将使用示例数据', false);
        }
      } else {
        addTestResult('⚠️ 没有localStorage数据，将使用示例数据', false);
      }

      // 测试4：打开Remotion编辑器
      addTestResult('正在打开Remotion编辑器页面...');
      window.open('http://localhost:3003/remotion-editor', '_blank');

      // 测试5：提供测试步骤
      setTimeout(() => {
        setTestResults(prev => [...prev,
          '\n📋 手动测试步骤:',
          '1. 在编辑器中点击"选择视频"按钮',
          '2. 从侧边栏选择至少2个视频',
          '3. 查看底部"视频整合渲染"区域',
          '4. 点击"整合视频"按钮',
          '5. 观察进度条和动画效果',
          '6. 查看成功结果和预览播放器',
          '7. 测试下载功能'
        ]);
      }, 2000);

    } catch (error) {
      addTestResult(`测试失败: ${error}`, false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-6">🎬 视频整合功能测试</h1>

      <div className="space-y-4">
        <button
          onClick={testVideoIntegration}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
        >
          开始测试视频整合功能
        </button>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold mb-3">测试结果:</h2>
          <div className="bg-gray-800 rounded-lg p-4 font-mono text-sm max-h-96 overflow-y-auto">
            {testResults.length > 0 ? (
              testResults.map((result, index) => (
                <div key={index} className={result.startsWith('✅') ? 'text-green-400' : result.startsWith('❌') ? 'text-red-400' : result.startsWith('⚠️') ? 'text-yellow-400' : 'text-gray-300'}>
                  {result}
                </div>
              ))
            ) : (
              <div className="text-gray-400">点击"开始测试"按钮开始测试...</div>
            )}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2">🔗 快速链接</h3>
          <div className="space-y-2">
            <a href="http://localhost:3003/remotion-editor" target="_blank" className="block text-blue-400 hover:text-blue-300">
              → Remotion 编辑器
            </a>
            <a href="http://localhost:3003/project-debug" target="_blank" className="block text-blue-400 hover:text-blue-300">
              → 项目调试页面
            </a>
            <a href="http://localhost:3003/" target="_blank" className="block text-blue-400 hover:text-blue-300">
              → 主页
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}