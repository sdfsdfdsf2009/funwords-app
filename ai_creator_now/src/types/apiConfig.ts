/**
 * API配置相关类型定义
 * 用于支持数据库化的API配置管理
 */

export interface ApiConfigData {
  provider: string
  apiKey: string
  baseUrl?: string
  model?: string
  settings?: Record<string, any>
  isActive?: boolean
}

export interface CreateApiConfigData extends Omit<ApiConfigData, 'isActive'> {}

export interface UpdateApiConfigData extends Partial<ApiConfigData> {}

export interface ApiConfig {
  id: string
  userId: string
  provider: string
  apiKey: string
  baseUrl?: string
  model?: string
  settings?: Record<string, any>
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ApiConfigFilter {
  provider?: string
  isActive?: boolean
  userId?: string
}

export interface ApiConfigValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

// API配置验证函数
export const validateApiConfig = (config: ApiConfigData): ApiConfigValidationResult => {
  const errors: string[] = []
  const warnings: string[] = []

  // 必填字段验证
  if (!config.provider || config.provider.trim() === '') {
    errors.push('Provider is required')
  }

  if (!config.apiKey || config.apiKey.trim() === '') {
    errors.push('API Key is required')
  }

  // 格式验证
  if (config.provider && !/^[a-zA-Z0-9_-]+$/.test(config.provider)) {
    errors.push('Provider can only contain letters, numbers, hyphens, and underscores')
  }

  if (config.baseUrl && !isValidUrl(config.baseUrl)) {
    errors.push('Base URL must be a valid URL')
  }

  // 安全警告
  if (config.apiKey && config.apiKey.length < 10) {
    warnings.push('API key appears to be too short, please verify it\'s correct')
  }

  if (config.baseUrl && !config.baseUrl.startsWith('https://')) {
    warnings.push('Base URL should use HTTPS for security')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

// URL验证辅助函数
const isValidUrl = (url: string): boolean => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// 常用API提供商
export const API_PROVIDERS = {
  EVOLINK: 'evolink',
  OPENAI: 'openai',
  STABILITY_AI: 'stability-ai',
  REPLICATE: 'replicate',
  HUGGINGFACE: 'huggingface'
} as const

export type ApiProvider = typeof API_PROVIDERS[keyof typeof API_PROVIDERS]

// EvoLink API配置接口
export interface EvoLinkAPIConfig {
  apiKey: string
  baseUrl?: string
  model?: string
  provider?: string
  timeout?: number
  maxRetries?: number
  maxTokens?: number
  temperature?: number
  settings?: {
    quality?: 'low' | 'medium' | 'high'
    format?: 'mp4' | 'webm'
    aspectRatio?: string
    duration?: number
  }
}

// 默认配置
export const DEFAULT_API_CONFIGS: Record<ApiProvider, Partial<ApiConfigData>> = {
  [API_PROVIDERS.EVOLINK]: {
    baseUrl: 'https://api.evolink.ai/v1',
    model: 'evolink-v1'
  },
  [API_PROVIDERS.OPENAI]: {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4'
  },
  [API_PROVIDERS.STABILITY_AI]: {
    baseUrl: 'https://api.stability.ai/v1',
    model: 'stable-diffusion-xl'
  },
  [API_PROVIDERS.REPLICATE]: {
    baseUrl: 'https://api.replicate.com/v1'
  },
  [API_PROVIDERS.HUGGINGFACE]: {
    baseUrl: 'https://api-inference.huggingface.co'
  }
}

// 错误类型
export enum ApiConfigError {
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  NOT_FOUND = 'NOT_FOUND',
  DUPLICATE_PROVIDER = 'DUPLICATE_PROVIDER',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED'
}

// API配置错误类
export class ApiConfigException extends Error {
  constructor(
    public type: ApiConfigError,
    message: string,
    public details?: any
  ) {
    super(message)
    this.name = 'ApiConfigException'
  }
}