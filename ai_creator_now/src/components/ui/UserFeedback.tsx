import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Info,
  X,
  Bell,
  Volume2,
  VolumeX,
  MessageSquare,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { errorMonitor } from '../../utils/errorMonitor';

// 反馈类型
export type FeedbackType = 'success' | 'error' | 'warning' | 'info' | 'loading';

// 反馈消息接口
export interface FeedbackMessage {
  id: string;
  type: FeedbackType;
  title: string;
  message: string;
  duration?: number;
  persistent?: boolean;
  actions?: Array<{
    label: string;
    action: () => void;
    primary?: boolean;
  }>;
  timestamp: Date;
  category?: 'user' | 'system' | 'api' | 'component' | 'network';
  source?: string;
  metadata?: Record<string, any>;
}

// 用户反馈配置接口
interface UserFeedbackConfig {
  enableSound?: boolean;
  enableNotifications?: boolean;
  maxMessages?: number;
  defaultDuration?: number;
  categories?: FeedbackType[];
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

// Hook返回值接口
interface UseUserFeedbackReturn {
  messages: FeedbackMessage[];
  config: UserFeedbackConfig;
  addMessage: (message: Omit<FeedbackMessage, 'id' | 'timestamp'>) => string;
  removeMessage: (id: string) => void;
  clearMessages: () => void;
  success: (title: string, message?: string, options?: Partial<FeedbackMessage>) => string;
  error: (title: string, message?: string, options?: Partial<FeedbackMessage>) => string;
  warning: (title: string, message?: string, options?: Partial<FeedbackMessage>) => string;
  info: (title: string, message?: string, options?: Partial<FeedbackMessage>) => string;
  loading: (title: string, message?: string, options?: Partial<FeedbackMessage>) => string;
  updateConfig: (config: Partial<UserFeedbackConfig>) => void;
  playSound: (type: FeedbackType) => void;
}

/**
 * 用户反馈Hook
 */
export function useUserFeedback(initialConfig: UserFeedbackConfig = {}): UseUserFeedbackReturn {
  const [messages, setMessages] = useState<FeedbackMessage[]>([]);
  const [config, setConfig] = useState<UserFeedbackConfig>({
    enableSound: true,
    enableNotifications: true,
    maxMessages: 5,
    defaultDuration: 5000,
    categories: ['success', 'error', 'warning', 'info', 'loading'],
    position: 'top-right',
    ...initialConfig
  });

  // 生成唯一ID
  const generateId = useCallback(() => {
    return `feedback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // 播放声音
  const playSound = useCallback((type: FeedbackType) => {
    if (!config.enableSound) return;

    try {
      const audio = new Audio();

      switch (type) {
        case 'success':
          audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBi6Gy/DaiTQLGGS56+2cTgwOUKzn4KxlFggzl9byyXkqBSl9y+/fikQLElyx6+yrWBUIQ5zd8sFuIAYuhM7z2YgzCBxkuevtm08MDlCs5+CvZxYKMZfW8sp4KwUqf8rx';
          break;
        case 'error':
          audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBi6Gy/DaiTQLGGS56+2cTgwOUKzn4KxlFggzl9byyXkqBSl9y+/fikQLElyx6+yrWBUIQ5zd8sFuIAYuhM7z2YgzCBxkuevtm08MDlCs5+CvZxYKMZfW8sp4KwUqf8rx';
          break;
        case 'warning':
          audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBi6Gy/DaiTQLGGS56+2cTgwOUKzn4KxlFggzl9byyXkqBSl9y+/fikQLElyx6+yrWBUIQ5zd8sFuIAYuhM7z2YgzCBxkuevtm08MDlCs5+CvZxYKMZfW8sp4KwUqf8rx';
          break;
        case 'info':
          audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBi6Gy/DaiTQLGGS56+2cTgwOUKzn4KxlFggzl9byyXkqBSl9y+/fikQLElyx6+yrWBUIQ5zd8sFuIAYuhM7z2YgzCBxkuevtm08MDlCs5+CvZxYKMZfW8sp4KwUqf8rx';
          break;
        default:
          return;
      }

      audio.volume = 0.3;
      audio.play().catch(() => {
        // 忽略播放失败（用户可能禁止了自动播放）
      });
    } catch (error) {
      // 忽略音频播放错误
    }
  }, [config.enableSound]);

  // 浏览器通知
  const showNotification = useCallback((title: string, message: string, type: FeedbackType) => {
    if (!config.enableNotifications || !('Notification' in window)) return;

    try {
      const permission = Notification.requestPermission();

      if (permission === 'granted') {
        new Notification(title, {
          body: message,
          icon: type === 'error' ? '/icons/error-icon.png' :
               type === 'success' ? '/icons/success-icon.png' :
               type === 'warning' ? '/icons/warning-icon.png' :
               '/icons/info-icon.png',
          tag: 'user-feedback'
        });
      }
    } catch (error) {
      // 忽略通知错误
    }
  }, [config.enableNotifications]);

  // 添加消息
  const addMessage = useCallback((
    messageData: Omit<FeedbackMessage, 'id' | 'timestamp'>
  ): string => {
    const id = generateId();
    const message: FeedbackMessage = {
      ...messageData,
      id,
      timestamp: new Date()
    };

    // 记录到错误监控系统
    errorMonitor.logUserAction('user-feedback', 'add', {
      id,
      type: message.type,
      title: message.title,
      category: message.category,
      source: message.source
    });

    setMessages(prev => {
      const newMessages = [...prev, message];

      // 限制消息数量
      if (newMessages.length > config.maxMessages) {
        return newMessages.slice(-config.maxMessages);
      }

      return newMessages;
    });

    // 播放声音
    playSound(message.type);

    // 显示浏览器通知
    showNotification(message.title, message.message, message.type);

    // 自动移除非持久消息
    if (!message.persistent && message.duration !== 0) {
      const duration = message.duration ?? config.defaultDuration;
      if (duration > 0) {
        setTimeout(() => {
          removeMessage(id);
        }, duration);
      }
    }

    return id;
  }, [generateId, config.maxMessages, config.defaultDuration, playSound, showNotification]);

  // 移除消息
  const removeMessage = useCallback((id: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== id));

    errorMonitor.logUserAction('user-feedback', 'remove', { id });
  }, []);

  // 清空消息
  const clearMessages = useCallback(() => {
    setMessages([]);

    errorMonitor.logUserAction('user-feedback', 'clear', {});
  }, []);

  // 便捷方法
  const success = useCallback((
    title: string,
    message?: string,
    options: Partial<FeedbackMessage> = {}
  ): string => {
    return addMessage({
      type: 'success',
      title,
      message: message || '',
      category: 'user',
      ...options
    });
  }, [addMessage]);

  const error = useCallback((
    title: string,
    message?: string,
    options: Partial<FeedbackMessage> = {}
  ): string => {
    return addMessage({
      type: 'error',
      title,
      message: message || '',
      category: 'user',
      persistent: true,
      ...options
    });
  }, [addMessage]);

  const warning = useCallback((
    title: string,
    message?: string,
    options: Partial<FeedbackMessage> = {}
  ): string => {
    return addMessage({
      type: 'warning',
      title,
      message: message || '',
      category: 'user',
      ...options
    });
  }, [addMessage]);

  const info = useCallback((
    title: string,
    message?: string,
    options: Partial<FeedbackMessage> = {}
  ): string => {
    return addMessage({
      type: 'info',
      title,
      message: message || '',
      category: 'user',
      ...options
    });
  }, [addMessage]);

  const loading = useCallback((
    title: string,
    message?: string,
    options: Partial<FeedbackMessage> = {}
  ): string => {
    return addMessage({
      type: 'loading',
      title,
      message: message || '',
      category: 'user',
      persistent: true,
      duration: 0,
      ...options
    });
  }, [addMessage]);

  // 更新配置
  const updateConfig = useCallback((newConfig: Partial<UserFeedbackConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));

    errorMonitor.logUserAction('user-feedback', 'config-update', newConfig);
  }, []);

  return {
    messages,
    config,
    addMessage,
    removeMessage,
    clearMessages,
    success,
    error,
    warning,
    info,
    loading,
    updateConfig,
    playSound
  };
}

/**
 * 用户反馈组件
 */
export const UserFeedback: React.FC<{
  feedback: UseUserFeedbackReturn;
}> = ({ feedback }) => {
  const { messages, removeMessage, config } = feedback;

  // 获取位置样式
  const getPositionStyles = () => {
    const baseStyles = 'fixed z-50 space-y-2 p-4 max-w-sm w-full';

    switch (config.position) {
      case 'top-right':
        return `${baseStyles} top-4 right-4`;
      case 'top-left':
        return `${baseStyles} top-4 left-4`;
      case 'bottom-right':
        return `${baseStyles} bottom-4 right-4`;
      case 'bottom-left':
        return `${baseStyles} bottom-4 left-4`;
      case 'top-center':
        return `${baseStyles} top-4 left-1/2 transform -translate-x-1/2`;
      case 'bottom-center':
        return `${baseStyles} bottom-4 left-1/2 transform -translate-x-1/2`;
      default:
        return `${baseStyles} top-4 right-4`;
    }
  };

  // 获取图标
  const getIcon = (type: FeedbackType) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      case 'info':
        return <Info className="w-5 h-5" />;
      case 'loading':
        return (
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        );
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  // 获取颜色样式
  const getColorStyles = (type: FeedbackType) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'loading':
        return 'bg-gray-50 border-gray-200 text-gray-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  if (messages.length === 0) {
    return null;
  }

  return (
    <div className={getPositionStyles()}>
      {messages.map((message) => (
        <div
          key={message.id}
          className={`
            relative p-4 rounded-lg border shadow-lg
            transform transition-all duration-300 ease-in-out
            ${getColorStyles(message.type)}
            animate-fade-in
          `}
        >
          {/* 关闭按钮 */}
          {message.type !== 'loading' && (
            <button
              onClick={() => removeMessage(message.id)}
              className="absolute top-2 right-2 p-1 rounded hover:bg-black/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* 内容 */}
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              {getIcon(message.type)}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm">{message.title}</h4>
              {message.message && (
                <p className="text-sm mt-1 opacity-90">{message.message}</p>
              )}

              {/* 元信息 */}
              {(message.category || message.source) && (
                <div className="mt-2 text-xs opacity-70">
                  {message.category && (
                    <span className="mr-2">
                      分类: {message.category}
                    </span>
                  )}
                  {message.source && (
                    <span>
                      来源: {message.source}
                    </span>
                  )}
                </div>
              )}

              {/* 操作按钮 */}
              {message.actions && message.actions.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {message.actions.map((action, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        action.action();
                        if (!message.persistent) {
                          removeMessage(message.id);
                        }
                      }}
                      className={`
                        px-3 py-1 text-xs font-medium rounded transition-colors
                        ${action.primary
                          ? 'bg-current text-white hover:opacity-90'
                          : 'bg-black/10 hover:bg-black/20'
                        }
                      `}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 时间戳 */}
          <div className="absolute bottom-1 right-1 text-xs opacity-50">
            {message.timestamp.toLocaleTimeString()}
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * 反馈控制组件
 */
export const FeedbackController: React.FC<{
  feedback: UseUserFeedbackReturn;
}> = ({ feedback }) => {
  const { config, updateConfig, playSound, clearMessages, messages } = feedback;

  return (
    <div className="fixed bottom-4 left-4 z-40 bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-xs">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-sm text-gray-900">反馈设置</h3>
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <Bell className="w-3 h-3" />
          <span>{messages.length}</span>
        </div>
      </div>

      {/* 设置选项 */}
      <div className="space-y-2">
        {/* 声音开关 */}
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-700">声音提示</label>
          <button
            onClick={() => updateConfig({ enableSound: !config.enableSound })}
            className={`p-1 rounded transition-colors ${
              config.enableSound ? 'text-blue-600' : 'text-gray-400'
            }`}
          >
            {config.enableSound ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>

        {/* 通知开关 */}
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-700">浏览器通知</label>
          <button
            onClick={() => updateConfig({ enableNotifications: !config.enableNotifications })}
            className={`p-1 rounded transition-colors ${
              config.enableNotifications ? 'text-blue-600' : 'text-gray-400'
            }`}
          >
            <Bell className="w-4 h-4" />
          </button>
        </div>

        {/* 最大消息数 */}
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-700">最大消息数</label>
          <select
            value={config.maxMessages}
            onChange={(e) => updateConfig({ maxMessages: parseInt(e.target.value) })}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value={3}>3</option>
            <option value={5}>5</option>
            <option value={10}>10</option>
          </select>
        </div>

        {/* 位置选择 */}
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-700">显示位置</label>
          <select
            value={config.position}
            onChange={(e) => updateConfig({ position: e.target.value as any })}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value="top-right">右上</option>
            <option value="top-left">左上</option>
            <option value="bottom-right">右下</option>
            <option value="bottom-left">左下</option>
            <option value="top-center">顶部居中</option>
            <option value="bottom-center">底部居中</option>
          </select>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="mt-4 space-y-2">
        <button
          onClick={() => playSound('success')}
          className="w-full px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
        >
          <CheckCircle className="w-3 h-3 inline mr-1" />
          测试声音
        </button>

        <button
          onClick={clearMessages}
          className="w-full px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
        >
          清空所有消息
        </button>
      </div>
    </div>
  );
};

export default useUserFeedback;