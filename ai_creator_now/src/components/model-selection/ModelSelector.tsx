import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronDown,
  Info,
  Zap,
  Clock,
  DollarSign,
  Award,
  Star,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Filter,
  Grid
} from 'lucide-react';

// EvoLink模型定义
export interface EvoLinkModel {
  id: string;
  name: string;
  provider: string;
  type: 'video' | 'image' | 'both';
  quality: 'standard' | 'high' | 'premium' | 'ultra';
  speed: 'slow' | 'medium' | 'fast' | 'instant';
  costPerCall: number;
  costPerMinute?: number;
  discount: number; // 折扣百分比
  description: string;
  features: string[];
  specifications: {
    maxResolution?: string;
    aspectRatios?: string[];
    maxLength?: number; // 视频最大长度(秒)
    formats?: string[];
  };
  availability: 'available' | 'beta' | 'coming_soon';
  popularity: number; // 热门度 1-10
  recommendedFor: string[]; // 推荐使用场景
  technology?: string; // 底层技术
}

// 预定义的EvoLink模型数据
const EVOLINK_MODELS: EvoLinkModel[] = [
  {
    id: 'sora-2-pro',
    name: 'Sora 2 Pro',
    provider: 'OpenAI',
    type: 'video',
    quality: 'ultra',
    speed: 'slow',
    costPerCall: 0.50,
    costPerMinute: 0.10,
    discount: 25,
    description: '顶级视频生成模型，提供电影级画质和复杂动作理解',
    features: [
      '电影级4K画质',
      '复杂场景理解',
      '长视频生成',
      '物理规律模拟',
      '多角色交互'
    ],
    specifications: {
      maxResolution: '4K',
      aspectRatios: ['16:9', '9:16', '1:1'],
      maxLength: 120,
      formats: ['MP4', 'WebM']
    },
    availability: 'available',
    popularity: 10,
    recommendedFor: ['专业视频制作', '电影预告片', '广告制作'],
    technology: 'Diffusion Transformer'
  },
  {
    id: 'veo-3.1-fast',
    name: 'VEO 3.1 Fast',
    provider: 'Google',
    type: 'video',
    quality: 'premium',
    speed: 'fast',
    costPerCall: 0.30,
    costPerMinute: 0.06,
    discount: 30,
    description: 'Google最新视频生成模型，平衡质量与速度',
    features: [
      '高质量视频生成',
      '快速处理',
      '语义理解强',
      '风格一致性',
      '色彩还原准确'
    ],
    specifications: {
      maxResolution: '2K',
      aspectRatios: ['16:9', '9:16', '1:1'],
      maxLength: 60,
      formats: ['MP4']
    },
    availability: 'available',
    popularity: 9,
    recommendedFor: ['内容创作', '社交媒体', '快速原型'],
    technology: 'Video Diffusion'
  },
  {
    id: 'nano-banana',
    name: 'Nano Banana',
    provider: 'EvoLink',
    type: 'video',
    quality: 'standard',
    speed: 'instant',
    costPerCall: 0.05,
    costPerMinute: 0.01,
    discount: 70,
    description: '轻量级快速模型，适合实时生成和大量处理',
    features: [
      '实时生成',
      '极低成本',
      '批量处理',
      '快速预览',
      '基础动画效果'
    ],
    specifications: {
      maxResolution: '720p',
      aspectRatios: ['16:9', '9:16'],
      maxLength: 30,
      formats: ['MP4', 'GIF']
    },
    availability: 'available',
    popularity: 8,
    recommendedFor: ['预览制作', '批量处理', '成本敏感项目']
  },
  {
    id: 'seedream-4.0',
    name: 'Seedream 4.0',
    provider: 'EvoLink',
    type: 'both',
    quality: 'high',
    speed: 'medium',
    costPerCall: 0.25,
    costPerMinute: 0.05,
    discount: 40,
    description: '新一代多模态模型，图像和视频生成并重',
    features: [
      '图像视频双模态',
      '创意风格多样',
      '细节还原出色',
      '风格迁移',
      '智能补帧'
    ],
    specifications: {
      maxResolution: '2K',
      aspectRatios: ['16:9', '9:16', '1:1'],
      maxLength: 45,
      formats: ['MP4', 'PNG', 'JPG']
    },
    availability: 'available',
    popularity: 9,
    recommendedFor: ['创意项目', '混合媒体', '艺术创作']
  },
  // 添加更多模型...
  {
    id: 'midjourney-v6-video',
    name: 'Midjourney V6 Video',
    provider: 'Midjourney',
    type: 'video',
    quality: 'premium',
    speed: 'medium',
    costPerCall: 0.40,
    costPerMinute: 0.08,
    discount: 20,
    description: 'Midjourney视频版本，艺术风格突出',
    features: [
      '艺术风格突出',
      '美学构图',
      '创意性画面',
      '色彩表现力强',
      '风格多样化'
    ],
    specifications: {
      maxResolution: '2K',
      aspectRatios: ['16:9', '9:16', '1:1'],
      maxLength: 60,
      formats: ['MP4']
    },
    availability: 'beta',
    popularity: 8,
    recommendedFor: ['艺术创作', '风格化视频', '创意广告']
  },
  {
    id: 'stable-video-diffusion',
    name: 'Stable Video Diffusion',
    provider: 'Stability AI',
    type: 'video',
    quality: 'high',
    speed: 'medium',
    costPerCall: 0.20,
    costPerMinute: 0.04,
    discount: 50,
    description: '开源视频模型的商业优化版本',
    features: [
      '开源技术',
      '成本效益高',
      '稳定性好',
      '社区支持强',
      '自定义能力强'
    ],
    specifications: {
      maxResolution: '1080p',
      aspectRatios: ['16:9', '9:16'],
      maxLength: 30,
      formats: ['MP4']
    },
    availability: 'available',
    popularity: 7,
    recommendedFor: ['开发项目', '研究用途', '成本控制']
  }
];

