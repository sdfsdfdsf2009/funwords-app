/**
 * 图片选择状态迁移脚本
 * 将localStorage中的图片选择状态迁移到数据库
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface ImageSelectionMigrationResult {
  success: boolean
  migratedScenes: number
  skippedScenes: number
  errorScenes: number
  errors: string[]
  warnings: string[]
}

interface LegacyImageSelectionState {
  [sceneId: string]: string[]
}

/**
 * 检查localStorage中是否有图片选择状态
 */
const hasLegacyImageSelections = (): boolean => {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    const selectionState = localStorage.getItem('selectedImagesPerScene')
    return selectionState !== null && selectionState !== ''
  } catch {
    return false
  }
}

/**
 * 从localStorage读取图片选择状态
 */
const getLegacyImageSelections = (): LegacyImageSelectionState => {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const selectionState = localStorage.getItem('selectedImagesPerScene')
    if (!selectionState) {
      return {}
    }

    const parsed = JSON.parse(selectionState)
    return typeof parsed === 'object' ? parsed : {}
  } catch (error) {
    console.error('Failed to read legacy image selections:', error)
    return {}
  }
}

/**
 * 清理localStorage中的图片选择状态
 */
const clearLegacyImageSelections = (): void => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    localStorage.removeItem('selectedImagesPerScene')
  } catch (error) {
    console.error('Failed to clear legacy image selections:', error)
  }
}

/**
 * 验证场景ID和图片选择数据
 */
const validateSceneSelections = (
  selections: LegacyImageSelectionState,
  availableSceneIds: string[]
): { valid: LegacyImageSelectionState; invalid: string[] } => {
  const valid: LegacyImageSelectionState = {}
  const invalid: string[] = []

  Object.entries(selections).forEach(([sceneId, selectedImageIds]) => {
    if (availableSceneIds.includes(sceneId) && Array.isArray(selectedImageIds)) {
      valid[sceneId] = selectedImageIds.filter(id => typeof id === 'string' && id.trim() !== '')
    } else {
      invalid.push(sceneId)
    }
  })

  return { valid, invalid }
}

/**
 * 迁移单个场景的图片选择状态
 */
const migrateSceneSelections = async (
  sceneId: string,
  selectedImageIds: string[]
): Promise<boolean> => {
  try {
    await prisma.scene.update({
      where: { id: sceneId },
      data: {
        selectedImageIds,
        imageSelectionState: {
          migratedAt: new Date().toISOString(),
          totalSelected: selectedImageIds.length,
          migratedFrom: 'localStorage'
        },
        updatedAt: new Date()
      }
    })

    console.log(`✅ Migrated image selection for scene: ${sceneId} (${selectedImageIds.length} images)`)
    return true
  } catch (error) {
    console.error(`❌ Failed to migrate image selection for scene ${sceneId}:`, error)
    return false
  }
}

/**
 * 主迁移函数
 */
