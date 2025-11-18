import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Wand2,
  Save,
  RefreshCw,
  Copy,
  Trash2,
  Plus,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Zap,
  Target,
  TrendingUp,
  Lightbulb,
  FileText,
  Hash,
  Settings,
  Check,
  X
} from 'lucide-react';
import { Button } from '../ui/Button';
import { usePromptTemplatesStore } from '../../stores/promptTemplatesStore';
import { logger } from '../../utils/logger';

// 提示词类型枚举
export enum PromptType {
  IMAGE_GENERATION = 'image',
  VIDEO_GENERATION = 'video',
  SCENE_DESCRIPTION = 'scene',
  STYLE_GUIDANCE = 'style',
  EDITING_ASSISTANT = 'editing'
}

// 提示词质量分数
export interface PromptQualityScore {
  clarity: number; // 清晰度 0-10
  detail: number; // 细节程度 0-10
  creativity: number; // 创造性 0-10
  technical: number; // 技术准确性 0-10
  overall: number; // 总分 0-10
}

// 提示词模板
export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  type: PromptType;
  category: string;
  content: string;
  variables: string[]; // 变量占位符
  tags: string[];
  isActive: boolean;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// 提示词编辑器状态
interface PromptEditorState {
  content: string;
  type: PromptType;
  qualityScore: PromptQualityScore | null;
  suggestions: string[];
  isAnalyzing: boolean;
  isGenerating: boolean;
  selectedTemplateId: string | null;
  wordCount: number;
  estimatedTokens: number;
}

export interface PromptEditorProps {
  initialContent?: string;
  type?: PromptType;
  onContentChange?: (content: string, quality?: PromptQualityScore) => void;
  onSave?: (content: string, metadata?: any) => void;
  className?: string;
  placeholder?: string;
  maxLength?: number;
  showQualityScore?: boolean;
  showTemplates?: boolean;
  enableAIAssistance?: boolean;
  autoFocus?: boolean;
  readOnly?: boolean;
}

// 提示词模板存储接口（临时实现，后续连接到数据库）
interface PromptTemplateStore {
  templates: PromptTemplate[];
  isLoading: boolean;
  error: string | null;

  loadTemplates: () => Promise<void>;
  saveTemplate: (template: Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTemplate: (id: string, updates: Partial<PromptTemplate>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  getTemplatesByType: (type: PromptType) => PromptTemplate[];
  incrementUsage: (id: string) => Promise<void>;
}

// 模拟的提示词模板存储
const usePromptTemplateStore = (): PromptTemplateStore => {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 模拟数据
      const mockTemplates: PromptTemplate[] = [
        {
          id: '1',
          name: '电影级视频提示词',
          description: '用于生成高质量电影风格视频的提示词模板',
          type: PromptType.VIDEO_GENERATION,
          category: 'cinematic',
          content: 'Cinematic shot of {{subject}} in {{setting}}, {{lighting}} lighting, {{camera_angle}} camera angle, {{time_of_day}} time of day, ultra detailed, 8k resolution, professional cinematography, shot on {{camera_type}}, {{color_grading}} color grading',
          variables: ['subject', 'setting', 'lighting', 'camera_angle', 'time_of_day', 'camera_type', 'color_grading'],
          tags: ['cinematic', 'professional', 'high-quality'],
          isActive: true,
          usageCount: 15,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        },
        {
          'id': '2',
          'name': '产品展示视频',
          description: '电商产品展示视频的标准提示词模板',
          type: PromptType.VIDEO_GENERATION,
          category: 'product',
          content: 'Professional product showcase video of {{product_name}}, {{branding}} branding, {{background}} background, clean studio lighting, smooth camera movement, 360-degree views, marketing focused, high resolution',
          variables: ['product_name', 'branding', 'background'],
          tags: ['product', 'marketing', 'ecommerce'],
          isActive: true,
          usageCount: 23,
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-02')
        },
        {
          id: '3',
          name: '自然风景图片',
          description: '生成自然风景照片的提示词模板',
          type: PromptType.IMAGE_GENERATION,
          category: 'nature',
          content: 'Breathtaking {{landscape}} during {{time_of_day}}, {{weather}} weather, {{season}} season, {{atmosphere}} atmosphere, ultra realistic, natural lighting, detailed textures, professional photography, {{style}} style',
          variables: ['landscape', 'time_of_day', 'weather', 'season', 'atmosphere', 'style'],
          tags: ['nature', 'realistic', 'photography'],
          isActive: true,
          usageCount: 42,
          createdAt: new Date('2024-01-03'),
          updatedAt: new Date('2024-01-03')
        },
        {
          'id': '4',
          name: '人物肖像',
          description: '生成人物肖像的详细提示词模板',
          type: PromptType.IMAGE_GENERATION,
          category: 'portrait',
          content: '{{age}} {{gender}} with {{facial_features}}, {{expression}} expression, {{hairstyle}} hairstyle, {{clothing}} clothing, {{background}} background, professional portrait lighting, detailed skin texture, {{mood}} mood, high resolution, photorealistic',
          variables: ['age', 'gender', 'facial_features', 'expression', 'hairstyle', 'clothing', 'background', 'mood'],
          tags: ['portrait', 'realistic', 'detailed'],
          isActive: true,
          usageCount: 31,
          createdAt: new Date('2024-01-04'),
          updatedAt: new Date('2024-01-04')
        }
      ];
      setTemplates(mockTemplates);
    } catch (err) {
      setError('加载模板失败');
      console.error('Failed to load prompt templates:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveTemplate = useCallback(async (template: Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newTemplate: PromptTemplate = {
        ...template,
        id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      setTemplates(prev => [...prev, newTemplate]);
      logger.info('Prompt template saved', { templateName: template.name });
    } catch (error) {
      console.error('Failed to save prompt template:', error);
      throw error;
    }
  }, []);

