import React, { useState, useEffect } from 'react';
import { LazyCreativeGenerator } from '../src/components/ui/LazyLoader';
import { useDatabaseProjectStore } from '../src/stores/databaseProjectStore';

export default function TestCreativeGenerator() {
  const [mounted, setMounted] = useState(false);
  const { projects, fetchProjects, setCurrentProject, currentProject } = useDatabaseProjectStore();

  useEffect(() => {
    setMounted(true);
    // 初始化测试项目数据
    initializeTestData();
  }, []);

  const initializeTestData = async () => {
    try {
      // 获取项目列表
      await fetchProjects();

      // 如果没有项目，创建一个测试项目
      if (projects.length === 0) {
        console.log('🧪 创建测试项目...');
        // 这里可以调用创建项目的API
      } else {
        // 自动选择第一个项目用于测试
        const firstProject = projects[0];
        if (firstProject) {
          console.log('🧪 自动选择测试项目:', firstProject.name);
          await setCurrentProject(firstProject.id);
        }
      }
    } catch (error) {
      console.error('🧪 初始化测试数据失败:', error);
    }
  };

  const handleCreateTestProject = async () => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: '创意生成器测试项目',
          description: '用于测试AI创意构思生成器的功能',
          settings: {
            defaultVideoModel: 'gemini-2.5-pro',
            defaultImageModel: 'gemini-2.5-pro'
          }
        })
      });

      if (response.ok) {
        const newProject = await response.json();
        console.log('🧪 测试项目创建成功:', newProject.name);
        await fetchProjects(); // 刷新项目列表
        await setCurrentProject(newProject.id); // 选择新项目
      }
    } catch (error) {
      console.error('🧪 创建测试项目失败:', error);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 测试页面头部 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🧪 创意生成器测试页面</h1>
              <p className="text-gray-600 mt-1">测试EvoLink + Gemini 2.5 Pro集成的创意构思生成器</p>
            </div>
            <div className="flex items-center space-x-4">
              {currentProject ? (
                <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg">
                  <span className="font-medium">当前项目:</span> {currentProject.name}
                </div>
              ) : (
                <button
                  onClick={handleCreateTestProject}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  创建测试项目
                </button>
              )}
              <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg">
                <span className="font-medium">项目数:</span> {projects.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 测试信息面板 */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">📋 测试说明</h2>
          <div className="text-blue-800 space-y-1">
            <p>• 这个页面用于测试创意生成器的完整功能</p>
            <p>• 支持预制系统提示词管理和实时交互</p>
            <p>• 可以测试EvoLink API集成和CSV导入功能</p>
            <p>• 如果没有项目，请先创建测试项目</p>
          </div>
        </div>

        {/* 创意生成器组件 */}
        <LazyCreativeGenerator />
      </div>

      {/* 调试信息面板 */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">🔧 调试信息</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-600">当前项目ID:</span>
              <span className="ml-2 text-gray-900">{currentProject?.id || '未选择'}</span>
            </div>
            <div>
              <span className="font-medium text-gray-600">API状态:</span>
              <span className="ml-2 text-green-600">就绪</span>
            </div>
            <div>
              <span className="font-medium text-gray-600">环境:</span>
              <span className="ml-2 text-gray-900">{process.env.NODE_ENV}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}