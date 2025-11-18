import {
  APIConfiguration,
  APIConfigurationTemplate,
  APIGenerationRequest,
  APIGenerationResult,
  APIHeader,
  APIRequestTemplate,
  APIResponseParser,
  APITestSettings,
  APIParameter
} from '../types';

// 预设的API配置模板
export const API_TEMPLATES: APIConfigurationTemplate[] = [
  {
    id: 'openai-dalle',
    name: 'OpenAI DALL-E',
    description: 'OpenAI DALL-E 图片生成API配置模板',
    category: '图片生成',
    isPopular: true,
    configuration: {
      type: 'image',
      endpoint: 'https://api.openai.com/v1/images/generations',
      method: 'POST',
      headers: [
        {
          key: 'Content-Type',
          value: 'application/json',
          description: '请求内容类型',
          enabled: true
        },
        {
          key: 'Authorization',
          value: 'Bearer YOUR_API_KEY',
          description: 'API密钥，请替换为您的实际密钥',
          enabled: true
        }
      ],
      requestTemplate: {
        format: 'json',
        template: JSON.stringify({
          prompt: '{{prompt}}',
          n: 1,
          size: '1024x1024',
          response_format: 'url'
        }, null, 2),
        parameters: [
          {
            name: 'prompt',
            type: 'string',
            required: true,
            description: '图片生成描述词'
          },
          {
            name: 'n',
            type: 'number',
            required: false,
            defaultValue: 1,
            description: '生成图片数量'
          },
          {
            name: 'size',
            type: 'string',
            required: false,
            defaultValue: '1024x1024',
            options: ['256x256', '512x512', '1024x1024', '1792x1024', '1024x1792'],
            description: '图片尺寸'
          },
          {
            name: 'response_format',
            type: 'string',
            required: false,
            defaultValue: 'url',
            options: ['url', 'b64_json'],
            description: '响应格式'
          }
        ],
        examples: [
          {
            name: '基础示例',
            description: '生成一张可爱的小猫图片',
            parameters: {
              prompt: '一只可爱的小猫坐在花园里，数字艺术风格',
              n: 1,
              size: '1024x1024'
            }
          }
        ]
      },
      responseParser: {
        format: 'json',
        imageUrlPath: '$.data[0].url',
        statusPath: '$.created',
        metadataPaths: {
          id: '$.created',
          generationTime: '$.created'
        },
        errorHandling: {
          errorPath: '$.error',
          errorMessages: {
            'invalid_request_error': '请求参数无效',
            'insufficient_quota': 'API配额不足',
            'rate_limit_exceeded': 'API调用频率超限'
          }
        }
      },
      testSettings: {
        testParameters: {
          prompt: '测试图片生成',
          n: 1,
          size: '256x256'
        },
        timeout: 30000,
        retryCount: 2,
        retryDelay: 1000
      }
    }
  },
  {
    id: 'stability-ai',
    name: 'Stability AI',
    description: 'Stability AI 图片生成API配置模板',
    category: '图片生成',
    isPopular: true,
    configuration: {
      type: 'image',
      endpoint: 'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
      method: 'POST',
      headers: [
        {
          key: 'Content-Type',
          value: 'application/json',
          description: '请求内容类型',
          enabled: true
        },
        {
          key: 'Authorization',
          value: 'Bearer YOUR_API_KEY',
          description: 'API密钥，请替换为您的实际密钥',
          enabled: true
        },
        {
          key: 'Accept',
          value: 'application/json',
          description: '响应格式',
          enabled: true
        }
      ],
      requestTemplate: {
        format: 'json',
        template: JSON.stringify({
          text_prompts: [
            {
              text: '{{prompt}}',
              weight: 1
            }
          ],
          cfg_scale: 7,
          height: 1024,
          width: 1024,
          samples: 1,
          steps: 30
        }, null, 2),
        parameters: [
          {
            name: 'prompt',
            type: 'string',
            required: true,
            description: '图片生成描述词'
          },
          {
            name: 'cfg_scale',
            type: 'number',
            required: false,
            defaultValue: 7,
            validation: { min: 1, max: 20 },
            description: '提示词引导强度'
          },
          {
            name: 'height',
            type: 'number',
            required: false,
            defaultValue: 1024,
            validation: { min: 128, max: 2048 },
            description: '图片高度'
          },
          {
            name: 'width',
            type: 'number',
            required: false,
            defaultValue: 1024,
            validation: { min: 128, max: 2048 },
            description: '图片宽度'
          },
          {
            name: 'samples',
            type: 'number',
            required: false,
            defaultValue: 1,
            validation: { min: 1, max: 10 },
            description: '生成图片数量'
          },
          {
            name: 'steps',
            type: 'number',
            required: false,
            defaultValue: 30,
            validation: { min: 10, max: 150 },
            description: '生成步数'
          }
        ],
        examples: [
          {
            name: '基础示例',
            description: '生成风景图片',
            parameters: {
              text_prompts: [
                {
                  text: '美丽的山脉风景，日落时分，油画风格',
                  weight: 1
                }
              ],
              cfg_scale: 7,
              height: 1024,
              width: 1024,
              samples: 1,
              steps: 30
            }
          }
        ]
      },
      responseParser: {
        format: 'json',
        imageUrlPath: '$.artifacts[0].base64',
        statusPath: '$.artifacts[0].finish_reason',
        metadataPaths: {
          id: '$.artifacts[0].seed',
          generationTime: '$.artifacts[0].finish_reason'
        },
        errorHandling: {
          errorPath: '$.message',
          errorMessages: {
            'invalid_request': '请求参数无效',
            'authentication_error': 'API密钥无效',
            'rate_limit_exceeded': 'API调用频率超限'
          }
        }
      },
      testSettings: {
        testParameters: {
          text_prompts: [
            {
              text: '测试图片生成',
              weight: 1
            }
          ],
          cfg_scale: 7,
          height: 512,
          width: 512,
          samples: 1,
          steps: 20
        },
        timeout: 60000,
        retryCount: 2,
        retryDelay: 2000
      }
    }
  },
  {
    id: 'evolink-nano-banana',
    name: 'Evolink Nano Banana',
    description: 'Evolink Nano Banana AI图片生成API配置模板',
    category: '图片生成',
    isPopular: false,
    configuration: {
      type: 'image',
      endpoint: '/api/evolink/v1/images/generations',
      method: 'POST',
      headers: [
        {
          key: 'Content-Type',
          value: 'application/json',
          description: '请求内容类型',
          enabled: true
        },
        {
          key: 'Authorization',
          value: 'Bearer YOUR_API_KEY',
          description: 'API密钥，请替换为您的实际密钥',
          enabled: true
        }
      ],
      requestTemplate: {
        format: 'json',
        template: JSON.stringify({
          model: 'gemini-2.5-flash-image',
          prompt: '{{prompt}}',
          size: 'auto',
          image_urls: []
        }, null, 2),
        parameters: [
          {
            name: 'model',
            type: 'string',
            required: true,
            defaultValue: 'gemini-2.5-flash-image',
            options: ['gemini-2.5-flash-image', 'gpt-4o-image', 'claude-3-opus', 'dall-e-3'],
            description: 'AI模型名称（支持Evolink提供的其他模型）'
          },
          {
            name: 'prompt',
            type: 'string',
            required: true,
            description: '图片生成描述词'
          },
          {
            name: 'size',
            type: 'string',
            required: false,
            defaultValue: 'auto',
            options: ['auto', '1:1', '2:3', '3:2', '4:5', '5:4'],
            description: '图片比例'
          },
          {
            name: 'image_urls',
            type: 'array',
            required: false,
            defaultValue: [],
            description: '参考图片URL数组（最多5张）'
          },
          {
            name: 'callback_url',
            type: 'string',
            required: false,
            description: '生成完成后的回调地址'
          }
        ],
        examples: [
          {
            name: '基础示例',
            description: '生成一张可爱的猫咪图片',
            parameters: {
              model: 'gemini-2.5-flash-image',
              prompt: '一只可爱的小猫坐在花园里，数字艺术风格',
              size: '1:1'
            }
          },
          {
            name: '自定义比例',
            description: '生成风景图片',
            parameters: {
              model: 'gemini-2.5-flash-image',
              prompt: '美丽的山脉风景，日落时分，油画风格',
              size: '16:9'
            }
          }
        ]
      },
      responseParser: {
        format: 'json',
        imageUrlPath: '$.results[0]',
        statusPath: '$.status',
        taskIdPath: '$.id',
        pollEndpoint: '/api/evolink/v1/tasks/{taskId}',
        pollMethod: 'GET',
        metadataPaths: {
          id: '$.id',
          progress: '$.progress',
          taskInfo: '$.task_info'
        },
        asyncSettings: {
          maxPollingTime: 180000, // 3 minutes
          pollingInterval: 2000, // 2 seconds
          completedStatus: 'completed',
          failedStatus: 'failed'
        },
        errorHandling: {
          errorPath: '$.error',
          errorMessages: {
            'invalid_request': '请求参数无效',
            'authentication_error': 'API密钥无效',
            'rate_limit_exceeded': 'API调用频率超限',
            'insufficient_quota': 'API配额不足'
          }
        }
      },
      testSettings: {
        testParameters: {
          model: 'gemini-2.5-flash-image',
          prompt: '测试图片生成',
          size: '1:1'
        },
        timeout: 60000,
        retryCount: 2,
        retryDelay: 2000
      }
    }
  },
  {
    id: 'evolink-video-generation',
    name: 'Evolink 视频生成',
    description: 'Evolink AI视频生成API配置模板，专门用于视频生成',
    category: '视频生成',
    isPopular: true,
    configuration: {
      type: 'video',
      endpoint: '/api/evolink/v1/images/generations',
      method: 'POST',
      headers: [
        {
          key: 'Content-Type',
          value: 'application/json',
          description: '请求内容类型',
          enabled: true
        },
        {
          key: 'Authorization',
          value: 'Bearer YOUR_API_KEY',
          description: 'API密钥，请替换为您的实际密钥',
          enabled: true
        }
      ],
      requestTemplate: {
        format: 'json',
        template: JSON.stringify({
          model: 'veo3.1',
          prompt: '{{prompt}}',
          image_urls: ['{{imageUrl}}'],
          video: true,
          duration: 5,
          aspect_ratio: '16:9'
        }, null, 2),
        parameters: [
          {
            name: 'model',
            type: 'string',
            required: true,
            defaultValue: 'veo3.1',
            description: '视频生成模型名称'
          },
          {
            name: 'prompt',
            type: 'string',
            required: true,
            description: '视频生成提示词'
          },
          {
            name: 'imageUrl',
            type: 'string',
            required: true,
            description: '参考图片URL'
          },
          {
            name: 'video',
            type: 'boolean',
            required: true,
            defaultValue: true,
            description: '是否生成视频'
          },
          {
            name: 'duration',
            type: 'number',
            required: false,
            defaultValue: 5,
            validation: { min: 1, max: 60 },
            description: '视频时长（秒）'
          },
          {
            name: 'aspect_ratio',
            type: 'string',
            required: false,
            defaultValue: '16:9',
            options: ['1:1', '4:3', '16:9', '9:16'],
            description: '视频宽高比'
          }
        ],
        examples: [
          {
            name: '基础视频生成示例',
            description: '生成一个基础视频',
            parameters: {
              model: 'veo3.1',
              prompt: '一个人在公园散步',
              imageUrl: 'https://example.com/image.jpg',
              video: true,
              duration: 5,
              aspect_ratio: '16:9'
            }
          }
        ]
      },
      responseParser: {
        format: 'json',
        imageUrlPath: '$.url',
        videoUrlPath: '$.videoUrl',
        statusPath: '$.status',
        taskIdPath: '$.id',
        pollEndpoint: '/api/evolink/v1/tasks/{taskId}',
        pollMethod: 'GET',
        metadataPaths: {
          id: '$.id',
          progress: '$.progress',
          taskInfo: '$.task_info'
        },
        asyncSettings: {
          maxPollingTime: 300000, // 5 minutes for video generation
          pollingInterval: 3000, // 3 seconds
          completedStatus: 'completed',
          failedStatus: 'failed'
        },
        errorHandling: {
          errorPath: '$.error',
          errorMessages: {
            'invalid_request': '请求参数无效',
            'authentication_error': 'API密钥无效',
            'rate_limit_exceeded': 'API调用频率超限',
            'model_access_denied': '模型访问权限不足'
          }
        }
      },
      testSettings: {
        testParameters: {
          model: 'veo3.1',
          prompt: '测试视频生成',
          imageUrl: 'https://example.com/test.jpg',
          video: true,
          duration: 5,
          aspect_ratio: '16:9'
        },
        timeout: 300000, // 5 minutes for video generation
        retryCount: 1,
        retryDelay: 5000
      }
    }
  },
  {
    id: 'evolink-custom',
    name: 'Evolink 自定义模型',
    description: 'Evolink自定义AI模型配置模板，支持任何Evolink提供的模型',
    category: '自定义配置',
    isPopular: false,
    configuration: {
      type: 'image',
      endpoint: '/api/evolink/v1/images/generations',
      method: 'POST',
      headers: [
        {
          key: 'Content-Type',
          value: 'application/json',
          description: '请求内容类型',
          enabled: true
        },
        {
          key: 'Authorization',
          value: 'Bearer YOUR_API_KEY',
          description: 'API密钥，请替换为您的实际密钥',
          enabled: true
        }
      ],
      requestTemplate: {
        format: 'json',
        template: JSON.stringify({
          model: '{{model}}',
          prompt: '{{prompt}}',
          size: '{{size}}',
          image_urls: []
        }, null, 2),
        parameters: [
          {
            name: 'model',
            type: 'string',
            required: true,
            description: '模型名称（如：gemini-2.5-flash-image, gpt-4o-image等）'
          },
          {
            name: 'prompt',
            type: 'string',
            required: true,
            description: '生成提示词'
          },
          {
            name: 'size',
            type: 'string',
            required: false,
            defaultValue: 'auto',
            description: '图片尺寸或比例'
          },
          {
            name: 'image_urls',
            type: 'array',
            required: false,
            defaultValue: [],
            description: '参考图片URL数组'
          }
        ],
        examples: [
          {
            name: '自定义模型示例',
            description: '使用自定义模型生成图片',
            parameters: {
              model: 'your-custom-model',
              prompt: '自定义提示词',
              size: 'auto'
            }
          }
        ]
      },
      responseParser: {
        format: 'json',
        imageUrlPath: '$.results[0]',
        statusPath: '$.status',
        taskIdPath: '$.id',
        pollEndpoint: '/api/evolink/v1/tasks/{taskId}',
        pollMethod: 'GET',
        metadataPaths: {
          id: '$.id',
          progress: '$.progress'
        },
        asyncSettings: {
          maxPollingTime: 180000, // 3 minutes
          pollingInterval: 2000, // 2 seconds
          completedStatus: 'completed',
          failedStatus: 'failed'
        },
        errorHandling: {
          errorPath: '$.error',
          errorMessages: {
            'invalid_request': '请求参数无效',
            'authentication_error': 'API密钥无效',
            'rate_limit_exceeded': 'API调用频率超限'
          }
        }
      },
      testSettings: {
        testParameters: {
          model: 'gemini-2.5-flash-image',
          prompt: '测试图片生成',
          size: 'auto'
        },
        timeout: 60000,
        retryCount: 2,
        retryDelay: 2000
      }
    }
  }
];

