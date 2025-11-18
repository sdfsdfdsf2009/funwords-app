import { NextApiRequest, NextApiResponse } from 'next';
import { logger } from '@/utils/logger';
import { EvoLinkAPIConfig } from '@/types/apiConfig';

// 创意输入接口
interface CreativeInput {
  coreIdea: string;
  style?: string;
  targetAudience?: string;
  duration?: number;
  mood?: string;
  additionalRequirements?: string;
  projectId?: string;
  timestamp?: string;
}

// 请求接口
interface GenerateRequest {
  model: string;
  systemPrompt?: string;
  input: CreativeInput;
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

// 创意方案接口
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

// Gemini 2.5 Pro 系统提示词
const CREATIVE_GENERATION_SYSTEM_PROMPT = `你是一位专业的视频创意策划师和视觉设计师，拥有丰富的影视制作和广告创意经验。你的任务是将用户的创意想法转化为详细的分镜脚本。

## 你的核心能力：
1. **创意概念化** - 将模糊的想法转化为具体的概念
2. **视觉设计** - 描述场景的视觉效果和风格
3. **分镜规划** - 设计合理的场景序列和节奏
4. **技术指导** - 提供摄影和制作建议

## 输出要求：
请严格按照以下JSON格式输出：

{
  "title": "吸引人的标题",
  "concept": "整体创意概念的详细描述",
  "style": "视觉风格（如：现代简约、温馨治愈、科技感等）",
  "mood": "情感基调（如：励志、温暖、悬疑、欢乐等）",
  "scenes": [
    {
      "sceneNumber": 1,
      "imagePrompt": "详细的图片生成提示词，包含主体、环境、光线、构图、色彩等",
      "videoPrompt": "详细的视频生成提示词，包含动作、镜头运动、节奏、转场等",
      "creativeNotes": "这个场景的创意说明和设计理念",
      "technicalSpecs": {
        "cameraAngle": "镜头角度（如：平视、俯视、仰视等）",
        "lighting": "光线设计（如：自然光、柔光、戏剧性光线等）",
        "composition": "构图方式（如：三分法、中心构图、引导线等）"
      }
    }
  ],
  "totalEstimatedTime": 60,
  "technicalNotes": [
    "整体制作的技术建议1",
    "整体制作的技术建议2"
  ],
  "suggestions": [
    "创意优化建议1",
    "创意优化建议2"
  ]
}

## 创作原则：
1. **用户中心** - 紧扣用户需求和目标观众
2. **视觉冲击** - 创造有记忆点的视觉画面
3. **故事连贯** - 确保场景之间的逻辑性和连贯性
4. **技术可行** - 考虑实际制作的技术限制
5. **创意独特** - 提供新颖的视角和表达方式

## 提示词优化指南：
- **图片提示词**：重点描述静态画面，包含主体、环境、光线、色彩、构图、氛围等
- **视频提示词**：重点描述动态元素，包含动作、镜头运动、节奏变化、转场效果等
- **技术规格**：提供具体可执行的摄影和制作指导

请根据用户的输入，生成一个完整的、专业的、可执行的创意方案。`;

// 根据模型类型选择API配置
function getAPIConfig(modelId: string): EvoLinkAPIConfig {
  const configs: Record<string, EvoLinkAPIConfig> = {
    'gemini-2.5-pro': {
      baseUrl: 'https://api.evolink.ai/v1',
      apiKey: process.env.EVOLINK_API_KEY || '',
      provider: 'evolink',
      model: 'gemini-2.5-pro',
      maxTokens: 8192,
      temperature: 0.7,
      timeout: 120000
    },
    'sora-2-pro': {
      baseUrl: 'https://api.evolink.ai/v1',
      apiKey: process.env.EVOLINK_API_KEY || '',
      provider: 'evolink',
      model: 'sora-2-pro',
      maxTokens: 4096,
      temperature: 0.8,
      timeout: 180000
    },
    'veo-3.1-fast': {
      baseUrl: 'https://api.evolink.ai/v1',
      apiKey: process.env.EVOLINK_API_KEY || '',
      provider: 'evolink',
      model: 'veo-3.1-fast',
      maxTokens: 4096,
      temperature: 0.7,
      timeout: 60000
    },
    'seedream-4.0': {
      baseUrl: 'https://api.evolink.ai/v1',
      apiKey: process.env.EVOLINK_API_KEY || '',
      provider: 'evolink',
      model: 'seedream-4.0',
      maxTokens: 6144,
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
    maxTokens: 4096,
    temperature: 0.7,
    timeout: 60000
  };

  return configs[modelId] || defaultConfig;
}

// 构建用户提示词
function buildUserPrompt(input: CreativeInput): string {
  let prompt = `请为以下创意想法生成详细的视频制作方案：\n\n`;

  prompt += `**核心创意：** ${input.coreIdea}\n\n`;

  if (input.style) {
    prompt += `**风格偏好：** ${input.style}\n\n`;
  }

  if (input.targetAudience) {
    prompt += `**目标观众：** ${input.targetAudience}\n\n`;
  }

  if (input.duration) {
    prompt += `**目标时长：** ${input.duration}秒\n\n`;
  }

  if (input.mood) {
    prompt += `**情感基调：** ${input.mood}\n\n`;
  }

  if (input.additionalRequirements) {
    prompt += `**额外要求：** ${input.additionalRequirements}\n\n`;
  }

  prompt += `请根据以上信息，生成3-5个场景的完整分镜脚本，确保总时长控制在${input.duration || 60}秒左右。每个场景都需要包含详细的图片和视频生成提示词。`;

  return prompt;
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

  logger.info('调用EvoLink创意生成API', {
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
function parseCreativeResponse(responseData: any): CreativeSolution {
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
      throw new Error('无法解析AI返回的创意方案');
    }

    // 验证必要字段
    if (!creativeSolution.title || !creativeSolution.concept || !creativeSolution.scenes) {
      throw new Error('创意方案缺少必要字段');
    }

    if (!Array.isArray(creativeSolution.scenes) || creativeSolution.scenes.length === 0) {
      throw new Error('创意方案必须包含至少一个场景');
    }

    // 验证每个场景
    creativeSolution.scenes.forEach((scene, index) => {
      if (!scene.sceneNumber || !scene.imagePrompt || !scene.videoPrompt) {
        throw new Error(`场景${index + 1}缺少必要字段`);
      }
    });

    logger.info('创意方案解析成功', {
      title: creativeSolution.title,
      sceneCount: creativeSolution.scenes.length,
      totalTime: creativeSolution.totalEstimatedTime
    });

    return creativeSolution;

  } catch (error) {
    logger.error('创意方案解析失败', { error: error.message, responseData });
    throw error;
  }
}

// 生成降级方案（当API调用失败时）
function generateFallbackSolution(input: CreativeInput): CreativeSolution {
  logger.warn('使用降级方案生成创意内容', { coreIdea: input.coreIdea });

  return {
    title: `关于${input.coreIdea.slice(0, 20)}的创意视频`,
    concept: `基于"${input.coreIdea}"的创意视频，通过生动的视觉画面和故事叙述，展现核心概念和价值主张。`,
    style: input.style || '现代简约',
    mood: input.mood || '积极向上',
    scenes: [
      {
        sceneNumber: 1,
        imagePrompt: `开场画面：${input.coreIdea}的核心视觉呈现，清晰明亮，专业质感`,
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
        imagePrompt: `细节展示：${input.coreIdea}的详细特写，突出重要特点`,
        videoPrompt: `特写镜头：重点展示${input.coreIdea}的核心优势，镜头缓慢推进`,
        creativeNotes: '通过特写镜头突出关键信息，增强说服力',
        technicalSpecs: {
          cameraAngle: '微距',
          lighting: '侧光增强质感',
          composition: '三分法则'
        }
      },
      {
        sceneNumber: 3,
        imagePrompt: `结尾画面：${input.coreIdea}的完整展示，配以品牌信息或行动号召`,
        videoPrompt: `结尾镜头：全景展示${input.coreIdea}的整体效果，淡出结束`,
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
      '后期调色保持风格统一'
    ],
    suggestions: [
      '可以根据实际需要调整场景数量和时长',
      '建议加入真实的使用场景增强可信度',
      '考虑加入字幕帮助信息传达'
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
    const { model, systemPrompt, input }: GenerateRequest = req.body;

    // 验证请求参数
    if (!model || !input || !input.coreIdea) {
      return res.status(400).json({
        error: '缺少必要参数',
        required: ['model', 'input.coreIdea']
      });
    }

    logger.info('开始处理创意生成请求', {
      model,
      coreIdea: input.coreIdea,
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

    // 构建提示词
    const userPrompt = buildUserPrompt(input);

    let creativeSolution: CreativeSolution;

    try {
      // 使用自定义系统提示词或默认提示词
      const systemPromptToUse = systemPrompt || CREATIVE_GENERATION_SYSTEM_PROMPT;

      // 调用EvoLink API
      const apiResponse = await callEvoLinkAPI(apiConfig, systemPromptToUse, userPrompt);

      // 解析响应
      creativeSolution = parseCreativeResponse(apiResponse);

      logger.info('创意方案生成成功', {
        title: creativeSolution.title,
        sceneCount: creativeSolution.scenes.length,
        model,
        duration: creativeSolution.totalEstimatedTime,
        usedCustomPrompt: !!systemPrompt
      });

    } catch (apiError) {
      logger.error('EvoLink API调用失败，使用降级方案', {
        error: apiError.message,
        model,
        coreIdea: input.coreIdea,
        usedCustomPrompt: !!systemPrompt
      });

      // 使用降级方案
      creativeSolution = generateFallbackSolution(input);
    }

    // 返回成功响应
    res.status(200).json(creativeSolution);

  } catch (error) {
    console.error('创意生成API错误:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';

    logger.error('创意生成失败', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      requestBody: req.body
    }, 'creative-generator-api');

    res.status(500).json({
      error: '创意生成失败',
      message: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
}

// API配置
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb'
    },
    responseLimit: '10mb'
  },
  maxDuration: 30 // 30秒超时
};