export const migrateImageSelections = async (options: {
  clearLegacy?: boolean
  dryRun?: boolean
  userId?: string
} = {}): Promise<ImageSelectionMigrationResult> => {
  const {
    clearLegacy = true,
    dryRun = false,
    userId = '00000000-0000-0000-0000-000000000001' // 默认用户ID
  } = options

  const result: ImageSelectionMigrationResult = {
    success: false,
    migratedScenes: 0,
    skippedScenes: 0,
    errorScenes: 0,
    errors: [],
    warnings: []
  }

  try {
    console.log('🚀 Starting image selection migration...')
    console.log(`Options: { clearLegacy: ${clearLegacy}, dryRun: ${dryRun}, userId: ${userId}`)

    // 检查是否有遗留的图片选择状态
    if (!hasLegacyImageSelections()) {
      console.log('ℹ️ No legacy image selections found')
      result.success = true
      return result
    }

    // 读取遗留的图片选择状态
    const legacySelections = getLegacyImageSelections()
    console.log(`📦 Found image selections for ${Object.keys(legacySelections).length} scenes in localStorage`)

    if (Object.keys(legacySelections).length === 0) {
      result.success = true
      return result
    }

    // 获取数据库中可用的场景ID
    const availableScenes = await prisma.scene.findMany({
      where: {
        project: {
          userId: userId
        }
      },
      select: { id: true }
    })

    const availableSceneIds = availableScenes.map(scene => scene.id)
    console.log(`📋 Found ${availableSceneIds.length} scenes in database`)

    // 验证和清理数据
    const { valid: validSelections, invalid: invalidSceneIds } = validateSceneSelections(
      legacySelections,
      availableSceneIds
    )

    if (invalidSceneIds.length > 0) {
      result.warnings.push(`Found ${invalidSceneIds.length} invalid scene selections: ${invalidSceneIds.join(', ')}`)
      console.warn(`⚠️ Skipping ${invalidSceneIds.length} invalid scene selections`)
    }

    // 处理每个有效的场景选择
    for (const [sceneId, selectedImageIds] of Object.entries(validSelections)) {
      if (selectedImageIds.length === 0) {
        result.skippedScenes++
        continue
      }

      if (dryRun) {
        console.log(`🔍 [DRY RUN] Would migrate ${selectedImageIds.length} image selections for scene: ${sceneId}`)
        result.migratedScenes++
        continue
      }

      // 执行迁移
      const migrated = await migrateSceneSelections(sceneId, selectedImageIds)
      if (migrated) {
        result.migratedScenes++
      } else {
        result.errorScenes++
        result.errors.push(`Failed to migrate scene: ${sceneId}`)
      }
    }

    // 清理localStorage
    if (!dryRun && clearLegacy && result.migratedScenes > 0) {
      console.log('🧹 Clearing legacy image selections from localStorage...')
      clearLegacyImageSelections()
    }

    result.success = result.errorScenes === 0

    // 输出总结
    console.log('\n📊 Image Selection Migration Summary:')
    console.log(`✅ Successfully migrated: ${result.migratedScenes} scenes`)
    console.log(`⏭️ Skipped: ${result.skippedScenes} scenes`)
    console.log(`❌ Errors: ${result.errorScenes} scenes`)

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
    console.error('💥 Image selection migration failed:', error)
    result.success = false
    result.errors.push(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return result
  }
}

/**
 * 验证迁移结果
 */
export const verifyImageSelectionMigration = async (): Promise<boolean> => {
  try {
    console.log('🔍 Verifying image selection migration...')

    // 检查数据库中是否有图片选择数据
    const scenesWithSelections = await prisma.scene.count({
      where: {
        selectedImageIds: {
          not: []
        }
      }
    })

    console.log(`📊 Found ${scenesWithSelections} scenes with image selections in database`)

    // 检查localStorage是否已清理
    const hasLegacy = hasLegacyImageSelections()
    if (hasLegacy) {
      console.warn('⚠️ Legacy image selections still exist in localStorage')
      return false
    }

    console.log('✅ Image selection migration verification passed')
    return true

  } catch (error) {
    console.error('❌ Image selection migration verification failed:', error)
    return false
  }
}

/**
 * 回滚迁移（开发/测试用）
 */
export const rollbackImageSelectionMigration = async (): Promise<void> => {
  try {
    console.log('⏪ Rolling back image selection migration...')

    await prisma.scene.updateMany({
      data: {
        selectedImageIds: [],
        imageSelectionState: null
      }
    })

    console.log('✅ Image selection migration rollback completed')
  } catch (error) {
    console.error('❌ Image selection migration rollback failed:', error)
    throw error
  }
}

// 如果直接运行此脚本
if (typeof window === 'undefined' && require.main === module) {
  const isTestMode = process.env.NODE_ENV === 'test'
  const isDryRun = process.argv.includes('--dry-run')

  migrateImageSelections({
    clearLegacy: !isTestMode,
    dryRun: isDryRun
  })
  .then((result) => {
    if (!result.success) {
      console.error('❌ Image selection migration completed with errors')
      process.exit(1)
    } else {
      console.log('✅ Image selection migration completed successfully')
      process.exit(0)
    }
  })
  .catch((error) => {
    console.error('💥 Image selection migration failed:', error)
    process.exit(1)
  })
}

export default migrateImageSelections