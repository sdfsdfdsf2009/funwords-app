import type { NextApiRequest, NextApiResponse } from 'next'
import { migrationService } from '@/lib/migration'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { method } = req

    if (method === 'GET') {
      // 检查迁移状态
      const needsMigration = migrationService.needsMigration()
      const migrationDetails = migrationService.detectLocalData()
      const migrationStats = migrationService.getMigrationStats()

      return res.status(200).json({
        success: true,
        data: {
          needsMigration,
          details: migrationDetails,
          stats: migrationStats
        }
      })
    }

    if (method === 'POST') {
      const body = req.body
      const action = body.action

      if (action === 'check') {
        // 检查迁移需求
        const needsMigration = migrationService.needsMigration()
        const details = migrationService.detectLocalData()

        return res.status(200).json({
          success: true,
          data: { needsMigration, details }
        })
      }

      if (action === 'backup') {
        // 创建备份
        const result = migrationService.createBackup()

        return res.status(200).json({
          success: result.success,
          error: result.error
        })
      }

      if (action === 'migrate') {
        // 执行迁移
        const result = await migrationService.migrateData((progress, stage) => {
          // 可以在这里实现WebSocket或其他方式来推送进度
          console.log(`Migration progress: ${progress}% - ${stage}`)
        })

        return res.status(200).json({
          success: result.success,
          data: result
        })
      }

      if (action === 'restore') {
        // 恢复备份
        const result = migrationService.restoreFromBackup()

        return res.status(200).json({
          success: result.success,
          error: result.error,
          data: {
            restoredProjects: result.restoredProjects
          }
        })
      }

      return res.status(400).json({
        success: false,
        error: 'Invalid action'
      })
    }

    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  } catch (error) {
    console.error('Error in migration API:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}