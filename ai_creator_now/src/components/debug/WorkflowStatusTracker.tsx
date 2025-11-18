/**
 * 工作流状态跟踪组件
 * 提供错误调试工作流的实时状态监控和界面
 */

import React, { useState, useEffect } from 'react';
import { errorDebuggingWorkflow, WorkflowTask, WorkflowStage, ErrorPriority, ErrorCategory } from '../../utils/errorDebuggingWorkflow';

interface WorkflowStatusTrackerProps {
  onErrorSelect?: (task: WorkflowTask) => void;
  showCompleted?: boolean;
  maxItems?: number;
}

interface WorkflowProgress {
  taskId: string;
  stages: WorkflowStage[];
  currentStage: WorkflowStage;
  completed: boolean;
  task: WorkflowTask;
}

const WorkflowStatusTracker: React.FC<WorkflowStatusTrackerProps> = ({
  onErrorSelect,
  showCompleted = false,
  maxItems = 10
}) => {
  const [workflows, setWorkflows] = useState<WorkflowProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [filter, setFilter] = useState<{
    priority?: ErrorPriority;
    category?: ErrorCategory;
    stage?: WorkflowStage;
  }>({});

  // 获取阶段显示信息
  const getStageInfo = (stage: WorkflowStage) => {
    const stageMap = {
      [WorkflowStage.INITIALIZED]: { label: '已初始化', color: 'bg-gray-100', icon: '🆕' },
      [WorkflowStage.DEBUG_ASSIGNED]: { label: '调试专家已分配', color: 'bg-blue-100', icon: '👨‍💻' },
      [WorkflowStage.DEBUG_IN_PROGRESS]: { label: '调试进行中', color: 'bg-blue-200', icon: '🔍' },
      [WorkflowStage.DEBUG_COMPLETED]: { label: '调试完成', color: 'bg-green-100', icon: '✅' },
      [WorkflowStage.DEVELOPMENT_ASSIGNED]: { label: '开发专家已分配', color: 'bg-purple-100', icon: '👨‍💻' },
      [WorkflowStage.DEVELOPMENT_IN_PROGRESS]: { label: '开发进行中', color: 'bg-purple-200', icon: '🔧' },
      [WorkflowStage.DEVELOPMENT_COMPLETED]: { label: '开发完成', color: 'bg-green-100', icon: '✅' },
      [WorkflowStage.TESTING_ASSIGNED]: { label: '测试专家已分配', color: 'bg-orange-100', icon: '👨‍💻' },
      [WorkflowStage.TESTING_IN_PROGRESS]: { label: '测试进行中', color: 'bg-orange-200', icon: '🧪' },
      [WorkflowStage.TESTING_COMPLETED]: { label: '测试完成', color: 'bg-green-100', icon: '✅' },
      [WorkflowStage.RESOLVED]: { label: '问题已解决', color: 'bg-green-200', icon: '🎉' },
      [WorkflowStage.FAILED]: { label: '处理失败', color: 'bg-red-100', icon: '❌' }
    };

    return stageMap[stage] || { label: '未知状态', color: 'bg-gray-100', icon: '❓' };
  };

  // 获取优先级显示信息
  const getPriorityInfo = (priority: ErrorPriority) => {
    const priorityMap = {
      [ErrorPriority.CRITICAL]: { label: '紧急', color: 'text-red-600 bg-red-50', icon: '🚨' },
      [ErrorPriority.HIGH]: { label: '高', color: 'text-orange-600 bg-orange-50', icon: '⚡' },
      [ErrorPriority.MEDIUM]: { label: '中', color: 'text-yellow-600 bg-yellow-50', icon: '⚠️' },
      [ErrorPriority.LOW]: { label: '低', color: 'text-blue-600 bg-blue-50', icon: 'ℹ️' }
    };

    return priorityMap[priority] || { label: '未知', color: 'text-gray-600 bg-gray-50', icon: '❓' };
  };

  // 获取分类显示信息
  const getCategoryInfo = (category: ErrorCategory) => {
    const categoryMap = {
      [ErrorCategory.SYSTEM_ERROR]: { label: '系统错误', icon: '💻' },
      [ErrorCategory.API_ERROR]: { label: 'API错误', icon: '🌐' },
      [ErrorCategory.UI_ERROR]: { label: 'UI错误', icon: '🖼️' },
      [ErrorCategory.LOGIC_ERROR]: { label: '逻辑错误', icon: '🧠' },
      [ErrorCategory.PERFORMANCE_ERROR]: { label: '性能错误', icon: '⚡' },
      [ErrorCategory.SECURITY_ERROR]: { label: '安全错误', icon: '🔒' },
      [ErrorCategory.DATA_ERROR]: { label: '数据错误', icon: '📊' },
      [ErrorCategory.CONFIGURATION_ERROR]: { label: '配置错误', icon: '⚙️' }
    };

    return categoryMap[category] || { label: '未知分类', icon: '❓' };
  };

  // 格式化时间
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 60) {
      return `${minutes} 分钟前`;
    } else if (hours < 24) {
      return `${hours} 小时前`;
    } else {
      return `${days} 天前`;
    }
  };

  // 计算进度百分比
  const calculateProgress = (stages: WorkflowStage[]) => {
    const totalStages = [
      WorkflowStage.INITIALIZED,
      WorkflowStage.DEBUG_ASSIGNED,
      WorkflowStage.DEBUG_IN_PROGRESS,
      WorkflowStage.DEBUG_COMPLETED,
      WorkflowStage.DEVELOPMENT_ASSIGNED,
      WorkflowStage.DEVELOPMENT_IN_PROGRESS,
      WorkflowStage.DEVELOPMENT_COMPLETED,
      WorkflowStage.TESTING_ASSIGNED,
      WorkflowStage.TESTING_IN_PROGRESS,
      WorkflowStage.TESTING_COMPLETED
    ];

    const currentStage = stages[stages.length - 1];
    const currentIndex = totalStages.indexOf(currentStage);
    return ((currentIndex + 1) / totalStages.length) * 100;
  };

  // 加载工作流数据
  const loadWorkflows = () => {
    setLoading(true);
    try {
      const tasks = showCompleted ?
        errorDebuggingWorkflow.getResolvedTasks() :
        errorDebuggingWorkflow.getActiveTasks();

      const workflowProgresses: WorkflowProgress[] = tasks.map(task => {
        const stages = errorDebuggingWorkflow.getWorkflowProgress(task.errorId);
        const currentStage = stages.length > 0 ? stages[stages.length - 1] : WorkflowStage.INITIALIZED;
        const completed = stages.includes(WorkflowStage.RESOLVED) || stages.includes(WorkflowStage.FAILED);

        return {
          taskId: task.id,
          stages,
          currentStage,
          completed,
          task
        };
      });

      // 应用过滤器
      let filteredWorkflows = workflowProgresses;

      if (filter.priority) {
        filteredWorkflows = filteredWorkflows.filter(w => w.task.priority === filter.priority);
      }

      if (filter.category) {
        filteredWorkflows = filteredWorkflows.filter(w => w.task.category === filter.category);
      }

      if (filter.stage) {
        filteredWorkflows = filteredWorkflows.filter(w => w.currentStage === filter.stage);
      }

      // 按优先级和时间排序
      filteredWorkflows.sort((a, b) => {
        const priorityOrder = {
          [ErrorPriority.CRITICAL]: 4,
          [ErrorPriority.HIGH]: 3,
          [ErrorPriority.MEDIUM]: 2,
          [ErrorPriority.LOW]: 1
        };

        const priorityDiff = priorityOrder[b.task.priority] - priorityOrder[a.task.priority];
        if (priorityDiff !== 0) return priorityDiff;

        return b.task.updatedAt.getTime() - a.task.updatedAt.getTime();
      });

      setWorkflows(filteredWorkflows.slice(0, maxItems));
    } catch (error) {
      console.error('[WorkflowStatusTracker] 加载工作流失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkflows();

    // 定期刷新数据
    const interval = setInterval(loadWorkflows, 30000); // 30秒刷新一次

    return () => clearInterval(interval);
  }, [showCompleted, maxItems, filter]);

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* 头部 */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            错误调试工作流
          </h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              {workflows.length} 个活跃任务
            </span>
            <button
              onClick={loadWorkflows}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              title="刷新"
            >
              🔄
            </button>
          </div>
        </div>

        {/* 过滤器 */}
        <div className="flex flex-wrap gap-2">
          <select
            value={filter.priority || ''}
            onChange={(e) => setFilter({ ...filter, priority: e.target.value as ErrorPriority || undefined })}
            className="px-3 py-1 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">所有优先级</option>
            <option value={ErrorPriority.CRITICAL}>紧急</option>
            <option value={ErrorPriority.HIGH}>高</option>
            <option value={ErrorPriority.MEDIUM}>中</option>
            <option value={ErrorPriority.LOW}>低</option>
          </select>

          <select
            value={filter.category || ''}
            onChange={(e) => setFilter({ ...filter, category: e.target.value as ErrorCategory || undefined })}
            className="px-3 py-1 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">所有分类</option>
            <option value={ErrorCategory.SYSTEM_ERROR}>系统错误</option>
            <option value={ErrorCategory.API_ERROR}>API错误</option>
            <option value={ErrorCategory.UI_ERROR}>UI错误</option>
            <option value={ErrorCategory.LOGIC_ERROR}>逻辑错误</option>
            <option value={ErrorCategory.PERFORMANCE_ERROR}>性能错误</option>
            <option value={ErrorCategory.SECURITY_ERROR}>安全错误</option>
            <option value={ErrorCategory.DATA_ERROR}>数据错误</option>
            <option value={ErrorCategory.CONFIGURATION_ERROR}>配置错误</option>
          </select>

          <button
            onClick={() => setFilter({})}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md"
          >
            清除过滤
          </button>
        </div>
      </div>

      {/* 工作流列表 */}
      <div className="divide-y">
        {workflows.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-2">🎉</div>
            <p>暂无活跃的调试任务</p>
          </div>
        ) : (
          workflows.map(workflow => {
            const stageInfo = getStageInfo(workflow.currentStage);
            const priorityInfo = getPriorityInfo(workflow.task.priority);
            const categoryInfo = getCategoryInfo(workflow.task.category);
            const progress = calculateProgress(workflow.stages);

            return (
              <div
                key={workflow.taskId}
                className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                  selectedWorkflow === workflow.taskId ? 'bg-blue-50' : ''
                }`}
                onClick={() => {
                  setSelectedWorkflow(workflow.taskId);
                  onErrorSelect?.(workflow.task);
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${priorityInfo.color}`}>
                        {priorityInfo.icon} {priorityInfo.label}
                      </span>
                      <span className="text-sm text-gray-500">
                        {categoryInfo.icon} {categoryInfo.label}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded ${stageInfo.color}`}>
                        {stageInfo.icon} {stageInfo.label}
                      </span>
                    </div>
                    <h3 className="font-medium text-gray-900 truncate">
                      {workflow.task.title}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {workflow.task.description}
                    </p>
                  </div>
                  <div className="ml-4 text-right">
                    <div className="text-sm text-gray-500">
                      {formatTime(workflow.task.updatedAt)}
                    </div>
                    {workflow.task.assignedTo && (
                      <div className="text-xs text-gray-400 mt-1">
                        负责人: {workflow.task.assignedTo}
                      </div>
                    )}
                  </div>
                </div>

                {/* 进度条 */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>处理进度</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        workflow.completed ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>

                {/* 阶段指示器 */}
                <div className="flex items-center justify-between mt-3 text-xs">
                  <div className="flex space-x-1">
                    {workflow.stages.slice(-3).map((stage, index) => {
                      const info = getStageInfo(stage);
                      return (
                        <span
                          key={index}
                          className={`px-2 py-1 rounded ${info.color}`}
                          title={info.label}
                        >
                          {info.icon}
                        </span>
                      );
                    })}
                  </div>
                  {workflow.task.estimatedDuration && (
                    <span className="text-gray-500">
                      预估: {workflow.task.estimatedDuration} 分钟
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 底部操作 */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              const report = errorDebuggingWorkflow.generateWorkflowReport();
              const blob = new Blob([report], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `workflow-report-${new Date().toISOString().split('T')[0]}.json`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            📊 导出工作流报告
          </button>
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            {showCompleted ? '显示活跃任务' : '显示已完成任务'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkflowStatusTracker;