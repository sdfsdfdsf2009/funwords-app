import type { NextApiRequest, NextApiResponse } from 'next'

// 导入renderJobs map（从renders.ts）
// 注意：在实际项目中，这应该使用Redis或数据库来存储
let renderJobs: Map<string, any> = new Map()

// 这是一个简单的解决方案来共享renderJobs
// 在实际项目中，应该使用更robust的解决方案
if (typeof globalThis !== 'undefined' && (globalThis as any).renderJobs) {
  renderJobs = (globalThis as any).renderJobs
} else if (typeof global !== 'undefined' && (global as any).renderJobs) {
  renderJobs = (global as any).renderJobs
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { renderId, method } = req.query

  if (!renderId || typeof renderId !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Render ID is required'
    })
  }

  if (method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }

  try {
    const renderJob = renderJobs.get(renderId)

    if (!renderJob) {
      return res.status(404).json({
        success: false,
        error: 'Render job not found'
      })
    }

    return res.status(200).json({
      success: true,
      data: {
        status: renderJob.status,
        progress: renderJob.progress,
        resultUrl: renderJob.resultUrl,
        error: renderJob.error,
        createdAt: renderJob.createdAt,
        completedAt: renderJob.completedAt,
      }
    })

  } catch (error) {
    console.error('Error getting render status:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}