import { NextApiRequest, NextApiResponse } from 'next';
import { logger } from '@/utils/logger';
import { EvoLinkAPIConfig } from '@/types/apiConfig';

// 最终方案请求接口
interface FinalizeRequest {
  model: string;
  systemPrompt?: string;
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

// 复用CreativeSolution和GeneratedScene接口
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

// 最终方案生成专用系统提示词
const CREATIVE_FINALIZE_SYSTEM_PROMPT = `你是一位专业的视频制作总监，基于用户与AI的完整讨论过程，生成最终的创意视频方案。

## 你的核心任务：
1. **总结讨论要点** - 提炼对话中的关键信息和创意共识
2. **生成完整方案** - 基于讨论结果制定详细的视频制作方案
3. **优化技术规格** - 提供具体的拍摄和制作指导
4. **确保可执行性** - 方案要实际可行，可以直接用于制作

## 输出要求：
请严格按照以下JSON格式输出最终的创意方案：

{
  "title": "吸引人的视频标题",
  "concept": "基于讨论总结的整体创意概念描述",
  "style": "最终确定的视觉风格",
  "mood": "最终确定的情感基调",
  "scenes": [
    {
      "sceneNumber": 1,
      "imagePrompt": "详细的图片生成提示词，包含主体、环境、光线、构图等",
      "videoPrompt": "详细的视频生成提示词，包含动作、镜头运动、节奏等",
      "creativeNotes": "这个场景的设计理念和在整体方案中的作用",
      "technicalSpecs": {
        "cameraAngle": "具体的镜头角度建议",
        "lighting": "光线设计要求",
        "composition": "构图方式和视觉重点"
      }
    }
  ],
  "totalEstimatedTime": 60,
  "technicalNotes": [
    "整体制作的技术要点和注意事项",
    "设备和技术要求建议"
  ],
  "suggestions": [
    "基于讨论的创意优化建议",
    "后续改进和发展方向"
  ]
}

## 生成原则：
1. **基于讨论** - 方案必须反映对话中的共识和决定
2. **逻辑连贯** - 场景之间要有清晰的逻辑关系
3. **技术可行** - 所有建议都要考虑实际制作条件
4. **创意突出** - 体现讨论中形成的独特创意点
5. **完整详细** - 提供足够详细的制作指导

## 特别注意：
- 场景数量控制在3-5个
- 每个场景都要有明确的制作目的
- 技术规格要具体可执行
- 总时长要符合用户需求

现在请根据用户的讨论历史，生成最终的创意方案。`;

// 根据模型类型选择API配置
function getAPIConfig(modelId: string): EvoLinkAPIConfig {
  const configs: Record<string, EvoLinkAPIConfig> = {
    'gemini-2.5-pro': {
      baseUrl: 'https://api.evolink.ai/v1',
      apiKey: process.env.EVOLINK_API_KEY || '',
      provider: 'evolink',
      model: 'gemini-2.5-pro',
      maxTokens: 8192,
      temperature: 0.6,
      timeout: 120000
    },
    'sora-2-pro': {
      baseUrl: 'https://api.evolink.ai/v1',
      apiKey: process.env.EVOLINK_API_KEY || '',
      provider: 'evolink',
      model: 'sora-2-pro',
      maxTokens: 6144,
      temperature: 0.7,
      timeout: 180000
    },
    'veo-3.1-fast': {
      baseUrl: 'https://api.evolink.ai/v1',
      apiKey: process.env.EVOLINK_API_KEY || '',
      provider: 'evolink',
      model: 'veo-3.1-fast',
      maxTokens: 4096,
      temperature: 0.6,
      timeout: 60000
    },
    'seedream-4.0': {
      baseUrl: 'https://api.evolink.ai/v1',
      apiKey: process.env.EVOLINK_API_KEY || '',
      provider: 'evolink',
      model: 'seedream-4.0',
      maxTokens: 6144,
      temperature: 0.7,
      timeout: 90000
    }
  };

  // 如果找不到精确匹配，使用默认配置
  const defaultConfig: EvoLinkAPIConfig = {
    baseUrl: 'https://api.evolink.ai/v1',
    apiKey: process.env.EVOLINK_API_KEY || '',
    provider: 'evolink',
    model: modelId,
    maxTokens: 4096,
    temperature: 0.6,
    timeout: 90000
  };

  return configs[modelId] || defaultConfig;
}

// 构建讨论总结
function buildDiscussionSummary(conversationHistory: FinalizeRequest['conversationHistory'], input: FinalizeRequest['input']): string {
  let summary = `## 创意讨论总结\n\n`;

  summary += `### 核心创意想法\n${input.coreIdea}\n\n`;

  if (input.style) {
    summary += `### 风格偏好\n${input.style}\n\n`;
  }

  if (input.targetAudience) {
    summary += `### 目标观众\n${input.targetAudience}\n\n`;
  }

  if (input.duration) {
    summary += `### 预计时长\n${input.duration}秒\n\n`;
  }

  if (input.additionalRequirements) {
    summary += `### 额外要求\n${input.additionalRequirements}\n\n`;
  }

  summary += `### 讨论要点\n`;

  // 提取讨论中的关键信息
  const recentHistory = conversationHistory.slice(-10);
  recentHistory.forEach((msg, index) => {
    const role = msg.role === 'user' ? '用户' : 'AI助手';
    summary += `${index + 1}. ${role}: ${msg.content.slice(0, 200)}${msg.content.length > 200 ? '...' : ''}\n`;
  });

  summary += `\n### 生成要求\n`;
  summary += `基于以上讨论，请生成一个完整的、可执行的创意视频方案。`;

  return summary;
}

// 调用EvoLink API
async function callEvoLinkAPI(config: EvoLinkAPIConfig, systemPrompt: string, userPrompt: string): Promise<any> {
  const requestBody = {
    model: config.model,
    messages: [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: userPrompt
      }
    ],
    max_tokens: config.maxTokens,
    temperature: config.temperature,
    response_format: { type: 'json_object' }
  };

