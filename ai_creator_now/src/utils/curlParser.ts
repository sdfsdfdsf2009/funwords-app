import { APIConfiguration, APIHeader, APIRequestTemplate, APIResponseParser, APITestSettings } from '../types';

export interface ParsedCurlCommand {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  name?: string;
}

export interface CurlImportResult {
  success: boolean;
  config?: Partial<APIConfiguration>;
  error?: string;
}

/**
 * 解析curl命令
 * 支持常见的curl选项：
 * - -X/--request: HTTP方法
 * - -H/--header: 请求头
 * - -d/--data: 请求体
 * - --data-binary: 二进制数据
 * - --url: URL
 * - 基本URL语法: curl "https://api.example.com/endpoint"
 */
export function parseCurlCommand(curlCommand: string): ParsedCurlCommand | null {
  try {
    // 清理和预处理命令
    const command = curlCommand.trim();

    // 提取URL（支持多种格式）
    let url = '';
    let method = 'GET';
    const headers: Record<string, string> = {};
    let body: string | undefined;

    // 匹配基本URL格式
    const urlMatch = command.match(/curl\s+(?:['"]?)(https?:\/\/[^\s'"]+)/);
    if (urlMatch) {
      url = urlMatch[1];
    }

    // 匹配--url选项
    const urlOptionMatch = command.match(/--url\s+(?:['"]?)(https?:\/\/[^\s'"]+)/);
    if (urlOptionMatch) {
      url = urlOptionMatch[1];
    }

    // 匹配HTTP方法
    const methodMatch = command.match(/-(?:X|--request)\s+(['"]?)(POST|GET|PUT|DELETE|PATCH)\1/i);
    if (methodMatch) {
      method = methodMatch[2].toUpperCase();
    }

    // 如果有数据体且未指定方法，默认为POST
    if ((command.includes('-d ') || command.includes('--data')) && !methodMatch) {
      method = 'POST';
    }

    // 匹配请求头
    const headerRegex = /-(?:H|--header)\s+(['"]?)([^:'"]+):\s*([^'"]+)\1/g;
    let headerMatch;
    while ((headerMatch = headerRegex.exec(command)) !== null) {
      const key = headerMatch[2].trim();
      const value = headerMatch[3].trim();
      headers[key] = value;
    }

    // 匹配请求体
    const dataMatch = command.match(/-(?:d|--data|--data-binary)\s+(['"]?)([^'"]+)\1/);
    if (dataMatch) {
      body = dataMatch[2];
    }

    // 验证必要信息
    if (!url) {
      return null;
    }

    return {
      url,
      method,
      headers,
      body,
      name: extractNameFromUrl(url)
    };
  } catch (error) {
    return null;
  }
}

/**
 * 从URL中提取有意义的名称
 */
function extractNameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('api.', '').replace('www.', '');
    const pathParts = urlObj.pathname.split('/').filter(part => part);
    const lastPath = pathParts[pathParts.length - 1] || 'api';

    return `${domain.charAt(0).toUpperCase() + domain.slice(1)} ${lastPath}`;
  } catch {
    return 'Imported API';
  }
}

/**
 * 将解析的curl命令转换为API配置
 */
export function curlToApiConfig(parsed: ParsedCurlCommand): CurlImportResult {
  try {
    if (!parsed.url) {
      return {
        success: false,
        error: '无法从curl命令中提取URL'
      };
    }

    // 转换headers格式
    const headers: APIHeader[] = Object.entries(parsed.headers).map(([key, value]) => ({
      key,
      value,
      description: getHeaderDescription(key),
      enabled: true
    }));

    // 确保有Content-Type头（如果有body）
    if (parsed.body && !headers.some(h => h.key.toLowerCase() === 'content-type')) {
      headers.push({
        key: 'Content-Type',
        value: 'application/json',
        description: '请求内容类型',
        enabled: true
      });
    }

    // 创建请求模板
    const requestTemplate = createRequestTemplate(parsed.method, parsed.body);

    // 创建响应解析器
    const responseParser = createResponseParser();

    // 创建测试设置
    const testSettings = createTestSettings(parsed);

    const config: Partial<APIConfiguration> = {
      name: parsed.name || 'Imported API',
      type: 'image', // 默认为图片生成，用户可以后续修改
      endpoint: parsed.url,
      method: parsed.method as 'POST' | 'GET',
      headers,
      requestTemplate,
      responseParser,
      testSettings
    };

    return {
      success: true,
      config
    };
  } catch (error) {
    return {
      success: false,
      error: `转换失败: ${error instanceof Error ? error.message : '未知错误'}`
    };
  }
}

/**
 * 获取请求头的描述
 */
function getHeaderDescription(key: string): string {
  const descriptions: Record<string, string> = {
    'authorization': 'API认证密钥',
    'content-type': '请求内容类型',
    'accept': '响应格式',
    'user-agent': '用户代理',
    'x-api-key': 'API密钥',
    'x-auth-token': '认证令牌'
  };

  return descriptions[key.toLowerCase()] || '自定义请求头';
}

/**
 * 创建请求模板
 */
function createRequestTemplate(method: string, body?: string): APIRequestTemplate {
  if (method === 'GET') {
    return {
      format: 'json',
      template: JSON.stringify({
        prompt: '{{prompt}}',
        size: 'auto'
      }, null, 2),
      parameters: [
        {
          name: 'prompt',
          type: 'string',
          description: '生成提示词',
          required: true
        },
        {
          name: 'size',
          type: 'string',
          description: '图片尺寸',
          required: false
        }
      ],
      examples: []
    };
  }

  // 如果有body，尝试解析并模板化
  if (body) {
    try {
      const parsedBody = JSON.parse(body);
      const template = JSON.stringify(parsedBody, null, 2);

      return {
        format: 'json',
        template,
        parameters: extractParameters(parsedBody),
        examples: []
      };
    } catch {
      // 如果不是JSON，作为字符串处理
      return {
        format: 'json',
        template: JSON.stringify({
          prompt: '{{prompt}}',
          data: body
        }, null, 2),
        parameters: [
          {
            name: 'prompt',
            type: 'string',
            description: '生成提示词',
            required: true
          }
        ],
        examples: []
      };
    }
  }

  // 默认POST模板
  return {
    format: 'json',
    template: JSON.stringify({
      prompt: '{{prompt}}'
    }, null, 2),
    parameters: [
      {
        name: 'prompt',
        type: 'string',
        description: '生成提示词',
        required: true
      }
    ],
    examples: []
  };
}

/**
 * 从对象中提取参数
 */
function extractParameters(obj: any, prefix = ''): any[] {
  const parameters: any[] = [];

  for (const [key, value] of Object.entries(obj)) {
    const paramName = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      parameters.push(...extractParameters(value, paramName));
    } else {
      parameters.push({
        name: paramName,
        type: typeof value,
        description: `参数 ${paramName}`,
        required: false
      });
    }
  }

  return parameters;
}

/**
 * 创建响应解析器
 */
function createResponseParser(): APIResponseParser {
  return {
    imageUrlPath: '$.data[0].url', // OpenAI格式
    fallbackPaths: [
      '$.url',              // 直接URL
      '$.image_url',        // 替代格式
      '$.output.url',       // Evolink格式
      '$.data[0].image_url' // 替代OpenAI格式
    ],
    metadataPaths: {
      id: '$.id',
      fileSize: '$.size',
      format: '$.format',
      dimensions: { width: '$.width', height: '$.height' }
    },
    errorPaths: {
      message: '$.error.message',
      code: '$.error.code',
      type: '$.error.type'
    }
  };
}

/**
 * 创建测试设置
 */
function createTestSettings(parsed: ParsedCurlCommand): APITestSettings {
  return {
    testParameters: {
      prompt: '测试图片生成',
      n: 1,
      size: '256x256'
    },
    timeout: 30000,
    retryCount: 2,
    retryDelay: 1000
  };
}

/**
 * 验证curl命令格式
 */
export function validateCurlCommand(curlCommand: string): { valid: boolean; message: string } {
  if (!curlCommand.trim()) {
    return { valid: false, message: 'curl命令不能为空' };
  }

  if (!curlCommand.toLowerCase().includes('curl')) {
    return { valid: false, message: '请输入有效的curl命令' };
  }

  const parsed = parseCurlCommand(curlCommand);
  if (!parsed) {
    return { valid: false, message: '无法解析curl命令格式' };
  }

  if (!parsed.url) {
    return { valid: false, message: '无法从curl命令中提取URL' };
  }

  try {
    new URL(parsed.url);
  } catch {
    return { valid: false, message: 'URL格式无效' };
  }

  return { valid: true, message: 'curl命令格式正确' };
}