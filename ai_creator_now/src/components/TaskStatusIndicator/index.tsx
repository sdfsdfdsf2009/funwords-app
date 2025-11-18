'use client';

import React, { useState } from 'react';
import { useTaskStatusMonitor } from '../../hooks/useTaskStatusMonitor';

interface TaskStatusIndicatorProps {
  compact?: boolean;
  showDetails?: boolean;
  onClick?: () => void;
}

export default function TaskStatusIndicator({
  compact = false,
  showDetails = false,
  onClick
}: TaskStatusIndicatorProps) {
  const {
    getTaskCounts,
    getActiveTasks,
    getRecentCompletedTasks,
    getRecentFailedTasks
  } = useTaskStatusMonitor();

  const [isExpanded, setIsExpanded] = useState(showDetails);

  const counts = getTaskCounts();
  const activeTasks = getActiveTasks();
  const recentCompleted = getRecentCompletedTasks();
  const recentFailed = getRecentFailedTasks();

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        {/* Active tasks indicator */}
        {counts.processing > 0 && (
          <div className="flex items-center space-x-1 text-blue-600">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
            <span className="text-xs font-medium">{counts.processing}</span>
          </div>
        )}

        {/* Completed tasks indicator */}
        {counts.completed > 0 && (
          <div className="flex items-center space-x-1 text-green-600">
            <div className="w-2 h-2 bg-green-600 rounded-full" />
            <span className="text-xs font-medium">{counts.completed}</span>
          </div>
        )}

        {/* Failed tasks indicator */}
        {counts.failed > 0 && (
          <div className="flex items-center space-x-1 text-red-600">
            <div className="w-2 h-2 bg-red-600 rounded-full" />
            <span className="text-xs font-medium">{counts.failed}</span>
          </div>
        )}

        {/* Click handler */}
        {onClick && (
          <button
            onClick={onClick}
            className="text-xs text-gray-500 hover:text-gray-700 ml-2"
          >
            查看详情
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200">
      {/* Header */}
      <div
        className="p-3 border-b border-gray-200 cursor-pointer hover:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h4 className="text-sm font-semibold text-gray-800">任务状态</h4>
            {activeTasks.length > 0 && (
              <span className="text-xs text-blue-600 font-medium">
                ({activeTasks.length} 个活跃任务)
              </span>
            )}
          </div>
          <span className="text-gray-400">
            {isExpanded ? '▼' : '▶'}
          </span>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center space-x-3 mt-2">
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${counts.processing > 0 ? 'bg-blue-600 animate-pulse' : 'bg-gray-300'}`} />
            <span className="text-xs text-gray-600">运行中: {counts.processing}</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${counts.completed > 0 ? 'bg-green-600' : 'bg-gray-300'}`} />
            <span className="text-xs text-gray-600">已完成: {counts.completed}</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${counts.failed > 0 ? 'bg-red-600' : 'bg-gray-300'}`} />
            <span className="text-xs text-gray-600">失败: {counts.failed}</span>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="p-3">
          {/* Active Tasks */}
          {activeTasks.length > 0 && (
            <div className="mb-4">
              <h5 className="text-xs font-semibold text-gray-700 mb-2">活跃任务</h5>
              <div className="space-y-2">
                {activeTasks.slice(0, 3).map(task => (
                  <div key={task.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
                      <span className="text-gray-600 truncate max-w-32">
                        {task.type === 'image' ? '🖼️' : '🎬'} {task.prompt || '无提示词'}
                      </span>
                    </div>
                    <span className="text-blue-600 font-medium">
                      {task.progress}%
                    </span>
                  </div>
                ))}
                {activeTasks.length > 3 && (
                  <div className="text-xs text-gray-500 text-center">
                    还有 {activeTasks.length - 3} 个任务...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recent Completed */}
          {recentCompleted.length > 0 && (
            <div className="mb-4">
              <h5 className="text-xs font-semibold text-gray-700 mb-2">最近完成</h5>
              <div className="space-y-1">
                {recentCompleted.slice(0, 2).map(task => (
                  <div key={task.id} className="flex items-center space-x-2 text-xs">
                    <div className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                    <span className="text-gray-600 truncate max-w-32">
                      {task.type === 'image' ? '🖼️' : '🎬'} {task.prompt || '无提示词'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Failed */}
          {recentFailed.length > 0 && (
            <div className="mb-4">
              <h5 className="text-xs font-semibold text-gray-700 mb-2">最近失败</h5>
              <div className="space-y-1">
                {recentFailed.slice(0, 2).map(task => (
                  <div key={task.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-red-600 rounded-full" />
                      <span className="text-gray-600 truncate max-w-32">
                        {task.type === 'image' ? '🖼️' : '🎬'} {task.prompt || '无提示词'}
                      </span>
                    </div>
                    <span className="text-red-600 text-xs">
                      {task.error ? '错误' : '失败'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Tasks */}
          {counts.total === 0 && (
            <div className="text-center text-gray-500 py-4">
              <div className="text-2xl mb-1">📝</div>
              <p className="text-xs">暂无任务</p>
            </div>
          )}

          {/* View All Button */}
          {onClick && counts.total > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              className="w-full mt-3 text-xs text-blue-600 hover:text-blue-700 font-medium py-1 border border-blue-200 rounded hover:bg-blue-50 transition-colors"
            >
              查看全部任务
            </button>
          )}
        </div>
      )}
    </div>
  );
}