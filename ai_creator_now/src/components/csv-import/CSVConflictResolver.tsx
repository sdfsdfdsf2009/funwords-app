import React, { useState, useEffect } from 'react';
import { AlertTriangle, Info, RefreshCw, PlusCircle, Edit3, Trash2 } from 'lucide-react';
import { CSVSceneData, Scene } from '../../types';

interface ConflictInfo {
  csvScene: CSVSceneData;
  existingScene?: Scene;
  conflictType: 'duplicate' | 'existing';
}

interface CSVConflictResolverProps {
  conflicts: ConflictInfo[];
  onResolve: (strategy: ConflictStrategy, options: ConflictOptions) => void;
  onCancel: () => void;
}

export type ConflictStrategy =
  | 'skip_duplicates'     // Skip duplicate scenes (current behavior)
  | 'renumber_duplicates' // Auto-renumber duplicates
  | 'update_existing'     // Update existing scenes
  | 'replace_all'        // Replace all scenes in project
  | 'merge_strategy';     // Intelligent merge

export interface ConflictOptions {
  preserveExisting?: boolean;
  startNumber?: number;
  updateFields?: string[];
  confirmDestructive?: boolean;
}

const CSVConflictResolver: React.FC<CSVConflictResolverProps> = ({
  conflicts,
  onResolve,
  onCancel
}) => {
  const [selectedStrategy, setSelectedStrategy] = useState<ConflictStrategy>('skip_duplicates');
  const [options, setOptions] = useState<ConflictOptions>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [conflictsPreview, setConflictsPreview] = useState<ConflictInfo[]>(conflicts);

  useEffect(() => {
    setConflictsPreview(conflicts);
  }, [conflicts]);

  const strategies = [
    {
      id: 'skip_duplicates' as ConflictStrategy,
      title: '跳过重复场景',
      description: '保留现有场景，只导入新的场景编号',
      icon: <Trash2 className="w-5 h-5" />,
      safe: true,
      recommended: true
    },
    {
      id: 'renumber_duplicates' as ConflictStrategy,
      title: '自动重新编号',
      description: '为新场景分配连续的编号（从下一个可用编号开始）',
      icon: <RefreshCw className="w-5 h-5" />,
      safe: true,
      recommended: false
    },
    {
      id: 'update_existing' as ConflictStrategy,
      title: '更新现有场景',
      description: '用CSV中的新内容替换现有场景的内容',
      icon: <Edit3 className="w-5 h-5" />,
      safe: false,
      recommended: false
    },
    {
      id: 'merge_strategy' as ConflictStrategy,
      title: '智能合并',
      description: '根据字段内容智能决定更新或保留',
      icon: <PlusCircle className="w-5 h-5" />,
      safe: false,
      recommended: false
    }
  ];

  const handleStrategyChange = (strategy: ConflictStrategy) => {
    setSelectedStrategy(strategy);

    // Set default options based on strategy
    const defaultOptions: ConflictOptions = {};

    switch (strategy) {
      case 'renumber_duplicates':
        // Calculate next available scene number
        const maxSceneNumber = Math.max(...conflicts.map(c => c.csvScene.sceneNumber));
        defaultOptions.startNumber = maxSceneNumber + 1;
        break;

      case 'update_existing':
        defaultOptions.updateFields = ['imagePrompt', 'videoPrompt'];
        break;

      case 'merge_strategy':
        defaultOptions.preserveExisting = true;
        defaultOptions.updateFields = ['imagePrompt', 'videoPrompt'];
        break;
    }

    setOptions(defaultOptions);
  };

  const handleResolve = () => {
    if (selectedStrategy === 'update_existing' || selectedStrategy === 'merge_strategy') {
      // For destructive operations, require confirmation
      if (!options.confirmDestructive) {
        setOptions({ ...options, confirmDestructive: true });
        return;
      }
    }

    onResolve(selectedStrategy, options);
  };

  const getConflictSummary = () => {
    const duplicateCount = conflicts.filter(c => c.existingScene).length;
    const newCount = conflicts.filter(c => !c.existingScene).length;

    return {
      total: conflicts.length,
      duplicates: duplicateCount,
      new: newCount
    };
  };

  const summary = getConflictSummary();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                检测到场景编号冲突
              </h2>
              <p className="text-gray-600">
                CSV文件中包含与现有项目冲突的场景编号。请选择如何处理这些冲突。
              </p>
            </div>
          </div>
        </div>

        {/* Conflict Summary */}
        <div className="p-6 bg-amber-50 border-b border-amber-200">
          <div className="flex items-center space-x-2 mb-3">
            <Info className="w-5 h-5 text-amber-600" />
            <span className="font-medium text-amber-900">冲突详情</span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-900">{summary.total}</div>
              <div className="text-amber-700">总场景数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{summary.duplicates}</div>
              <div className="text-red-700">重复编号</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{summary.new}</div>
              <div className="text-green-700">新场景</div>
            </div>
          </div>
        </div>

        {/* Strategy Selection */}
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">选择处理策略</h3>
          <div className="space-y-3">
            {strategies.map((strategy) => (
              <button
                key={strategy.id}
                onClick={() => handleStrategyChange(strategy.id)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  selectedStrategy === strategy.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${
                    selectedStrategy === strategy.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {strategy.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">
                        {strategy.title}
                      </span>
                      {strategy.recommended && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                          推荐
                        </span>
                      )}
                      {strategy.safe && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                          安全
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {strategy.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Advanced Options */}
        {selectedStrategy !== 'skip_duplicates' && (
          <div className="p-6 border-t border-gray-200">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <span>高级选项</span>
              <span className={`transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-4">
                {selectedStrategy === 'renumber_duplicates' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      起始编号
                    </label>
                    <input
                      type="number"
                      value={options.startNumber || ''}
                      onChange={(e) => setOptions({
                        ...options,
                        startNumber: parseInt(e.target.value) || 1
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="1"
                    />
                  </div>
                )}

                {selectedStrategy === 'update_existing' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      更新字段
                    </label>
                    <div className="space-y-2">
                      {['imagePrompt', 'videoPrompt'].map((field) => (
                        <label key={field} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={options.updateFields?.includes(field) || false}
                            onChange={(e) => {
                              const fields = options.updateFields || [];
                              if (e.target.checked) {
                                setOptions({
                                  ...options,
                                  updateFields: [...fields, field]
                                });
                              } else {
                                setOptions({
                                  ...options,
                                  updateFields: fields.filter(f => f !== field)
                                });
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">
                            {field === 'imagePrompt' ? '图片提示词' : '视频提示词'}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {(selectedStrategy === 'update_existing' || selectedStrategy === 'merge_strategy') && (
                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={options.confirmDestructive || false}
                        onChange={(e) => setOptions({
                          ...options,
                          confirmDestructive: e.target.checked
                        })}
                        className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                      <span className="text-sm text-red-700">
                        我确认要覆盖现有场景的内容
                      </span>
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            取消导入
          </button>
          <button
            onClick={handleResolve}
            disabled={(selectedStrategy === 'update_existing' || selectedStrategy === 'merge_strategy') && !options.confirmDestructive}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {selectedStrategy === 'skip_duplicates' ? '继续导入' : '应用策略'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CSVConflictResolver;