/**
 * Database-based API Configuration Store
 * 替代localStorage的API配置管理，提供更可靠的持久化存储
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { PrismaClient } from '@prisma/client'
import { ApiConfig, ApiConfigData, CreateApiConfigData, UpdateApiConfigData, ApiConfigValidationResult, validateApiConfig, ApiConfigException, ApiConfigError } from '@/types/apiConfig'

// 扩展全局接口以支持window对象
declare global {
  interface Window {
    __API_CONFIG_CACHE__?: Map<string, any>
  }
}

const prisma = new PrismaClient()

interface DatabaseApiConfigStore {
  // 状态
  configs: Map<string, ApiConfig>
  loading: boolean
  error: ApiConfigException | null

  // 缓存相关
  cacheTimeout: number
  lastCacheUpdate: number

  // API配置管理
  getApiConfig: (provider: string) => Promise<ApiConfig | null>
  setApiConfig: (provider: string, config: CreateApiConfigData) => Promise<void>
  updateApiConfig: (provider: string, updates: UpdateApiConfigData) => Promise<void>
  removeApiConfig: (provider: string) => Promise<void>

  // 批量操作
  getAllApiConfigs: () => Promise<ApiConfig[]>
  setMultipleApiConfigs: (configs: Record<string, CreateApiConfigData>) => Promise<void>

  // 工具方法
  hasApiConfig: (provider: string) => Promise<boolean>
  validateApiConfig: (config: ApiConfigData) => ApiConfigValidationResult
  clearCache: () => void

  // 初始化
  initialize: () => Promise<void>
  refreshConfig: (provider: string) => Promise<void>
}

export const useDatabaseApiConfigStore = create<DatabaseApiConfigStore>()(
  persist(
    (set, get) => ({
      // 状态管理
      configs: new Map(),
      loading: false,
      error: null,
      cacheTimeout: 5 * 60 * 1000, // 5分钟缓存
      lastCacheUpdate: 0,

      /**
       * 获取API配置
       */
      getApiConfig: async (provider: string) => {
        try {
          set({ loading: true, error: null })

          // 检查缓存
          const cached = get().configs.get(provider)
          if (cached && get().lastCacheUpdate > 0) {
            const now = Date.now()
            if (now - get().lastCacheUpdate < get().cacheTimeout) {
              return cached
            }
          }

          // 从数据库获取
          const config = await prisma.apiConfig.findFirst({
            where: {
              provider,
              userId: 'default-user', // TODO: 实现用户认证
              isActive: true
            }
          })

          if (config) {
            // 更新缓存
            const newConfigs = new Map(get().configs)
            newConfigs.set(provider, config)
            set({
              configs: newConfigs,
              lastCacheUpdate: Date.now()
            })
          }

          return config
        } catch (error) {
          console.error('Failed to get API config:', error)
          const exception = new ApiConfigException(
            ApiConfigError.DATABASE_ERROR,
            `Failed to get API config for provider: ${provider}`,
            error
          )
          set({ error: exception })
          return null
        } finally {
          set({ loading: false })
        }
      },

      /**
       * 设置API配置
       */
      setApiConfig: async (provider: string, configData: CreateApiConfigData) => {
        try {
          set({ loading: true, error: null })

          // 验证配置
          const validation = get().validateApiConfig(configData)
          if (!validation.isValid) {
            throw new ApiConfigException(
              ApiConfigError.VALIDATION_FAILED,
              'Invalid API configuration',
              { errors: validation.errors }
            )
          }

          // 检查是否已存在
          const existing = await prisma.apiConfig.findFirst({
            where: {
              provider,
              userId: 'default-user'
            }
          })

          let config: ApiConfig

          if (existing) {
            // 更新现有配置
            config = await prisma.apiConfig.update({
              where: { id: existing.id },
              data: {
                apiKey: configData.apiKey,
                baseUrl: configData.baseUrl,
                model: configData.model,
                settings: configData.settings || {},
                isActive: configData.isActive !== false
              }
            })
          } else {
            // 创建新配置
            config = await prisma.apiConfig.create({
              data: {
                provider,
                userId: 'default-user',
                ...configData,
                isActive: configData.isActive !== false
              }
            })
          }

          // 更新本地状态和缓存
          const newConfigs = new Map(get().configs)
          newConfigs.set(provider, config)
          set({
            configs: newConfigs,
            lastCacheUpdate: Date.now()
          })

        } catch (error) {
          console.error('Failed to set API config:', error)
          const exception = new ApiConfigException(
            ApiConfigError.DATABASE_ERROR,
            `Failed to set API config for provider: ${provider}`,
            error
          )
          set({ error: exception })
          throw exception
        } finally {
          set({ loading: false })
        }
      },

      /**
       * 更新API配置
       */
      updateApiConfig: async (provider: string, updates: UpdateApiConfigData) => {
        try {
          set({ loading: true, error: null })

          const existing = get().configs.get(provider)
          if (!existing) {
            throw new ApiConfigException(
              ApiConfigError.NOT_FOUND,
              `API config not found for provider: ${provider}`
            )
          }

          // 验证更新数据
          const validation = get().validateApiConfig({
            ...existing,
            ...updates
          })
          if (!validation.isValid) {
            throw new ApiConfigException(
              ApiConfigError.VALIDATION_FAILED,
              'Invalid API configuration update',
              { errors: validation.errors }
            )
          }

          // 更新数据库
          const config = await prisma.apiConfig.update({
            where: { id: existing.id },
            data: updates
          })

          // 更新本地状态和缓存
          const newConfigs = new Map(get().configs)
          newConfigs.set(provider, config)
          set({
            configs: newConfigs,
            lastCacheUpdate: Date.now()
          })

        } catch (error) {
          console.error('Failed to update API config:', error)
          const exception = new ApiConfigException(
            ApiConfigError.DATABASE_ERROR,
            `Failed to update API config for provider: ${provider}`,
            error
          )
          set({ error: exception })
          throw exception
        } finally {
          set({ loading: false })
        }
      },

      /**
       * 删除API配置
       */
      removeApiConfig: async (provider: string) => {
        try {
          set({ loading: true, error: null })

          const existing = get().configs.get(provider)
          if (!existing) {
            return // 不存在则直接返回
          }

          // 从数据库删除
          await prisma.apiConfig.delete({
            where: { id: existing.id }
          })

          // 更新本地状态和缓存
          const newConfigs = new Map(get().configs)
          newConfigs.delete(provider)
          set({
            configs: newConfigs,
            lastCacheUpdate: Date.now()
          })

        } catch (error) {
          console.error('Failed to remove API config:', error)
          const exception = new ApiConfigException(
            ApiConfigError.DATABASE_ERROR,
            `Failed to remove API config for provider: ${provider}`,
            error
          )
          set({ error: exception })
          throw exception
        } finally {
          set({ loading: false })
        }
      },

      /**
       * 获取所有API配置
       */
      getAllApiConfigs: async () => {
        try {
          set({ loading: true, error: null })

          const configs = await prisma.apiConfig.findMany({
            where: {
              userId: 'default-user',
              isActive: true
            },
            orderBy: [
              { createdAt: 'desc' }
            ]
          })

          // 更新本地状态和缓存
          const configsMap = new Map()
          configs.forEach(config => {
            configsMap.set(config.provider, config)
          })

          set({
            configs: configsMap,
            lastCacheUpdate: Date.now()
          })

          return configs
        } catch (error) {
          console.error('Failed to get all API configs:', error)
          const exception = new ApiConfigException(
            ApiConfigError.DATABASE_ERROR,
            'Failed to get all API configs',
            error
          )
          set({ error: exception })
          return []
        } finally {
          set({ loading: false })
        }
      },

      /**
       * 批量设置API配置
       */
      setMultipleApiConfigs: async (configs: Record<string, CreateApiConfigData>) => {
        try {
          set({ loading: true, error: null })

          const results = await Promise.allSettled(
            Object.entries(configs).map(([provider, configData]) =>
              get().setApiConfig(provider, configData)
            )
          )

          // 检查是否有失败的操作
          const failures = results.filter(result => result.status === 'rejected')
          if (failures.length > 0) {
            throw new ApiConfigException(
              ApiConfigError.DATABASE_ERROR,
              `Failed to set ${failures.length} API configs`,
              { failures: failures.map(f => f.reason) }
            )
          }

        } catch (error) {
          console.error('Failed to set multiple API configs:', error)
          set({ error: error instanceof ApiConfigException ? error : new ApiConfigException(ApiConfigError.DATABASE_ERROR, 'Failed to set multiple API configs', error) })
          throw error
        } finally {
          set({ loading: false })
        }
      },

      /**
       * 检查API配置是否存在
       */
      hasApiConfig: async (provider: string): Promise<boolean> => {
        try {
          const config = await get().getApiConfig(provider)
          return config !== null
        } catch (error) {
          console.error('Failed to check API config existence:', error)
          return false
        }
      },

      /**
       * 验证API配置
       */
      validateApiConfig: (config: ApiConfigData): ApiConfigValidationResult => {
        return validateApiConfig(config)
      },

      /**
       * 清除缓存
       */
      clearCache: () => {
        set({
          configs: new Map(),
          lastCacheUpdate: 0,
          error: null
        })
      },

      /**
       * 初始化存储
       */
      initialize: async () => {
        try {
          set({ loading: true })

          // 从数据库加载所有配置
          const configs = await get().getAllApiConfigs()

          set({
            configs: new Map(configs.map(c => [c.provider, c])),
            lastCacheUpdate: Date.now(),
            loading: false,
            error: null
          })

          console.log(`API Config Store initialized with ${configs.length} configurations`)
        } catch (error) {
          console.error('Failed to initialize API config store:', error)
          set({
            loading: false,
            error: error instanceof Error ? new ApiConfigException(ApiConfigError.DATABASE_ERROR, 'Initialization failed', error) : new ApiConfigException(ApiConfigError.DATABASE_ERROR, 'Initialization failed')
          })
        }
      },

      /**
       * 刷新特定配置
       */
      refreshConfig: async (provider: string) => {
        // 清除缓存强制重新获取
        const newConfigs = new Map(get().configs)
        newConfigs.delete(provider)
        set({
          configs: newConfigs,
          lastCacheUpdate: 0
        })

        // 重新获取
        return await get().getApiConfig(provider)
      }
    }),
    {
      name: 'api-config-store',
      partialize: (state) => ({
        configs: state.configs,
        loading: state.loading,
        error: state.error,
        cacheTimeout: state.cacheTimeout,
        lastCacheUpdate: state.lastCacheUpdate
      }),
      version: 1
    }
  )
)

// 初始化存储
if (typeof window !== 'undefined') {
  // 等待DOM加载完成后初始化
  window.addEventListener('DOMContentLoaded', () => {
    useDatabaseApiConfigStore.getState().initialize()
  })
}

export default useDatabaseApiConfigStore