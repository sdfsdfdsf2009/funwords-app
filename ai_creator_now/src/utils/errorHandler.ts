/**
 * 视频生成错误处理工具
 * 提供详细的错误分类、用户友好提示和解决建议
 */

// 错误类型枚举
export enum VideoErrorType {
  // API相关错误
  API_KEY_INVALID = 'api_key_invalid',
  API_QUOTA_EXCEEDED = 'api_quota_exceeded',
  API_RATE_LIMIT = 'api_rate_limit',
  API_NETWORK_ERROR = 'api_network_error',
  API_SERVER_ERROR = 'api_server_error',

  // 输入参数错误
  INVALID_IMAGE_FORMAT = 'invalid_image_format',
  IMAGE_TOO_LARGE = 'image_too_large',
  INVALID_PROMPT = 'invalid_prompt',
  INVALID_PARAMETERS = 'invalid_parameters',

  // 处理错误
  PROCESSING_TIMEOUT = 'processing_timeout',
  PROCESSING_FAILED = 'processing_failed',
  CONTENT_FILTERED = 'content_filtered',
  MODEL_UNAVAILABLE = 'model_unavailable',

  // 系统错误
  STORAGE_ERROR = 'storage_error',
  PERMISSION_DENIED = 'permission_denied',
  UNKNOWN_ERROR = 'unknown_error'
}

// 错误信息接口
export interface VideoError {
  type: VideoErrorType;
  code?: string;
  message: string;
  userMessage: string;
  suggestions: string[];
  canRetry: boolean;
  retryDelay?: number; // 重试延迟（毫秒）
}

