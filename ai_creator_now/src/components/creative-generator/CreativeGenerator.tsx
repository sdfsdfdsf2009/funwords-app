import React, { useState, useCallback, useEffect } from 'react';
import {
  Lightbulb,
  Wand2,
  MessageSquare,
  Download,
  RefreshCw,
  Copy,
  ChevronRight,
  FileText,
  Sparkles,
  Target,
  Palette,
  Clock,
  Settings,
  Send,
  Loader2,
  History,
  Brain
} from 'lucide-react';
import { ModelSelector, EvoLinkModel } from '../model-selection/ModelSelector';
import { SystemPromptManager } from './SystemPromptManager';
import { useProjectStore } from '../../stores/projectStore';
import { logger } from '../../utils/logger';

// 创意讨论状态接口
interface CreativeDiscussionState {
  status: 'idle' | 'ready' | 'discussing' | 'finalizing' | 'completed' | 'error';
  error?: string;
  sessionId?: string;
  isWaitingForResponse?: boolean;
}

// 创意输入接口
interface CreativeInput {
  coreIdea: string;
  style?: string;
  targetAudience?: string;
  duration?: number;
  mood?: string;
  additionalRequirements?: string;
}

// 聊天消息接口
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isTyping?: boolean;
}

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

// 生成的场景接口
interface GeneratedScene {
  sceneNumber: number;
  imagePrompt: string;
  videoPrompt: string;
  creativeNotes?: string;
  technicalSpecs?: {
    cameraAngle?: string;
    lighting?: string;
    composition?: string;
  };
}

// 完整创意方案接口
interface CreativeSolution {
  title: string;
  concept: string;
  style: string;
  mood: string;
  scenes: GeneratedScene[];
  totalEstimatedTime: number;
  technicalNotes?: string[];
  suggestions?: string[];
}

