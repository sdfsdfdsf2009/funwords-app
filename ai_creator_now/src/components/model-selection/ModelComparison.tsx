import React, { useState } from 'react';
import {
  Grid3X3,
  X,
  Info,
  Zap,
  DollarSign,
  Award,
  Clock,
  Star,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { EvoLinkModel } from './ModelSelector';

export interface ModelComparisonProps {
  models: EvoLinkModel[];
  maxModels?: number;
  className?: string;
}

export const ModelComparison: React.FC<ModelComparisonProps> = ({
  models,
  maxModels = 3,
  className = ''
}) => {
  const [selectedModels, setSelectedModels] = useState<EvoLinkModel[]>([]);

  const addModel = (model: EvoLinkModel) => {
    if (selectedModels.length < maxModels && !selectedModels.find(m => m.id === model.id)) {
      setSelectedModels([...selectedModels, model]);
    }
  };

  const removeModel = (modelId: string) => {
    setSelectedModels(selectedModels.filter(m => m.id !== modelId));
  };

  const getQualityScore = (quality: string) => {
    switch (quality) {
      case 'ultra': return 10;
      case 'premium': return 8;
      case 'high': return 6;
      case 'standard': return 4;
      default: return 2;
    }
  };

  const getSpeedScore = (speed: string) => {
    switch (speed) {
      case 'instant': return 10;
      case 'fast': return 8;
      case 'medium': return 6;
      case 'slow': return 4;
      default: return 2;
    }
  };

  const getCostScore = (cost: number) => {
    // 成本越低分数越高
    if (cost <= 0.05) return 10;
    if (cost <= 0.1) return 8;
    if (cost <= 0.2) return 6;
    if (cost <= 0.3) return 4;
    return 2;
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600 bg-green-100';
    if (score >= 6) return 'text-blue-600 bg-blue-100';
    if (score >= 4) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const availableModels = models.filter(
    model => !selectedModels.find(selected => selected.id === model.id)
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 模型选择器 */}
      {selectedModels.length < maxModels && (
        <div className="bg-white rounded-lg border border-gray-200/50 p-4">
          <div className="flex items-center space-x-2 mb-3">
            <Grid3X3 className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">添加模型对比</h3>
            <span className="text-sm text-gray-500">
              ({selectedModels.length}/{maxModels})
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {availableModels.map((model) => (
              <div
                key={model.id}
                onClick={() => addModel(model)}
                className="border border-gray-200 rounded-lg p-3 cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{model.name}</h4>
                  <div className="flex items-center space-x-1">
                    <Award className="w-4 h-4 text-purple-600" />
                    <Zap className="w-4 h-4 text-green-500" />
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  {model.quality} • {model.speed} • ${model.costPerCall}
                </div>
                <div className="flex items-center mt-1">
                  <Star className="w-3 h-3 text-yellow-500 mr-1" />
                  <span className="text-xs text-gray-500">{model.popularity}/10</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 对比表格 */}
      {selectedModels.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200/50 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">模型对比</h3>
              <div className="text-sm text-gray-500">
                最多对比 {maxModels} 个模型
              </div>
            </div>
          </div>

          {/* 选中的模型卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
            {selectedModels.map((model) => (
              <div
                key={model.id}
                className="border border-gray-200 rounded-lg p-4 relative"
              >
                {/* 删除按钮 */}
                <button
                  onClick={() => removeModel(model.id)}
                  className="absolute top-2 right-2 text-gray-400 hover:text-red-600"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* 模型基本信息 */}
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-900 mb-2">{model.name}</h4>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full">
                      <Award className="w-3 h-3 inline mr-1" />
                      {model.quality}
                    </span>
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                      <Zap className="w-3 h-3 inline mr-1" />
                      {model.speed}
                    </span>
                    {model.discount > 30 && (
                      <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
                        -{model.discount}%
                      </span>
                    )}
                  </div>
                </div>

                {/* 详细规格 */}
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">单次成本</span>
                    <span className="font-medium text-gray-900">${model.costPerCall}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">每分钟</span>
                    <span className="font-medium text-gray-900">
                      ${model.costPerMinute || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">最大分辨率</span>
                    <span className="font-medium text-gray-900">
                      {model.specifications.maxResolution || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">最大长度</span>
                    <span className="font-medium text-gray-900">
                      {model.specifications.maxLength ? `${model.specifications.maxLength}秒` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">热门度</span>
                    <div className="flex items-center space-x-1">
                      <Star className="w-3 h-3 text-yellow-500" />
                      <span className="font-medium text-gray-900">{model.popularity}/10</span>
                    </div>
                  </div>
                </div>

                {/* 评分雷达图（简化版） */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h5 className="text-sm font-medium text-gray-900 mb-3">综合评分</h5>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">质量</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-purple-600"
                            style={{ width: `${getQualityScore(model.quality) * 10}%` }}
                          />
                        </div>
                        <span className={`px-2 py-1 text-xs rounded ${getScoreColor(getQualityScore(model.quality))}`}>
                          {getQualityScore(model.quality)}/10
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">速度</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-green-600"
                            style={{ width: `${getSpeedScore(model.speed) * 10}%` }}
                          />
                        </div>
                        <span className={`px-2 py-1 text-xs rounded ${getScoreColor(getSpeedScore(model.speed))}`}>
                          {getSpeedScore(model.speed)}/10
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">成本</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-blue-600"
                            style={{ width: `${getCostScore(model.costPerCall) * 10}%` }}
                          />
                        </div>
                        <span className={`px-2 py-1 text-xs rounded ${getScoreColor(getCostScore(model.costPerCall))}`}>
                          {getCostScore(model.costPerCall)}/10
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 特性列表 */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h5 className="text-sm font-medium text-gray-900 mb-2">主要特性</h5>
                  <div className="space-y-1">
                    {model.features.slice(0, 4).map((feature, index) => (
                      <div key={index} className="flex items-center space-x-1">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        <span className="text-xs text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 推荐场景 */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h5 className="text-sm font-medium text-gray-900 mb-2">推荐场景</h5>
                  <div className="flex flex-wrap gap-1">
                    {model.recommendedFor.slice(0, 2).map((scenario, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded"
                      >
                        {scenario}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 对比总结 */}
      {selectedModels.length >= 2 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <Info className="w-4 h-4 text-blue-600 mt-0.5" />
            <div>
              <h5 className="font-medium text-blue-800 mb-2">对比总结</h5>
              <div className="text-sm text-blue-700 space-y-1">
                <p>
                  • 最经济选择: <strong>{selectedModels.reduce((min, model) =>
                    model.costPerCall < min.costPerCall ? model : min
                  ).name}</strong>
                </p>
                <p>
                  • 最高质量: <strong>{selectedModels.reduce((best, model) =>
                    getQualityScore(model.quality) > getQualityScore(best.quality) ? model : best
                  ).name}</strong>
                </p>
                <p>
                  • 最快速度: <strong>{selectedModels.reduce((fastest, model) =>
                    getSpeedScore(model.speed) > getSpeedScore(fastest.speed) ? model : fastest
                  ).name}</strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelComparison;