import React, { memo, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { VideoProgress, VideoTask, VideoTaskStatus } from './VideoProgress';
import { Film, X, Settings, Bell } from 'lucide-react';

// ProgressContainer 组件属性
interface ProgressContainerProps {
  tasks: VideoTask[];
  onTaskComplete?: (task: VideoTask) => void;
  onTaskFailed?: (task: VideoTask) => void;
  onTaskCancel?: (taskId: string) => void;
  onTaskRetry?: (task: VideoTask) => void;
  onTaskView?: (task: VideoTask) => void;
  onTaskDownload?: (task: VideoTask) => void;
  onTaskDelete?: (taskId: string) => void;
  maxTasks?: number;
  showSettings?: boolean;
  enableNotifications?: boolean;
}

// 通知设置
interface NotificationSettings {
  enabled: boolean;
  onComplete: boolean;
  onFailed: boolean;
  sound: boolean;
}

// ProgressContainer 组件
export const ProgressContainer = memo<ProgressContainerProps>(({
  tasks,
  onTaskComplete,
  onTaskFailed,
  onTaskCancel,
  onTaskRetry,
  onTaskView,
  onTaskDownload,
  onTaskDelete,
  maxTasks = 20,
  showSettings = true,
  enableNotifications = true
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    enabled: enableNotifications,
    onComplete: true,
    onFailed: true,
    sound: true
  });
  const [filter, setFilter] = useState<VideoTaskStatus | 'all'>('all');
  const [notifiedTasks, setNotifiedTasks] = useState<Set<string>>(new Set());

  // 通知权限请求
  useEffect(() => {
    if (enableNotifications && notificationSettings.enabled && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, [enableNotifications, notificationSettings.enabled]);

  // 显示浏览器通知
  const showNotification = useCallback((title: string, body: string, status: VideoTaskStatus) => {
    if (!notificationSettings.enabled || !('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    // 检查是否应该为此状态显示通知
    if (status === 'completed' && !notificationSettings.onComplete) return;
    if (status === 'failed' && !notificationSettings.onFailed) return;

    const notification = new Notification(title, {
      body,
      tag: `video-task-${status}`,
      requireInteraction: status === 'failed'
    });

    // 播放声音通知
    if (notificationSettings.sound) {
      try {
        // 使用系统内置的声音或简单的beep
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = status === 'completed' ? 800 : 400;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.1;

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.2);
      } catch (error) {
        // 忽略音频播放错误
      }
    }

    // 自动关闭通知
    if (status !== 'failed') {
      setTimeout(() => notification.close(), 5000);
    }
  }, [notificationSettings]);

  // 使用ref跟踪已处理任务，避免无限循环
  const processedTasksRef = useRef<Set<string>>(new Set());

  // 监听任务状态变化 - 使用ref避免依赖循环
  useEffect(() => {
    const now = Date.now();
    const newTaskIds: string[] = [];

    tasks.forEach(task => {
      // 检查是否已经处理过这个任务
      if (processedTasksRef.current.has(task.id)) {
        return;
      }

      // 检查刚刚完成的任务
      if (task.status === 'completed' && task.completedAt) {
        const completedTime = new Date(task.completedAt).getTime();
        const timeDiff = now - completedTime;

        // 如果是在最近3秒内完成的，处理通知
        if (timeDiff < 3000) {
          newTaskIds.push(task.id);
          onTaskComplete?.(task);
        }
      }

      // 检查刚刚失败的任务
      if (task.status === 'failed') {
        newTaskIds.push(task.id);
        showNotification(
          '视频生成失败',
          `任务 "${task.prompt}" 生成失败，请重试`,
          'failed'
        );
        onTaskFailed?.(task);
      }
    });

    // 更新ref和state
    if (newTaskIds.length > 0) {
      processedTasksRef.current = new Set([...processedTasksRef.current, ...newTaskIds]);
      setNotifiedTasks(prev => {
        const newSet = new Set(prev);
        newTaskIds.forEach(id => newSet.add(id));
        return newSet;
      });
    }
  }, [tasks, onTaskComplete, onTaskFailed, showNotification]);

  // 过滤任务
  const filteredTasks = useMemo(() => {
    let filtered = tasks;

    if (filter !== 'all') {
      filtered = tasks.filter(task => task.status === filter);
    }

    // 按状态和创建时间排序
    return filtered.sort((a, b) => {
      // 处理中的任务优先
      if (a.status === 'processing' && b.status !== 'processing') return -1;
      if (b.status === 'processing' && a.status !== 'processing') return 1;

      // 然后按创建时间排序（最新的在前）
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }).slice(0, maxTasks);
  }, [tasks, filter, maxTasks]);

  // 统计各状态任务数量
  const taskStats = useMemo(() => {
    return tasks.reduce((stats, task) => {
      stats[task.status]++;
      stats.total++;
      return stats;
    }, { total: 0, pending: 0, processing: 0, completed: 0, failed: 0 } as Record<VideoTaskStatus | 'total', number>);
  }, [tasks]);

  // 清理已完成的任务
  const clearCompletedTasks = useCallback(() => {
    const completedTaskIds = tasks
      .filter(task => task.status === 'completed')
      .map(task => task.id);

    completedTaskIds.forEach(taskId => {
      onTaskDelete?.(taskId);
    });

    // 清理通知记录
    setNotifiedTasks(prev => {
      const newSet = new Set(prev);
      completedTaskIds.forEach(taskId => newSet.delete(taskId));
      return newSet;
    });
  }, [tasks, onTaskDelete]);

  // 如果没有任务且最小化状态，不显示
  if (tasks.length === 0 && isMinimized) {
    return null;
  }

  return (
    <div className={`fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border transition-all duration-300 ${
      isMinimized ? 'w-64' : 'w-96 max-h-96'
    }`}>
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-lg">
        <div className="flex items-center space-x-2">
          <Film className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">视频生成进度</h3>
          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
            {taskStats.processing > 0 ? `${taskStats.processing} 处理中` : taskStats.total}
          </span>
        </div>

        <div className="flex items-center space-x-1">
          {showSettings && (
            <button
              onClick={() => setShowSettingsPanel(!showSettingsPanel)}
              className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
              title="设置"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
            title={isMinimized ? '展开' : '最小化'}
          >
            <div className={`w-4 h-4 transition-transform duration-200 ${
              isMinimized ? 'rotate-180' : ''
            }`}>
              ▼
            </div>
          </button>
        </div>
      </div>

      {/* 设置面板 */}
      {showSettingsPanel && (
        <div className="p-4 border-b bg-gray-50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-700">通知</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notificationSettings.enabled}
                onChange={(e) => setNotificationSettings(prev => ({
                  ...prev,
                  enabled: e.target.checked
                }))}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {notificationSettings.enabled && (
            <div className="pl-6 space-y-2">
              <label className="flex items-center space-x-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={notificationSettings.onComplete}
                  onChange={(e) => setNotificationSettings(prev => ({
                    ...prev,
                    onComplete: e.target.checked
                  }))}
                  className="rounded border-gray-300"
                />
                <span>完成时通知</span>
              </label>
              <label className="flex items-center space-x-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={notificationSettings.onFailed}
                  onChange={(e) => setNotificationSettings(prev => ({
                    ...prev,
                    onFailed: e.target.checked
                  }))}
                  className="rounded border-gray-300"
                />
                <span>失败时通知</span>
              </label>
              <label className="flex items-center space-x-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={notificationSettings.sound}
                  onChange={(e) => setNotificationSettings(prev => ({
                    ...prev,
                    sound: e.target.checked
                  }))}
                  className="rounded border-gray-300"
                />
                <span>声音提醒</span>
              </label>
            </div>
          )}
        </div>
      )}

      {/* 过滤器（仅在展开状态显示） */}
      {!isMinimized && (
        <div className="p-3 border-b bg-gray-50">
          <div className="flex space-x-2 text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-full transition-colors ${
                filter === 'all'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              全部 ({taskStats.total})
            </button>
            <button
              onClick={() => setFilter('processing')}
              className={`px-3 py-1 rounded-full transition-colors ${
                filter === 'processing'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              处理中 ({taskStats.processing})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-3 py-1 rounded-full transition-colors ${
                filter === 'completed'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              已完成 ({taskStats.completed})
            </button>
            <button
              onClick={() => setFilter('failed')}
              className={`px-3 py-1 rounded-full transition-colors ${
                filter === 'failed'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              失败 ({taskStats.failed})
            </button>
          </div>
        </div>
      )}

      {/* 任务列表 */}
      <div className={`overflow-y-auto ${isMinimized ? 'max-h-32' : 'max-h-64'}`}>
        {filteredTasks.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Film className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">暂无{filter === 'all' ? '' : filter === 'processing' ? '处理中的' : filter === 'completed' ? '已完成的' : '失败的'}任务</p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {filteredTasks.map(task => (
              <VideoProgress
                key={task.id}
                task={task}
                onCancel={onTaskCancel}
                onRetry={onTaskRetry}
                onView={onTaskView}
                onDownload={onTaskDownload}
                onDelete={onTaskDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* 底部操作 */}
      {!isMinimized && taskStats.completed > 0 && (
        <div className="p-3 border-t bg-gray-50">
          <button
            onClick={clearCompletedTasks}
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            清理已完成任务 ({taskStats.completed})
          </button>
        </div>
      )}
    </div>
  );
});

ProgressContainer.displayName = 'ProgressContainer';