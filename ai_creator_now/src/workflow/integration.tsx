/**
 * 工作流系统集成入口
 * 提供一键集成所有功能的React组件
 */

import React, { useEffect, useState, useCallback } from 'react';
import { workflowManager, WorkflowManagerConfig } from './WorkflowManager';
import { EnhancedErrorBoundary } from './integrations/ReactErrorBoundary';
import { apiErrorInterceptor, useApiErrorInterceptor } from './integrations/ApiErrorInterceptor';
import { useStateErrorMonitor } from './integrations/StateErrorMonitor';
import { WorkflowStatusTracker } from '../components/debug/WorkflowStatusTracker';
import { SafetyConfirmationPanel } from '../components/debug/SafetyConfirmationPanel';
import { workflowConfig, SafetyLevel } from './WorkflowConfig';

interface WorkflowIntegrationProps {
  children: React.ReactNode;
  config?: WorkflowManagerConfig;
  showDebugPanel?: boolean;
  showSafetyPanel?: boolean;
  enableNotifications?: boolean;
  onError?: (error: any, context?: any) => void;
  onWorkflowEvent?: (event: any) => void;
}

interface WorkflowDebugInfo {
  isRunning: boolean;
  stats: any;
  environment: string;
  safetyLevel: SafetyLevel;
  pendingConfirmations: number;
}