  logger.info('调用EvoLink最终方案API', {
    model: config.model,
    baseUrl: config.baseUrl,
    promptLength: userPrompt.length
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

// 解析和验证API响应
function parseFinalizeResponse(responseData: any): CreativeSolution {
  try {
    const content = responseData.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('API返回的内容为空');
    }

    // 解析JSON响应
    let creativeSolution: CreativeSolution;
    try {
      creativeSolution = JSON.parse(content);
    } catch (parseError) {
      logger.error('JSON解析失败', { content, error: parseError.message });
      throw new Error('无法解析AI返回的最终方案');
    }

    // 验证必要字段
    if (!creativeSolution.title || !creativeSolution.concept || !creativeSolution.scenes) {
      throw new Error('最终方案缺少必要字段');
    }

    if (!Array.isArray(creativeSolution.scenes) || creativeSolution.scenes.length === 0) {
      throw new Error('最终方案必须包含至少一个场景');
    }

    // 验证每个场景
    creativeSolution.scenes.forEach((scene, index) => {
      if (!scene.sceneNumber || !scene.imagePrompt || !scene.videoPrompt) {
        throw new Error(`场景${index + 1}缺少必要字段`);
      }
    });

    logger.info('最终方案解析成功', {
      title: creativeSolution.title,
      sceneCount: creativeSolution.scenes.length,
      totalTime: creativeSolution.totalEstimatedTime
    });

    return creativeSolution;

  } catch (error) {
    logger.error('最终方案解析失败', { error: error.message, responseData });
    throw error;
  }
}

// 生成降级方案（当API调用失败时）
function generateFallbackSolution(input: FinalizeRequest['input'], conversationHistory: FinalizeRequest['conversationHistory']): CreativeSolution {
  logger.warn('使用降级方案生成最终创意方案', { coreIdea: input.coreIdea });

  // 从讨论历史中提取关键信息
  const lastUserMessage = conversationHistory.filter(msg => msg.role === 'user').pop();
  const lastAIMessage = conversationHistory.filter(msg => msg.role === 'assistant').pop();

  return {
    title: `关于${input.coreIdea.slice(0, 20)}的创意视频`,
    concept: `基于深入的创意讨论，这个视频将展现"${input.coreIdea}"的核心价值。${lastAIMessage ? `AI建议：${lastAIMessage.content.slice(0, 100)}...` : ''}`,
    style: input.style || '现代简约',
    mood: input.mood || '积极向上',
    scenes: [
      {
        sceneNumber: 1,
        imagePrompt: `开场画面：${input.coreIdea}的核心视觉呈现，${input.style || '现代简约'}风格，清晰明亮`,
        videoPrompt: `开场镜头：缓慢展示${input.coreIdea}的关键特征，配以柔和的背景音乐`,
        creativeNotes: '开场需要快速吸引观众注意力，建立第一印象',
        technicalSpecs: {
          cameraAngle: '平视',
          lighting: '明亮柔和',
          composition: '中心构图'
        }
      },
      {
        sceneNumber: 2,
        imagePrompt: `细节展示：${input.coreIdea}的详细特写，突出重要特点和${input.targetAudience || '观众'}关心的价值点`,
        videoPrompt: `特写镜头：重点展示${input.coreIdea}的核心优势，镜头缓慢推进，突出细节`,
        creativeNotes: '通过特写镜头突出关键信息，增强说服力',
        technicalSpecs: {
          cameraAngle: '微距',
          lighting: '侧光增强质感',
          composition: '三分法则'
        }
      },
      {
        sceneNumber: 3,
        imagePrompt: `结尾画面：${input.coreIdea}的完整展示，配以行动号召，${input.style || '现代简约'}风格的设计`,
        videoPrompt: `结尾镜头：全景展示${input.coreIdea}的整体效果，淡出结束，留下深刻印象`,
        creativeNotes: '结尾需要强化记忆点，引导观众行动',
        technicalSpecs: {
          cameraAngle: '全景',
          lighting: '自然光',
          composition: '黄金分割'
        }
      }
    ],
    totalEstimatedTime: input.duration || 60,
    technicalNotes: [
      '建议使用高质量摄影设备确保画面清晰度',
      '注意音画同步，音质要清晰',
      '后期调色保持风格统一',
      '讨论中提到的要点已融入方案设计'
    ],
    suggestions: [
      '可以根据实际需要调整场景数量和时长',
      '建议加入真实的使用场景增强可信度',
      '考虑加入字幕帮助信息传达',
      '基于讨论反馈，可以进一步优化细节'
    ]
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 只允许POST请求
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { model, systemPrompt, conversationHistory, input }: FinalizeRequest = req.body;

    // 验证请求参数
    if (!model || !input.coreIdea) {
      return res.status(400).json({
        error: '缺少必要参数',
        required: ['model', 'input.coreIdea']
      });
    }

    if (!conversationHistory || conversationHistory.length < 2) {
      return res.status(400).json({
        error: '讨论历史不完整，需要至少一轮对话',
        discussionLength: conversationHistory?.length || 0
      });
    }

    logger.info('开始处理最终方案生成请求', {
      model,
      coreIdea: input.coreIdea,
      discussionLength: conversationHistory.length,
      duration: input.duration,
      style: input.style,
      hasCustomSystemPrompt: !!systemPrompt
    });

    // 获取API配置
    const apiConfig = getAPIConfig(model);

    // 检查API密钥
    if (!apiConfig.apiKey) {
      logger.error('EvoLink API密钥未配置');
      return res.status(500).json({ error: 'API配置错误：缺少API密钥' });
    }

    let creativeSolution: CreativeSolution;

    try {
      // 构建讨论总结
      const discussionSummary = buildDiscussionSummary(conversationHistory, input);

      // 使用自定义系统提示词或默认提示词
      const systemPromptToUse = systemPrompt || CREATIVE_FINALIZE_SYSTEM_PROMPT;

      // 调用EvoLink API
      const apiResponse = await callEvoLinkAPI(apiConfig, systemPromptToUse, discussionSummary);

      // 解析响应
      creativeSolution = parseFinalizeResponse(apiResponse);

      logger.info('最终方案生成成功', {
        title: creativeSolution.title,
        sceneCount: creativeSolution.scenes.length,
        model,
        duration: creativeSolution.totalEstimatedTime,
        discussionMessages: conversationHistory.length,
        usedCustomPrompt: !!systemPrompt
      });

    } catch (apiError) {
      logger.error('EvoLink API调用失败，使用降级方案', {
        error: apiError.message,
        model,
        coreIdea: input.coreIdea,
        discussionLength: conversationHistory.length,
        usedCustomPrompt: !!systemPrompt
      });

      // 使用降级方案
      creativeSolution = generateFallbackSolution(input, conversationHistory);
    }

    // 返回成功响应
    res.status(200).json(creativeSolution);

  } catch (error) {
    console.error('最终方案生成API错误:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';

    logger.error('最终方案生成失败', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      requestBody: req.body
    }, 'creative-finalize-api');

    res.status(500).json({
      error: '最终方案生成失败',
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
  maxDuration: 60 // 60秒超时，生成最终方案需要更长时间
};