export interface ModelSelectorProps {
  taskType: 'image' | 'video' | 'both';
  onModelSelect: (model: EvoLinkModel) => void;
  selectedModelId?: string;
  className?: string;
  disabled?: boolean;
  showCostAnalysis?: boolean;
  showRecommendations?: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  taskType,
  onModelSelect,
  selectedModelId,
  className = '',
  disabled = false,
  showCostAnalysis = true,
  showRecommendations = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredModels, setFilteredModels] = useState<EvoLinkModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<EvoLinkModel | null>(null);
  const [sortBy, setSortBy] = useState<'popularity' | 'cost' | 'quality' | 'speed'>('popularity');
  const [filterQuality, setFilterQuality] = useState<string>('all');

  // 过滤模型
  const filterModels = useCallback(() => {
    let models = EVOLINK_MODELS.filter(model => {
      // 根据任务类型过滤
      if (taskType !== 'both' && model.type !== taskType && model.type !== 'both') {
        return false;
      }

      // 只显示可用模型
      if (model.availability !== 'available') {
        return false;
      }

      // 质量过滤
      if (filterQuality !== 'all' && model.quality !== filterQuality) {
        return false;
      }

      return true;
    });

    // 排序
    models.sort((a, b) => {
      switch (sortBy) {
        case 'cost':
          return a.costPerCall - b.costPerCall;
        case 'quality':
          const qualityOrder = { 'standard': 1, 'high': 2, 'premium': 3, 'ultra': 4 };
          return qualityOrder[b.quality] - qualityOrder[a.quality];
        case 'speed':
          const speedOrder = { 'slow': 1, 'medium': 2, 'fast': 3, 'instant': 4 };
          return speedOrder[b.speed] - speedOrder[a.speed];
        case 'popularity':
        default:
          return b.popularity - a.popularity;
      }
    });

    setFilteredModels(models);
  }, [taskType, sortBy, filterQuality]);

  useEffect(() => {
    filterModels();
  }, [filterModels]);

  useEffect(() => {
    // 初始化选中的模型
    if (selectedModelId) {
      const model = EVOLINK_MODELS.find(m => m.id === selectedModelId);
      if (model) {
        setSelectedModel(model);
      }
    } else if (filteredModels.length > 0 && !selectedModel) {
      // 默认选择第一个推荐模型
      const recommended = filteredModels.find(m => m.popularity >= 8);
      const defaultModel = recommended || filteredModels[0];
      setSelectedModel(defaultModel);
      onModelSelect(defaultModel);
    }
  }, [selectedModelId, filteredModels, selectedModel, onModelSelect]);

  const handleModelSelect = (model: EvoLinkModel) => {
    console.log('🎯 ModelSelector: 用户选择了模型', model.name, model.id);
    setSelectedModel(model);
    onModelSelect(model);
    setIsOpen(false);
  };

  const getQualityIcon = (quality: string) => {
    switch (quality) {
      case 'ultra':
        return <Award className="w-4 h-4 text-purple-600" />;
      case 'premium':
        return <Star className="w-4 h-4 text-yellow-600" />;
      case 'high':
        return <TrendingUp className="w-4 h-4 text-blue-600" />;
      default:
        return <CheckCircle className="w-4 h-4 text-green-600" />;
    }
  };

  const getSpeedIcon = (speed: string) => {
    switch (speed) {
      case 'instant':
        return <Zap className="w-4 h-4 text-yellow-500" />;
      case 'fast':
        return <Zap className="w-4 h-4 text-green-500" />;
      case 'medium':
        return <Clock className="w-4 h-4 text-blue-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getCostColor = (cost: number) => {
    if (cost <= 0.1) return 'text-green-600';
    if (cost <= 0.3) return 'text-blue-600';
    if (cost <= 0.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className={`relative ${className}`}>
      {/* 选择按钮 */}
      <button
        type="button"
        onClick={() => {
          console.log('🖱️ ModelSelector: 用户点击了选择按钮, disabled:', disabled, 'isOpen:', isOpen);
          if (!disabled) {
            setIsOpen(!isOpen);
          }
        }}
        disabled={disabled}
        className={`w-full px-4 py-3 bg-white border-2 rounded-lg flex items-center justify-between transition-all ${
          disabled
            ? 'bg-gray-100 border-gray-300 cursor-not-allowed'
            : 'border-gray-300 hover:border-blue-500 cursor-pointer'
        }`}
      >
        {selectedModel ? (
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              {getQualityIcon(selectedModel.quality)}
              <getSpeedIcon speed={selectedModel.speed} />
            </div>
            <div className="text-left">
              <div className="font-medium text-gray-900">{selectedModel.name}</div>
              <div className="text-sm text-gray-500">
                {selectedModel.quality} • {selectedModel.speed} • ${selectedModel.costPerCall}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-2 text-gray-500">
            <Grid className="w-5 h-5" />
            <span>选择AI模型</span>
          </div>
        )}
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${
          isOpen ? 'rotate-180' : ''
        }`} />
      </button>

      {/* 下拉面板 */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-300 rounded-lg shadow-lg max-h-96 overflow-hidden"
             onClick={(e) => e.stopPropagation()}
        >
          {/* 头部和控制 */}
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">选择AI模型</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            {/* 控制选项 */}
            <div className="flex space-x-4">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="popularity">热门度</option>
                <option value="cost">价格</option>
                <option value="quality">质量</option>
                <option value="speed">速度</option>
              </select>

              <select
                value={filterQuality}
                onChange={(e) => setFilterQuality(e.target.value)}
                className="px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">所有质量</option>
                <option value="ultra">顶级</option>
                <option value="premium">高级</option>
                <option value="high">高质</option>
                <option value="standard">标准</option>
              </select>
            </div>
          </div>

          {/* 模型列表 */}
          <div className="max-h-80 overflow-y-auto">
            {filteredModels.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>没有找到符合条件的模型</p>
              </div>
            ) : (
              filteredModels.map((model) => (
                <div
                  key={model.id}
                  onClick={() => handleModelSelect(model)}
                  className={`relative p-4 border-b border-gray-100 cursor-pointer transition-colors hover:bg-blue-50 ${
                    selectedModel?.id === model.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 pr-2">
                      {/* 模型名称和标签 */}
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-semibold text-gray-900">{model.name}</h4>
                        <div className="flex items-center space-x-1">
                          {getQualityIcon(model.quality)}
                          <getSpeedIcon speed={model.speed} />
                          {model.discount > 30 && (
                            <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
                              -{model.discount}%
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 描述 */}
                      <p className="text-sm text-gray-600 mb-2">{model.description}</p>

                      {/* 特性标签 */}
                      <div className="flex flex-wrap gap-1 mb-2">
                        {model.features.slice(0, 3).map((feature, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                          >
                            {feature}
                          </span>
                        ))}
                        {model.features.length > 3 && (
                          <span className="px-2 py-1 text-xs text-gray-500">
                            +{model.features.length - 3} 更多
                          </span>
                        )}
                      </div>

                      {/* 规格信息 */}
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center space-x-3">
                          <span className="flex items-center space-x-1">
                            <DollarSign className="w-3 h-3" />
                            <span className={getCostColor(model.costPerCall)}>
                              ${model.costPerCall}/次
                            </span>
                          </span>
                          {model.specifications.maxLength && (
                            <span>{model.specifications.maxLength}秒</span>
                          )}
                          {model.specifications.maxResolution && (
                            <span>{model.specifications.maxResolution}</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="text-yellow-500">★</span>
                          <span>{model.popularity}/10</span>
                        </div>
                      </div>
                    </div>

                    {/* 推荐标识 - 移到右侧，确保不遮挡点击区域 */}
                    {model.popularity >= 9 && (
                      <div className="absolute top-2 right-2 z-10">
                        <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full flex items-center space-x-1 pointer-events-none">
                          <Star className="w-3 h-3" />
                          <span>推荐</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 底部说明 */}
          {showCostAnalysis && (
            <div className="p-4 bg-blue-50 border-t border-blue-100">
              <div className="flex items-start space-x-2">
                <Info className="w-4 h-4 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">💡 成本优化提示</p>
                  <p className="text-xs">
                    EvoLink模型平均节省20-70%成本。根据使用量可享受更大折扣。
                    批量处理时可选择快速模型，重要项目推荐高质量模型。
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 遮罩层 */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default ModelSelector;