class APIConfigService {
  public configurations: APIConfiguration[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadConfigurations();
    }
  }

  private loadConfigurations(): void {
    if (typeof window === 'undefined') return;

    // 从Zustand store的localStorage中读取数据，而不是使用单独的key
    const zustandData = localStorage.getItem('api-config-store');
    if (zustandData) {
      try {
        const parsed = JSON.parse(zustandData);
        this.configurations = parsed.state?.configurations || [];
        console.log('ApiConfigService loaded configurations from Zustand store', { count: this.configurations.length });
      } catch (error) {
        console.error('Failed to load API configurations from Zustand store:', error);
        this.configurations = [];
      }
    } else {
      // 降级到旧的存储方式（向后兼容）
      const legacyData = localStorage.getItem('apiConfigurations');
      if (legacyData) {
        try {
          this.configurations = JSON.parse(legacyData);
          console.log('ApiConfigService loaded configurations from legacy storage', { count: this.configurations.length });
        } catch (error) {
          console.error('Failed to load API configurations from legacy storage:', error);
          this.configurations = [];
        }
      }
    }
  }

  private saveConfigurations(): void {
    // 不再需要 - Zustand处理持久化
    // 保留方法以避免破坏现有代码
  }

  // 获取所有配置
  getConfigurations(): APIConfiguration[] {
    return this.configurations.filter(config => config.isActive);
  }

  // 根据类型获取配置
  getConfigurationsByType(type: 'image' | 'video' | 'both'): APIConfiguration[] {
    return this.configurations.filter(config =>
      config.isActive && (config.type === type || config.type === 'both')
    );
  }

  // 获取单个配置
  getConfiguration(id: string): APIConfiguration | null {
    return this.configurations.find(config => config.id === id) || null;
  }

  // 添加新配置
  addConfiguration(config: Omit<APIConfiguration, 'id' | 'createdAt' | 'updatedAt'>): APIConfiguration {
    const newConfig: APIConfiguration = {
      ...config,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.configurations.push(newConfig);
    this.saveConfigurations();
    return newConfig;
  }

  // 更新配置
  updateConfiguration(id: string, updates: Partial<APIConfiguration>): APIConfiguration | null {
    const index = this.configurations.findIndex(config => config.id === id);
    if (index === -1) return null;

    this.configurations[index] = {
      ...this.configurations[index],
      ...updates,
      updatedAt: new Date()
    };

    this.saveConfigurations();
    return this.configurations[index];
  }

  // 删除配置
  deleteConfiguration(id: string): boolean {
    const index = this.configurations.findIndex(config => config.id === id);
    if (index === -1) return false;

    this.configurations.splice(index, 1);
    this.saveConfigurations();
    return true;
  }

  // 激活/停用配置
  toggleConfiguration(id: string): boolean {
    const config = this.getConfiguration(id);
    if (!config) return false;

    config.isActive = !config.isActive;
    config.updatedAt = new Date();
    this.saveConfigurations();
    return true;
  }

  // 获取配置模板
  getTemplates(): APIConfigurationTemplate[] {
    return API_TEMPLATES;
  }

  // 从模板创建配置
  createFromTemplate(templateId: string, name: string): APIConfiguration | null {
    const template = API_TEMPLATES.find(t => t.id === templateId);
    if (!template) return null;

    return this.addConfiguration({
      name,
      ...template.configuration
    });
  }

  // 测试API配置
  async testConfiguration(config: APIConfiguration): Promise<{ success: boolean; message: string; data?: any }> {
    console.log('开始测试API配置:', {
      endpoint: config.endpoint,
      method: config.method,
      headers: this.buildHeaders(config.headers),
      hasBody: !!config.requestTemplate,
      testParameters: config.testSettings.testParameters
    });

    try {
      const requestBody = this.buildRequestBody(config.requestTemplate, config.testSettings.testParameters);

      console.log('API测试请求详情:', {
        url: config.endpoint,
        method: config.method,
        headers: this.buildHeaders(config.headers),
        body: requestBody,
        timeout: config.testSettings.timeout
      });

      const response = await fetch(config.endpoint, {
        method: config.method,
        headers: this.buildHeaders(config.headers),
        body: requestBody,
        signal: AbortSignal.timeout(config.testSettings.timeout)
      });

      console.log('API测试响应详情:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        ok: response.ok
      });

      // 获取响应文本以便调试
      let responseText = '';
      let data;

      try {
        responseText = await response.text();

        console.log('API测试响应内容:', {
          responseText: responseText?.substring(0, 500),
          length: responseText?.length || 0,
          isEmpty: !responseText || responseText.trim().length === 0,
          contentType: response.headers.get('content-type')
        });

        // 检查响应是否为空
        if (!responseText || responseText.trim().length === 0) {
          const errorMsg = `API返回空响应 (状态: ${response.status} ${response.statusText})`;
          console.error('API配置测试 - 空响应:', {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            endpoint: config.endpoint
          });
          throw new Error(errorMsg);
        }

        // 尝试解析JSON
        data = JSON.parse(responseText);
        console.log('API测试 - JSON解析成功:', {
          dataType: typeof data,
          hasKeys: Object.keys(data).length > 0,
          keys: Object.keys(data).slice(0, 10) // 只显示前10个键
        });
      } catch (parseError) {
        console.error('API配置测试 JSON解析失败:', {
          parseError: parseError instanceof Error ? parseError.message : '未知错误',
          responseStatus: response.status,
          responseText: responseText?.substring(0, 200) || '无响应内容',
          contentType: response.headers.get('content-type'),
          endpoint: config.endpoint
        });

        // 如果不是JSON，尝试返回原始文本
        if (responseText && responseText.trim().length > 0) {
          return {
            success: response.ok,
            message: `API返回非JSON格式数据 (状态: ${response.status}): ${responseText.substring(0, 100)}`,
            data: { rawResponse: responseText.substring(0, 500) }
          };
        }

        throw new Error(`JSON解析失败: ${parseError instanceof Error ? parseError.message : '未知错误'}`);
      }

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

        // 特殊处理常见的HTTP错误
        if (response.status === 503) {
          if (data?.error?.message) {
            if (data.error.message.includes('无可用渠道') || data.error.message.includes('Access denied')) {
              errorMessage = `模型访问权限不足: ${data.error.message}`;
            } else if (data.error.message.includes('Service temporarily unavailable')) {
              errorMessage = `服务暂时不可用，请稍后重试 (建议等待30秒后重试)`;
            } else {
              errorMessage = `服务不可用: ${data.error.message}`;
            }
          } else {
            errorMessage = `服务暂时不可用 (503)，建议稍后重试`;
          }
        } else if (response.status === 403) {
          if (data?.error?.message) {
            errorMessage = `访问被拒绝: ${data.error.message}`;
          } else {
            errorMessage = `访问被拒绝 (403)，请检查API密钥权限`;
          }
        } else if (response.status === 429) {
          errorMessage = `请求频率超限，请稍后重试`;
        } else if (data?.error?.message) {
          errorMessage = `API错误: ${data.error.message}`;
        }

        return {
          success: false,
          message: errorMessage,
          data
        };
      }

      // 尝试解析响应
      const parsedData = this.parseResponse(data, config.responseParser);

      console.log('API配置测试成功:', {
        hasParsedData: !!parsedData,
        parsedKeys: parsedData ? Object.keys(parsedData) : []
      });

      return {
        success: true,
        message: 'API配置测试成功',
        data: { response: data, parsed: parsedData }
      };

    } catch (error) {
      console.error('API配置测试失败:', {
        error: error instanceof Error ? error.message : '未知错误',
        stack: error instanceof Error ? error.stack : undefined,
        endpoint: config.endpoint,
        method: config.method
      });

      let errorMessage = `测试失败: ${error instanceof Error ? error.message : '未知错误'}`;

      // 特殊处理网络超时和服务不可用错误
      if (error instanceof Error) {
        if (error.message.includes('timeout') || error.message.includes('AbortSignal')) {
          errorMessage = `请求超时: 请检查网络连接或增加超时时间`;
        } else if (error.message.includes('fetch')) {
          errorMessage = `网络连接失败: 请检查API端点是否可访问`;
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = `网络请求失败: 请检查CORS设置或API端点`;
        }
      }

      return {
        success: false,
        message: errorMessage
      };
    }
  }

  // 构建请求头
  private buildHeaders(headers: APIHeader[]): Record<string, string> {
    return headers
      .filter(header => header.enabled)
      .reduce((acc, header) => {
        acc[header.key] = header.value;
        return acc;
      }, {} as Record<string, string>);
  }

  // 构建请求体
  private buildRequestBody(template: APIRequestTemplate, parameters: Record<string, any>): string | FormData {
    if (template.format === 'form-data') {
      const formData = new FormData();
      Object.entries(parameters).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
      return formData;
    }

    if (template.format === 'raw') {
      return template.template;
    }

    // JSON格式
    let body = template.template;
    Object.entries(parameters).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      body = body.replace(new RegExp(placeholder, 'g'), String(value));
    });

    return body;
  }

  // 解析响应
  private parseResponse(response: any, parser: APIResponseParser): any {
    if (parser.format === 'json') {
      return {
        imageUrl: this.extractValue(response, parser.imageUrlPath),
        status: this.extractValue(response, parser.statusPath),
        metadata: parser.metadataPaths ?
          Object.fromEntries(
            Object.entries(parser.metadataPaths).map(([key, path]) => [key, this.extractValue(response, path!)])
          ) : {}
      };
    }

    // 其他格式解析逻辑
    return response;
  }

  // 从响应中提取值（支持JSONPath）
  private extractValue(data: any, path: string): any {
    if (!path) return null;

    try {
      // 简单的JSONPath实现，支持 $.property 和 $.array[0].property 格式
      const parts = path.replace(/^\$\./, '').split('.');
      let current = data;

      for (const part of parts) {
        if (part.includes('[') && part.includes(']')) {
          const [prop, indexStr] = part.split('[');
          const index = parseInt(indexStr.replace(']', ''));
          current = current[prop][index];
        } else {
          current = current[part];
        }
      }

      return current;
    } catch (error) {
      console.error(`Failed to extract value from path ${path}:`, error);
      return null;
    }
  }

  // 生成唯一ID
  private generateId(): string {
    return `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

let apiConfigServiceInstance: APIConfigService | null = null;

export const getApiConfigService = (): APIConfigService => {
  if (!apiConfigServiceInstance) {
    apiConfigServiceInstance = new APIConfigService();
  }
  return apiConfigServiceInstance;
};

export const apiConfigService = getApiConfigService();