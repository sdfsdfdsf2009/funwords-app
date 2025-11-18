/**
 * 用户友好错误翻译映射表
 * 将技术错误转换为用户可理解的友好信息
 */

export interface ErrorTranslation {
  userMessage: string;
  suggestions: string[];
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
  severity: 'low' | 'medium' | 'high';
  type: 'network' | 'authentication' | 'validation' | 'system' | 'data';
}

// 网络错误翻译
export const networkErrorTranslations: Record<string, ErrorTranslation> = {
  'ECONNREFUSED': {
    userMessage: '网络连接失败',
    suggestions: ['请检查网络连接是否正常', '稍后重试', '如果问题持续存在，请联系技术支持'],
    actions: [
      {
        label: '重试',
        action: () => window.location.reload()
      }
    ],
    severity: 'high',
    type: 'network'
  },
  'ETIMEDOUT': {
    userMessage: '请求超时',
    suggestions: ['网络较慢，请稍后重试', '检查网络连接稳定性', '尝试切换到更稳定的网络环境'],
    actions: [
      {
        label: '重试',
        action: () => window.location.reload()
      }
    ],
    severity: 'medium',
    type: 'network'
  },
  'ERR_NETWORK': {
    userMessage: '网络连接异常',
    suggestions: ['请检查网络连接', '确认网络服务正常工作', '尝试刷新页面'],
    severity: 'high',
    type: 'network'
  },
  'OFFLINE': {
    userMessage: '当前处于离线状态',
    suggestions: ['请连接到互联网', '检查WiFi或移动网络设置'],
    severity: 'high',
    type: 'network'
  }
};

// API认证错误翻译
export const authErrorTranslations: Record<string, ErrorTranslation> = {
  '401': {
    userMessage: 'API密钥无效或已过期',
    suggestions: ['请检查API配置', '确认密钥格式正确', '联系管理员获取新的API密钥'],
    actions: [
      {
        label: '前往设置',
        action: () => window.location.href = '/settings'
      }
    ],
    severity: 'high',
    type: 'authentication'
  },
  '403': {
    userMessage: '访问权限不足',
    suggestions: ['检查API密钥权限设置', '确认账户状态正常', '联系管理员开通相应权限'],
    actions: [
      {
        label: '查看权限设置',
        action: () => window.location.href = '/settings'
      }
    ],
    severity: 'high',
    type: 'authentication'
  },
  'API_KEY_INVALID': {
    userMessage: 'API密钥格式错误',
    suggestions: ['请检查API密钥是否完整', '确认没有多余的空格或字符', '重新复制正确的API密钥'],
    severity: 'high',
    type: 'authentication'
  },
  'QUOTA_EXCEEDED': {
    userMessage: 'API调用次数已达上限',
    suggestions: ['检查当前使用量', '升级API套餐', '等待下个计费周期重置'],
    severity: 'medium',
    type: 'authentication'
  }
};

// 数据验证错误翻译
export const validationErrorTranslations: Record<string, ErrorTranslation> = {
  'EMPTY_PROJECT_NAME': {
    userMessage: '项目名称不能为空',
    suggestions: ['请输入有意义的项目名称', '项目名称应包含中文、英文或数字'],
    severity: 'medium',
    type: 'validation'
  },
  'PROJECT_NAME_TOO_LONG': {
    userMessage: '项目名称过长',
    suggestions: ['项目名称不能超过50个字符', '建议使用简洁明了的名称'],
    severity: 'medium',
    type: 'validation'
  },
  'INVALID_CHARACTERS': {
    userMessage: '项目名称包含无效字符',
    suggestions: ['请使用中文、英文、数字、空格、连字符或下划线', '避免使用特殊符号如<>{}[]等'],
    severity: 'medium',
    type: 'validation'
  },
  'INVALID_EMAIL': {
    userMessage: '邮箱格式不正确',
    suggestions: ['请检查邮箱地址格式', '例如：user@example.com'],
    severity: 'medium',
    type: 'validation'
  },
  'INVALID_URL': {
    userMessage: 'URL格式不正确',
    suggestions: ['请检查网址格式', '包含http://或https://前缀'],
    severity: 'medium',
    type: 'validation'
  },
  'FILE_TOO_LARGE': {
    userMessage: '文件大小超出限制',
    suggestions: ['请选择较小的文件', '压缩文件后重试', '文件大小不能超过10MB'],
    severity: 'medium',
    type: 'validation'
  },
  'UNSUPPORTED_FILE_TYPE': {
    userMessage: '不支持的文件类型',
    suggestions: ['请选择支持的文件格式', '查看支持的文件类型列表'],
    severity: 'medium',
    type: 'validation'
  }
};

// 系统错误翻译
export const systemErrorTranslations: Record<string, ErrorTranslation> = {
  'DATABASE_CONNECTION_FAILED': {
    userMessage: '数据库连接失败',
    suggestions: ['系统正在维护中，请稍后重试', '如果问题持续，请联系技术支持'],
    actions: [
      {
        label: '重试',
        action: () => window.location.reload()
      }
    ],
    severity: 'high',
    type: 'system'
  },
  'MEMORY_INSUFFICIENT': {
    userMessage: '系统内存不足',
    suggestions: ['关闭其他浏览器标签页', '清理浏览器缓存', '重启浏览器'],
    severity: 'high',
    type: 'system'
  },
  'SERVICE_UNAVAILABLE': {
    userMessage: '服务暂时不可用',
    suggestions: ['系统正在维护中，请稍后重试', '预计恢复时间：30分钟'],
    severity: 'high',
    type: 'system'
  },
  'UNKNOWN_ERROR': {
    userMessage: '发生了未知错误',
    suggestions: ['请刷新页面重试', '如果问题持续，请联系技术支持'],
    actions: [
      {
        label: '刷新页面',
        action: () => window.location.reload()
      },
      {
        label: '联系支持',
        action: () => window.location.href = 'mailto:support@example.com'
      }
    ],
    severity: 'medium',
    type: 'system'
  }
};