export const WorkflowIntegration: React.FC<WorkflowIntegrationProps> = ({
  children,
  config,
  showDebugPanel = false,
  showSafetyPanel = false,
  enableNotifications = true,
  onError,
  onWorkflowEvent
}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [debugInfo, setDebugInfo] = useState<WorkflowDebugInfo | null>(null);
  const [apiErrors, setApiErrors] = useState<any[]>([]);
  const [stateErrors, setStateErrors] = useState<any[]>([]);

  // API错误监控
  const { errors: apiErrorList, clearErrors: clearApiErrors, fetch: enhancedFetch } = useApiErrorInterceptor();

  // 状态错误监控
  const {
    errors: stateErrorList,
    clearErrors: clearStateErrors,
    wrapStore,
    wrapReduxStore,
    wrapZustandStore
  } = useStateErrorMonitor();

  // 初始化工作流管理器
  useEffect(() => {
    const initializeWorkflow = async () => {
      try {
        console.log('🚀 初始化错误调试工作流系统...');

        // 启动工作流管理器
        if (config) {
          const manager = WorkflowManager.getInstance(config);
          await manager.start();
        } else {
          await workflowManager.start();
        }

        setIsInitialized(true);
        console.log('✅ 错误调试工作流系统初始化完成');

        // 设置事件监听器
        setupEventListeners();

      } catch (error) {
        console.error('❌ 工作流系统初始化失败:', error);
      }
    };

    initializeWorkflow();

    return () => {
      console.log('🛑 停止错误调试工作流系统');
      workflowManager.stop();
    };
  }, []);

  // 设置事件监听器
  const setupEventListeners = useCallback(() => {
    // 错误处理事件
    workflowManager.addEventListener('error_processed', (event) => {
      console.log('📋 错误已处理:', event.taskId);
      onError?.(event.error, event.context);
      onWorkflowEvent?.(event);
    });

    // 工作流完成事件
    workflowManager.addEventListener('workflow_completed', (event) => {
      console.log('🎉 工作流完成:', event.taskId);
      onWorkflowEvent?.(event);

      if (enableNotifications) {
        showNotification('工作流完成', `任务 ${event.taskId} 已成功完成`, 'success');
      }
    });

    // 待确认请求事件
    workflowManager.addEventListener('pending_confirmations', (event) => {
      console.log('🔔 有待确认的修复建议:', event.count);
      onWorkflowEvent?.(event);

      if (enableNotifications && showSafetyPanel) {
        showNotification('待确认请求', `有 ${event.count} 个修复建议需要确认`, 'info');
      }
    });

    // 统计更新事件
    workflowManager.addEventListener('stats_updated', (event) => {
      updateDebugInfo();
    });

  }, [onError, onWorkflowEvent, enableNotifications, showSafetyPanel]);

  // 更新调试信息
  const updateDebugInfo = useCallback(() => {
    try {
      const stats = workflowManager.getStats();
      const config = workflowConfig.getCurrentConfig();

      setDebugInfo({
        isRunning: stats.manager.isRunning,
        stats,
        environment: config.name,
        safetyLevel: config.safetyLevel,
        pendingConfirmations: workflowManager.getPendingConfirmations().length
      });
    } catch (error) {
      console.warn('Failed to update debug info:', error);
    }
  }, []);

  // 定期更新调试信息
  useEffect(() => {
    if (isInitialized) {
      updateDebugInfo();
      const interval = setInterval(updateDebugInfo, 5000); // 每5秒更新一次
      return () => clearInterval(interval);
    }
  }, [isInitialized, updateDebugInfo]);

  // 更新错误列表
  useEffect(() => {
    setApiErrors(apiErrorList);
  }, [apiErrorList]);

  useEffect(() => {
    setStateErrors(stateErrorList);
  }, [stateErrorList]);

  // 显示通知
  const showNotification = useCallback((title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/favicon.ico',
        tag: 'workflow-notification'
      });
    } else {
      // 回退到控制台通知
      console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
    }
  }, []);

  // 请求通知权限
  useEffect(() => {
    if (enableNotifications && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, [enableNotifications]);

  // 全局fetch替换
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const originalFetch = window.fetch;
      window.fetch = enhancedFetch;

      return () => {
        window.fetch = originalFetch;
      };
    }
  }, [enhancedFetch]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在初始化错误调试工作流系统...</p>
        </div>
      </div>
    );
  }

  return (
    <EnhancedErrorBoundary
      enableWorkflow={true}
      onError={(error, errorInfo) => {
        console.error('Global Error Boundary caught an error:', error, errorInfo);
      }}
    >
      {/* 安全确认面板 */}
      {showSafetyPanel && (
        <div className="fixed top-4 right-4 z-50 w-96 max-h-96 overflow-hidden">
          <SafetyConfirmationPanel
            onSettingsChange={(level) => {
              console.log('Safety level changed to:', level);
              updateDebugInfo();
            }}
          />
        </div>
      )}

      {/* 调试面板 */}
      {showDebugPanel && debugInfo && (
        <div className="fixed top-4 left-4 z-50 w-96 max-h-96 overflow-hidden">
          <div className="bg-white rounded-lg shadow-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">工作流状态</h3>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>状态:</span>
                <span className={debugInfo.isRunning ? 'text-green-600' : 'text-red-600'}>
                  {debugInfo.isRunning ? '运行中' : '已停止'}
                </span>
              </div>

              <div className="flex justify-between">
                <span>环境:</span>
                <span className="text-gray-600">{debugInfo.environment}</span>
              </div>

              <div className="flex justify-between">
                <span>安全级别:</span>
                <span className="text-gray-600">{debugInfo.safetyLevel}</span>
              </div>

              <div className="flex justify-between">
                <span>待确认:</span>
                <span className="text-orange-600">{debugInfo.pendingConfirmations}</span>
              </div>

              <div className="flex justify-between">
                <span>活跃任务:</span>
                <span className="text-blue-600">{debugInfo.stats.activeTasks}</span>
              </div>

              <div className="flex justify-between">
                <span>成功率:</span>
                <span className="text-green-600">{debugInfo.stats.successRate}%</span>
              </div>
            </div>

            {/* 错误列表 */}
            {(apiErrors.length > 0 || stateErrors.length > 0) && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="font-medium text-gray-900 mb-2">最近错误</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {apiErrors.slice(0, 3).map((error, index) => (
                    <div key={`api-${index}`} className="text-xs text-red-600 truncate">
                      API: {error.message?.substring(0, 50)}...
                    </div>
                  ))}
                  {stateErrors.slice(0, 3).map((error, index) => (
                    <div key={`state-${index}`} className="text-xs text-orange-600 truncate">
                      State: {error.error?.message?.substring(0, 50)}...
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="mt-4 pt-4 border-t flex space-x-2">
              <button
                onClick={() => {
                  clearApiErrors();
                  clearStateErrors();
                }}
                className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                清除错误
              </button>
              <button
                onClick={updateDebugInfo}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                刷新
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 主应用内容 */}
      {children}

      {/* 状态栏（可选） */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 bg-white rounded-lg shadow p-2 text-xs">
          <div className="flex items-center space-x-4">
            <span className="flex items-center">
              <div className={`w-2 h-2 rounded-full mr-1 ${debugInfo?.isRunning ? 'bg-green-500' : 'bg-red-500'}`}></div>
              工作流
            </span>
            <span>任务: {debugInfo?.stats.activeTasks || 0}</span>
            <span>成功: {debugInfo?.stats.successRate || 0}%</span>
            <span>待确认: {debugInfo?.pendingConfirmations || 0}</span>
          </div>
        </div>
      )}
    </EnhancedErrorBoundary>
  );
};

// 便捷的Hook
export function useWorkflowIntegration() {
  const [isReady, setIsReady] = useState(false);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const checkStatus = () => {
      try {
        const currentStats = workflowManager.getStats();
        setStats(currentStats);
        setIsReady(currentStats.manager.isRunning);
      } catch (error) {
        setIsReady(false);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  const triggerWorkflow = useCallback(async (error: any, context?: any) => {
    if (!isReady) {
      console.warn('Workflow system is not ready');
      return null;
    }

    try {
      return await workflowManager.triggerWorkflow(error, context);
    } catch (error) {
      console.error('Failed to trigger workflow:', error);
      return null;
    }
  }, [isReady]);

  const getPendingConfirmations = useCallback(() => {
    if (!isReady) return [];
    return workflowManager.getPendingConfirmations();
  }, [isReady]);

  const handleConfirmation = useCallback(async (requestId: string, result: any) => {
    if (!isReady) {
      throw new Error('Workflow system is not ready');
    }

    return await workflowManager.handleConfirmation(requestId, result);
  }, [isReady]);

  const updateConfig = useCallback((updates: any) => {
    if (!isReady) {
      console.warn('Workflow system is not ready');
      return;
    }

    workflowManager.updateConfig(updates);
  }, [isReady]);

  return {
    isReady,
    stats,
    triggerWorkflow,
    getPendingConfirmations,
    handleConfirmation,
    updateConfig
  };
}

// 全局导出的便捷函数
export const startWorkflowSystem = async (config?: WorkflowManagerConfig) => {
  const manager = WorkflowManager.getInstance(config);
  await manager.start();
  return manager;
};

export const stopWorkflowSystem = () => {
  workflowManager.stop();
};

export const triggerWorkflowError = (error: any, context?: any) => {
  return workflowManager.handleError(error, context);
};

// 默认导出
export default WorkflowIntegration;