import React from 'react';
import {
  TrendingUp,
  DollarSign,
  Calculator,
  Info,
  BarChart3,
  Zap,
  Award,
  AlertTriangle
} from 'lucide-react';
import { EvoLinkModel } from './ModelSelector';

export interface CostAnalysisProps {
  selectedModel: EvoLinkModel;
  comparisonModels?: EvoLinkModel[];
  estimatedUsage?: {
    videosPerMonth: number;
    averageLength: number; // 分钟
  };
  className?: string;
}

export const CostAnalysis: React.FC<CostAnalysisProps> = ({
  selectedModel,
  comparisonModels = [],
  estimatedUsage = { videosPerMonth: 50, averageLength: 1 },
  className = ''
}) => {
  // 计算月度成本
  const calculateMonthlyCost = (model: EvoLinkModel) => {
    const perVideoCost = model.costPerCall + (model.costPerMinute || 0) * estimatedUsage.averageLength;
    return perVideoCost * estimatedUsage.videosPerMonth;
  };

  // 计算年度成本
  const calculateYearlyCost = (model: EvoLinkModel) => {
    return calculateMonthlyCost(model) * 12;
  };

  // 计算节省比例
  const calculateSavings = (model: EvoLinkModel, compareModel: EvoLinkModel) => {
    const modelCost = calculateMonthlyCost(model);
    const compareCost = calculateMonthlyCost(compareModel);
    return compareCost > 0 ? ((compareCost - modelCost) / compareCost * 100) : 0;
  };

  // 获取质量等级的颜色
  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'ultra': return 'text-purple-600 bg-purple-100';
      case 'premium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-blue-600 bg-blue-100';
      default: return 'text-green-600 bg-green-100';
    }
  };

  // 获取速度等级的颜色
  const getSpeedColor = (speed: string) => {
    switch (speed) {
      case 'instant': return 'text-yellow-500 bg-yellow-50';
      case 'fast': return 'text-green-500 bg-green-50';
      case 'medium': return 'text-blue-500 bg-blue-50';
      default: return 'text-gray-500 bg-gray-50';
    }
  };

  const monthlyCost = calculateMonthlyCost(selectedModel);
  const yearlyCost = calculateYearlyCost(selectedModel);

  return (
    <div className={`bg-white rounded-lg border border-gray-200/50 p-6 ${className}`}>
      {/* 头部 */}
      <div className="flex items-center space-x-2 mb-6">
        <Calculator className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">成本分析</h3>
      </div>

      {/* 当前选择的模型成本 */}
      <div className="bg-blue-50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="font-semibold text-gray-900">{selectedModel.name}</h4>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`px-2 py-1 text-xs rounded-full ${getQualityColor(selectedModel.quality)}`}>
                <Award className="w-3 h-3 inline mr-1" />
                {selectedModel.quality}
              </span>
              <span className={`px-2 py-1 text-xs rounded-full ${getSpeedColor(selectedModel.speed)}`}>
                <Zap className="w-3 h-3 inline mr-1" />
                {selectedModel.speed}
              </span>
              {selectedModel.discount > 0 && (
                <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
                  -{selectedModel.discount}%
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">
              ${monthlyCost.toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">/ 月</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">单次生成:</span>
            <span className="ml-2 font-medium text-gray-900">
              ${selectedModel.costPerCall}
            </span>
          </div>
          <div>
            <span className="text-gray-600">每分钟:</span>
            <span className="ml-2 font-medium text-gray-900">
              ${selectedModel.costPerMinute || 'N/A'}
            </span>
          </div>
          <div>
            <span className="text-gray-600">年度预估:</span>
            <span className="ml-2 font-medium text-gray-900">
              ${yearlyCost.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-gray-600">热门度:</span>
            <span className="ml-2 font-medium text-gray-900">
              ★ {selectedModel.popularity}/10
            </span>
          </div>
        </div>
      </div>

      {/* 使用估算 */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex items-center space-x-2 mb-3">
          <BarChart3 className="w-4 h-4 text-gray-600" />
          <h5 className="font-medium text-gray-900">使用估算</h5>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <label className="text-gray-600">每月视频数</label>
            <div className="font-medium text-gray-900">{estimatedUsage.videosPerMonth}</div>
          </div>
          <div>
            <label className="text-gray-600">平均长度</label>
            <div className="font-medium text-gray-900">{estimatedUsage.averageLength} 分钟</div>
          </div>
        </div>
      </div>

      {/* 成本对比 */}
      {comparisonModels.length > 0 && (
        <div className="mb-6">
          <h5 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
            <TrendingUp className="w-4 h-4" />
            <span>与其他模型对比</span>
          </h5>
          <div className="space-y-2">
            {comparisonModels.map((model) => {
              const modelMonthlyCost = calculateMonthlyCost(model);
              const savings = calculateSavings(selectedModel, model);
              const isMoreExpensive = monthlyCost > modelMonthlyCost;

              return (
                <div
                  key={model.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{model.name}</div>
                    <div className="text-sm text-gray-600">
                      ${model.costPerCall} / 次 • {model.quality} • {model.speed}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900">
                      ${modelMonthlyCost.toFixed(2)}/月
                    </div>
                    <div className={`text-sm ${isMoreExpensive ? 'text-red-600' : 'text-green-600'}`}>
                      {isMoreExpensive ? '+' : '-'}{Math.abs(savings).toFixed(1)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 优化建议 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <Info className="w-4 h-4 text-yellow-600 mt-0.5" />
          <div>
            <h5 className="font-medium text-yellow-800 mb-2">💡 成本优化建议</h5>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• 批量处理时可选择快速模型节省时间成本</li>
              <li>• 重要项目推荐使用高质量模型确保效果</li>
              <li>• 长期使用可联系 EvoLink 获取更大折扣</li>
              <li>• 测试阶段可使用标准质量模型降低成本</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 注意事项 */}
      <div className="mt-4 flex items-start space-x-2 text-xs text-gray-500">
        <AlertTriangle className="w-3 h-3 mt-0.5" />
        <p>
          * 以上成本为估算值，实际费用可能因视频长度、分辨率等因素有所差异。
          EvoLink 模型享有 20-70% 的成本折扣，实际付费会比标准 API 更低。
        </p>
      </div>
    </div>
  );
};

export default CostAnalysis;