import React, { memo } from 'react';
import {
  ProgressContainer,
  VideoTask,
  VideoTaskStatus
} from './ProgressContainer';
import { ChevronDown, ChevronUp, RotateCw } from 'lucide-react';

interface VideoGenerationProgressProps {
  tasks: VideoTask[];
  taskConfigs: Map<string, any>;
  onTasksChange: () => void;
  onToggleVisibility: () => void;
}

export const VideoGenerationProgress: React.FC<VideoGenerationProgressProps> = memo(({
  tasks,
  taskConfigs,
  onTasksChange,
  onToggleVisibility
}) => {
  const [isExpanded, setIsExpanded] = React.useState(true);

  // 过滤出正在进行的任务
  const activeTasks = tasks.filter(task =>
    task.status === 'pending' || task.status === 'processing' || task.status === 'failed'
  );

  const completedTasks = tasks.filter(task => task.status === 'completed');

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <RotateCw className="w-5 h-5 text-orange-500" />
          <h3 className="font-medium">任务进度</h3>
          {activeTasks.length > 0 && (
            <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
              {activeTasks.length} 进行中
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {completedTasks.length > 0 && (
            <span className="text-sm text-green-600">
              {completedTasks.length} 已完成
            </span>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-500">{tasks.length}</div>
          <div className="text-xs text-gray-500">总任务</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-500">{activeTasks.length}</div>
          <div className="text-xs text-gray-500">进行中</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-500">{completedTasks.length}</div>
          <div className="text-xs text-gray-500">已完成</div>
        </div>
      </div>

      {/* 进度列表 */}
      {isExpanded && (
        <div className="space-y-3">
          {tasks.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              <RotateCw className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>暂无任务</p>
            </div>
          ) : (
            <ProgressContainer
              tasks={tasks}
              taskConfigs={taskConfigs}
              onTasksChange={onTasksChange}
              maxHeight={300} // 限制最大高度
            />
          )}
        </div>
      )}

      {/* 快速操作 */}
      {tasks.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-500">
              最后更新: {new Date().toLocaleTimeString()}
            </div>

            <div className="flex gap-2">
              {activeTasks.length > 0 && (
                <button
                  onClick={() => window.location.reload()}
                  className="text-xs text-blue-500 hover:text-blue-700 transition-colors"
                >
                  刷新状态
                </button>
              )}

              <button
                onClick={onToggleVisibility}
                className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                隐藏面板
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

VideoGenerationProgress.displayName = 'VideoGenerationProgress';