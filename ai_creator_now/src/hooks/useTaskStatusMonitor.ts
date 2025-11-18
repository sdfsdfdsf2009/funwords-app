import { useEffect, useState, useRef, useCallback } from 'react';
import { useAPIConfigStore } from '../stores/apiConfigStore';
import { GenerationProgress } from '../types';
import { logger } from '../utils/logger';

interface TaskStatus extends GenerationProgress {
  configId: string;
  sceneId?: string;
  prompt?: string;
  type: 'image' | 'video';
  createdAt: number;
}

export function useTaskStatusMonitor() {
  // Use individual selectors to avoid object reference issues
  const activeGenerations = useAPIConfigStore((state) => state.activeGenerations);
  const generationHistory = useAPIConfigStore((state) => state.generationHistory);
  const configurations = useAPIConfigStore((state) => state.configurations);

  const [taskStatuses, setTaskStatuses] = useState<TaskStatus[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isUpdatingRef = useRef<boolean>(false);
  const lastDataHashRef = useRef<string>('');

  // Create a stable hash of the data to detect actual changes
  const createDataHash = useCallback(() => {
    const activeKeys = Object.keys(activeGenerations).sort().join(',');
    const historyIds = generationHistory.slice(0, 10).map(h => h.id).join(',');
    const configIds = configurations.map(c => c.id).slice(0, 5).join(',');
    return `${activeKeys}|${historyIds}|${configIds}`;
  }, [activeGenerations, generationHistory, configurations]);

  // Memoize the update function to prevent recreating it on every render
  const updateTaskStatuses = useCallback(() => {
    // Prevent re-entrant calls
    if (isUpdatingRef.current) {
      return;
    }

    isUpdatingRef.current = true;

    try {
      const currentDataHash = createDataHash();

      // Skip update if data hasn't actually changed
      if (currentDataHash === lastDataHashRef.current && intervalRef.current) {
        return;
      }

      lastDataHashRef.current = currentDataHash;

      const statuses: TaskStatus[] = [];
      const now = Date.now();

      // Process active generations
      Object.entries(activeGenerations).forEach(([taskId, request]) => {
        const config = configurations.find(c => c.id === request.configId);
        const prompt = request.parameters.prompt || request.parameters.input || '';

        // Try to get real progress from image generation service
        let realProgress = 0;
        let realStatus: TaskStatus['status'] = 'processing';
        let message = '正在处理...';

        // First, try to get progress info from the active request itself
        if ((request as any).progress !== undefined) {
          realProgress = (request as any).progress;
          message = (request as any).message || `处理中 ${Math.round(realProgress)}%`;

          if ((request as any).status) {
            realStatus = (request as any).status as TaskStatus['status'];
            if (realStatus === 'completed') {
              message = '生成完成';
            } else if (realStatus === 'failed') {
              message = '生成失败';
            } else if (realStatus === 'pending') {
              message = '等待中...';
            }
          }
        } else {
          // Fallback: try to get progress from image generation service
          try {
            const { getImageGenerationService } = require('../services/imageGeneration');
            const service = getImageGenerationService();
            const serviceHistory = service.getGenerationHistory();

            const matchingTask = serviceHistory.find(task =>
              task.id.includes(request.sceneId) ||
              task.id === taskId.replace('temp_img_', '').replace(/^temp_/, '')
            );

            if (matchingTask) {
              realProgress = matchingTask.progress;
              realStatus = matchingTask.status as TaskStatus['status'];

              if (realStatus === 'completed') {
                message = '生成完成';
              } else if (realStatus === 'failed') {
                message = '生成失败';
              } else if (realStatus === 'pending') {
                message = '等待中...';
              } else {
                message = `处理中 ${Math.round(realProgress)}%`;
              }
            }
          } catch (error) {
            // Final fallback: use default progress
            realProgress = 25;
          }
        }

        statuses.push({
          id: taskId,
          type: request.type,
          status: realStatus,
          progress: realProgress,
          message,
          configId: request.configId,
          sceneId: request.sceneId,
          prompt,
          createdAt: now
        });
      });

      // Process generation history for recent completed/failed tasks
      const recentHistory = generationHistory
        .filter(result => {
          const resultTime = new Date(result.createdAt).getTime();
          return (now - resultTime) < 5 * 60 * 1000; // Last 5 minutes
        });

      recentHistory.forEach(result => {
        const prompt = result.parameters.prompt || result.parameters.input || '';

        let status: TaskStatus['status'] = 'completed';
        let message = '生成完成';

        if (!result.success) {
          status = 'failed';
          message = result.error || '生成失败';
        }

        statuses.push({
          id: result.id,
          type: result.parsedData.imageUrl ? 'image' : 'video',
          status,
          progress: status === 'completed' ? 100 : 0,
          message,
          result: result.parsedData.imageUrl || result.parsedData.videoUrl,
          error: result.error,
          configId: result.configId,
          prompt,
          createdAt: new Date(result.createdAt).getTime()
        });
      });

      // Sort by creation time (newest first)
      statuses.sort((a, b) => b.createdAt - a.createdAt);

      // Use requestAnimationFrame to prevent blocking
      requestAnimationFrame(() => {
        setTaskStatuses(statuses);
        setLastUpdate(new Date(now));
      });

    } finally {
      // Always reset the updating flag
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 0);
    }
  }, [activeGenerations, generationHistory, configurations, createDataHash]);

  // Effect to manage the interval with stable dependencies
  useEffect(() => {
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Initial update
    updateTaskStatuses();

    // Set up periodic updates only if there are active tasks
    const hasActiveTasks = Object.keys(activeGenerations).length > 0;

    if (hasActiveTasks) {
      intervalRef.current = setInterval(() => {
        updateTaskStatuses();
      }, 2000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      isUpdatingRef.current = false;
    };
  }, [activeGenerations, updateTaskStatuses]);

  // Get task counts by status
  const getTaskCounts = () => {
    const counts = {
      total: taskStatuses.length,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0
    };

    taskStatuses.forEach(task => {
      counts[task.status]++;
    });

    return counts;
  };

  // Get tasks by status
  const getTasksByStatus = (status: TaskStatus['status']) => {
    return taskStatuses.filter(task => task.status === status);
  };

  // Get active tasks (pending + processing)
  const getActiveTasks = () => {
    return taskStatuses.filter(task =>
      task.status === 'pending' || task.status === 'processing'
    );
  };

  // Get recent completed tasks (last 10)
  const getRecentCompletedTasks = () => {
    return taskStatuses
      .filter(task => task.status === 'completed')
      .slice(0, 10);
  };

  // Get recent failed tasks (last 5)
  const getRecentFailedTasks = () => {
    return taskStatuses
      .filter(task => task.status === 'failed')
      .slice(0, 5);
  };

  return {
    taskStatuses,
    lastUpdate,
    getTaskCounts,
    getTasksByStatus,
    getActiveTasks,
    getRecentCompletedTasks,
    getRecentFailedTasks
  };
}