// 错误映射配置
const ERROR_MAPPINGS: Record<string, Partial<VideoError>> = {
  // API密钥相关
  'invalid api key': {
    type: VideoErrorType.API_KEY_INVALID,
    userMessage: 'API密钥无效或已过期',
    suggestions: [
      '请检查API密钥是否正确配置',
      '登录供应商官网确认密钥状态',
      '重新生成并更新API密钥'
    ],
    canRetry: false
  },
  'unauthorized': {
    type: VideoErrorType.API_KEY_INVALID,
    userMessage: 'API认证失败，请检查密钥配置',
    suggestions: ['验证API密钥格式', '确认密钥权限设置'],
    canRetry: false
  },
  'forbidden': {
    type: VideoErrorType.PERMISSION_DENIED,
    userMessage: '访问被拒绝，权限不足',
    suggestions: ['检查账户权限', '联系管理员开通相应权限'],
    canRetry: false
  },

  // 配额和限制
  'quota exceeded': {
    type: VideoErrorType.API_QUOTA_EXCEEDED,
    userMessage: 'API使用配额已用完',
    suggestions: [
      '等待配额重置（通常按月重置）',
      '升级到更高配额套餐',
      '购买额外配额'
    ],
    canRetry: false,
    retryDelay: 24 * 60 * 60 * 1000 // 24小时后重试
  },
  'rate limit': {
    type: VideoErrorType.API_RATE_LIMIT,
    userMessage: 'API调用频率过高，请稍后重试',
    suggestions: [
      '降低调用频率',
      '等待几分钟后重试',
      '升级到更高频率限制的套餐'
    ],
    canRetry: true,
    retryDelay: 60000 // 1分钟后重试
  },
  'too many requests': {
    type: VideoErrorType.API_RATE_LIMIT,
    userMessage: '请求过于频繁，请稍后重试',
    suggestions: ['分批处理任务', '延长重试间隔'],
    canRetry: true,
    retryDelay: 30000 // 30秒后重试
  },

  // 网络和服务错误
  'network error': {
    type: VideoErrorType.API_NETWORK_ERROR,
    userMessage: '网络连接失败，请检查网络设置',
    suggestions: [
      '检查网络连接是否正常',
      '尝试切换网络环境',
      '检查防火墙设置'
    ],
    canRetry: true,
    retryDelay: 5000 // 5秒后重试
  },
  'timeout': {
    type: VideoErrorType.PROCESSING_TIMEOUT,
    userMessage: '处理超时，请稍后重试',
    suggestions: [
      '降低视频质量或时长设置',
      '简化提示词内容',
      '检查网络稳定性'
    ],
    canRetry: true,
    retryDelay: 10000 // 10秒后重试
  },
  'internal server error': {
    type: VideoErrorType.API_SERVER_ERROR,
    userMessage: '服务器内部错误，请稍后重试',
    suggestions: [
      '等待几分钟后重试',
      '如果持续出现，请联系技术支持'
    ],
    canRetry: true,
    retryDelay: 30000 // 30秒后重试
  },
  'service unavailable': {
    type: VideoErrorType.MODEL_UNAVAILABLE,
    userMessage: '服务暂时不可用',
    suggestions: [
      '等待服务恢复',
      '尝试切换到其他模型',
      '稍后重试'
    ],
    canRetry: true,
    retryDelay: 60000 // 1分钟后重试
  },

  // 输入验证错误
  'invalid image': {
    type: VideoErrorType.INVALID_IMAGE_FORMAT,
    userMessage: '图片格式不支持或损坏',
    suggestions: [
      '使用JPG、PNG等常见格式',
      '确保图片文件完整',
      '图片大小不超过10MB'
    ],
    canRetry: false
  },
  'image too large': {
    type: VideoErrorType.IMAGE_TOO_LARGE,
    userMessage: '图片文件过大',
    suggestions: [
      '压缩图片到10MB以下',
      '降低图片分辨率',
      '使用在线图片压缩工具'
    ],
    canRetry: false
  },
  'invalid prompt': {
    type: VideoErrorType.INVALID_PROMPT,
    userMessage: '提示词格式不正确',
    suggestions: [
      '检查提示词是否包含违规内容',
      '简化提示词描述',
      '使用英文提示词'
    ],
    canRetry: false
  },
  'content filtered': {
    type: VideoErrorType.CONTENT_FILTERED,
    userMessage: '内容被安全过滤器拦截',
    suggestions: [
      '修改提示词避免敏感内容',
      '使用更中性、积极的描述',
      '避免暴力、成人内容等'
    ],
    canRetry: false
  },
  'model not found': {
    type: VideoErrorType.MODEL_UNAVAILABLE,
    userMessage: '指定的模型不存在或已下线',
    suggestions: [
      '选择其他可用模型',
      '检查模型名称拼写',
      '查看支持的模型列表'
    ],
    canRetry: false
  },

  // 处理失败
  'processing failed': {
    type: VideoErrorType.PROCESSING_FAILED,
    userMessage: '视频处理失败，请重试',
    suggestions: [
      '检查输入图片质量',
      '简化生成参数',
      '尝试不同的提示词'
    ],
    canRetry: true,
    retryDelay: 15000 // 15秒后重试
  },
  'generation failed': {
    type: VideoErrorType.PROCESSING_FAILED,
    userMessage: '视频生成失败',
    suggestions: [
      '降低生成难度',
      '使用更简单的描述',
      '检查网络连接稳定性'
    ],
    canRetry: true,
    retryDelay: 20000 // 20秒后重试
  }
};

/**
 * 解析API错误并返回详细的错误信息
 */
export function parseVideoError(error: any, fallbackMessage?: string): VideoError {
  // 如果已经是VideoError类型，直接返回
  if (error?.type && error?.userMessage) {
    return error as VideoError;
  }

  // 提取错误信息
  const errorMessage = error?.message || error?.error?.message || fallbackMessage || '未知错误';
  const errorCode = error?.code || error?.error?.code;
  const originalMessage = typeof error === 'string' ? error : errorMessage;

  // 转换为小写进行匹配
  const lowerMessage = originalMessage.toLowerCase();

  // 查找匹配的错误类型
  for (const [pattern, errorMapping] of Object.entries(ERROR_MAPPINGS)) {
    if (lowerMessage.includes(pattern.toLowerCase())) {
      return {
        type: errorMapping.type || VideoErrorType.UNKNOWN_ERROR,
        code: errorCode,
        message: originalMessage,
        userMessage: errorMapping.userMessage || originalMessage,
        suggestions: errorMapping.suggestions || ['请联系技术支持'],
        canRetry: errorMapping.canRetry ?? true,
        retryDelay: errorMapping.retryDelay
      };
    }
  }

  // 默认未知错误
  return {
    type: VideoErrorType.UNKNOWN_ERROR,
    code: errorCode,
    message: originalMessage,
    userMessage: '发生未知错误，请稍后重试',
    suggestions: [
      '检查网络连接',
      '刷新页面重试',
      '如果问题持续，请联系技术支持'
    ],
    canRetry: true,
    retryDelay: 10000
  };
}

