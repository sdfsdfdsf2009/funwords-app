import React, { useState } from 'react'
import {
  AlertCircle,
  CheckCircle,
  SkipForward,
  RefreshCw,
  Edit3,
  GitMerge,
  X,
  Info,
  Clock,
  CheckSquare
} from 'lucide-react'
import {
  ConflictDetectionResult,
  ConflictResolutionStrategy,
  CSVImportEnhancedService
} from '@/services/csvImportEnhanced'

interface ConflictResolutionModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  conflicts: ConflictDetectionResult
  onResolutionSelected: (strategy: ConflictResolutionStrategy) => void
  csvData: any[]
}

export function ConflictResolutionModal({
  isOpen,
  onClose,
  projectId,
  conflicts,
  onResolutionSelected,
  csvData
}: ConflictResolutionModalProps) {
  const [selectedStrategy, setSelectedStrategy] = useState<ConflictResolutionStrategy>(
    CSVImportEnhancedService.getDefaultStrategy(conflicts.hasConflicts)
  )
  const [isProcessing, setIsProcessing] = useState(false)

  if (!isOpen) return null

  const strategies = conflicts.strategyRecommendations

  const handleStrategySelect = (strategy: ConflictResolutionStrategy) => {
    setSelectedStrategy(strategy)
  }

  const handleConfirm = async () => {
    setIsProcessing(true)
    try {
      await onResolutionSelected(selectedStrategy)
    } finally {
      setIsProcessing(false)
    }
  }

  const getPreview = (strategy: ConflictResolutionStrategy) => {
    const preview = CSVImportEnhancedService.previewImportResult(strategy, conflicts.conflicts)
    return preview
  }

  const getStrategyIcon = (strategy: ConflictResolutionStrategy) => {
    return CSVImportEnhancedService.getStrategyIcon(strategy)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-6 h-6 text-amber-500" />
              <h2 className="text-xl font-semibold text-gray-900">
                检测到场景编号冲突
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="mt-2 text-gray-600">
            在您的CSV文件中发现了 {conflicts.conflicts.length} 个场景编号与现有项目冲突。
            请选择如何处理这些冲突。
          </p>
        </div>

        {/* Conflict Details */}
        <div className="p-6 bg-amber-50 border-b border-amber-200">
          <div className="flex items-center space-x-2 mb-3">
            <Info className="w-4 h-4 text-amber-600" />
            <span className="font-medium text-amber-800">冲突详情</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">CSV场景数量：</span>
              <span className="font-medium ml-2">{csvData.length}</span>
            </div>
            <div>
              <span className="text-gray-600">冲突场景：</span>
              <span className="font-medium text-red-600 ml-2">{conflicts.conflicts.length}</span>
            </div>
          </div>

          {/* List of conflicting scenes */}
          <div className="mt-4 max-h-32 overflow-y-auto">
            <div className="text-xs text-gray-500 mb-2">冲突场景编号：</div>
            <div className="flex flex-wrap gap-2">
              {conflicts.conflicts.map((conflict, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium"
                >
                  场景 {conflict.sceneNumber}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Strategy Options */}
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">选择解决策略</h3>

          <div className="space-y-4">
            {strategies.map((strategy) => (
              <div
                key={strategy.strategy}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedStrategy === strategy.strategy
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleStrategySelect(strategy.strategy)}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    <span className="text-2xl">{strategy.icon}</span>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900 flex items-center">
                        {strategy.name}
                        {strategy.recommended && (
                          <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                            推荐
                          </span>
                        )}
                      </h4>

                      <div className="flex items-center">
                        {selectedStrategy === strategy.strategy && (
                          <CheckCircle className="w-5 h-5 text-blue-500 mr-2" />
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mt-1">
                      {strategy.description}
                    </p>

                    {/* Impact Summary */}
                    <div className="mt-3 flex items-center space-x-4 text-xs text-gray-500">
                      <span>➕ 新建: {strategy.impact.created}</span>
                      <span>🔄 更新: {strategy.impact.updated}</span>
                      <span>⏭️ 跳过: {strategy.impact.skipped}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Strategy Preview */}
        <div className="p-6 bg-gray-50 border-t border-gray-200">
          <h4 className="font-medium text-gray-900 mb-2">策略预览</h4>
          <p className="text-sm text-gray-600 mb-3">
            {CSVImportEnhancedService.getStrategyDescription(selectedStrategy)}
          </p>

          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>预计时间: {getPreview(selectedStrategy).estimatedTime}</span>
            </div>
            <div className="flex items-center space-x-1">
              <CheckSquare className="w-3 h-3" />
              <span>置信度: {getPreview(selectedStrategy).confidence}%</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-200 bg-white">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={isProcessing}
            >
              取消导入
            </button>

            <button
              onClick={handleConfirm}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isProcessing}
            >
              {isProcessing ? '处理中...' : `确认使用 ${strategies.find(s => s.strategy === selectedStrategy)?.name}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConflictResolutionModal