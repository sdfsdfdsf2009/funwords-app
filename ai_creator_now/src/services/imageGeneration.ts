import { APIConfiguration, ImageGenerationRequest, ImageGenerationProgress, GeneratedImage } from '../types';
import { logger } from '../utils/logger';
import { rateLimitHandler, withRateLimitRetry } from '../utils/rateLimitHandler';

// 简化版图片生成服务，专注于修复后的Evolink API
class SimpleImageGenerationService {

  /**
   * 验证配置数据的完整性和安全性
   */
  private validateConfig(config: any): APIConfiguration {
    logger.info('Validating API configuration', { configId: config?.id });

    // 详细调试：打印接收到的配置对象结构
    console.log('🔧 validateConfig 接收到的配置:', {
      configId: config?.id,
      configName: config?.name,
      hasHeaders: !!config?.headers,
      headersCount: config?.headers?.length || 0,
      headers: config?.headers?.map((h, i) => ({
        index: i,
        key: h?.key,
        hasValue: !!h?.value,
        enabled: h?.enabled,
        isAuth: h?.key?.toLowerCase() === 'authorization',
        valuePreview: h?.key?.toLowerCase() === 'authorization' ?
          (h?.value?.startsWith('Bearer ') ? 'Bearer [***]' : h?.value?.substring(0, 20) + '...') :
          h?.value?.substring(0, 20) + '...'
      })),
      endpoint: config?.endpoint,
      type: config?.type,
      isActive: config?.isActive
    });

    // 检查必需字段
    if (!config) {
      throw new Error('API配置不存在');
    }

    if (!config.id) {
      throw new Error('API配置缺少ID字段');
    }

    if (!config.endpoint) {
      throw new Error('API配置缺少endpoint字段');
    }

    // 检查并修复headers字段
    if (!config.headers || !Array.isArray(config.headers)) {
      logger.warn('API配置缺少headers字段，使用默认值', { configId: config.id });
      config.headers = [];
    }

    // 确保基本headers存在
    const hasContentType = config.headers.some(h => h.key === 'Content-Type');
    if (!hasContentType) {
      config.headers.push({
        key: 'Content-Type',
        value: 'application/json'
      });
    }

    // 验证endpoint格式 - 支持相对路径和绝对路径
    try {
      // 如果是相对路径（以/开头），则跳过URL验证
      if (!config.endpoint.startsWith('/')) {
        new URL(config.endpoint);
      }
    } catch (error) {
      throw new Error(`API配置的endpoint格式无效: ${config.endpoint}`);
    }

    logger.info('API configuration validation passed', {
      configId: config.id,
      hasHeaders: config.headers.length > 0,
      endpoint: config.endpoint
    });

    return config as APIConfiguration;
  }

  /**
   * 构建安全的请求头
   */
  private buildHeaders(config: APIConfiguration): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    // 安全地从配置中添加headers - 修复：只添加启用的headers
    if (config.headers && Array.isArray(config.headers)) {
      config.headers.forEach(header => {
        // 添加条件检查：header必须存在 + enabled=true + key和value都是有效字符串
        if (header &&
            header.enabled !== false && // 关键修复：检查enabled状态
            header.key && typeof header.key === 'string' &&
            header.value && typeof header.value === 'string') {
          headers[header.key] = header.value;

          // 特别调试Authorization头部
          if (header.key.toLowerCase() === 'authorization') {
            logger.info('Authorization header found and added', {
              configId: config.id,
              hasBearerPrefix: header.value.startsWith('Bearer '),
              valueLength: header.value.length
            });
          }
        } else if (header && header.key === 'Authorization') {
          logger.warn('Authorization header found but disabled or invalid', {
            configId: config.id,
            enabled: header.enabled,
            hasKey: !!header.key,
            hasValue: !!header.value,
            keyType: typeof header.key,
            valueType: typeof header.value
          });
        }
      });
    }

