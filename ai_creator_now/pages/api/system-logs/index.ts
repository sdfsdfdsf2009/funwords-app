import type { NextApiRequest, NextApiResponse } from 'next'
import { prismaHelpers } from '@/lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method, query } = req

  try {
    if (method === 'GET') {
      // 获取日志
      const {
        userId,
        level,
        category,
        limit = '100',
        offset = '0'
      } = query

      const options: any = {}
      if (level && typeof level === 'string') options.level = level as any
      if (category && typeof category === 'string') options.category = category
      if (limit && typeof limit === 'string') options.limit = parseInt(limit)
      if (offset && typeof offset === 'string') options.offset = parseInt(offset)

      const logs = await prismaHelpers.getSystemLogs(
        userId as string,
        options
      )

      return res.status(200).json({
        success: true,
        logs,
        total: logs.length
      })
    }

    if (method === 'POST') {
      // 创建日志
      const { userId, level, message, category, metadata } = req.body

      if (!level || !message) {
        return res.status(400).json({
          success: false,
          error: 'Level and message are required'
        })
      }

      const log = await prismaHelpers.createSystemLog({
        userId,
        level,
        message,
        category: category || 'system',
        metadata: metadata || {}
      })

      return res.status(201).json({
        success: true,
        log: {
          id: log.id,
          userId: log.userId,
          level: log.level,
          message: log.message,
          category: log.category,
          metadata: log.metadata,
          createdAt: log.createdAt
        }
      })
    }

    if (method === 'DELETE') {
      // 清除日志
      const { userId, beforeDate } = query

      let before: Date | undefined
      if (beforeDate && typeof beforeDate === 'string') {
        before = new Date(beforeDate)
      }

      await prismaHelpers.clearSystemLogs(userId as string, before)

      return res.status(200).json({
        success: true,
        message: 'Logs cleared successfully'
      })
    }

    res.setHeader('Allow', ['GET', 'POST', 'DELETE'])
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })

  } catch (error) {
    console.error('Error in system logs API:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}