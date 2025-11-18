import React, { useState, useEffect, useCallback } from 'react';
import { Lightbulb, TrendingUp, Zap, Clock, Award, Settings, X, ChevronRight, Sparkles } from 'lucide-react';

interface AIRecommendation {
  id: string;
  type: 'content' | 'workflow' | 'setting' | 'template';
  title: string;
  description: string;
  confidence: number;
  category: string;
  action?: {
    type: 'navigate' | 'apply' | 'create';
    target: string;
    params?: any;
  };
  benefits: string[];
  estimatedTime?: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface UserBehaviorPattern {
  frequentActions: string[];
  preferredStyles: string[];
  commonWorkflows: string[];
  timePatterns: string[];
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
}

interface AIRecommendationEngineProps {
  userId?: string;
  currentProject?: any;
  userPreferences?: any;
  onRecommendationApply?: (recommendation: AIRecommendation) => void;
  className?: string;
}

export const AIRecommendationEngine: React.FC<AIRecommendationEngineProps> = ({
  userId,
  currentProject,
  userPreferences,
  onRecommendationApply,
  className = ""
}) => {
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userPatterns, setUserPatterns] = useState<UserBehaviorPattern | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [enabledCategories, setEnabledCategories] = useState<string[]>([
    'content', 'workflow', 'setting', 'template'
  ]);
  const [dismissedRecommendations, setDismissedRecommendations] = useState<Set<string>>(new Set());