    logger.debug('Built request headers', {
      configId: config.id,
      headerCount: Object.keys(headers).length,
      hasAuth: !!headers['Authorization'],
      allHeaders: Object.keys(headers)
    });

    // 特别检查：如果没有Authorization头部，记录警告
    if (!headers['Authorization']) {
      logger.error('No Authorization header found in configuration!', {
        configId: config.id,
        configName: config.name,
        totalHeaders: config.headers?.length || 0,
        headerDetails: config.headers?.map(h => ({
          key: h.key,
          hasValue: !!h.value,
          enabled: h.enabled,
          isAuth: h.key?.toLowerCase() === 'authorization'
        }))
      });
    }

    return headers;
  }

  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationProgress> {
    const generationId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // 验证配置数据 - 这是关键修复
      const config = this.validateConfig(request.config);

      const progress: ImageGenerationProgress = {
        id: generationId,
        configId: config.id,
        sceneId: request.sceneId,
        prompt: request.prompt,
        status: 'pending',
        progress: 0,
        startTime: Date.now()
      };

      logger.info('Starting simplified image generation with rate limit protection', {
        generationId,
        endpoint: config.endpoint,
        prompt: request.prompt,
        configValidated: true
      });

      // 使用速率限制保护包装请求
      const result = await withRateLimitRetry(async () => {
        return this.executeImageGeneration(config, request, generationId);
      }, {
        maxRetries: 5,
        baseDelay: 3000, // 3秒基础延迟，更保守
        maxDelay: 120000, // 最大2分钟
        backoffFactor: 2.0,
        jitter: true,
        retryableErrors: [
          'too many requests',
          'rate limit',
          'rate_limit_exceeded',
          '429',
          'quota exceeded',
          'throttled',
          'api request failed: 429'
        ]
      });

      // 合并结果到进度对象
      progress.status = result.status;
      progress.progress = result.progress;
      progress.result = result.result;
      progress.endTime = result.endTime;
      progress.error = result.error;

      logger.info('Image generation completed with rate limit protection', {
        generationId,
        status: progress.status,
        imageUrl: progress.result?.url
      });

      return progress;

    } catch (error) {
      logger.error('Image generation failed after rate limit retries', {
        error: error.message,
        generationId,
        stack: error.stack,
        errorType: error.constructor.name
      });

      // 增强错误处理 - 特别处理429错误
      let errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (error.message.includes('429') || error.message.includes('Too Many Requests') || error.message.includes('rate limit')) {
        errorMessage = `请求频率过高：${errorMessage}

解决建议：
1. 等待2-5分钟后重试
2. 减少同时生成的图片数量
3. 分批处理多个场景
4. 检查是否有其他程序在发送请求

系统已自动重试多次，建议稍后再试。`;
      } else if (error.message.includes('API配置') || error.message.includes('配置')) {
        errorMessage = `配置错误: ${errorMessage}。请检查API配置设置。`;
      } else if (error.message.includes('fetch') || error.message.includes('network')) {
        errorMessage = `网络错误: ${errorMessage}。请检查网络连接。`;
      }

      const progress: ImageGenerationProgress = {
        id: generationId,
        configId: request.config?.id || 'unknown',
        sceneId: request.sceneId,
        prompt: request.prompt,
        status: 'failed',
        progress: 0,
        startTime: Date.now(),
        endTime: Date.now(),
        error: errorMessage
      };

      return progress;
    }
  }

  /**
   * 执行实际的图片生成请求
   */
  private async executeImageGeneration(
    config: APIConfiguration,
    request: ImageGenerationRequest,
    generationId: string
  ): Promise<Partial<ImageGenerationProgress>> {
    // 记录请求以防止重复
    rateLimitHandler.recordRequest(config.endpoint, 'POST');

    // 检查是否应该阻止请求
    if (rateLimitHandler.shouldBlockRequest(config.endpoint)) {
      throw new Error('请求过于频繁，请稍后再试');
    }

    // 构建请求体
    const requestBody = {
      model: 'gemini-2.5-flash-image',
      prompt: request.prompt,
      size: 'auto',
      image_urls: []
    };

    // 构建安全的请求头
    const headers = this.buildHeaders(config);

    logger.info('Executing image generation request', {
      generationId,
      endpoint: config.endpoint,
      model: requestBody.model
    });

    // 发送请求
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody)
    });

    // 检查速率限制
    if (response.status === 429) {
      const rateLimitInfo = rateLimitHandler.analyzeRateLimit(response);
      logger.warn('Rate limit detected', {
        generationId,
        rateLimitInfo,
        retryAfter: rateLimitInfo.retryAfter
      });

      // 创建增强的错误对象
      const error = new Error(`API request failed: 429 Too Many Requests`);
      (error as any).response = response;
      (error as any).rateLimitInfo = rateLimitInfo;
      throw error;
    }

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    logger.info('API response received', { generationId, data });

    const result: Partial<ImageGenerationProgress> = {
      status: 'completed',
      progress: 100,
      endTime: Date.now()
    };

    // 检查是否是异步响应
    if (data.id && data.status) {
      result.status = 'processing';
      result.progress = 10;

      const imageResult = await this.pollForTaskCompletionWithRetry(config, data.id, generationId);
      result.result = imageResult;
      result.status = 'completed';
      result.progress = 100;

      logger.info('Image generation completed (async)', {
        generationId,
        imageUrl: imageResult.url
      });
    } else {
      // 同步响应，直接解析结果
      const imageResult: GeneratedImage = {
        id: `img_${Date.now()}`,
        url: data.results?.[0] || data.url || data.result_url,
        thumbnailUrl: data.results?.[0] || data.url || data.result_url,
        metadata: {
          model: requestBody.model,
          prompt: request.prompt,
          provider: 'Evolink'
        }
      };

      result.result = imageResult;

      logger.info('Image generation completed (sync)', {
        generationId,
        imageUrl: imageResult.url
      });
    }

    return result;
  }

  private async pollForTaskCompletionWithRetry(
    config: APIConfiguration,
    taskId: string,
    generationId: string
  ): Promise<GeneratedImage> {
    return await withRateLimitRetry(async () => {
      return this.pollForTaskCompletion(config, taskId, generationId);
    }, {
      maxRetries: 3,
      baseDelay: 2000,
      maxDelay: 30000,
      backoffFactor: 1.5,
      jitter: true
    });
  }

  private async pollForTaskCompletion(
    config: APIConfiguration,
    taskId: string,
    generationId: string
  ): Promise<GeneratedImage> {
    const maxPollingTime = 180000; // 3分钟
    const pollingInterval = 2000; // 2秒
    const startTime = Date.now();

    // 使用本地代理而不是直接调用外部API
    const localPollEndpoint = `/api/evolink/v1/tasks/${taskId}`;

    // 准备配置头部给代理使用
    const configHeader = encodeURIComponent(JSON.stringify({
      headers: config.headers
    }));

    let currentProgress = 10;

    while (Date.now() - startTime < maxPollingTime) {
      try {
        // 添加速率限制保护到轮询请求
        const response = await withRateLimitRetry(async () => {
          return await fetch(localPollEndpoint, {
            method: 'GET',
            headers: {
              'x-api-config': configHeader
            }
          });
        }, {
          maxRetries: 2,
          baseDelay: 1000,
          maxDelay: 10000,
          retryableErrors: ['429', 'too many requests', 'rate limit']
        });

        if (!response.ok) {
          if (response.status === 429) {
            throw new Error(`轮询请求被限制: 429 Too Many Requests`);
          }
          throw new Error(`Polling request failed: ${response.status}`);
        }

        const data = await response.json();
        logger.debug('Polling response received', { generationId, taskId, status: data.status });

        currentProgress = Math.min(currentProgress + 8, 90);

        if (data.status === 'completed') {
          const result: GeneratedImage = {
            id: taskId,
            url: data.results?.[0] || data.url || data.result_url,
            thumbnailUrl: data.results?.[0] || data.url || data.result_url,
            metadata: {
              taskId: taskId,
              progress: data.progress,
              taskInfo: data.task_info,
              provider: 'Evolink'
            }
          };

          logger.info('Task polling completed successfully', {
            generationId,
            taskId,
            imageUrl: result.url
          });

          return result;
        }

        if (data.status === 'failed') {
          throw new Error(`Task failed: ${data.error || 'Unknown error'}`);
        }

        // 继续等待
        await new Promise(resolve => setTimeout(resolve, pollingInterval));

      } catch (error) {
        logger.error('Polling error', { error, taskId, generationId });
        throw error;
      }
    }

    throw new Error('Task polling timeout');
  }
}

