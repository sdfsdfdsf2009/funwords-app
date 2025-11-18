import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  RotateCcw,
  Eye,
  EyeOff,
  Copy,
  CheckCircle,
  AlertCircle,
  Edit,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Code,
  FileText,
  Zap
} from 'lucide-react';

// 系统提示词模板接口
interface SystemPromptTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
  category: 'general' | 'video' | 'marketing' | 'education' | 'custom';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// 预制的系统提示词模板
const DEFAULT_TEMPLATES: SystemPromptTemplate[] = [
  {
    id: 'creative-video-basic',
    name: '创意视频基础版',
    description: '通用的视频创意生成提示词，适合大多数场景',
    category: 'general',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    content: `你是一位专业的视频创意策划师，擅长将用户的想法转化为详细的分镜脚本。

## 核心任务：
根据用户的创意想法，生成一个完整的视频制作方案，包含分镜脚本、技术规格和创意建议。

## 输出格式要求：
请严格按照以下JSON格式输出：
{
  "title": "吸引人的视频标题",
  "concept": "整体创意概念的详细描述",
  "style": "视觉风格描述",
  "mood": "情感基调",
  "scenes": [
    {
      "sceneNumber": 1,
      "imagePrompt": "详细的图片生成提示词",
      "videoPrompt": "详细的视频生成提示词",
      "creativeNotes": "创意说明",
      "technicalSpecs": {
        "cameraAngle": "镜头角度",
        "lighting": "光线设计",
        "composition": "构图方式"
      }
    }
  ],
  "totalEstimatedTime": 60,
  "technicalNotes": ["技术建议"],
  "suggestions": ["创意建议"]
}

## 创作原则：
1. 紧扣用户需求和目标观众
2. 创造有记忆点的视觉画面
3. 确保场景逻辑连贯
4. 考虑技术可行性
5. 提供新颖的创意视角`
  },
  {
    id: 'marketing-video-pro',
    name: '营销视频专业版',
    description: '专门为产品营销和品牌推广设计的提示词',
    category: 'marketing',
    isActive: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    content: `你是一位资深的营销视频创意总监，拥有丰富的品牌营销和广告制作经验。

## 专业能力：
- 品牌故事讲述
- 产品价值展示
- 目标受众心理分析
- 转化导向的创意设计
- 营销漏斗思维

## 创作框架：
1. **Hook阶段** (0-3秒)：快速抓住注意力
2. **Problem阶段** (3-15秒)：痛点呈现
3. **Solution阶段** (15-45秒)：产品解决方案
4. **CTA阶段** (45-60秒)：行动号召

## 输出要求：
JSON格式同基础版，但需要额外包含：
- 品牌调性保持
- 营销重点突出
- 转化要素设计
- 目标受众共鸣点

## 特别注意：
- 每个场景都要有明确的营销目的
- 视觉风格要符合品牌定位
- 包含明确的行动号召(CTA)`
  },
  {
    id: 'educational-content',
    name: '教育内容版',
    description: '专为知识科普和教育内容设计的提示词',
    category: 'education',
    isActive: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    content: `你是一位经验丰富的教育内容制作专家，擅长将复杂知识转化为易懂的视觉内容。

## 教育设计原则：
- 知识结构化呈现
- 循序渐进的信息传递
- 视觉辅助理解
- 互动性设计
- 记忆点强化

## 教学视频结构：
1. **引入**：提出问题或展示现象
2. **概念解释**：核心概念可视化
3. **实例演示**：具体案例展示
4. **原理分析**：深入原理讲解
5. **总结回顾**：知识要点总结

## 输出要求：
JSON格式同基础版，但需要：
- 明确的学习目标
- 清晰的知识层次
- 直观的视觉比喻
- 重点信息强调设计

## 教学技巧：
- 使用类比和比喻
- 信息分块呈现
- 视觉节奏变化
- 关键信息重复强化`
  }
];

