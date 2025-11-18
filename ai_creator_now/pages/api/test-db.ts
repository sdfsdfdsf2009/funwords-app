import type { NextApiRequest, NextApiResponse } from 'next'
import { prismaHelpers } from '@/lib/prisma'
import prisma from '@/lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // 测试数据库连接
    const userCount = await prisma.user.count()
    const projectCount = await prisma.project.count()
    const sceneCount = await prisma.scene.count()

    res.status(200).json({
      success: true,
      message: 'Database connection successful',
      data: {
        userCount,
        projectCount,
        sceneCount,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Database connection error:', error)
    res.status(500).json({
      success: false,
      error: 'Database connection failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}