/**
 * 获取错误类型的显示信息
 */
export function getErrorTypeInfo(errorType: VideoErrorType): {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
} {
  const typeMap = {
    [VideoErrorType.API_KEY_INVALID]: {
      label: '密钥错误',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      icon: '🔑'
    },
    [VideoErrorType.API_QUOTA_EXCEEDED]: {
      label: '配额用完',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      icon: '📊'
    },
    [VideoErrorType.API_RATE_LIMIT]: {
      label: '频率限制',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      icon: '⏱️'
    },
    [VideoErrorType.API_NETWORK_ERROR]: {
      label: '网络错误',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      icon: '🌐'
    },
    [VideoErrorType.API_SERVER_ERROR]: {
      label: '服务器错误',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      icon: '🖥️'
    },
    [VideoErrorType.INVALID_IMAGE_FORMAT]: {
      label: '图片格式错误',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      icon: '🖼️'
    },
    [VideoErrorType.IMAGE_TOO_LARGE]: {
      label: '图片过大',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      icon: '📏'
    },
    [VideoErrorType.INVALID_PROMPT]: {
      label: '提示词错误',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      icon: '📝'
    },
    [VideoErrorType.INVALID_PARAMETERS]: {
      label: '参数错误',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      icon: '⚙️'
    },
    [VideoErrorType.PROCESSING_TIMEOUT]: {
      label: '处理超时',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      icon: '⏰'
    },
    [VideoErrorType.PROCESSING_FAILED]: {
      label: '处理失败',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      icon: '❌'
    },
    [VideoErrorType.CONTENT_FILTERED]: {
      label: '内容过滤',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      icon: '🛡️'
    },
    [VideoErrorType.MODEL_UNAVAILABLE]: {
      label: '模型不可用',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      icon: '🤖'
    },
    [VideoErrorType.STORAGE_ERROR]: {
      label: '存储错误',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      icon: '💾'
    },
    [VideoErrorType.PERMISSION_DENIED]: {
      label: '权限不足',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      icon: '🔒'
    },
    [VideoErrorType.UNKNOWN_ERROR]: {
      label: '未知错误',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      icon: '❓'
    }
  };

  return typeMap[errorType] || typeMap[VideoErrorType.UNKNOWN_ERROR];
}

/**
 * 格式化重试延迟时间
 */
export function formatRetryDelay(delayMs: number): string {
  const seconds = Math.ceil(delayMs / 1000);
  if (seconds < 60) {
    return `${seconds}秒`;
  }
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) {
    return `${minutes}分钟`;
  }
  const hours = Math.ceil(minutes / 60);
  return `${hours}小时`;
}

/**
 * 生成错误报告（用于技术支持）
 */
export function generateErrorReport(error: VideoError, taskInfo?: any): string {
  const timestamp = new Date().toISOString();
  const report = `
视频生成错误报告
==================
时间: ${timestamp}
错误类型: ${error.type}
错误代码: ${error.code || 'N/A'}
用户信息: ${error.userMessage}
原始错误: ${error.message}
可重试: ${error.canRetry ? '是' : '否'}
重试延迟: ${error.retryDelay ? formatRetryDelay(error.retryDelay) : 'N/A'}

任务信息:
${taskInfo ? JSON.stringify(taskInfo, null, 2) : '无任务信息'}

建议操作:
${error.suggestions.map(s => `- ${s}`).join('\n')}
  `.trim();

  return report;
}