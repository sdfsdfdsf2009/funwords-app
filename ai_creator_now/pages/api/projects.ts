import type { NextApiRequest, NextApiResponse } from 'next'
import { prismaHelpers } from '@/lib/prisma'
import { withSecurityAndCorsPages } from '@/utils/cors-middleware-pages'
import { SecureLogger } from '@/utils/secureLogger'

async function projectsHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { method, query } = req
    const userId = query.userId || '00000000-0000-0000-0000-000000000001'
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 20
    const search = query.search as string || undefined
    const status = query.status as string || undefined

    if (method === 'GET') {
      const result = await prismaHelpers.getProjectsByUser(Array.isArray(userId) ? userId[0] : userId, {
        page,
        limit,
        search,
        status
      })

      return res.status(200).json({
        success: true,
        data: result.projects,
        pagination: result.pagination
      })
    }

    if (method === 'POST') {
      const body = req.body

      // 验证必需字段
      if (!body.name) {
        return res.status(400).json({
          success: false,
          error: 'Project name is required'
        })
      }

      const projectData = {
        name: body.name,
        description: body.description || null,
        userId: body.userId || userId,
        status: body.status || 'draft',
        settings: body.settings || {},
        metadata: body.metadata || {}
      }

      const project = await prismaHelpers.createProject(projectData)

      return res.status(201).json({
        success: true,
        data: project
      })
    }

    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  } catch (error) {
    // 使用安全日志记录错误，防止敏感信息泄露
    SecureLogger.error('Error in projects API', {
      method: req.method,
      query: req.query,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : 'Unknown error',
      timestamp: new Date().toISOString()
    })

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred'
    })
  }
}

export default withSecurityAndCorsPages(projectsHandler)