/**
 * API配置数据迁移脚本
 * 将localStorage中的API配置迁移到数据库
 */

import { PrismaClient } from '@prisma/client'
import { ApiConfigException, ApiConfigError, validateApiConfig, API_PROVIDERS } from '@/types/apiConfig'

const prisma = new PrismaClient()

interface MigrationResult {
  success: boolean
  migratedCount: number
  skippedCount: number
  errorCount: number
  errors: string[]
  warnings: string[]
}

interface LegacyApiConfig {
  provider: string
  apiKey: string
  baseUrl?: string
  model?: string
  settings?: Record<string, any>
  isActive?: boolean
}

/**
 * 检查localStorage中是否有API配置
 */
const hasLegacyApiConfigs = (): boolean => {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    const config = localStorage.getItem('api-configs')
    return config !== null && config !== ''
  } catch {
    return false
  }
}

/**
 * 从localStorage读取API配置
 */
const getLegacyApiConfigs = (): Record<string, LegacyApiConfig> => {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const config = localStorage.getItem('api-configs')
    if (!config) {
      return {}
    }

    const parsed = JSON.parse(config)
    return typeof parsed === 'object' ? parsed : {}
  } catch (error) {
    console.error('Failed to read legacy API configs:', error)
    return {}
  }
}

/**
 * 清理localStorage中的API配置
 */
const clearLegacyApiConfigs = (): void => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    localStorage.removeItem('api-configs')
  } catch (error) {
    console.error('Failed to clear legacy API configs:', error)
  }
}

/**
 * 验证并清理迁移数据
 */
const validateAndCleanConfig = (provider: string, config: LegacyApiConfig): LegacyApiConfig | null => {
  // 基础字段验证
  if (!provider || typeof provider !== 'string') {
    return null
  }

  if (!config.apiKey || typeof config.apiKey !== 'string') {
    return null
  }

  // 创建干净的配置对象
  const cleanConfig: LegacyApiConfig = {
    provider: provider.trim(),
    apiKey: config.apiKey.trim(),
    baseUrl: config.baseUrl?.trim() || undefined,
    model: config.model?.trim() || undefined,
    settings: config.settings || {},
    isActive: config.isActive !== false // 默认为true
  }

  // 使用验证函数进一步验证
  const validation = validateApiConfig(cleanConfig)
  if (!validation.isValid) {
    console.warn(`Skipping invalid API config for provider ${provider}:`, validation.errors)
    return null
  }

  // 显示警告
  if (validation.warnings.length > 0) {
    console.warn(`API config warnings for provider ${provider}:`, validation.warnings)
  }

  return cleanConfig
}

/**
 * 迁移单个API配置
 */
const migrateSingleConfig = async (provider: string, config: LegacyApiConfig): Promise<boolean> => {
  try {
    // 检查是否已存在
    const existing = await prisma.apiConfig.findFirst({
      where: {
        provider,
        userId: 'default-user'
      }
    })

    if (existing) {
      console.log(`API config for provider ${provider} already exists, skipping`)
      return false // 跳过
    }

    // 创建新配置
    await prisma.apiConfig.create({
      data: {
        provider,
        userId: 'default-user',
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        model: config.model,
        settings: config.settings || {},
        isActive: config.isActive !== false
      }
    })

    console.log(`✅ Migrated API config for provider: ${provider}`)
    return true

  } catch (error) {
    console.error(`❌ Failed to migrate API config for provider ${provider}:`, error)
    throw error
  }
}

/**
 * 主迁移函数
 */