  // 模拟AI分析用户行为模式
  const analyzeUserBehavior = useCallback(async (): Promise<UserBehaviorPattern> => {
    // 这里应该连接到实际的分析服务
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          frequentActions: ['video-generation', 'scene-editing', 'export'],
          preferredStyles: ['modern', 'professional', 'creative'],
          commonWorkflows: ['quick-create', 'batch-processing', 'template-based'],
          timePatterns: ['morning', 'weekend'],
          skillLevel: 'intermediate'
        });
      }, 1000);
    });
  }, []);

  // 生成AI推荐
  const generateRecommendations = useCallback(async (patterns: UserBehaviorPattern): Promise<AIRecommendation[]> => {
    const baseRecommendations: AIRecommendation[] = [
      {
        id: 'ai-template-suggestion',
        type: 'template',
        title: '推荐使用专业视频模板',
        description: '基于您的使用习惯，我们发现使用预设模板可以提升40%的创作效率',
        confidence: 0.92,
        category: 'template',
        action: {
          type: 'navigate',
          target: '/templates'
        },
        benefits: ['节省时间', '保持一致性', '专业效果'],
        estimatedTime: '2分钟',
        difficulty: 'easy'
      },
      {
        id: 'ai-workflow-optimization',
        type: 'workflow',
        title: '优化您的工作流程',
        description: '检测到您经常在相似步骤间切换，建议使用批量处理功能',
        confidence: 0.87,
        category: 'workflow',
        action: {
          type: 'navigate',
          target: '/workflow-optimizer'
        },
        benefits: ['减少重复操作', '提高效率', '降低错误率'],
        estimatedTime: '5分钟',
        difficulty: 'medium'
      },
      {
        id: 'ai-content-enhancement',
        type: 'content',
        title: 'AI内容增强建议',
        description: '基于当前项目内容，建议添加动态转场和背景音乐以提升观感',
        confidence: 0.79,
        category: 'content',
        action: {
          type: 'apply',
          target: 'enhance-content',
          params: { enhancements: ['transitions', 'music'] }
        },
        benefits: ['提升专业度', '增强观赏性', '更好的用户体验'],
        estimatedTime: '3分钟',
        difficulty: 'easy'
      },
      {
        id: 'ai-quality-settings',
        type: 'setting',
        title: '画质设置优化',
        description: '根据您的输出需求，建议调整渲染设置以平衡质量和速度',
        confidence: 0.85,
        category: 'setting',
        action: {
          type: 'apply',
          target: 'settings',
          params: { quality: 'high', format: 'mp4' }
        },
        benefits: ['更快的渲染', '合适的文件大小', '良好的画质'],
        estimatedTime: '1分钟',
        difficulty: 'easy'
      }
    ];

    // 根据用户模式过滤和排序推荐
    return baseRecommendations
      .filter(rec => enabledCategories.includes(rec.category))
      .filter(rec => !dismissedRecommendations.has(rec.id))
      .sort((a, b) => b.confidence - a.confidence);
  }, [enabledCategories, dismissedRecommendations]);

  // 初始化推荐引擎
  useEffect(() => {
    const initializeRecommendations = async () => {
      setIsLoading(true);
      try {
        const patterns = await analyzeUserBehavior();
        setUserPatterns(patterns);
        const recs = await generateRecommendations(patterns);
        setRecommendations(recs);
      } catch (error) {
        console.error('AI推荐引擎初始化失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeRecommendations();
  }, [analyzeUserBehavior, generateRecommendations]);

  // 处理推荐应用
  const handleApplyRecommendation = useCallback((recommendation: AIRecommendation) => {
    if (onRecommendationApply) {
      onRecommendationApply(recommendation);
    }

    // 记录用户行为用于改进推荐
    console.log('用户应用了推荐:', recommendation.title);

    // 从推荐列表中移除已应用的推荐
    setRecommendations(prev => prev.filter(rec => rec.id !== recommendation.id));
  }, [onRecommendationApply]);

  // 忽略推荐
  const handleDismissRecommendation = useCallback((recommendationId: string) => {
    setDismissedRecommendations(prev => new Set([...prev, recommendationId]));
    setRecommendations(prev => prev.filter(rec => rec.id !== recommendationId));
  }, []);

  // 获取难度标签样式
  const getDifficultyStyles = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'hard':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // 获取推荐类型图标
  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'content':
        return <Sparkles className="w-5 h-5 text-blue-500" />;
      case 'workflow':
        return <Zap className="w-5 h-5 text-purple-500" />;
      case 'setting':
        return <Settings className="w-5 h-5 text-gray-500" />;
      case 'template':
        return <Lightbulb className="w-5 h-5 text-yellow-500" />;
      default:
        return <TrendingUp className="w-5 h-5 text-green-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="animate-pulse">
            <Lightbulb className="w-6 h-6 text-blue-500" />
          </div>
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* 头部 */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Lightbulb className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">AI智能推荐</h3>
              <p className="text-sm text-gray-600">基于您的使用习惯提供的个性化建议</p>
            </div>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="推荐设置"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 设置面板 */}
      {showSettings && (
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">推荐设置</h4>
          <div className="space-y-2">
            {['template', 'workflow', 'content', 'setting'].map(category => (
              <label key={category} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={enabledCategories.includes(category)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setEnabledCategories(prev => [...prev, category]);
                    } else {
                      setEnabledCategories(prev => prev.filter(c => c !== category));
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 capitalize">
                  {category === 'template' ? '模板推荐' :
                   category === 'workflow' ? '工作流优化' :
                   category === 'content' ? '内容增强' : '设置建议'}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* 推荐列表 */}
      <div className="p-6">
        {recommendations.length === 0 ? (
          <div className="text-center py-8">
            <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">暂无推荐建议</p>
            <p className="text-sm text-gray-400 mt-1">继续使用应用以获得个性化推荐</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recommendations.map((recommendation) => (
              <div
                key={recommendation.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    {getRecommendationIcon(recommendation.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-base font-medium text-gray-900">
                        {recommendation.title}
                      </h4>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getDifficultyStyles(recommendation.difficulty)}`}>
                          {recommendation.difficulty === 'easy' ? '简单' :
                           recommendation.difficulty === 'medium' ? '中等' : '困难'}
                        </span>
                        <button
                          onClick={() => handleDismissRecommendation(recommendation.id)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                          aria-label="忽略推荐"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-3">
                      {recommendation.description}
                    </p>

                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{recommendation.estimatedTime}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <TrendingUp className="w-3 h-3" />
                          <span>{Math.round(recommendation.confidence * 100)}% 匹配</span>
                        </div>
                      </div>
                    </div>

                    {recommendation.benefits.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-gray-700 mb-1">主要优势:</p>
                        <div className="flex flex-wrap gap-1">
                          {recommendation.benefits.map((benefit, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded"
                            >
                              {benefit}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => handleApplyRecommendation(recommendation)}
                      className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center space-x-2"
                    >
                      <span>应用建议</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部信息 */}
      {userPatterns && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
          <p className="text-xs text-gray-500">
            基于 {userPatterns.skillLevel === 'beginner' ? '新手' :
                    userPatterns.skillLevel === 'intermediate' ? '进阶' : '专业'} 用户模式分析
          </p>
        </div>
      )}
    </div>
  );
};

export default AIRecommendationEngine;