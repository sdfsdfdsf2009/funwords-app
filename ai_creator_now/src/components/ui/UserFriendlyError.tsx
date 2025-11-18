import React, { useState } from 'react';
import {
  AlertCircle,
  WifiOff,
  Lock,
  AlertTriangle,
  Info,
  RefreshCw,
  Settings,
  Download,
  Mail,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  getUserFriendlyError,
  getErrorIconClass,
  getErrorDisplayStyle,
  ErrorTranslation
} from '../../utils/errorTranslations';

interface UserFriendlyErrorProps {
  error: Error | string;
  context?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  showDetails?: boolean;
  className?: string;
}

export const UserFriendlyError: React.FC<UserFriendlyErrorProps> = ({
  error,
  context,
  onRetry,
  onDismiss,
  showDetails = false,
  className = ''
}) => {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const errorTranslation = getUserFriendlyError(error, context);
  const displayStyle = getErrorDisplayStyle(errorTranslation.severity);

  // 根据错误类型选择图标
  const getErrorIcon = () => {
    switch (errorTranslation.type) {
      case 'network':
        return <WifiOff className={`${displayStyle.icon} ${getErrorIconClass(errorTranslation.type)}`} />;
      case 'authentication':
        return <Lock className={`${displayStyle.icon} ${getErrorIconClass(errorTranslation.type)}`} />;
      case 'validation':
        return <AlertTriangle className={`${displayStyle.icon} ${getErrorIconClass(errorTranslation.type)}`} />;
      case 'data':
        return <Info className={`${displayStyle.icon} ${getErrorIconClass(errorTranslation.type)}`} />;
      case 'system':
      default:
        return <AlertCircle className={`${displayStyle.icon} ${getErrorIconClass(errorTranslation.type)}`} />;
    }
  };

  const handleRetry = async () => {
    if (onRetry) {
      setIsRetrying(true);
      try {
        await onRetry();
      } finally {
        setIsRetrying(false);
      }
    }
  };

  const handleAction = async (action: () => void) => {
    try {
      await action();
    } catch (error) {
      console.error('Error action failed:', error);
    }
  };

  return (
    <div className={`rounded-lg border p-4 ${displayStyle.container} ${className}`}>
      {/* 主要错误信息 */}
      <div className="flex items-start space-x-3">
        {getErrorIcon()}
        <div className="flex-1 min-w-0">
          <h3 className={displayStyle.message}>
            {errorTranslation.userMessage}
          </h3>

          {/* 建议列表 */}
          {errorTranslation.suggestions.length > 0 && (
            <ul className="mt-2 text-sm space-y-1">
              {errorTranslation.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <span className="text-gray-400 mt-0.5">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          )}

          {/* 操作按钮 */}
          {(errorTranslation.actions || onRetry) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {onRetry && (
                <button
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-medium rounded-md bg-white/20 hover:bg-white/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
                  <span>{isRetrying ? '重试中...' : '重试'}</span>
                </button>
              )}

              {errorTranslation.actions?.map((action, index) => (
                <button
                  key={index}
                  onClick={() => handleAction(action.action)}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-medium rounded-md bg-white/20 hover:bg-white/30 transition-colors"
                >
                  {action.label === '前往设置' && <Settings className="w-3 h-3" />}
                  {action.label === '下载备份' && <Download className="w-3 h-3" />}
                  {action.label === '联系支持' && <Mail className="w-3 h-3" />}
                  {action.label === '重试' && <RefreshCw className="w-3 h-3" />}
                  {action.label === '刷新页面' && <RefreshCw className="w-3 h-3" />}
                  <span>{action.label}</span>
                </button>
              ))}

              {showDetails && (
                <button
                  onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-medium rounded-md bg-white/20 hover:bg-white/30 transition-colors"
                >
                  {showTechnicalDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  <span>{showTechnicalDetails ? '隐藏详情' : '显示详情'}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* 关闭按钮 */}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 p-1 rounded-md hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 技术详情 */}
      {showTechnicalDetails && showDetails && (
        <div className="mt-3 pt-3 border-t border-current/20">
          <div className="text-xs font-mono bg-black/10 rounded p-2">
            <div className="mb-1">
              <strong>原始错误:</strong> {typeof error === 'string' ? error : error.message}
            </div>
            {typeof error === 'object' && error.stack && (
              <div className="mt-1 text-gray-600">
                <strong>堆栈跟踪:</strong>
                <pre className="whitespace-pre-wrap break-words mt-1">
                  {error.stack}
                </pre>
              </div>
            )}
            {context && (
              <div className="mt-1">
                <strong>上下文:</strong> {context}
              </div>
            )}
            <div className="mt-1">
              <strong>错误类型:</strong> {errorTranslation.type}
            </div>
            <div className="mt-1">
              <strong>严重程度:</strong> {errorTranslation.severity}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserFriendlyError;