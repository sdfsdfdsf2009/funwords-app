import { NextApiRequest, NextApiResponse } from 'next';
import { logger } from '@/utils/logger';
import { EvoLinkAPIConfig } from '@/types/apiConfig';

// 讨论请求接口
interface DiscussRequest {
  model: string;
  systemPrompt?: string;
  message: string;
  conversationHistory: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
  input: {
    coreIdea: string;
    style?: string;
    targetAudience?: string;
    duration?: number;
    mood?: string;
    additionalRequirements?: string;
    projectId?: string;
    timestamp?: string;
  };
}

// 讨论响应接口
interface DiscussResponse {
  response: string;
  suggestions?: string[];
  nextSteps?: string[];
}

// 创意讨论专用系统提示词
const CREATIVE_DISCUSSION_SYSTEM_PROMPT = `你是一位专业的创意策划师和视频制作顾问，擅长通过对话的方式帮助用户完善他们的创意想法。

## 你的核心任务：
1. **对话式创意发展** - 通过提问和建议引导用户深化创意
2. **可行性分析** - 评估创意的实际制作可能性
3. **创意优化** - 提供具体的改进建议
4. **技术指导** - 给出制作层面的专业建议

## 对话原则：
1. **启发式提问** - 通过问题引导用户思考更深层次
2. **建设性反馈** - 先肯定优点，再提出改进建议
3. **循序渐进** - 逐步深入，不要一次性提出太多建议
4. **实用导向** - 所有建议都要有实际操作性
5. **鼓励创新** - 支持用户的大胆想法，同时提供实现路径

## 回复格式：
- 每次回复都要简明扼要（200-300字）
- 提供具体可执行的建议
- 适当提问引导下一步讨论
- 保持友好、专业的语调

## 特别注意：
- 不要过早给出最终方案
- 重点关注创意的独特性和可行性
- 根据用户反馈调整讨论方向
- 记住之前的对话内容，保持连贯性

现在开始与用户进行创意讨论吧！`;

// 根据模型类型选择API配置
function getAPIConfig(modelId: string): EvoLinkAPIConfig {
  const configs: Record<string, EvoLinkAPIConfig> = {
    'gemini-2.5-pro': {
      baseUrl: 'https://api.evolink.ai/v1',
      apiKey: process.env.EVOLINK_API_KEY || '',
      provider: 'evolink',
      model: 'gemini-2.5-pro',
      maxTokens: 4096,
      temperature: 0.7,
      timeout: 120000
    },
    'sora-2-pro': {
      baseUrl: 'https://api.evolink.ai/v1',
      apiKey: process.env.EVOLINK_API_KEY || '',
      provider: 'evolink',
      model: 'sora-2-pro',
      maxTokens: 3072,
      temperature: 0.8,
      timeout: 180000
    },
    'veo-3.1-fast': {
      baseUrl: 'https://api.evolink.ai/v1',
      apiKey: process.env.EVOLINK_API_KEY || '',
      provider: 'evolink',
      model: 'veo-3.1-fast',
      maxTokens: 3072,
      temperature: 0.7,
      timeout: 60000
    },
    'seedream-4.0': {
      baseUrl: 'https://api.evolink.ai/v1',
      apiKey: process.env.EVOLINK_API_KEY || '',
      provider: 'evolink',
      model: 'seedream-4.0',
      maxTokens: 4096,
      temperature: 0.8,
      timeout: 90000
    }
  };

  // 如果找不到精确匹配，使用默认配置
  const defaultConfig: EvoLinkAPIConfig = {
    baseUrl: 'https://api.evolink.ai/v1',
    apiKey: process.env.EVOLINK_API_KEY || '',
    provider: 'evolink',
    model: modelId,
    maxTokens: 3072,
    temperature: 0.7,
    timeout: 60000
  };

  return configs[modelId] || defaultConfig;
}

// 构建对话上下文
function buildConversationContext(
  systemPrompt: string,
  userMessage: string,
  conversationHistory: DiscussRequest['conversationHistory']
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    {
      role: 'system',
      content: systemPrompt || CREATIVE_DISCUSSION_SYSTEM_PROMPT
    }
  ];

  // 添加对话历史（最近10条）
  const recentHistory = conversationHistory.slice(-10);
  recentHistory.forEach(msg => {
    messages.push({
      role: msg.role,
      content: msg.content
    });
  });

  // 添加当前用户消息
  messages.push({
    role: 'user',
    content: userMessage
  });

  return messages;
}