let simpleImageServiceInstance: SimpleImageGenerationService | null = null;

export const getSimpleImageGenerationService = (): SimpleImageGenerationService => {
  if (!simpleImageServiceInstance) {
    simpleImageServiceInstance = new SimpleImageGenerationService();
  }
  return simpleImageServiceInstance;
};

// 为了兼容现有代码，导出一些别名
export const imageGenerationService = getSimpleImageGenerationService();
export const getImageGenerationService = getSimpleImageGenerationService;

// 导出主要的生成函数
export async function generateImage(request: ImageGenerationRequest) {
  const service = getSimpleImageGenerationService();
  return await service.generateImage(request);
}

// 导出历史记录函数（从项目状态中读取）
export function getImageGenerationHistory() {
  try {
    // 动态导入项目store以避免循环依赖
    const { useProjectStore } = require('../stores/projectStore');
    const currentProject = useProjectStore.getState().currentProject;

    if (!currentProject || !currentProject.scenes) {
      return [];
    }

    // 从所有场景中收集生成的图片
    const history: ImageGenerationProgress[] = [];

    currentProject.scenes.forEach(scene => {
      if (scene.images && scene.images.length > 0) {
        scene.images.forEach(image => {
          // 安全处理时间戳，使用图片ID作为备用排序依据
          const timestamp = image.createdAt || image.metadata?.timestamp || Date.now();
          let startTime: Date;

          if (typeof timestamp === 'string') {
            startTime = new Date(timestamp);
            if (isNaN(startTime.getTime())) {
              // 如果时间解析失败，从图片ID提取时间戳或使用当前时间
              const idTime = parseInt(image.id?.replace(/\D/g, '') || '0');
              startTime = new Date(idTime > 0 ? idTime : Date.now());
            }
          } else if (timestamp instanceof Date) {
            startTime = timestamp;
          } else {
            startTime = new Date(timestamp);
          }

          const historyItem: ImageGenerationProgress = {
            id: image.id,
            configId: image.metadata?.configId || 'unknown',
            sceneId: scene.id,
            prompt: image.prompt || '',
            status: 'completed',
            progress: 100,
            startTime: startTime,
            endTime: startTime,
            result: {
              id: image.id,
              url: image.url,
              thumbnailUrl: image.thumbnailUrl || image.url,
              provider: image.provider || image.metadata?.provider || 'Evolink',
              prompt: image.prompt,
              settings: image.settings,
              metadata: image.metadata,
              createdAt: image.createdAt
            }
          };
          history.push(historyItem);
        });
      }
    });

    // 按创建时间倒序排列（最新的在前），使用安全的时间比较
    return history.sort((a, b) => {
      const timeA = a.startTime instanceof Date ? a.startTime.getTime() : new Date(a.startTime).getTime();
      const timeB = b.startTime instanceof Date ? b.startTime.getTime() : new Date(b.startTime).getTime();
      return timeB - timeA;
    });

  } catch (error) {
    console.error('Failed to get image generation history:', error);
    return [];
  }
}