  const updateTemplate = useCallback(async (id: string, updates: Partial<PromptTemplate>) => {
    try {
      setTemplates(prev =>
        prev.map(template =>
          template.id === id
            ? { ...template, ...updates, updatedAt: new Date() }
            : template
        )
      );
      logger.info('Prompt template updated', { templateId: id });
    } catch (error) {
      console.error('Failed to update prompt template:', error);
      throw error;
    }
  }, []);

  const deleteTemplate = useCallback(async (id: string) => {
    try {
      setTemplates(prev => prev.filter(template => template.id !== id));
      logger.info('Prompt template deleted', { templateId: id });
    } catch (error) {
      console.error('Failed to delete prompt template:', error);
      throw error;
    }
  }, []);

  const getTemplatesByType = useCallback((type: PromptType): PromptTemplate[] => {
    return templates.filter(template => template.type === type);
  }, [templates]);

  const incrementUsage = useCallback(async (id: string) => {
    try {
      setTemplates(prev =>
        prev.map(template =>
          template.id === id
            ? { ...template, usageCount: template.usageCount + 1 }
            : template
        )
      );
    } catch (error) {
      console.error('Failed to increment template usage:', error);
      throw error;
    }
  }, [templates]);

  return {
    templates,
    isLoading,
    error,
    loadTemplates,
    saveTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplatesByType,
    incrementUsage
  };
};