// 调用EvoLink API
async function callEvoLinkAPI(config: EvoLinkAPIConfig, messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>): Promise<any> {
  const requestBody = {
    model: config.model,
    messages,
    max_tokens: config.maxTokens,
    temperature: config.temperature
  };

  logger.info('调用EvoLink讨论API', {
    model: config.model,
    baseUrl: config.baseUrl,
    messageCount: messages.length
  });

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
      'User-Agent': 'AI-Creator-Studio/1.0'
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(config.timeout)
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('EvoLink API调用失败', {
      status: response.status,
      statusText: response.statusText,
      errorText,
      model: config.model
    });
    throw new Error(`EvoLink API调用失败: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  logger.info('EvoLink API调用成功', {
    model: config.model,
    usage: data.usage
  });

  return data;
}

// 生成降级回复（当API调用失败时）
function generateFallbackResponse(userMessage: string, conversationHistory: DiscussRequest['conversationHistory']): DiscussResponse {
  logger.warn('使用降级回复生成讨论响应', { userMessage: userMessage.slice(0, 50) });

  const lowerMessage = userMessage.toLowerCase();

  if (lowerMessage.includes('场景') || lowerMessage.includes('分镜')) {
    return {
      response: '关于场景设计，我建议你考虑开场、发展和结尾三个部分。开场要能快速吸引注意力，发展部分要展示核心内容，结尾要有明确的行动号召。你希望重点突出哪个部分？',
      suggestions: ['设计开场悬念', '优化视觉冲击力', '强化情感共鸣'],
      nextSteps: ['确定场景数量', '设计转场效果', '制定拍摄计划']
    };
  }

  if (lowerMessage.includes('风格') || lowerMessage.includes('色调')) {
    return {
      response: '视频风格的选择很重要，它影响观众的情感连接。你可以考虑现代简约、温馨治愈或者科技感等风格。你更倾向于哪种视觉风格？',
      suggestions: ['统一色调方案', '设计视觉符号', '选择背景音乐'],
      nextSteps: ['确定主色调', '设计字体样式', '制定视觉规范']
    };
  }

  if (lowerMessage.includes('时间') || lowerMessage.includes('时长')) {
    return {
      response: '视频时长需要平衡内容丰富度和观众注意力。通常30-60秒适合社交媒体，2-3分钟适合深度内容。你的目标观众是谁？他们通常在什么平台观看视频？',
      suggestions: ['精简核心信息', '优化节奏控制', '设计重点突出'],
      nextSteps: ['确定目标平台', '制定内容大纲', '设计时间分配']
    };
  }

  return {
    response: '这是一个很有趣的创意想法！为了帮你更好地完善这个概念，你能告诉我更多关于目标观众和期望达到的效果吗？这样我能给出更有针对性的建议。',
    suggestions: ['明确目标观众', '定义核心信息', '选择发布平台'],
    nextSteps: ['完善创意描述', '确定视觉风格', '制定实施计划']
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 只允许POST请求
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { model, systemPrompt, message, conversationHistory, input }: DiscussRequest = req.body;

    // 验证请求参数
    if (!model || !message) {
      return res.status(400).json({
        error: '缺少必要参数',
        required: ['model', 'message']
      });
    }

    logger.info('开始处理创意讨论请求', {
      model,
      messageLength: message.length,
      historyLength: conversationHistory?.length || 0,
      coreIdea: input.coreIdea
    });

    // 获取API配置
    const apiConfig = getAPIConfig(model);

    // 检查API密钥
    if (!apiConfig.apiKey) {
      logger.error('EvoLink API密钥未配置');
      return res.status(500).json({ error: 'API配置错误：缺少API密钥' });
    }

    let response: DiscussResponse;

    try {
      // 构建对话上下文
      const messages = buildConversationContext(systemPrompt || CREATIVE_DISCUSSION_SYSTEM_PROMPT, message, conversationHistory || []);

      // 调用EvoLink API
      const apiResponse = await callEvoLinkAPI(apiConfig, messages);

      // 解析响应
      const content = apiResponse.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('API返回的内容为空');
      }

      response = {
        response: content,
        suggestions: [
          '继续深化创意概念',
          '考虑技术实现方案',
          '思考观众互动方式'
        ],
        nextSteps: [
          '确定核心视觉元素',
          '设计关键场景',
          '制定时间规划'
        ]
      };

      logger.info('创意讨论生成成功', {
        model,
        responseLength: response.response.length,
        historyLength: (conversationHistory?.length || 0) + 2
      });

    } catch (apiError) {
      logger.error('EvoLink API调用失败，使用降级回复', {
        error: apiError.message,
        model,
        messageLength: message.length
      });

      // 使用降级回复
      response = generateFallbackResponse(message, conversationHistory || []);
    }

    // 返回成功响应
    res.status(200).json(response);

  } catch (error) {
    console.error('创意讨论API错误:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';

    logger.error('创意讨论失败', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      requestBody: req.body
    }, 'creative-discussion-api');

    res.status(500).json({
      error: '创意讨论失败',
      message: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
}

// API配置
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '2mb'
    },
    responseLimit: '10mb'
  },
  maxDuration: 30 // 30秒超时
};