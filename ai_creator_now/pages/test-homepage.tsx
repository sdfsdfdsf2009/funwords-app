import React, { useState, useEffect } from 'react';
import { ProjectSelector } from '../src/components/project/ProjectSelector';
import { useDatabaseProjectStore } from '../src/stores/databaseProjectStore';

export default function TestHomePage() {
  const [debugInfo, setDebugInfo] = useState('');
  const [appDebug, setAppDebug] = useState('App组件调试信息加载中...');

  const { currentProject, projects, isLoading, error, setCurrentProject, loadProjects } = useDatabaseProjectStore();

  useEffect(() => {
    const updateDebugInfo = () => {
      const storeState = useDatabaseProjectStore.getState();
      setDebugInfo(`
=== 主页项目选择调试信息 ===
时间: ${new Date().toLocaleTimeString()}

DatabaseProjectStore 状态:
- isLoading: ${isLoading}
- error: ${error || 'null'}
- projects 数量: ${projects.length}
- currentProject: ${currentProject?.name || 'null'}

Store 原始状态:
- projects 数量: ${storeState.projects.length}
- currentProject: ${storeState.currentProject?.name || 'null'}
- selectedProjectId: ${storeState.selectedProjectId || 'null'}

项目列表:
${projects.map((p, i) => `${i + 1}. ${p.name} (${p.id})`).join('\\n')}

当前选中项目详情:
${currentProject ? `
- ID: ${currentProject.id}
- 名称: ${currentProject.name}
- 场景数: ${currentProject.scenes.length}
- 更新时间: ${currentProject.updatedAt.toLocaleString()}
` : '无选中项目'}
      `);

      // 模拟App.tsx中的初始化逻辑
      const simulateAppInitialization = async () => {
        try {
          setAppDebug('开始模拟App初始化...');

          // 加载项目
          setAppDebug('正在加载项目...');
          await storeState.loadProjects();
          setAppDebug(`项目加载完成，共 ${storeState.projects.length} 个项目`);

          // 检查是否需要自动选择项目
          if (!storeState.currentProject && storeState.projects.length > 0) {
            setAppDebug('没有选中项目，开始自动选择最新项目...');

            const latestProject = storeState.projects.reduce((latest, project) => {
              const latestDate = new Date(latest.updatedAt);
              const projectDate = new Date(project.updatedAt);
              return projectDate > latestDate ? project : latest;
            });

            setAppDebug(`准备选择项目: ${latestProject.name} (ID: ${latestProject.id})`);
            storeState.setCurrentProject(latestProject.id);

            // 等待状态更新
            setTimeout(() => {
              const newState = useDatabaseProjectStore.getState();
              setAppDebug(`自动选择完成: ${newState.currentProject?.name || '失败'}`);
            }, 100);
          } else if (storeState.currentProject) {
            setAppDebug(`已有选中项目: ${storeState.currentProject.name}`);
          } else {
            setAppDebug('没有可用的项目');
          }
        } catch (error) {
          setAppDebug(`初始化失败: ${error.message}`);
        }
      };

      simulateAppInitialization();
    };

    updateDebugInfo();

    // 定期更新调试信息
    const interval = setInterval(updateDebugInfo, 2000);

    return () => clearInterval(interval);
  }, [projects, currentProject, isLoading, error]);

  const handleManualSelect = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      console.log(`手动选择项目: ${project.name} (${projectId})`);
      setCurrentProject(projectId);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">主页项目选择诊断</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 调试信息 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">调试信息</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-700 mb-2">实时状态:</h3>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto whitespace-pre-wrap">
                  {debugInfo}
                </pre>
              </div>

              <div>
                <h3 className="font-medium text-gray-700 mb-2">App初始化模拟:</h3>
                <pre className="bg-blue-50 p-4 rounded text-sm overflow-auto whitespace-pre-wrap text-blue-800">
                  {appDebug}
                </pre>
              </div>
            </div>
          </div>

          {/* 测试控制 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">测试控制</h2>
            <div className="space-y-4">
              {/* 项目选择器 */}
              <div>
                <h3 className="font-medium text-gray-700 mb-2">ProjectSelector 组件:</h3>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <ProjectSelector />
                </div>
              </div>

              {/* 手动选择按钮 */}
              <div>
                <h3 className="font-medium text-gray-700 mb-2">手动选择项目:</h3>
                <div className="grid grid-cols-2 gap-2">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => handleManualSelect(project.id)}
                      className={`px-3 py-2 text-sm rounded transition-colors ${
                        currentProject?.id === project.id
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 hover:bg-gray-300'
                      }`}
                    >
                      {project.name}
                      {currentProject?.id === project.id && ' ✓'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 操作按钮 */}
              <div>
                <h3 className="font-medium text-gray-700 mb-2">操作:</h3>
                <div className="space-x-2">
                  <button
                    onClick={async () => {
                      console.log('手动重新加载项目...');
                      await loadProjects();
                      console.log('重新加载完成');
                    }}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    重新加载项目
                  </button>

                  <button
                    onClick={() => {
                      const state = useDatabaseProjectStore.getState();
                      console.log('当前Store状态:', state);
                      alert('状态已输出到控制台');
                    }}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    输出状态到控制台
                  </button>

                  {currentProject && (
                    <button
                    onClick={() => {
                      console.log('清除当前选中项目');
                      useDatabaseProjectStore.getState().setCurrentProject(null);
                    }}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      清除选中项目
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 状态指示器 */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">系统状态</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded ${isLoading ? 'bg-yellow-100' : 'bg-green-100'}`}>
              <div className="font-medium">加载状态</div>
              <div className="text-sm text-gray-600">
                {isLoading ? '正在加载...' : '加载完成'}
              </div>
            </div>

            <div className={`p-4 rounded ${error ? 'bg-red-100' : 'bg-green-100'}`}>
              <div className="font-medium">错误状态</div>
              <div className="text-sm text-gray-600">
                {error ? '有错误' : '无错误'}
              </div>
            </div>

            <div className={`p-4 rounded ${currentProject ? 'bg-green-100' : 'bg-yellow-100'}`}>
              <div className="font-medium">选中状态</div>
              <div className="text-sm text-gray-600">
                {currentProject ? `已选中: ${currentProject.name}` : '未选中项目'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}