export const PromptEditor: React.FC<PromptEditorProps> = ({
  initialContent = '',
  type = PromptType.VIDEO_GENERATION,
  onContentChange,
  onSave,
  className = '',
  placeholder = '输入您的提示词...',
  maxLength = 2000,
  showQualityScore = true,
  showTemplates = true,
  enableAIAssistance = true,
  autoFocus = false,
  readOnly = false
}) => {
  const [editorState, setEditorState] = useState<PromptEditorState>({
    content: initialContent,
    type,
    qualityScore: null,
    suggestions: [],
    isAnalyzing: false,
    isGenerating: false,
    selectedTemplateId: null,
    wordCount: initialContent.split(' ').length,
    estimatedTokens: Math.ceil(initialContent.split(' ').length * 1.3)
  });

  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['templates', 'editor', 'analysis']));

  const templateStore = usePromptTemplatesStore();

  // 计算质量和字数
  const analyzePrompt = useCallback(async (content: string) => {
    setEditorState(prev => ({ ...prev, isAnalyzing: true }));

    try {
      // 模拟质量分析
      await new Promise(resolve => setTimeout(resolve, 500));

      const wordCount = content.split(' ').filter(word => word.length > 0).length;
      const clarityScore = Math.min(10, wordCount >= 10 ? 9 : Math.floor(wordCount / 10 * 10));
      const detailScore = Math.min(10, content.length >= 500 ? 9 : Math.floor(content.length / 500 * 10));
      const creativityScore = Math.min(10, (content.match(/\b(innovative|creative|unique|artistic|experimental|artistic)\b/gi) || []).length);
      const technicalScore = Math.min(10, (content.match(/\b(professional|detailed|specific|technical|precise)\b/gi) || []).length);

      const overallScore = Math.round((clarityScore + detailScore + creativityScore + technicalScore) / 4);

      const qualityScore: PromptQualityScore = {
        clarity: clarityScore,
        detail: detailScore,
        creativity: creativityScore,
        technical: technicalScore,
        overall: overallScore
      };

      setEditorState(prev => ({
        ...prev,
        qualityScore,
        wordCount,
        estimatedTokens: Math.ceil(wordCount * 1.3),
        isAnalyzing: false
      }));

      if (onContentChange) {
        onContentChange(content, qualityScore);
      }
    } catch (error) {
      console.error('Failed to analyze prompt:', error);
      setEditorState(prev => ({ ...prev, isAnalyzing: false }));
    }
  }, [onContentChange]);

  // 生成AI建议
  const generateSuggestions = useCallback(async () => {
    setEditorState(prev => ({ ...prev, isGenerating: true, suggestions: [] }));

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const suggestions = [
        '尝试添加更多细节描述，如特定的时间、地点、情绪等',
        '使用专业术语和行业特定词汇',
        '明确指定输出格式和风格要求',
        '包含具体的视觉指令和参数设置',
        '添加对比元素或参考标准'
      ];

      setEditorState(prev => ({
        ...prev,
        suggestions,
        isGenerating: false
      }));
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
      setEditorState(prev => ({ ...prev, isGenerating: false, suggestions: [] }));
    }
  }, []);

  // 应用模板
  const applyTemplate = useCallback((template: PromptTemplate) => {
    let content = template.content;

    // 替换变量为默认值或询问用户
    const variables = template.variables;
    const replacements: Record<string, string> = {};

    for (const variable of variables) {
      const defaultValue = getDefaultReplacement(variable, template.type);
      replacements[variable] = defaultValue;
    }

    for (const [variable, value] of Object.entries(replacements)) {
      content = content.replace(new RegExp(`{{${variable}}}`, 'g'), value);
    }

    setEditorState(prev => ({ ...prev, content, selectedTemplateId: template.id }));
    templateStore.incrementUsage(template.id);
    analyzePrompt(content);

    logger.info('Prompt template applied', { templateName: template.name });
  }, [templateStore, analyzePrompt]);

  // 获取变量默认值
  const getDefaultReplacement = (variable: string, type: PromptType): string => {
    const defaults: Record<string, Record<PromptType, string>> = {
      'subject': {
        [PromptType.IMAGE_GENERATION]: 'a beautiful landscape',
        [PromptType.VIDEO_GENERATION]: 'a dynamic scene',
        [PromptType.SCENE_DESCRIPTION]: 'main subject',
        [PromptType.STYLE_GUIDANCE]: 'subject',
        [PromptType.EDITING_ASSISTANT]: 'content'
      },
      'setting': {
        [PromptType.IMAGE_GENERATION]: 'mountain valley',
        [PromptType.VIDEO_GENERATION]: 'urban environment',
        [PromptType.SCENE_DESCRIPTION]: 'location',
        [PromptType.STYLE_GUIDANCE]: 'environment',
        [PromptType.EDITING_ASSISTANT]: 'context'
      },
      'background': {
        [PromptType.IMAGE_GENERATION]: 'clear blue sky',
        [PromptType.VIDEO_GENERATION]: 'studio setting',
        [PromptType.SCENE_DESCRIPTION]: 'background',
        [PromptType.STYLE_GUIDANCE]: 'background',
        [PromptType.EDITING_ASSISTANT]: 'background'
      }
    };

    return defaults[variable]?.[type] || variable;
  };

  // 内容变化处理
  const handleContentChange = (content: string) => {
    if (content.length <= maxLength) {
      setEditorState(prev => ({
        ...prev,
        content,
        wordCount: content.split(' ').filter(word => word.length > 0).length,
        estimatedTokens: Math.ceil(content.split(' ').filter(word => word.length > 0).length * 1.3)
      }));

      // 延迟分析以避免频繁调用
      const timeoutId = setTimeout(() => {
        analyzePrompt(content);
      }, 800);

      // 返回清理函数
      return () => clearTimeout(timeoutId);
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg border border-gray-200 ${className}`}>
      {/* 头部工具栏 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Wand2 className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-gray-700">
              提示词编辑器
            </span>
          </div>

          {showTemplates && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTemplateModal(true)}
              className="flex items-center gap-1"
            >
              <FileText className="w-4 h-4" />
              模板
            </Button>
          )}

          {enableAIAssistance && (
            <Button
              variant="outline"
              size="sm"
              onClick={generateSuggestions}
              disabled={editorState.isGenerating}
              className="flex items-center gap-1"
            >
              <Sparkles className="w-4 h-4" />
              {editorState.isGenerating ? '生成中...' : 'AI建议'}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {showQualityScore && editorState.qualityScore && (
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-md">
              <Target className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">
                质量: {editorState.qualityScore.overall}/10
              </span>
            </div>
          )}

          <div className="flex items-center gap-1 text-xs text-gray-500">
            <span>{editorState.wordCount} 词</span>
            <span>•</span>
            <span>~{editorState.estimatedTokens} tokens</span>
          </div>

          {!readOnly && onSave && (
            <Button
              size="sm"
              onClick={() => onSave(editorState.content, editorState.qualityScore)}
              disabled={!editorState.content.trim()}
              className="flex items-center gap-1"
            >
              <Save className="w-4 h-4" />
              保存
            </Button>
          )}
        </div>
      </div>

      {/* 编辑器主体 */}
      <div className="p-4">
        <div className="relative">
          <textarea
            value={editorState.content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
            autoFocus={autoFocus}
            readOnly={readOnly}
            className="w-full h-64 p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
            style={{
              fontFamily: 'Monaco, Menlo, monospace'
            }}
          />

          {/* 字符计数 */}
          <div className="absolute bottom-2 right-2 text-xs text-gray-400">
            {editorState.content.length}/{maxLength}
          </div>
        </div>

        {/* AI建议 */}
        {enableAIAssistance && editorState.suggestions.length > 0 && (
          <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-md">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">AI 建议</span>
              <button
                onClick={() => setEditorState(prev => ({ ...prev, suggestions: [] }))}
                className="ml-auto text-purple-600 hover:text-purple-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ul className="space-y-2">
              {editorState.suggestions.map((suggestion, index) => (
                <li
                  key={index}
                  className="text-sm text-purple-700 flex items-start gap-2 cursor-pointer hover:text-purple-900"
                  onClick={() => {
                    const newContent = editorState.content + '\n' + suggestion;
                    handleContentChange(newContent);
                    setEditorState(prev => ({ ...prev, suggestions: [] }));
                  }}
                >
                  <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 质量分析 */}
        {showQualityScore && editorState.qualityScore && !editorState.isAnalyzing && (
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-gray-800">质量分析</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">清晰度:</span>
                  <span className="font-medium">{editorState.qualityScore.clarity}/10</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${(editorState.qualityScore.clarity / 10) * 100}%` }}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">细节程度:</span>
                  <span className="font-medium">{editorState.qualityScore.detail}/10</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${(editorState.qualityScore.detail / 10) * 100}%` }}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">创造性:</span>
                  <span className="font-medium">{editorState.qualityScore.creativity}/10</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-500 h-2 rounded-full"
                    style={{ width: `${(editorState.qualityScore.creativity / 10) * 100}%` }}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">技术性:</span>
                  <span className="font-medium">{editorState.qualityScore.technical}/10</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-orange-500 h-2 rounded-full"
                    style={{ width: `${(editorState.qualityScore.technical / 10) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 模板选择模态框 */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                选择提示词模板
              </h2>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {templateStore.isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-gray-500">加载模板中...</div>
                </div>
              ) : templateStore.error ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-red-500">加载失败: {templateStore.error}</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {templateStore
                    .getTemplatesByType(type)
                    .filter(template => template.isActive)
                    .map((template) => (
                      <div
                        key={template.id}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => {
                          applyTemplate(template);
                          setShowTemplateModal(false);
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">
                              {template.name}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                              {template.description}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {template.tags.map((tag, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="text-xs text-gray-400">
                            使用 {template.usageCount} 次
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => {
                  // 创建新模板的逻辑
                  setShowTemplateModal(false);
                }}
                className="w-full flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                创建新模板
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromptEditor;