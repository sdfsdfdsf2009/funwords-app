import type { NextApiRequest, NextApiResponse } from 'next'
import { prismaHelpers } from '@/lib/prisma'
import { HistoryEntry } from '@/src/types'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { projectId, method } = req.query

  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Project ID is required'
    })
  }

  if (method === 'PUT') {
    try {
      const { history } = req.body

      if (!Array.isArray(history)) {
        return res.status(400).json({
          success: false,
          error: 'History must be an array'
        })
      }

      // 获取现有的Remotion编辑器数据
      const existingData = await prismaHelpers.getRemotionEditorData(projectId)

      if (existingData) {
        // 更新现有记录
        await prismaHelpers.saveRemotionEditorData(projectId, {
          timeline: existingData.timeline,
          settings: existingData.settings,
          history,
          metadata: existingData.metadata,
          updatedAt: new Date()
        })
      } else {
        // 创建新记录
        await prismaHelpers.saveRemotionEditorData(projectId, {
          timeline: {},
          settings: {},
          history,
          metadata: {},
          updatedAt: new Date()
        })
      }

      return res.status(200).json({
        success: true,
        message: 'History saved successfully'
      })

    } catch (error) {
      console.error('Error saving history:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  res.setHeader('Allow', ['PUT'])
  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  })
}