import type { NextApiRequest, NextApiResponse } from 'next'
import { prismaHelpers } from '@/lib/prisma'
import prisma from '@/lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { method, query } = req
    const { id } = query

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Project ID is required'
      })
    }

    if (method === 'GET') {
      // 获取单个项目
      const project = await prismaHelpers.getProjectById(id)

      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        })
      }

      return res.status(200).json({
        success: true,
        data: project
      })
    }

    if (method === 'PUT') {
      // 更新项目
      const body = req.body

      const updatedProject = await prismaHelpers.updateProject(id, {
        name: body.name,
        description: body.description,
        status: body.status,
        settings: body.settings,
        metadata: body.metadata
      })

      if (!updatedProject) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        })
      }

      return res.status(200).json({
        success: true,
        data: updatedProject
      })
    }

    if (method === 'DELETE') {
      // 删除项目
      const deleted = await prismaHelpers.deleteProject(id)

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        })
      }

      return res.status(200).json({
        success: true,
        message: 'Project deleted successfully'
      })
    }

    res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  } catch (error) {
    console.error('Error in project API:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}