// 数据操作错误翻译
export const dataErrorTranslations: Record<string, ErrorTranslation> = {
  'SAVE_FAILED': {
    userMessage: '保存失败',
    suggestions: ['检查网络连接', '确认数据格式正确', '稍后重试'],
    actions: [
      {
        label: '重试保存',
        action: () => {} // 需要传入具体的重试函数
      },
      {
        label: '下载备份',
        action: () => {} // 需要传入下载函数
      }
    ],
    severity: 'medium',
    type: 'data'
  },
  'LOAD_FAILED': {
    userMessage: '数据加载失败',
    suggestions: ['检查网络连接', '刷新页面重试', '清除浏览器缓存'],
    severity: 'medium',
    type: 'data'
  },
  'DELETE_FAILED': {
    userMessage: '删除失败',
    suggestions: ['检查权限设置', '确认数据未被其他程序占用', '稍后重试'],
    severity: 'medium',
    type: 'data'
  },
  'DUPLICATE_ENTRY': {
    userMessage: '数据已存在',
    suggestions: ['请使用不同的名称或标识', '检查是否已创建过类似内容'],
    severity: 'low',
    type: 'data'
  },
  'DATA_CORRUPTION': {
    userMessage: '数据损坏',
    suggestions: ['联系技术支持恢复数据', '检查数据备份'],
    severity: 'high',
    type: 'data'
  }
};

// API特定错误翻译
export const apiErrorTranslations: Record<string, ErrorTranslation> = {
  'IMAGE_GENERATION_FAILED': {
    userMessage: '图片生成失败',
    suggestions: ['检查输入描述是否合适', '稍后重试', '尝试修改描述后重新生成'],
    severity: 'medium',
    type: 'system'
  },
  'VIDEO_GENERATION_FAILED': {
    userMessage: '视频生成失败',
    suggestions: ['检查项目配置是否完整', '确认所有场景都已配置', '稍后重试'],
    severity: 'high',
    type: 'system'
  },
  'MODEL_UNAVAILABLE': {
    userMessage: 'AI模型暂时不可用',
    suggestions: ['模型正在更新中，请稍后重试', '尝试使用其他模型'],
    severity: 'medium',
    type: 'system'
  },
  'RATE_LIMIT_EXCEEDED': {
    userMessage: '请求过于频繁',
    suggestions: ['请稍等片刻再试', '避免连续快速操作'],
    severity: 'medium',
    type: 'system'
  }
};

/**
 * 获取用户友好的错误信息
 */
export function getUserFriendlyError(
  error: Error | string,
  context?: string
): ErrorTranslation {
  const errorKey = typeof error === 'string' ? error : error.message;
  const errorCode = typeof error === 'string' ? error : error.name;

  // 按优先级查找错误翻译
  const translations = [
    networkErrorTranslations,
    authErrorTranslations,
    validationErrorTranslations,
    systemErrorTranslations,
    dataErrorTranslations,
    apiErrorTranslations
  ];

  // 精确匹配
  for (const translationMap of translations) {
    if (translationMap[errorKey]) {
      return translationMap[errorKey];
    }
    if (translationMap[errorCode]) {
      return translationMap[errorCode];
    }
  }

  // 模糊匹配（关键词匹配）
  const errorLower = errorKey.toLowerCase();

  // 网络错误关键词
  if (errorLower.includes('network') || errorLower.includes('connection') ||
      errorLower.includes('fetch') || errorLower.includes('timeout')) {
    return networkErrorTranslations['ERR_NETWORK'];
  }

  // 认证错误关键词
  if (errorLower.includes('unauthorized') || errorLower.includes('forbidden') ||
      errorLower.includes('auth') || errorLower.includes('token')) {
    return authErrorTranslations['401'];
  }

  // 验证错误关键词
  if (errorLower.includes('validation') || errorLower.includes('invalid') ||
      errorLower.includes('required') || errorLower.includes('format')) {
    return validationErrorTranslations['INVALID_CHARACTERS'];
  }

  // 系统错误关键词
  if (errorLower.includes('system') || errorLower.includes('server') ||
      errorLower.includes('internal')) {
    return systemErrorTranslations['UNKNOWN_ERROR'];
  }

  // 默认返回未知错误
  return systemErrorTranslations['UNKNOWN_ERROR'];
}

/**
 * 根据错误类型获取图标样式类
 */
export function getErrorIconClass(type: string): string {
  switch (type) {
    case 'network':
      return 'text-orange-500';
    case 'authentication':
      return 'text-red-500';
    case 'validation':
      return 'text-yellow-500';
    case 'data':
      return 'text-blue-500';
    case 'system':
    default:
      return 'text-gray-500';
  }
}

/**
 * 根据错误严重程度获取显示样式
 */
export function getErrorDisplayStyle(severity: string): {
  container: string;
  icon: string;
  message: string;
} {
  switch (severity) {
    case 'high':
      return {
        container: 'bg-red-50 border-red-200 text-red-800',
        icon: 'w-5 h-5 text-red-600',
        message: 'text-sm font-medium text-red-800'
      };
    case 'medium':
      return {
        container: 'bg-yellow-50 border-yellow-200 text-yellow-800',
        icon: 'w-4 h-4 text-yellow-600',
        message: 'text-sm text-yellow-700'
      };
    case 'low':
    default:
      return {
        container: 'bg-blue-50 border-blue-200 text-blue-800',
        icon: 'w-4 h-4 text-blue-600',
        message: 'text-xs text-blue-700'
      };
  }
}