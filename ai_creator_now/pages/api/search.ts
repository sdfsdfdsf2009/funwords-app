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
    const searchQuery = query.q as string || ''
    const userId = query.userId as string || '00000000-0000-0000-0000-000000000001'
    const type = query.type as string || 'all' // 'projects', 'scenes', or 'all'

    if (!searchQuery.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      })
    }

    let results: {
      projects: any[],
      scenes: any[]
    } = {
      projects: [],
      scenes: []
    }
    if (type === 'all' || type === 'projects') {
      results.projects = await prismaHelpers.searchProjects(userId, searchQuery)
    }

    if (type === 'all' || type === 'scenes') {
      results.scenes = await prisma.scene.findMany({
        where: {
          project: {
            userId: userId
          },
          OR: [
            {
              title: {
                contains: searchQuery,
                mode: 'insensitive'
              }
            },
            {
              description: {
                contains: searchQuery,
                mode: 'insensitive'
              }
            },
            {
              videoPrompt: {
                contains: searchQuery,
                mode: 'insensitive'
              }
            }
          ]
        },
        include: {
          project: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' },
        take: 50
      })
    }

    return res.status(200).json({
      success: true,
      data: results,
      query: searchQuery,
      type
    })
  } catch (error) {
    console.error('Error performing search:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to perform search',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}