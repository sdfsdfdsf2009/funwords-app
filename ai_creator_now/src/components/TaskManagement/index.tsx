'use client';

import React, { useState, useEffect } from 'react';
import { useAPIConfigStore } from '../../stores/apiConfigStore';
import { APIGenerationResult, GenerationProgress } from '../../types';
import { logger } from '../../utils/logger';

interface TaskInfo extends APIGenerationResult {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  estimatedTime?: number;
  sceneId?: string;
  sceneNumber?: number;
}

export default function TaskManagement() {
  const {
    activeGenerations,
    generationHistory,
    configurations
  } = useAPIConfigStore();

  const [tasks, setTasks] = useState<TaskInfo[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'processing' | 'completed' | 'failed'>('all');
  const [sortBy, setSortBy] = useState<'time' | 'status' | 'type'>('time');
  const [isExpanded, setIsExpanded] = useState(false);

  // Process tasks from both active generations and history
  useEffect(() => {
    const processTasks = () => {
      const taskList: TaskInfo[] = [];

      // Process active generations (current tasks)
      Object.entries(activeGenerations).forEach(([taskId, request]) => {
        const config = configurations.find(c => c.id === request.configId);
        taskList.push({
          id: taskId,
          configId: request.configId,
          parameters: request.parameters,
          response: null,
          parsedData: { status: 'processing' },
          success: false,
          generationTime: 0,
          createdAt: new Date(),
          status: 'processing',
          progress: 0,
          sceneId: request.sceneId,
          type: request.type
        } as TaskInfo);
      });

      // Process generation history
      generationHistory.forEach(result => {
        let status: TaskInfo['status'] = 'completed';
        if (!result.success) {
          status = 'failed';
        } else if (result.parsedData.status === 'processing') {
          status = 'processing';
        } else if (result.parsedData.status === 'pending') {
          status = 'pending';
        }

        taskList.push({
          ...result,
          status,
          progress: status === 'completed' ? 100 : status === 'failed' ? 0 : 50,
          type: result.parsedData.imageUrl ? 'image' : 'video'
        } as TaskInfo);
      });

      // Sort tasks
      const sortedTasks = taskList.sort((a, b) => {
        switch (sortBy) {
          case 'time':
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          case 'status':
            const statusOrder = { 'processing': 0, 'pending': 1, 'completed': 2, 'failed': 3 };
            return statusOrder[a.status] - statusOrder[b.status];
          case 'type':
            return a.type.localeCompare(b.type);
          default:
            return 0;
        }
      });

      setTasks(sortedTasks);
    };

    processTasks();
  }, [activeGenerations, generationHistory, configurations, sortBy]);

  // Filter tasks based on selected filter
  const filteredTasks = tasks.filter(task =>
    filter === 'all' || task.status === filter
  );

  // Get status color and icon
  const getStatusInfo = (status: TaskInfo['status']) => {
    switch (status) {
      case 'pending':
        return { color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: '⏳', label: '已提交' };
      case 'processing':
        return { color: 'text-blue-600', bgColor: 'bg-blue-100', icon: '🔄', label: '运行中' };
      case 'completed':
        return { color: 'text-green-600', bgColor: 'bg-green-100', icon: '✅', label: '已完成' };
      case 'failed':
        return { color: 'text-red-600', bgColor: 'bg-red-100', icon: '❌', label: '失败' };
      default:
        return { color: 'text-gray-600', bgColor: 'bg-gray-100', icon: '❓', label: '未知' };
    }
  };

  // Get type icon
  const getTypeIcon = (type: 'image' | 'video') => {
    return type === 'image' ? '🖼️' : '🎬';
  };

  // Get config name
  const getConfigName = (configId: string) => {
    const config = configurations.find(c => c.id === configId);
    return config?.name || '未知配置';
  };

  // Format time
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}天前`;
    if (hours > 0) return `${hours}小时前`;
    if (minutes > 0) return `${minutes}分钟前`;
    return '刚刚';
  };

  // Get task counts
  const taskCounts = {
    all: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    processing: tasks.filter(t => t.status === 'processing').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    failed: tasks.filter(t => t.status === 'failed').length
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-semibold text-gray-800">任务管理</h3>
            <span className="text-sm text-gray-500">({taskCounts.all} 个任务)</span>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>

        {/* Task Stats */}
        <div className="grid grid-cols-4 gap-2 mt-3">
          {Object.entries(taskCounts).filter(([key]) => key !== 'all').map(([status, count]) => {
            const statusInfo = getStatusInfo(status as TaskInfo['status']);
            return (
              <div
                key={status}
                className={`${statusInfo.bgColor} ${statusInfo.color} px-2 py-1 rounded text-xs flex items-center justify-between cursor-pointer hover:opacity-80`}
                onClick={() => setFilter(status as typeof filter)}
              >
                <span>{statusInfo.icon}</span>
                <span>{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Filters and Sort */}
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-wrap gap-2">
              {/* Filter */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">筛选:</span>
                <div className="flex gap-1">
                  {(['all', 'pending', 'processing', 'completed', 'failed'] as const).map(status => {
                    const isActive = filter === status;
                    const statusInfo = getStatusInfo(status as TaskInfo['status']);
                    return (
                      <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                          isActive
                            ? `${statusInfo.bgColor} ${statusInfo.color}`
                            : 'text-gray-600 bg-white hover:bg-gray-100'
                        }`}
                      >
                        {status === 'all' ? '全部' : statusInfo.label}
                        {taskCounts[status] > 0 && ` (${taskCounts[status]})`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sort */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">排序:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="time">时间</option>
                  <option value="status">状态</option>
                  <option value="type">类型</option>
                </select>
              </div>
            </div>
          </div>

          {/* Task List */}
          <div className="max-h-96 overflow-y-auto">
            {filteredTasks.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="text-4xl mb-2">📝</div>
                <p>暂无任务</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredTasks.map(task => {
                  const statusInfo = getStatusInfo(task.status);
                  const configName = getConfigName(task.configId);
                  const prompt = task.parameters.prompt || task.parameters.input || '无提示词';

                  return (
                    <div key={task.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        {/* Main Info */}
                        <div className="flex items-start space-x-3 flex-1">
                          {/* Status Icon */}
                          <div className={`w-8 h-8 ${statusInfo.bgColor} ${statusInfo.color} rounded-full flex items-center justify-center flex-shrink-0`}>
                            <span className="text-sm">{statusInfo.icon}</span>
                          </div>

                          {/* Task Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-sm font-medium text-gray-900">
                                {getTypeIcon(task.type)} {task.type === 'image' ? '图像生成' : '视频生成'}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
                                {statusInfo.label}
                              </span>
                            </div>

                            <div className="text-sm text-gray-600 mb-1">
                              <p className="truncate" title={prompt}>
                                {prompt}
                              </p>
                            </div>

                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span>配置: {configName}</span>
                              <span>{formatTime(task.createdAt)}</span>
                              {task.generationTime > 0 && (
                                <span>耗时: {(task.generationTime / 1000).toFixed(1)}s</span>
                              )}
                            </div>

                            {/* Progress Bar for Processing Tasks */}
                            {task.status === 'processing' && (
                              <div className="mt-2">
                                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                  <span>处理中...</span>
                                  <span>{task.progress || 0}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                  <div
                                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                                    style={{ width: `${task.progress || 0}%` }}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Error Message for Failed Tasks */}
                            {task.status === 'failed' && task.error && (
                              <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                                错误: {task.error}
                              </div>
                            )}

                            {/* Result Preview for Completed Tasks */}
                            {task.status === 'completed' && task.parsedData.imageUrl && (
                              <div className="mt-2">
                                <img
                                  src={task.parsedData.imageUrl}
                                  alt="Generated result"
                                  className="w-16 h-16 object-cover rounded border border-gray-200"
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-1 ml-2">
                          {task.status === 'completed' && task.parsedData.imageUrl && (
                            <button
                              onClick={() => window.open(task.parsedData.imageUrl, '_blank')}
                              className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                              title="查看原图"
                            >
                              🔗
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}