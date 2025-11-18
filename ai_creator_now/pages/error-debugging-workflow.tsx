/**
 * 错误调试工作流演示页面
 * 展示完整的错误调试、修复和验证流程
 */

import React, { useState, useEffect } from 'react';
import { errorMonitor } from '../src/utils/errorMonitor';
import { errorDebuggingWorkflow, ErrorPriority, ErrorCategory } from '../src/utils/errorDebuggingWorkflow';
import { errorWorkflowController, WorkflowEventType } from '../src/utils/errorWorkflowController';
import { debugExpert } from '../src/utils/debugExpert';
import { developmentExpert } from '../src/utils/developmentExpert';
import { testingExpert } from '../src/utils/testingExpert';
import WorkflowStatusTracker from '../src/components/debug/WorkflowStatusTracker';

const ErrorDebuggingWorkflowDemo: React.FC = () => {
  const [isControllerRunning, setIsControllerRunning] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [showDemoPanel, setShowDemoPanel] = useState(false);

  // 模拟错误类型
  const demoErrors = [
    {
      title: 'API认证失败',
      type: 'api',
      message: 'API request failed with status 401: Unauthorized',
      priority: ErrorPriority.HIGH,
      category: ErrorCategory.API_ERROR
    },
    {
      title: 'React组件崩溃',
      type: 'react',
      message: 'Cannot read property \'name\' of undefined',
      priority: ErrorPriority.CRITICAL,
      category: ErrorCategory.UI_ERROR
    },
    {
      title: '状态管理错误',
      type: 'state',
      message: 'Cannot update project store: invalid state transition',
      priority: ErrorPriority.MEDIUM,
      category: ErrorCategory.LOGIC_ERROR
    },
    {
      title: '网络连接超时',
      type: 'network',
      message: 'Request timeout: Failed to fetch data from server',
      priority: ErrorPriority.MEDIUM,
      category: ErrorCategory.SYSTEM_ERROR
    },
    {
      title: '视频生成失败',
      type: 'processing',
      message: 'Video generation failed: processing timeout after 2 minutes',
      priority: ErrorPriority.HIGH,
      category: ErrorCategory.PERFORMANCE_ERROR
    }
  ];

  // 初始化
  useEffect(() => {
    // 添加事件监听器
    const handleWorkflowEvent = (event: any) => {
      setEvents(prev => [event, ...prev.slice(0, 9)]); // 保留最新10个事件
    };

    Object.values(WorkflowEventType).forEach(eventType => {
      errorWorkflowController.addEventListener(eventType as WorkflowEventType, handleWorkflowEvent);
    });

    // 定期更新统计信息
    const statsInterval = setInterval(() => {
      setStats(errorWorkflowController.getWorkflowStats());
    }, 2000);

    return () => {
      // 清理事件监听器
      Object.values(WorkflowEventType).forEach(eventType => {
        errorWorkflowController.removeEventListener(eventType as WorkflowEventType, handleWorkflowEvent);
      });
      clearInterval(statsInterval);
    };
  }, []);

  // 启动/停止控制器
  const toggleController = () => {
    if (isControllerRunning) {
      errorWorkflowController.stop();
      setIsControllerRunning(false);
    } else {
      errorWorkflowController.start();
      setIsControllerRunning(true);
      (errorWorkflowController as any).startTime = Date.now();
    }
  };

  // 触发模拟错误
  const triggerDemoError = (errorType: any) => {
    const errorInfo = {
      id: `demo-${Date.now()}`,
      timestamp: new Date(),
      type: errorType.type,
      message: errorType.message,
      source: 'demo-page',
      component: 'ErrorDebuggingWorkflowDemo',
      userAgent: navigator.userAgent,
      url: window.location.href,
      sessionId: `demo-session-${Date.now()}`,
      context: {
        demo: true,
        priority: errorType.priority,
        category: errorType.category,
        frequency: 1
      }
    };

    // 记录错误并触发工作流
    errorMonitor.logError(errorInfo);
    errorWorkflowController.triggerWorkflow(errorInfo);
  };

  // 清除所有数据
  const clearAllData = () => {
    if (confirm('确定要清除所有工作流数据吗？这将删除所有任务和报告。')) {
      localStorage.removeItem('error-debugging-workflow');
      errorMonitor.clearErrors();
      setEvents([]);
      setStats(null);
      setSelectedTask(null);
      alert('所有数据已清除');
    }
  };

  // 导出工作流报告
  const exportWorkflowReport = () => {
    const report = errorDebuggingWorkflow.generateWorkflowReport();
    const blob = new Blob([report], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-workflow-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 专家信息
  const expertInfo = [
    {
      name: '调试专家',
      description: '负责错误诊断和根因分析',
      icon: '🔍',
      specialties: ['JavaScript错误分析', 'React错误诊断', 'API错误调试', '性能问题分析']
    },
    {
      name: '开发专家',
      description: '负责错误修复和代码实现',
      icon: '👨‍💻',
      specialties: ['React组件开发', 'TypeScript开发', 'API接口开发', '状态管理']
    },
    {
      name: '测试专家',
      description: '负责修复验证和质量保证',
      icon: '🧪',
      specialties: ['单元测试', '集成测试', '性能测试', '回归测试']
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  🔧 错误调试工作流系统
                </h1>
                <p className="mt-2 text-gray-600">
                  智能化的错误诊断、修复和验证工作流 - 由调试专家、开发专家和测试专家协作完成
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowDemoPanel(!showDemoPanel)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {showDemoPanel ? '隐藏' : '显示'}演示面板
                </button>
                <button
                  onClick={toggleController}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    isControllerRunning
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {isControllerRunning ? '⏸️ 停止系统' : '▶️ 启动系统'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 系统状态 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-full">
                  <span className="text-2xl">🔄</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">活跃任务</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeTasks}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-full">
                  <span className="text-2xl">✅</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">已完成</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.completedTasks}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 bg-red-100 rounded-full">
                  <span className="text-2xl">❌</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">失败任务</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.failedTasks}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-full">
                  <span className="text-2xl">📊</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">成功率</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.successRate}%</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：工作流状态 */}
          <div className="lg:col-span-2">
            <WorkflowStatusTracker
              onErrorSelect={setSelectedTask}
              showCompleted={false}
              maxItems={15}
            />
          </div>

          {/* 右侧：专家信息和事件日志 */}
          <div className="space-y-6">
            {/* 专家团队 */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900">👥 专家团队</h3>
              </div>
              <div className="p-6 space-y-4">
                {expertInfo.map((expert, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <span className="text-2xl">{expert.icon}</span>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{expert.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{expert.description}</p>
                      <div className="mt-2">
                        <div className="flex flex-wrap gap-1">
                          {expert.specialties.map((specialty, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                            >
                              {specialty}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 事件日志 */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">📝 事件日志</h3>
                <button
                  onClick={() => setEvents([])}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  清除
                </button>
              </div>
              <div className="p-6 max-h-96 overflow-y-auto">
                {events.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">暂无事件</p>
                ) : (
                  <div className="space-y-3">
                    {events.map((event, index) => (
                      <div
                        key={index}
                        className="text-sm border-l-4 border-blue-500 pl-3 py-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900">
                            {event.type.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        {event.message && (
                          <p className="text-gray-600 mt-1">{event.message}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🎛️ 系统操作</h3>
              <div className="space-y-3">
                <button
                  onClick={exportWorkflowReport}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  📊 导出工作流报告
                </button>
                <button
                  onClick={clearAllData}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  🗑️ 清除所有数据
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 演示面板 */}
        {showDemoPanel && (
          <div className="mt-8 bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">🎭 演示面板</h3>
              <p className="text-sm text-gray-600 mt-1">
                触发不同类型的模拟错误来测试工作流系统
              </p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {demoErrors.map((error, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{error.title}</h4>
                      <span className={`px-2 py-1 text-xs rounded ${
                        error.priority === ErrorPriority.CRITICAL ? 'bg-red-100 text-red-800' :
                        error.priority === ErrorPriority.HIGH ? 'bg-orange-100 text-orange-800' :
                        error.priority === ErrorPriority.MEDIUM ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {error.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{error.message}</p>
                    <button
                      onClick={() => triggerDemoError(error)}
                      className="w-full px-3 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 transition-colors"
                    >
                      触发错误
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 任务详情 */}
        {selectedTask && (
          <div className="mt-8 bg-white rounded-lg shadow">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">📋 任务详情</h3>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">基本信息</h4>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">任务ID:</dt>
                      <dd className="text-sm font-medium">{selectedTask.id}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">状态:</dt>
                      <dd className="text-sm font-medium">{selectedTask.status}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">优先级:</dt>
                      <dd className="text-sm font-medium">{selectedTask.priority}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">分类:</dt>
                      <dd className="text-sm font-medium">{selectedTask.category}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">创建时间:</dt>
                      <dd className="text-sm font-medium">
                        {selectedTask.createdAt.toLocaleString()}
                      </dd>
                    </div>
                  </dl>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">描述</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {selectedTask.description}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorDebuggingWorkflowDemo;