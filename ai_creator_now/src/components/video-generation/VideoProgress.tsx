import React, { memo, useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RotateCw,
  X,
  Eye,
  Download,
  Trash2,
  Info
} from 'lucide-react';
import { ErrorDetailModal } from './ErrorDetailModal';

// 视频任务状态类型
export type VideoTaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

// 视频任务接口
export interface VideoTask {
  id: string;
  originalApiId?: string; // 原始API返回的ID，用于轮询状态
  prompt: string;
  status: VideoTaskStatus;
  progress: number;
  model?: string;
  estimatedTime?: number;
  createdAt: Date;
  completedAt?: Date;
  errorMessage?: string;
  errorCode?: string;
  errorDetails?: any; // 详细的错误对象
  videoUrl?: string;
  config?: any;
  sourceImageId?: string; // 源图片ID，用于批量处理时追踪
  sceneId?: string; // 场景ID，用于批量处理时追踪
}

// VideoProgress 组件属性
interface VideoProgressProps {
  task: VideoTask;
  onCancel?: (taskId: string) => void;
  onRetry?: (task: VideoTask) => void;
  onView?: (task: VideoTask) => void;
  onDownload?: (task: VideoTask) => void;
  onDelete?: (taskId: string) => void;
  expanded?: boolean;
}

// 状态显示映射
const statusDisplay = {
  pending: {
    icon: Clock,
    text: '等待处理...',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200'
  },
  processing: {
    icon: RotateCw,
    text: '正在生成视频...',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  completed: {
    icon: CheckCircle,
    text: '视频生成完成',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  failed: {
    icon: XCircle,
    text: '生成失败',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  }
};

// 估算剩余时间
const estimateRemainingTime = (progress: number, estimatedTotalTime?: number): string => {
  if (!estimatedTotalTime || progress <= 0) return '计算中...';

  const remainingTime = Math.round((estimatedTotalTime * (100 - progress)) / progress / 60);
  if (remainingTime < 1) return '少于1分钟';
  if (remainingTime < 60) return `约${remainingTime}分钟`;

  const hours = Math.floor(remainingTime / 60);
  const minutes = remainingTime % 60;
  return `约${hours}小时${minutes > 0 ? minutes + '分钟' : ''}`;
};

// VideoProgress 组件
export const VideoProgress = memo<VideoProgressProps>(({
  task,
  onCancel,
  onRetry,
  onView,
  onDownload,
  onDelete,
  expanded = false
}) => {
  const [isExpanded, setIsExpanded] = useState(expanded);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);

  const statusInfo = statusDisplay[task.status];
  const StatusIcon = statusInfo.icon;

  // 进度条颜色
  const getProgressColor = () => {
    switch (task.status) {
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'processing': return 'bg-blue-500';
      default: return 'bg-yellow-500';
    }
  };

  // 动画效果
  useEffect(() => {
    if (task.status === 'completed' && !isAnimating) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 1000);
    }
  }, [task.status, isAnimating]);

  return (
    <div className={`border rounded-lg p-4 mb-3 transition-all duration-300 ${
      statusInfo.bgColor
    } ${statusInfo.borderColor} ${
      isAnimating ? 'ring-2 ring-green-400 ring-opacity-50' : ''
    }`}>
      {/* 任务头部 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <StatusIcon className={`w-5 h-5 ${statusInfo.color} flex-shrink-0`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {task.prompt || '视频生成任务'}
            </p>
            <p className={`text-xs ${statusInfo.color}`}>
              {statusInfo.text}
            </p>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          {task.status === 'processing' && onCancel && (
            <button
              onClick={() => onCancel(task.id)}
              className="p-1 text-gray-500 hover:text-red-600 transition-colors"
              title="取消任务"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {task.status === 'failed' && (
            <>
              <button
                onClick={() => setShowErrorModal(true)}
                className="p-1 text-gray-500 hover:text-orange-600 transition-colors"
                title="查看错误详情"
              >
                <Info className="w-4 h-4" />
              </button>
              {onRetry && (
                <button
                  onClick={() => onRetry(task)}
                  className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                  title="重试"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              )}
            </>
          )}

          {task.status === 'completed' && (
            <>
              {onView && (
                <button
                  onClick={() => onView(task)}
                  className="p-1 text-gray-500 hover:text-green-600 transition-colors"
                  title="播放视频"
                >
                  <Eye className="w-4 h-4" />
                </button>
              )}
              {onDownload && (
                <button
                  onClick={() => onDownload(task)}
                  className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                  title="下载视频"
                >
                  <Download className="w-4 h-4" />
                </button>
              )}
            </>
          )}

          {onDelete && (
            <button
              onClick={() => onDelete(task.id)}
              className="p-1 text-gray-500 hover:text-red-600 transition-colors"
              title="删除任务"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
            title={isExpanded ? '收起详情' : '展开详情'}
          >
            <div className={`w-4 h-4 transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`}>
              ▼
            </div>
          </button>
        </div>
      </div>

      {/* 进度条 */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-600">
            进度: {task.progress}%
          </span>
          {task.status === 'processing' && task.estimatedTime && (
            <span className="text-xs text-gray-600">
              剩余时间: {estimateRemainingTime(task.progress, task.estimatedTime)}
            </span>
          )}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ease-out ${getProgressColor()}`}
            style={{ width: `${task.progress}%` }}
          >
            {task.progress > 10 && (
              <div className="h-full bg-white bg-opacity-30 animate-pulse"></div>
            )}
          </div>
        </div>
      </div>

      {/* 展开的详细信息 */}
      {isExpanded && (
        <div className="border-t pt-3 mt-3 space-y-2 text-xs text-gray-600">
          <div className="flex justify-between">
            <span>任务ID:</span>
            <span className="font-mono">{task.id}</span>
          </div>

          {task.model && (
            <div className="flex justify-between">
              <span>模型:</span>
              <span>{task.model}</span>
            </div>
          )}

          <div className="flex justify-between">
            <span>创建时间:</span>
            <span>{task.createdAt.toLocaleString()}</span>
          </div>

          {task.completedAt && (
            <div className="flex justify-between">
              <span>完成时间:</span>
              <span>{task.completedAt.toLocaleString()}</span>
            </div>
          )}

          {task.errorMessage && (
            <div className="text-red-600 bg-red-50 p-2 rounded border border-red-200">
              <div className="flex items-center space-x-1 mb-1">
                <AlertCircle className="w-3 h-3" />
                <span>错误信息:</span>
              </div>
              <p className="text-xs">{task.errorMessage}</p>
            </div>
          )}

          {task.videoUrl && (
            <div className="flex justify-between items-center">
              <span>视频链接:</span>
              <a
                href={task.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline truncate max-w-xs"
              >
                查看视频
              </a>
            </div>
          )}
        </div>
      )}

      {/* 错误详情模态框 */}
      <ErrorDetailModal
        error={task.errorMessage || '任务失败'}
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        onRetry={() => {
          setShowErrorModal(false);
          onRetry?.(task);
        }}
        taskInfo={{
          taskId: task.id,
          prompt: task.prompt,
          status: task.status,
          createdAt: task.createdAt,
          completedAt: task.completedAt,
          model: task.model,
          config: task.config
        }}
      />
    </div>
  );
});

VideoProgress.displayName = 'VideoProgress';