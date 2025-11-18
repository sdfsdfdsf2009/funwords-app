import React, { useState, useEffect } from 'react';
import { ProjectSelector } from '../src/components/project/ProjectSelector';
import { useDatabaseProjectStore } from '../src/stores/databaseProjectStore';

export default function TestProjectSelect() {
  const [debugInfo, setDebugInfo] = useState('');
  const { currentProject, projects, isLoading, error } = useDatabaseProjectStore();

  useEffect(() => {
    setDebugInfo(`
=== ProjectSelector Debug Info ===
Current Project: ${currentProject?.name || 'null'}
Projects Count: ${projects.length}
Projects: ${projects.map(p => p.name).join(', ')}
Is Loading: ${isLoading}
Error: ${error || 'null'}
Store State: ${JSON.stringify({
  hasCurrentProject: !!currentProject,
  projectsCount: projects.length,
  isLoading,
  hasError: !!error
}, null, 2)}
    `);
  }, [currentProject, projects, isLoading, error]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">项目选择器测试页面</h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">当前状态</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {debugInfo}
          </pre>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">项目选择器</h2>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
            <ProjectSelector />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mt-8">
          <h2 className="text-xl font-semibold mb-4">测试按钮</h2>
          <div className="space-y-4">
            <button
              onClick={() => {
                console.log('Current store state:', useDatabaseProjectStore.getState());
                alert('查看控制台输出');
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              输出Store状态到控制台
            </button>

            <button
              onClick={async () => {
                const state = useDatabaseProjectStore.getState();
                console.log('重新加载项目...');
                try {
                  await state.loadProjects();
                  console.log('项目重新加载完成');
                  alert('项目重新加载完成，查看控制台');
                } catch (error) {
                  console.error('项目重新加载失败:', error);
                  alert('项目重新加载失败，查看控制台');
                }
              }}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              重新加载项目
            </button>

            {projects.length > 0 && (
              <button
                onClick={() => {
                  const firstProject = projects[0];
                  console.log('手动选择项目:', firstProject.name);
                  useDatabaseProjectStore.getState().setCurrentProject(firstProject.id);
                  alert(`已选择项目: ${firstProject.name}`);
                }}
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                手动选择第一个项目
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}