export const CreativeGenerator: React.FC = () => {
  const [state, setState] = useState<CreativeDiscussionState>({ status: 'idle' });
  const [selectedModel, setSelectedModel] = useState<EvoLinkModel | null>(null);
  const [input, setInput] = useState<CreativeInput>({ coreIdea: '' });
  const [solution, setSolution] = useState<CreativeSolution | null>(null);
  const [selectedSystemPrompt, setSelectedSystemPrompt] = useState<SystemPromptTemplate | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [showSystemPromptManager, setShowSystemPromptManager] = useState(false);
  const [discussionStarted, setDiscussionStarted] = useState(false);

  const { currentProject, setCurrentProject } = useProjectStore();

  // 预设的创意模板
  const creativeTemplates = [
    {
      name: '产品介绍',
      template: '制作一个关于{产品}的短视频，突出{特点}，吸引{目标用户}',
      examples: ['智能手表', '环保咖啡杯', '健身应用']
    },
    {
      name: '品牌故事',
      template: '讲述{品牌}的故事，传达{价值观}，建立情感连接',
      examples: ['手工皮具品牌', '有机食品店', '独立书店']
    },
    {
      name: '教育内容',
      template: '用生动的视觉方式解释{概念}，让观众易于理解',
      examples: ['区块链技术', '气候变化', '心理健康']
    },
    {
      name: '生活方式',
      template: '展示{生活方式}的美好时刻，分享{理念}和{技巧}',
      examples: ['极简生活', '健康饮食', '日常冥想']
    }
  ];

  // 初始化处理
  useEffect(() => {
    if (currentProject) {
      setState({ status: 'ready' });
    } else {
      setState({ status: 'idle', error: '请先选择一个项目' });
    }
  }, [currentProject]);

  // 选择模型
  const handleModelSelect = useCallback((model: EvoLinkModel) => {
    console.log('🎯 CreativeGenerator: 用户选择了模型', model.name);
    setSelectedModel(model);
    if (state.status === 'idle') {
      setState({ status: 'ready' });
    }
  }, [state.status]);

  // 开始讨论
  const startDiscussion = useCallback(async () => {
    if (!selectedModel || !input.coreIdea.trim()) {
      setState(prev => ({ ...prev, error: '请选择模型并输入创意想法' }));
      return;
    }

    setState({ status: 'discussing', isWaitingForResponse: true });
    setDiscussionStarted(true);

    // 初始化对话
    const initialMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: `我想创作一个关于"${input.coreIdea}"的视频，${input.style ? `风格偏好是${input.style}，` : ''}${input.targetAudience ? `目标观众是${input.targetAudience}，` : ''}${input.duration ? `预计时长${input.duration}秒。` : ''}${input.additionalRequirements ? `额外要求：${input.additionalRequirements}` : ''}`,
      timestamp: new Date().toISOString()
    };

    setChatMessages([initialMessage]);

    try {
      // 发送初始请求到EvoLink API
      const response = await fetch('/api/evolink/v1/creative/discuss', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel.id,
          systemPrompt: selectedSystemPrompt?.content,
          message: initialMessage.content,
          conversationHistory: [],
          input: {
            ...input,
            projectId: currentProject?.id,
            timestamp: new Date().toISOString()
          }
        })
      });

      if (!response.ok) {
        throw new Error(`请求失败: ${response.statusText}`);
      }

      const data = await response.json();

      // 添加AI回复
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString()
      };

      setChatMessages(prev => [...prev, aiMessage]);
      setState({ status: 'discussing', isWaitingForResponse: false });

    } catch (error) {
      console.error('开始讨论失败:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      setState(prev => ({ ...prev, status: 'error', error: errorMessage, isWaitingForResponse: false }));
    }
  }, [selectedModel, input, currentProject, selectedSystemPrompt]);

  // 发送消息
  const sendMessage = useCallback(async () => {
    const messageToSend = currentMessage.trim();
    if (!messageToSend || state.isWaitingForResponse) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageToSend,
      timestamp: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setState(prev => ({ ...prev, isWaitingForResponse: true }));

    try {
      const response = await fetch('/api/evolink/v1/creative/discuss', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel?.id,
          systemPrompt: selectedSystemPrompt?.content,
          message: messageToSend,
          conversationHistory: [...chatMessages, userMessage],
          input: {
            ...input,
            projectId: currentProject?.id,
            timestamp: new Date().toISOString()
          }
        })
      });

      if (!response.ok) {
        throw new Error(`请求失败: ${response.statusText}`);
      }

      const data = await response.json();

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString()
      };

      setChatMessages(prev => [...prev, aiMessage]);
      setState(prev => ({ ...prev, isWaitingForResponse: false }));

    } catch (error) {
      console.error('发送消息失败:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      setState(prev => ({ ...prev, status: 'error', error: errorMessage, isWaitingForResponse: false }));
    }
  }, [currentMessage, chatMessages, selectedModel, selectedSystemPrompt, input, currentProject, state.isWaitingForResponse]);

  // 确定最终方案
  const finalizeSolution = useCallback(async () => {
    setState({ status: 'finalizing', isWaitingForResponse: true });

    try {
      const response = await fetch('/api/evolink/v1/creative/finalize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel?.id,
          systemPrompt: selectedSystemPrompt?.content,
          conversationHistory: chatMessages,
          input: {
            ...input,
            projectId: currentProject?.id,
            timestamp: new Date().toISOString()
          }
        })
      });

      if (!response.ok) {
        throw new Error(`生成最终方案失败: ${response.statusText}`);
      }

      const data: CreativeSolution = await response.json();
      setSolution(data);
      setState({ status: 'completed', isWaitingForResponse: false });

      logger.info('创意方案确定成功', {
        title: data.title,
        sceneCount: data.scenes.length,
        duration: data.totalEstimatedTime,
        messagesCount: chatMessages.length
      });

    } catch (error) {
      console.error('确定最终方案失败:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      setState(prev => ({ ...prev, status: 'error', error: errorMessage, isWaitingForResponse: false }));
    }
  }, [selectedModel, selectedSystemPrompt, chatMessages, input, currentProject]);

  // 处理创意输入变化
  const handleInputChange = useCallback((field: keyof CreativeInput, value: string | number) => {
    setInput(prev => ({ ...prev, [field]: value }));
  }, []);

  // 应用模板
  const applyTemplate = useCallback((template: typeof creativeTemplates[0], example: string) => {
    const filledTemplate = template.template
      .replace('{产品}', example)
      .replace('{特点}', '独特的优势')
      .replace('{目标用户}', '年轻用户')
      .replace('{品牌}', example)
      .replace('{价值观}', '品质与创新')
      .replace('{概念}', example)
      .replace('{生活方式}', example)
      .replace('{理念}', '生活美学')
      .replace('{技巧}', '实用技巧');

    setInput(prev => ({
      ...prev,
      coreIdea: filledTemplate,
      style: '现代简约',
      targetAudience: '25-35岁城市用户',
      duration: 60
    }));
  }, []);

  // 处理系统提示词选择
  const handleSystemPromptSelect = useCallback((template: SystemPromptTemplate) => {
    setSelectedSystemPrompt(template);
    logger.info('系统提示词已选择', { template: template.name, category: template.category });
  }, []);

  
  // 导出为CSV
  const exportToCSV = useCallback(() => {
    if (!solution) return;

    const headers = ['sceneNumber', 'imagePrompt', 'videoPrompt'];
    const csvContent = [
      headers.join(','),
      ...solution.scenes.map(scene => [
        scene.sceneNumber,
        `"${scene.imagePrompt.replace(/"/g, '""')}"`,
        `"${scene.videoPrompt.replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(link);

    link.setAttribute('href', url);
    link.setAttribute('download', `${solution.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}_scenes.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    logger.logFeature.used('creative-csv-export', {
      title: solution.title,
      sceneCount: solution.scenes.length
    });
  }, [solution]);

  // 直接导入到当前项目
  const importToProject = useCallback(async () => {
    if (!solution || !currentProject) return;

    try {
      const response = await fetch('/api/scenes/batch-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: currentProject.id,
          scenes: solution.scenes.map(scene => ({
            sceneNumber: scene.sceneNumber,
            imagePrompt: scene.imagePrompt,
            videoPrompt: scene.videoPrompt
          })),
          strategy: 'skip' as const
        })
      });

      if (!response.ok) {
        throw new Error(`导入失败: ${response.statusText}`);
      }

      const result = await response.json();

      // 刷新项目数据
      await setCurrentProject(currentProject.id);

      logger.info('创意方案导入成功', {
        title: solution.title,
        importedScenes: result.summary?.successful || 0
      });

      // 显示成功提示
      alert(`成功导入 ${result.summary?.successful || 0} 个场景到项目中！`);

    } catch (error) {
      console.error('导入失败:', error);
      const errorMessage = error instanceof Error ? error.message : '导入失败';
      alert(`导入失败: ${errorMessage}`);
      logger.error('创意方案导入失败', { error: errorMessage }, 'creative-generator');
    }
  }, [solution, currentProject, setCurrentProject]);

  // 复制提示词
  const copyToClipboard = useCallback((text: string, type: string) => {
    navigator.clipboard.writeText(text).then(() => {
      logger.logFeature.used('copy-prompt', { type });
    }).catch(error => {
      console.error('复制失败:', error);
    });
  }, []);

  // 如果没有选择项目
  if (state.status === 'idle' && !currentProject) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <Target className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-yellow-900 mb-2">请先选择一个项目</h3>
          <p className="text-yellow-700">创意生成器需要绑定到具体项目才能工作</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      {/* 头部 */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI创意讨论助手</h1>
            <p className="text-gray-600">基于Gemini 2.5 Pro的实时创意构思讨论</p>
          </div>
        </div>
      </div>

      {/* 模型选择和配置 */}
      {state.status === 'ready' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center space-x-2 mb-4">
            <Settings className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">选择AI模型</h2>
          </div>
          <ModelSelector
            taskType="both"
            onModelSelect={handleModelSelect}
            selectedModelId={selectedModel?.id}
            disabled={false}
          />
        </div>
      )}

      {/* 系统提示词管理 */}
      {state.status === 'ready' && selectedModel && (
        <SystemPromptManager
          selectedTemplate={selectedSystemPrompt}
          onTemplateSelect={handleSystemPromptSelect}
        />
      )}

      {/* 创意输入和开始讨论 */}
      {state.status === 'ready' && selectedModel && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center space-x-2 mb-6">
            <Lightbulb className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">描述你的创意想法</h2>
          </div>

          {/* 模板选择 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">快速开始模板</label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {creativeTemplates.map((template, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3">
                  <h4 className="font-medium text-gray-900 mb-2">{template.name}</h4>
                  <div className="space-y-2">
                    {template.examples.map((example, exampleIndex) => (
                      <button
                        key={exampleIndex}
                        onClick={() => applyTemplate(template, example)}
                        className="w-full text-left px-2 py-1 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 核心创意输入 */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                核心创意想法 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={input.coreIdea}
                onChange={(e) => handleInputChange('coreIdea', e.target.value)}
                placeholder="描述你想要创作的视频内容，比如：制作一个关于环保咖啡杯的短视频，展示它如何减少塑料垃圾..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">风格偏好</label>
                <select
                  value={input.style || ''}
                  onChange={(e) => handleInputChange('style', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">自动选择</option>
                  <option value="现代简约">现代简约</option>
                  <option value="温馨治愈">温馨治愈</option>
                  <option value="科技感">科技感</option>
                  <option value="复古怀旧">复古怀旧</option>
                  <option value="自然清新">自然清新</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">目标时长</label>
                <select
                  value={input.duration || 60}
                  onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value={30}>30秒</option>
                  <option value={60}>60秒</option>
                  <option value={90}>90秒</option>
                  <option value={120}>2分钟</option>
                  <option value={180}>3分钟</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">目标观众</label>
                <select
                  value={input.targetAudience || ''}
                  onChange={(e) => handleInputChange('targetAudience', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">不限</option>
                  <option value="年轻人">年轻人 (18-35岁)</option>
                  <option value="职场人士">职场人士 (25-45岁)</option>
                  <option value="家庭用户">家庭用户</option>
                  <option value="学生群体">学生群体</option>
                  <option value="专业人士">专业人士</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">额外要求</label>
              <textarea
                value={input.additionalRequirements || ''}
                onChange={(e) => handleInputChange('additionalRequirements', e.target.value)}
                placeholder="比如：需要包含品牌logo、特定的色彩搭配、避免某些元素等..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={2}
              />
            </div>
          </div>

          {/* 开始讨论按钮 */}
          <div className="mt-6 flex justify-center">
            <button
              onClick={startDiscussion}
              disabled={!input.coreIdea.trim() || state.isWaitingForResponse}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2 shadow-lg"
            >
              {state.isWaitingForResponse ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>连接中...</span>
                </>
              ) : (
                <>
                  <MessageSquare className="w-5 h-5" />
                  <span>开始创意讨论</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 讨论聊天界面 */}
      {(state.status === 'discussing' || state.status === 'finalizing') && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">创意讨论</h2>
              {state.status === 'finalizing' && (
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                  正在生成最终方案...
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span>{selectedModel?.name}</span>
              <span>•</span>
              <span>{chatMessages.length} 条消息</span>
            </div>
          </div>

          {/* 聊天消息区域 */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 h-96 overflow-y-auto mb-4">
            {chatMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                <MessageSquare className="w-12 h-12 mb-2" />
                <p>开始你的创意讨论...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {chatMessages.map((message, index) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div
                      className={`max-w-2xl px-4 py-3 rounded-lg ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-gray-200 text-gray-800'
                      }`}
                    >
                      <div className="flex items-start space-x-2">
                        {message.role === 'assistant' && (
                          <Brain className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          <p
                            className={`text-xs mt-2 ${
                              message.role === 'user' ? 'text-blue-100' : 'text-gray-400'
                            }`}
                          >
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                        {message.role === 'user' && (
                          <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-xs text-white">你</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* 等待回复指示器 */}
                {state.isWaitingForResponse && (
                  <div className="flex justify-start animate-fade-in">
                    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <Brain className="w-5 h-5 text-blue-600" />
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 消息输入区域 */}
          {state.status === 'discussing' && (
            <div className="space-y-4">
              <div className="flex items-end space-x-2">
                <textarea
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="继续讨论你的创意想法，比如：可以让场景更有冲击力吗？"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                  disabled={state.isWaitingForResponse}
                />
                <button
                  onClick={sendMessage}
                  disabled={!currentMessage.trim() || state.isWaitingForResponse}
                  className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>

              {/* 操作按钮 */}
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  按 Enter 发送，Shift+Enter 换行
                </div>
                <button
                  onClick={finalizeSolution}
                  disabled={state.isWaitingForResponse || chatMessages.length < 2}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  <FileText className="w-4 h-4" />
                  <span>确定最终方案</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 错误状态 */}
      {state.status === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">!</span>
            </div>
            <h2 className="text-lg font-semibold text-red-900">讨论失败</h2>
          </div>
          <p className="text-red-700 mb-4">{state.error}</p>
          <div className="flex space-x-2">
            <button
              onClick={() => setState({ status: 'ready' })}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              重新开始
            </button>
            {discussionStarted && (
              <button
                onClick={() => setState({ status: 'discussing', isWaitingForResponse: false })}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                继续讨论
              </button>
            )}
          </div>
        </div>
      )}

      {/* 结果展示 */}
      {state.status === 'completed' && solution && (
        <div className="space-y-6">
          {/* 方案概览 */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">{solution.title}</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setState({ status: 'ready' });
                    setSolution(null);
                    setChatMessages([]);
                    setDiscussionStarted(false);
                  }}
                  className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  title="重新开始讨论"
                >
                  <RefreshCw className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  onClick={exportToCSV}
                  className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  title="导出CSV"
                >
                  <Download className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  onClick={importToProject}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <FileText className="w-4 h-4" />
                  <span>导入项目</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-white/70 rounded-lg p-3">
                <div className="flex items-center space-x-2 text-gray-600 mb-1">
                  <FileText className="w-4 h-4" />
                  <span className="text-sm">场景数量</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{solution.scenes.length}</p>
              </div>
              <div className="bg-white/70 rounded-lg p-3">
                <div className="flex items-center space-x-2 text-gray-600 mb-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">预计时长</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{solution.totalEstimatedTime}秒</p>
              </div>
              <div className="bg-white/70 rounded-lg p-3">
                <div className="flex items-center space-x-2 text-gray-600 mb-1">
                  <Palette className="w-4 h-4" />
                  <span className="text-sm">视觉风格</span>
                </div>
                <p className="text-lg font-bold text-gray-900">{solution.style}</p>
              </div>
              <div className="bg-white/70 rounded-lg p-3">
                <div className="flex items-center space-x-2 text-gray-600 mb-1">
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-sm">情感基调</span>
                </div>
                <p className="text-lg font-bold text-gray-900">{solution.mood}</p>
              </div>
            </div>

            <div className="bg-white/70 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">创意概念</h3>
              <p className="text-gray-700">{solution.concept}</p>
            </div>
          </div>

          {/* 场景详情 */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">分镜脚本</h3>
            <div className="space-y-6">
              {solution.scenes.map((scene, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-semibold text-sm">
                        {scene.sceneNumber}
                      </span>
                      <h4 className="font-medium text-gray-900">场景 {scene.sceneNumber}</h4>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => copyToClipboard(scene.imagePrompt, 'image')}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        title="复制图片提示词"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => copyToClipboard(scene.videoPrompt, 'video')}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        title="复制视频提示词"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <h5 className="font-medium text-green-900 mb-2 flex items-center space-x-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span>图片提示词</span>
                      </h5>
                      <p className="text-sm text-gray-700">{scene.imagePrompt}</p>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <h5 className="font-medium text-blue-900 mb-2 flex items-center space-x-1">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        <span>视频提示词</span>
                      </h5>
                      <p className="text-sm text-gray-700">{scene.videoPrompt}</p>
                    </div>
                  </div>

                  {scene.creativeNotes && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        <span className="font-medium">创意说明：</span> {scene.creativeNotes}
                      </p>
                    </div>
                  )}

                  {scene.technicalSpecs && (
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                      {scene.technicalSpecs.cameraAngle && (
                        <div className="text-sm">
                          <span className="font-medium text-gray-600">镜头：</span>
                          <span className="text-gray-800 ml-1">{scene.technicalSpecs.cameraAngle}</span>
                        </div>
                      )}
                      {scene.technicalSpecs.lighting && (
                        <div className="text-sm">
                          <span className="font-medium text-gray-600">光线：</span>
                          <span className="text-gray-800 ml-1">{scene.technicalSpecs.lighting}</span>
                        </div>
                      )}
                      {scene.technicalSpecs.composition && (
                        <div className="text-sm">
                          <span className="font-medium text-gray-600">构图：</span>
                          <span className="text-gray-800 ml-1">{scene.technicalSpecs.composition}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 技术建议 */}
          {solution.technicalNotes && solution.technicalNotes.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">技术建议</h3>
              <ul className="space-y-2">
                {solution.technicalNotes.map((note, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <ChevronRight className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 创意建议 */}
          {solution.suggestions && solution.suggestions.length > 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-purple-900 mb-4">创意建议</h3>
              <ul className="space-y-2">
                {solution.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <Sparkles className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                    <span className="text-purple-800">{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CreativeGenerator;