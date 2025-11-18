import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

// Toast类型定义
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  persistent?: boolean;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
}

// Toast Context
const ToastContext = createContext<ToastContextValue | undefined>(undefined);

// Toast Provider
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = { id, ...toast };

    setToasts(prev => [...prev, newToast]);

    // 自动移除Toast（除非是持久化的）
    if (!toast.persistent) {
      const duration = toast.duration || 5000;
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearAllToasts }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
};

// Hook for using Toast
export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Toast组件样式
const getToastStyles = (type: ToastType) => {
  const baseStyles = 'flex items-start p-4 rounded-lg shadow-lg border transition-all duration-300 transform translate-x-full';

  switch (type) {
    case 'success':
      return `${baseStyles} bg-green-50 border-green-200 text-green-900`;
    case 'error':
      return `${baseStyles} bg-red-50 border-red-200 text-red-900`;
    case 'warning':
      return `${baseStyles} bg-yellow-50 border-yellow-200 text-yellow-900`;
    case 'info':
      return `${baseStyles} bg-blue-50 border-blue-200 text-blue-900`;
    default:
      return baseStyles;
  }
};

const getIcon = (type: ToastType) => {
  switch (type) {
    case 'success':
      return <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />;
    case 'error':
      return <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />;
    case 'warning':
      return <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />;
    case 'info':
      return <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />;
    default:
      return <Info className="w-5 h-5 text-gray-600 flex-shrink-0" />;
  }
};

// Toast容器组件
const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-4 max-w-sm w-full">
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          className={`${getToastStyles(toast.type)} animate-slide-in`}
          style={{
            animationDelay: `${index * 100}ms`,
            animationFillMode: 'both'
          }}
        >
          <div className="flex items-start flex-1">
            <div className="flex-shrink-0 mr-3">
              {getIcon(toast.type)}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium">{toast.title}</h4>
              {toast.message && (
                <p className="text-sm mt-1 opacity-90">{toast.message}</p>
              )}
              {toast.action && (
                <button
                  onClick={toast.action.onClick}
                  className="mt-2 text-sm font-medium underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded"
                >
                  {toast.action.label}
                </button>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 ml-4 inline-flex text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded"
            >
              <span className="sr-only">关闭</span>
              <X className="w-4 h-4" />
            </button>
          </div>
          {!toast.persistent && (
            <div className="mt-2 bg-gray-200 rounded-full h-1">
              <div
                className="bg-current h-1 rounded-full transition-all ease-linear"
                style={{
                  width: '100%',
                  animation: `shrink ${toast.duration || 5000}ms linear forwards`,
                  animationDelay: `${index * 100}ms`
                }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// 便捷方法
export const createToastHelpers = () => {
  const { addToast } = useToast();

  return {
    success: (title: string, message?: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title' | 'message'>>) =>
      addToast({ type: 'success', title, message, ...options }),

    error: (title: string, message?: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title' | 'message'>>) =>
      addToast({ type: 'error', title, message, persistent: true, ...options }),

    warning: (title: string, message?: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title' | 'message'>>) =>
      addToast({ type: 'warning', title, message, ...options }),

    info: (title: string, message?: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title' | 'message'>>) =>
      addToast({ type: 'info', title, message, ...options }),

    loading: (title: string, message?: string) =>
      addToast({
        type: 'info',
        title,
        message,
        persistent: true,
        action: {
          label: '取消',
          onClick: () => {
            // 可以在这里添加取消逻辑
          }
        }
      })
  };
};

// 自定义Hook
export const useToastHelpers = () => {
  return createToastHelpers();
};

// 样式
const style = `
  @keyframes slide-in {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes shrink {
    from {
      width: 100%;
    }
    to {
      width: 0%;
    }
  }

  .animate-slide-in {
    animation: slide-in 0.3s ease-out;
  }
`;

// 注入样式
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = style;
  if (!document.head.querySelector('style[data-toast]')) {
    styleElement.setAttribute('data-toast', 'true');
    document.head.appendChild(styleElement);
  }
}

export default ToastProvider;