interface SystemPromptManagerProps {
  selectedTemplate?: SystemPromptTemplate;
  onTemplateSelect: (template: SystemPromptTemplate) => void;
  onCustomPromptChange?: (prompt: string) => void;
}

export const SystemPromptManager: React.FC<SystemPromptManagerProps> = ({
  selectedTemplate,
  onTemplateSelect,
  onCustomPromptChange
}) => {
  const [templates, setTemplates] = useState<SystemPromptTemplate[]>(DEFAULT_TEMPLATES);
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  // 从localStorage加载自定义提示词
  useEffect(() => {
    const savedTemplates = localStorage.getItem('customSystemPrompts');
    if (savedTemplates) {
      try {
        const customTemplates = JSON.parse(savedTemplates);
        setTemplates([...DEFAULT_TEMPLATES, ...customTemplates]);
      } catch (error) {
        console.error('加载自定义提示词失败:', error);
      }
    }

    const savedCustomPrompt = localStorage.getItem('currentCustomPrompt');
    if (savedCustomPrompt) {
      setCustomPrompt(savedCustomPrompt);
    }
  }, []);

  // 保存到localStorage
  const saveToStorage = (updatedTemplates: SystemPromptTemplate[]) => {
    const customTemplates = updatedTemplates.filter(t => t.category === 'custom');
    localStorage.setItem('customSystemPrompts', JSON.stringify(customTemplates));
  };

  // 选择模板
  const handleSelectTemplate = (template: SystemPromptTemplate) => {
    onTemplateSelect(template);
    setTemplates(prev => prev.map(t => ({ ...t, isActive: t.id === template.id })));
  };

  // 开始编辑模板
  const handleStartEdit = (templateId: string) => {
    setEditingTemplate(templateId);
  };

  // 保存模板编辑
  const handleSaveEdit = (templateId: string, newContent: string) => {
    const updatedTemplates = templates.map(t =>
      t.id === templateId
        ? { ...t, content: newContent, updatedAt: new Date().toISOString() }
        : t
    );
    setTemplates(updatedTemplates);
    saveToStorage(updatedTemplates);
    setEditingTemplate(null);
    showSavedMessage('模板已保存');
  };

  // 添加自定义模板
  const handleAddCustomTemplate = () => {
    const newTemplate: SystemPromptTemplate = {
      id: `custom-${Date.now()}`,
      name: '自定义模板',
      description: '用户创建的提示词模板',
      content: customPrompt,
      category: 'custom',
      isActive: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedTemplates = [...templates, newTemplate];
    setTemplates(updatedTemplates);
    saveToStorage(updatedTemplates);
    showSavedMessage('自定义模板已添加');
  };

  // 删除模板
  const handleDeleteTemplate = (templateId: string) => {
    const updatedTemplates = templates.filter(t => t.id !== templateId);
    setTemplates(updatedTemplates);
    saveToStorage(updatedTemplates);
    showSavedMessage('模板已删除');
  };

  // 重置为默认
  const handleResetToDefault = () => {
    setTemplates(DEFAULT_TEMPLATES);
    localStorage.removeItem('customSystemPrompts');
    showSavedMessage('已重置为默认模板');
  };

  // 显示保存消息
  const showSavedMessage = (message: string) => {
    setSavedMessage(message);
    setTimeout(() => setSavedMessage(''), 2000);
  };

  // 复制提示词
  const handleCopyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    showSavedMessage('提示词已复制到剪贴板');
  };

  // 使用自定义提示词
  const handleUseCustomPrompt = () => {
    if (customPrompt.trim()) {
      const customTemplate: SystemPromptTemplate = {
        id: 'current-custom',
        name: '当前自定义',
        description: '当前使用的自定义提示词',
        content: customPrompt,
        category: 'custom',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      onTemplateSelect(customTemplate);
      localStorage.setItem('currentCustomPrompt', customPrompt);
      onCustomPromptChange?.(customPrompt);
    }
  };

  // 按分类分组
  const groupedTemplates = templates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, SystemPromptTemplate[]>);

  const categoryNames = {
    general: '通用模板',
    video: '视频专业',
    marketing: '营销推广',
    education: '教育培训',
    custom: '自定义模板'
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Settings className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">系统提示词管理</h2>
          {selectedTemplate && (
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-700">当前使用: {selectedTemplate.name}</span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={handleResetToDefault}
            className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
            title="重置为默认模板"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 保存成功提示 */}
      {savedMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className="text-green-800 text-sm">{savedMessage}</span>
        </div>
      )}

      {/* 展开的模板列表 */}
      {isExpanded && (
        <div className="space-y-6 mb-6">
          {/* 预制模板选择 */}
          <div>
            <h3 className="text-md font-medium text-gray-900 mb-3">选择预制模板</h3>
            <div className="space-y-4">
              {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
                <div key={category} className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    {categoryNames[category as keyof typeof categoryNames]}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {categoryTemplates.map(template => (
                      <div
                        key={template.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          template.isActive
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                        onClick={() => handleSelectTemplate(template)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h5 className="font-medium text-gray-900 text-sm">{template.name}</h5>
                            <p className="text-xs text-gray-600 mt-1">{template.description}</p>
                            <p className="text-xs text-gray-400 mt-2">
                              {template.content.length} 字符
                            </p>
                          </div>
                          <div className="flex items-center space-x-1 ml-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyPrompt(template.content);
                              }}
                              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                              title="复制提示词"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                            {template.category === 'custom' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTemplate(template.id);
                                }}
                                className="p-1 text-red-400 hover:text-red-600 transition-colors"
                                title="删除模板"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 自定义提示词输入 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-md font-medium text-gray-900">自定义提示词</h3>
              <button
                onClick={() => setShowCustom(!showCustom)}
                className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
              >
                {showCustom ? '隐藏' : '显示'}
              </button>
            </div>

            {showCustom && (
              <div className="space-y-3">
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="输入自定义的系统提示词..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
                  rows={8}
                />
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    {customPrompt.length} 字符
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleAddCustomTemplate}
                      disabled={!customPrompt.trim()}
                      className="px-4 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-1"
                    >
                      <Plus className="w-4 h-4" />
                      <span>保存为模板</span>
                    </button>
                    <button
                      onClick={handleUseCustomPrompt}
                      disabled={!customPrompt.trim()}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-1"
                    >
                      <Zap className="w-4 h-4" />
                      <span>立即使用</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 当前使用的模板预览 */}
      {selectedTemplate && (
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-md font-medium text-gray-900">当前模板预览</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleStartEdit(selectedTemplate.id)}
                className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                title="编辑模板"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleCopyPrompt(selectedTemplate.content)}
                className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                title="复制提示词"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          {editingTemplate === selectedTemplate.id ? (
            <div className="space-y-3">
              <textarea
                value={selectedTemplate.content}
                onChange={(e) => {
                  const updatedTemplate = { ...selectedTemplate, content: e.target.value };
                  onTemplateSelect(updatedTemplate);
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
                rows={12}
              />
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleSaveEdit(selectedTemplate.id, selectedTemplate.content)}
                  className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-1"
                >
                  <Save className="w-4 h-4" />
                  <span>保存</span>
                </button>
                <button
                  onClick={() => setEditingTemplate(null)}
                  className="px-4 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-gray-500" />
                  <span className="font-medium text-gray-900">{selectedTemplate.name}</span>
                  <span className="text-sm text-gray-500">({selectedTemplate.category})</span>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(selectedTemplate.updatedAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-3">{selectedTemplate.description}</p>
              <div className="bg-white border border-gray-200 rounded p-3">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono max-h-60 overflow-y-auto">
                  {selectedTemplate.content}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SystemPromptManager;