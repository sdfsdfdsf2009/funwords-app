import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, RefreshCw, Info, CheckCircle, X, Zap, Shield } from 'lucide-react';

interface RateLimitErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  error?: Error;
  onRetry?: () => void;
  retryCount?: number;
  estimatedWaitTime?: number;
}

interface RateLimitInfo {
  severity: 'low' | 'medium' | 'high' | 'critical';
  estimatedWaitTime: number;
  retryCount: number;
  suggestions: string[];
  canRetry: boolean;
  nextRetryTime?: Date;
}

export const RateLimitErrorModal: React.FC<RateLimitErrorModalProps> = ({
  isOpen,
  onClose,
  error,
  onRetry,
  retryCount = 0,
  estimatedWaitTime = 0
}) => {
  const [countdown, setCountdown] = useState<number>(0);
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null);

  useEffect(() => {
    if (isOpen && error) {
      const info = analyzeRateLimitError(error, retryCount, estimatedWaitTime);
      setRateLimitInfo(info);
      setCountdown(info.estimatedWaitTime);
    }
  }, [isOpen, error, retryCount, estimatedWaitTime]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  if (!isOpen || !rateLimitInfo) return null;

  const handleRetry = () => {
    if (rateLimitInfo.canRetry && onRetry) {
      onRetry();
      onClose();
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}分${secs}秒` : `${secs}秒`;
  };

  const getSeverityColor = (severity: RateLimitInfo['severity']) => {
    switch (severity) {
      case 'low':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'medium':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'critical':
        return 'text-red-700 bg-red-100 border-red-300';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: RateLimitInfo['severity']) => {
    switch (severity) {
      case 'low':
        return <AlertTriangle className="w-6 h-6 text-yellow-600" />;
      case 'medium':
        return <AlertTriangle className="w-6 h-6 text-orange-600" />;
      case 'high':
        return <Shield className="w-6 h-6 text-red-600" />;
      case 'critical':
        return <Zap className="w-6 h-6 text-red-700" />;
      default:
        return <Info className="w-6 h-6 text-gray-600" />;
    }
  };

  const getSeverityTitle = (severity: RateLimitInfo['severity']) => {
    switch (severity) {
      case 'low':
        return '请求频率轻微过高';
      case 'medium':
        return '请求频率过高';
      case 'high':
        return '请求严重超频';
      case 'critical':
        return '请求频率已达上限';
      default:
        return '请求限制';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className={`p-6 border-b ${getSeverityColor(rateLimitInfo.severity)} rounded-t-xl`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getSeverityIcon(rateLimitInfo.severity)}
              <div>
                <h3 className="text-lg font-semibold">{getSeverityTitle(rateLimitInfo.severity)}</h3>
                <p className="text-sm opacity-90">HTTP 429 - Too Many Requests</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
              aria-label="关闭对话框"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Error Message */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-700 leading-relaxed">
              {error?.message || '请求过于频繁，服务器暂时拒绝了您的请求。'}
            </p>
          </div>

          {/* Status Information */}
          <div className="mb-6 space-y-4">
            {/* Countdown Timer */}
            {countdown > 0 && (
              <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Clock className="w-5 h-5 text-blue-600 animate-pulse" />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    建议等待时间
                  </p>
                  <p className="text-lg font-bold text-blue-700">
                    {formatTime(countdown)}
                  </p>
                </div>
              </div>
            )}

            {/* Retry Attempts */}
            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
              <RefreshCw className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  已重试次数
                </p>
                <p className="text-lg font-bold text-gray-700">
                  {retryCount} 次
                </p>
              </div>
            </div>

            {/* Severity Indicator */}
            <div className={`p-4 rounded-lg border ${getSeverityColor(rateLimitInfo.severity)}`}>
              <div className="flex items-center space-x-2">
                {getSeverityIcon(rateLimitInfo.severity)}
                <span className="font-medium">严重程度: {rateLimitInfo.severity.toUpperCase()}</span>
              </div>
            </div>
          </div>

          {/* Suggestions */}
          <div className="mb-6">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
              <Info className="w-4 h-4 mr-2" />
              解决建议
            </h4>
            <ul className="space-y-2">
              {rateLimitInfo.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={handleRetry}
              disabled={!rateLimitInfo.canRetry || countdown > 0}
              className={`
                flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-200
                ${rateLimitInfo.canRetry && countdown === 0
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              {countdown > 0 ? (
                <span className="flex items-center justify-center">
                  <Clock className="w-4 h-4 mr-2" />
                  请等待 {formatTime(countdown)}
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  立即重试
                </span>
              )}
            </button>

            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
            >
              稍后再试
            </button>
          </div>

          {/* Additional Help */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-700">
              <strong>提示：</strong>为避免频繁触发限制，建议您：
              <br />• 分批处理大量数据
              <br />• 避免同时打开多个标签页
              <br />• 检查是否有自动化程序在发送请求
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * 分析速率限制错误并生成用户友好的信息
 */
function analyzeRateLimitError(
  error: Error,
  retryCount: number,
  estimatedWaitTime: number
): RateLimitInfo {
  const errorMessage = error.message.toLowerCase();

  // 根据错误消息和重试次数判断严重程度
  let severity: RateLimitInfo['severity'] = 'medium';
  let baseWaitTime = 30; // 默认30秒

  if (errorMessage.includes('critical') || retryCount >= 5) {
    severity = 'critical';
    baseWaitTime = 300; // 5分钟
  } else if (errorMessage.includes('严重') || retryCount >= 3) {
    severity = 'high';
    baseWaitTime = 120; // 2分钟
  } else if (errorMessage.includes('轻微') || retryCount <= 1) {
    severity = 'low';
    baseWaitTime = 15; // 15秒
  }

  // 使用服务器返回的等待时间，或计算基于重试次数的等待时间
  const calculatedWaitTime = estimatedWaitTime || Math.min(baseWaitTime * Math.pow(2, retryCount), 600);

  const suggestions = generateSuggestions(severity, retryCount);
  const canRetry = severity !== 'critical' || retryCount < 6;

  return {
    severity,
    estimatedWaitTime: Math.ceil(calculatedWaitTime),
    retryCount,
    suggestions,
    canRetry,
    nextRetryTime: canRetry ? new Date(Date.now() + calculatedWaitTime * 1000) : undefined
  };
}

/**
 * 根据严重程度生成建议
 */
function generateSuggestions(severity: RateLimitInfo['severity'], retryCount: number): string[] {
  const baseSuggestions = [
    '等待几分钟后重试',
    '减少并发请求数量',
    '分批处理大量数据'
  ];

  const severitySuggestions = {
    low: [
      ...baseSuggestions,
      '短暂等待（15-30秒）后重试',
      '检查网络连接是否稳定'
    ],
    medium: [
      ...baseSuggestions,
      '等待1-2分钟后重试',
      '关闭其他可能发送请求的标签页'
    ],
    high: [
      ...baseSuggestions,
      '等待2-5分钟后重试',
      '检查是否有自动化程序在运行',
      '考虑分批导入较小的文件'
    ],
    critical: [
      ...baseSuggestions,
      '等待5-10分钟后重试',
      '立即停止所有相关操作',
      '检查系统资源使用情况',
      '如问题持续，请联系技术支持'
    ]
  };

  const retrySuggestions = retryCount > 3 ? [
    '您已经重试多次，建议等待更长时间',
    '考虑检查网络环境和系统状态'
  ] : [];

  return [...severitySuggestions[severity], ...retrySuggestions];
}

export default RateLimitErrorModal;