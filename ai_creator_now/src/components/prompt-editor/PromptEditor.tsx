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
  readOnly?: false;
}

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

      const estimatedTokens = Math.ceil(content.split(' ').length * 1.3);

      setEditorState(prev => ({
        ...prev,
        qualityScore,
        wordCount,
        estimatedTokens,
        isAnalyzing: false
      }));

      onContentChange?.(content, qualityScore);
    } catch (error) {
      console.error('Failed to analyze prompt:', error);
      setEditorState(prev => ({ ...prev, isAnalyzing: false }));
    }
  }, [onContentChange]);

  // AI建议生成
  const generateSuggestions = useCallback(async (content: string) => {
    setEditorState(prev => ({ ...prev, isGenerating: true }));

    try {
      // 模拟AI建议
      await new Promise(resolve => setTimeout(resolve, 1000));

      const suggestions = [
        '添加更多具体的视觉细节描述',
        '包含镜头运动和拍摄角度的说明',
        '指定光线条件和时间设置',
        '添加色彩和氛围要求',
        '包含分辨率和质量参数'
      ];

      setEditorState(prev => ({
        ...prev,
        suggestions,
        isGenerating: false
      }));
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
      setEditorState(prev => ({ ...prev, isGenerating: false }));
    }
  }, []);

  // 内容变化处理
  const handleContentChange = useCallback((newContent: string) => {
    setEditorState(prev => ({
      ...prev,
      content: newContent,
      wordCount: newContent.split(' ').filter(word => word.length > 0).length,
      estimatedTokens: Math.ceil(newContent.split(' ').length * 1.3)
    }));

    // 防抖分析
    const timeoutId = setTimeout(() => {
      if (newContent.length > 10) {
        analyzePrompt(newContent);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [analyzePrompt]);

  // 应用模板
  const applyTemplate = useCallback((template: any) => {
    setEditorState(prev => ({
      ...prev,
      content: template.content,
      selectedTemplateId: template.id
    }));
    setShowTemplateModal(false);

    if (template.id) {
      templateStore.addToRecentlyUsed(template.id);
    }
  }, [templateStore]);

  // 复制内容
  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(editorState.content);
  }, [editorState.content]);

  // 保存提示词
  const handleSave = useCallback(() => {
    onSave?.(editorState.content, {
      quality: editorState.qualityScore,
      wordCount: editorState.wordCount,
      estimatedTokens: editorState.estimatedTokens
    });
  }, [editorState, onSave]);

  // 质量分数颜色
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  // 质量分数背景
  const getScoreBackground = (score: number) => {
    if (score >= 8) return 'bg-green-100';
    if (score >= 6) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  // 切换展开状态
  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  }, []);

  // 获取当前类型的模板
  const currentTypeTemplates = useMemo(() => {
    return templateStore.getTemplatesByType(type);
  }, [templateStore, type]);

  // 初始化分析
  useEffect(() => {
    if (initialContent) {
      analyzePrompt(initialContent);
    }
  }, [initialContent, analyzePrompt]);

  return (
    <div className={`prompt-editor ${className}`}>
      {/* 工具栏 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          {enableAIAssistance && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateSuggestions(editorState.content)}
              loading={editorState.isGenerating}
            >
              <Sparkles className="w-4 h-4 mr-1" />
              AI建议
            </Button>
          )}
          {showTemplates && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTemplateModal(true)}
            >
              <FileText className="w-4 h-4 mr-1" />
              模板
            </Button>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={copyToClipboard}
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
          >
            <Save className="w-4 h-4 mr-1" />
            保存
          </Button>
        </div>
      </div>

      {/* 主编辑区域 */}
      <div className="space-y-4">
        {/* 编辑器 */}
        {expandedSections.has('editor') && (
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                提示词编辑器
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleSection('editor')}
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>
            <textarea
              value={editorState.content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder={placeholder}
              maxLength={maxLength}
              readOnly={readOnly}
              autoFocus={autoFocus}
              className="w-full h-48 p-3 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
            <div className="flex items-center justify-between mt-2 text-sm text-gray-600">
              <span>
                {editorState.wordCount} 词 · {editorState.estimatedTokens} tokens
              </span>
              <span>
                {editorState.content.length}/{maxLength}
              </span>
            </div>
          </div>
        )}

        {/* 质量分析 */}
        {showQualityScore && expandedSections.has('analysis') && editorState.qualityScore && (
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium flex items-center">
                <Target className="w-5 h-5 mr-2" />
                质量分析
                {editorState.isAnalyzing && (
                  <div className="ml-2 w-4 h-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                )}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleSection('analysis')}
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className={`text-center p-3 rounded-lg ${getScoreBackground(editorState.qualityScore.overall)}`}>
                <div className={`text-2xl font-bold ${getScoreColor(editorState.qualityScore.overall)}`}>
                  {editorState.qualityScore.overall}
                </div>
                <div className="text-sm text-gray-600">总分</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-blue-600">
                  {editorState.qualityScore.clarity}
                </div>
                <div className="text-sm text-gray-600">清晰度</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-green-600">
                  {editorState.qualityScore.detail}
                </div>
                <div className="text-sm text-gray-600">细节</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-purple-600">
                  {editorState.qualityScore.creativity}
                </div>
                <div className="text-sm text-gray-600">创造性</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-orange-600">
                  {editorState.qualityScore.technical}
                </div>
                <div className="text-sm text-gray-600">技术性</div>
              </div>
            </div>
          </div>
        )}

        {/* AI建议 */}
        {enableAIAssistance && editorState.suggestions.length > 0 && (
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-medium mb-3 flex items-center">
              <Lightbulb className="w-5 h-5 mr-2" />
              AI建议
            </h3>
            <ul className="space-y-2">
              {editorState.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start">
                  <Check className="w-4 h-4 mr-2 text-green-500 mt-0.5" />
                  <span className="text-sm">{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 模板快速访问 */}
        {showTemplates && expandedSections.has('templates') && currentTypeTemplates.length > 0 && (
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                快速模板
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleSection('templates')}
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {currentTypeTemplates.slice(0, 6).map((template) => (
                <Button
                  key={template.id}
                  variant="outline"
                  size="sm"
                  onClick={() => applyTemplate(template)}
                  className="text-left justify-start"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  <span className="truncate">{template.name}</span>
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 模板选择模态框 */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">选择提示词模板</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTemplateModal(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentTypeTemplates.map((template) => (
                <div
                  key={template.id}
                  className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => applyTemplate(template)}
                >
                  <h3 className="font-semibold mb-1">{template.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      {template.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <span className="text-xs text-gray-500">
                      {template.usageCount} 次使用
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};