import React, { useState } from 'react';
import { X, AlertTriangle, Info, CheckCircle, Clock, Copy, Mail } from 'lucide-react';
import { VideoError, parseVideoError, getErrorTypeInfo, formatRetryDelay, generateErrorReport } from '../../utils/errorHandler';

interface ErrorDetailModalProps {
  error: any;
  isOpen: boolean;
  onClose: () => void;
  onRetry?: () => void;
  taskInfo?: any;
}

export const ErrorDetailModal: React.FC<ErrorDetailModalProps> = ({
  error,
  isOpen,
  onClose,
  onRetry,
  taskInfo
}) => {
  const [copiedReport, setCopiedReport] = useState(false);

  if (!isOpen) return null;

  const videoError = parseVideoError(error);
  const errorTypeInfo = getErrorTypeInfo(videoError.type);

  const copyReport = async () => {
    const report = generateErrorReport(videoError, taskInfo);
    try {
      await navigator.clipboard.writeText(report);
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="sticky top-0 bg-white border-b p-6 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-full ${errorTypeInfo.bgColor}`}>
                <span className="text-2xl">{errorTypeInfo.icon}</span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  生成失败
                </h2>
                <p className={`text-sm ${errorTypeInfo.color}`}>
                  {errorTypeInfo.label}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* 用户友好的错误信息 */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-red-900 mb-1">
                  {videoError.userMessage}
                </h3>
                <p className="text-sm text-red-700">
                  {videoError.message !== videoError.userMessage && videoError.message}
                </p>
              </div>
            </div>
          </div>

          {/* 解决建议 */}
          {videoError.suggestions.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                <Info className="w-4 h-4 mr-2 text-blue-600" />
                解决建议
              </h3>
              <div className="space-y-2">
                {videoError.suggestions.map((suggestion, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                    <p className="text-sm text-gray-700">{suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 重试信息 */}
          {videoError.canRetry && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-blue-900">可以重试</h4>
                  {videoError.retryDelay && (
                    <p className="text-sm text-blue-700">
                      建议等待 {formatRetryDelay(videoError.retryDelay)} 后重试
                    </p>
                  )}
                </div>
              </div>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="mt-3 w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>立即重试</span>
                </button>
              )}
            </div>
          )}

          {/* 技术详情 */}
          <details className="border border-gray-200 rounded-lg">
            <summary className="p-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between">
              <span className="font-medium text-gray-900">技术详情</span>
              <span className="text-sm text-gray-500">点击展开</span>
            </summary>
            <div className="p-4 pt-0 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium text-gray-700">错误类型:</span>
                  <span className="ml-2 text-gray-600">{videoError.type}</span>
                </div>
                {videoError.code && (
                  <div>
                    <span className="font-medium text-gray-700">错误代码:</span>
                    <span className="ml-2 text-gray-600">{videoError.code}</span>
                  </div>
                )}
                <div>
                  <span className="font-medium text-gray-700">可重试:</span>
                  <span className="ml-2 text-gray-600">{videoError.canRetry ? '是' : '否'}</span>
                </div>
                {videoError.retryDelay && (
                  <div>
                    <span className="font-medium text-gray-700">重试延迟:</span>
                    <span className="ml-2 text-gray-600">{formatRetryDelay(videoError.retryDelay)}</span>
                  </div>
                )}
              </div>

              <div>
                <span className="font-medium text-gray-700">原始错误信息:</span>
                <div className="mt-1 p-2 bg-gray-50 rounded border text-xs font-mono">
                  {videoError.message}
                </div>
              </div>
            </div>
          </details>

          {/* 错误报告 */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900 flex items-center">
                <Mail className="w-4 h-4 mr-2 text-gray-600" />
                错误报告
              </h3>
              <button
                onClick={copyReport}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
              >
                <Copy className="w-4 h-4" />
                <span>{copiedReport ? '已复制' : '复制报告'}</span>
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              如果问题持续存在，请复制错误报告并发送至技术支持邮箱。
            </p>
            <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded border">
              错误报告已生成，点击"复制报告"按钮获取完整信息。
            </div>
          </div>
        </div>

        {/* 底部操作 */}
        <div className="sticky bottom-0 bg-white border-t p-6 rounded-b-lg">
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              关闭
            </button>
            {videoError.canRetry && onRetry && (
              <button
                onClick={() => {
                  onRetry();
                  onClose();
                }}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>重试</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};