import React, { useState, useEffect } from 'react'
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader,
  X,
  TrendingUp,
  FileText,
  Clock
} from 'lucide-react'
import { BatchImportResult } from '@/pages/api/scenes/batch-import'
import { CSVImportEnhancedService } from '@/services/csvImportEnhanced'

interface ImportProgressModalProps {
  isOpen: boolean
  onClose: () => void
  isProcessing: boolean
  result: BatchImportResult | null
  error: string | null
  progress?: {
    current: number
    total: number
    currentScene?: string
  }
}

export function ImportProgressModal({
  isOpen,
  onClose,
  isProcessing,
  result,
  error,
  progress
}: ImportProgressModalProps) {
  const [showDetails, setShowDetails] = useState(false)

  if (!isOpen) return null

  const renderProcessingState = () => (
    <div className="text-center py-8">
      <div className="relative inline-flex items-center justify-center w-16 h-16 mb-4">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
        <div className="absolute inset-0 border-4 border-blue-200 rounded-full animate-pulse"></div>
      </div>

      <h3 className="text-lg font-medium text-gray-900 mb-2">
        正在导入场景...
      </h3>

      {progress && (
        <div className="mb-4">
          <div className="text-sm text-gray-600 mb-2">
            处理进度: {progress.current} / {progress.total}
          </div>

          {progress.currentScene && (
            <div className="text-xs text-gray-500">
              当前场景: {progress.currentScene}
            </div>
          )}

          <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      <p className="text-sm text-gray-500">
        请稍候，正在处理您的场景数据...
      </p>
    </div>
  )

  const renderErrorState = () => (
    <div className="text-center py-8">
      <div className="inline-flex items-center justify-center w-16 h-16 mb-4 bg-red-100 rounded-full">
        <XCircle className="w-8 h-8 text-red-600" />
      </div>

      <h3 className="text-lg font-medium text-gray-900 mb-2">
        导入失败
      </h3>

      <p className="text-sm text-gray-600 mb-4">
        {error || '导入过程中发生未知错误'}
      </p>

      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left">
        <div className="flex items-center space-x-2 mb-2">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span className="text-sm font-medium text-red-800">错误详情</span>
        </div>
        <p className="text-xs text-red-700">
          {error || '无法完成导入操作，请检查文件格式和网络连接，然后重试。'}
        </p>
      </div>
    </div>
  )

  const renderSuccessState = () => {
    if (!result) return null

    const formattedResult = CSVImportEnhancedService.formatImportResult(result)

    return (
      <div className="py-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4 bg-green-100 rounded-full">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>

          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {formattedResult.title}
          </h3>

          <p className="text-sm text-gray-600">
            {formattedResult.message}
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-600">
              {result.summary.created}
            </div>
            <div className="text-xs text-green-700">新建场景</div>
          </div>

          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {result.summary.updated}
            </div>
            <div className="text-xs text-blue-700">更新场景</div>
          </div>

          <div className="bg-amber-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-amber-600">
              {result.summary.skipped}
            </div>
            <div className="text-xs text-amber-700">跳过场景</div>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-gray-600">
              {result.summary.conflicts}
            </div>
            <div className="text-xs text-gray-700">解决冲突</div>
          </div>
        </div>

        {/* Details */}
        <div className="border-t pt-4">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="text-sm font-medium text-gray-700">
              详细信息
            </span>
            <TrendingUp
              className={`w-4 h-4 text-gray-500 transition-transform ${
                showDetails ? 'rotate-180' : ''
              }`}
            />
          </button>

          {showDetails && (
            <div className="mt-4 space-y-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <h4 className="text-sm font-medium text-gray-700 mb-2">处理详情</h4>
                <ul className="space-y-1">
                  {formattedResult.details.map((detail, index) => (
                    <li key={index} className="text-xs text-gray-600 flex items-center space-x-2">
                      <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Failed Scenes */}
              {result.results.failed.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-red-800 mb-2">
                    失败的场景 ({result.results.failed.length})
                  </h4>
                  <ul className="space-y-1 max-h-32 overflow-y-auto">
                    {result.results.failed.map((failed, index) => (
                      <li key={index} className="text-xs text-red-700">
                        场景 {failed.sceneNumber}: {failed.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Successful Scenes */}
              {result.results.successful.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-green-800 mb-2">
                    成功处理的场景 ({result.results.successful.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                    {result.results.successful.slice(0, 10).map((success, index) => (
                      <div key={index} className="text-xs text-green-700 flex items-center space-x-2">
                        <CheckCircle className="w-3 h-3" />
                        <span>场景 {success.sceneNumber}: {success.title}</span>
                      </div>
                    ))}
                    {result.results.successful.length > 10 && (
                      <div className="text-xs text-green-600 col-span-full">
                        ...还有 {result.results.successful.length - 10} 个场景
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                CSV导入进度
              </h2>
            </div>

            {!isProcessing && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {isProcessing && renderProcessingState()}
          {error && !isProcessing && renderErrorState()}
          {result && !isProcessing && !error && renderSuccessState()}
        </div>

        {/* Footer */}
        {!isProcessing && (
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {result ? '完成' : '关闭'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ImportProgressModal