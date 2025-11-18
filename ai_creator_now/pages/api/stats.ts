import type { NextApiRequest, NextApiResponse } from 'next'
import { prismaHelpers } from '@/lib/prisma'
import prisma from '@/lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET'])
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      })
    }

    const { query } = req
    const userId = query.userId as string || '00000000-0000-0000-0000-000000000001'

    const statistics = await prismaHelpers.getProjectStatistics(userId)

    // 计算额外的统计数据
    const [recentProjects, activeProjects, completedProjects] = await Promise.all([
      prisma.project.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          updatedAt: true,
          status: true,
          _count: {
            select: { scenes: true }
          }
        }
      }),
      prisma.project.count({
        where: {
          userId,
          status: {
            in: ['draft', 'in_progress', 'review']
          }
        }
      }),
      prisma.project.count({
        where: {
          userId,
          status: 'completed'
        }
      })
    ])

    return res.status(200).json({
      success: true,
      data: {
        ...statistics,
        recentProjects,
        activeProjects,
        completedProjects,
        completionRate: statistics.totalProjects > 0
          ? Math.round((completedProjects / statistics.totalProjects) * 100)
          : 0
      }
    })
  } catch (error) {
    console.error('Error fetching statistics:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}