export const migrateApiConfigs = async (options: {
  clearLegacy?: boolean
  dryRun?: boolean
  userId?: string
} = {}): Promise<MigrationResult> => {
  const {
    clearLegacy = true,
    dryRun = false,
    userId = 'default-user'
  } = options

  const result: MigrationResult = {
    success: false,
    migratedCount: 0,
    skippedCount: 0,
    errorCount: 0,
    errors: [],
    warnings: []
  }

  try {
    console.log('🚀 Starting API configuration migration...')
    console.log(`Options: { clearLegacy: ${clearLegacy}, dryRun: ${dryRun}, userId: ${userId} }`)

    // 检查是否有遗留配置
    if (!hasLegacyApiConfigs()) {
      console.log('ℹ️ No legacy API configurations found')
      result.success = true
      return result
    }

    // 读取遗留配置
    const legacyConfigs = getLegacyApiConfigs()
    console.log(`📦 Found ${Object.keys(legacyConfigs).length} API configurations in localStorage`)

    if (Object.keys(legacyConfigs).length === 0) {
      result.success = true
      return result
    }

    // 处理每个配置
    for (const [provider, config] of Object.entries(legacyConfigs)) {
      try {
        // 验证和清理配置
        const cleanConfig = validateAndCleanConfig(provider, config)
        if (!cleanConfig) {
          result.skippedCount++
          continue
        }

        // 如果是dry run，只验证不实际迁移
        if (dryRun) {
          console.log(`🔍 [DRY RUN] Would migrate API config for provider: ${provider}`)
          result.migratedCount++
          continue
        }

        // 执行迁移
        const migrated = await migrateSingleConfig(provider, cleanConfig)
        if (migrated) {
          result.migratedCount++
        } else {
          result.skippedCount++
        }

      } catch (error) {
        result.errorCount++
        result.errors.push(`Failed to migrate ${provider}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // 清理localStorage
    if (!dryRun && clearLegacy && result.migratedCount > 0) {
      console.log('🧹 Clearing legacy API configurations from localStorage...')
      clearLegacyApiConfigs()
    }

    result.success = result.errorCount === 0

    // 输出总结
    console.log('\n📊 Migration Summary:')
    console.log(`✅ Successfully migrated: ${result.migratedCount}`)
    console.log(`⏭️ Skipped: ${result.skippedCount}`)
    console.log(`❌ Errors: ${result.errorCount}`)

    if (result.warnings.length > 0) {
      console.log('\n⚠️ Warnings:')
      result.warnings.forEach(warning => console.log(`  - ${warning}`))
    }

    if (result.errors.length > 0) {
      console.log('\n❌ Errors:')
      result.errors.forEach(error => console.log(`  - ${error}`))
    }

    return result

  } catch (error) {
    console.error('💥 Migration failed:', error)
    result.success = false
    result.errors.push(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return result
  }
}

/**
 * 验证迁移结果
 */
export const verifyMigration = async (): Promise<boolean> => {
  try {
    console.log('🔍 Verifying API configuration migration...')

    // 检查数据库中是否有配置
    const configCount = await prisma.apiConfig.count({
      where: {
        userId: 'default-user'
      }
    })

    console.log(`📊 Found ${configCount} API configurations in database`)

    // 检查localStorage是否已清理
    const hasLegacy = hasLegacyApiConfigs()
    if (hasLegacy) {
      console.warn('⚠️ Legacy API configurations still exist in localStorage')
      return false
    }

    console.log('✅ Migration verification passed')
    return true

  } catch (error) {
    console.error('❌ Migration verification failed:', error)
    return false
  }
}

/**
 * 回滚迁移（开发/测试用）
 */
export const rollbackMigration = async (): Promise<void> => {
  try {
    console.log('⏪ Rolling back API configuration migration...')

    await prisma.apiConfig.deleteMany({
      where: {
        userId: 'default-user'
      }
    })

    console.log('✅ Migration rollback completed')
  } catch (error) {
    console.error('❌ Migration rollback failed:', error)
    throw error
  }
}

// 如果直接运行此脚本
if (typeof window === 'undefined' && require.main === module) {
  const isTestMode = process.env.NODE_ENV === 'test'
  const isDryRun = process.argv.includes('--dry-run')

  migrateApiConfigs({
    clearLegacy: !isTestMode,
    dryRun: isDryRun
  })
  .then((result) => {
    if (!result.success) {
      console.error('❌ Migration completed with errors')
      process.exit(1)
    } else {
      console.log('✅ Migration completed successfully')
      process.exit(0)
    }
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error)
    process.exit(1)
  })
}

export default migrateApiConfigs