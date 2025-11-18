import type { NextApiRequest, NextApiResponse } from 'next'

// 导入renderJobs map
let renderJobs: Map<string, any> = new Map()

// 简单的解决方案来共享renderJobs
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

  if (method !== 'POST') {
    res.setHeader('Allow', ['POST'])
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

    if (renderJob.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel completed render job'
      })
    }

    if (renderJob.status === 'failed') {
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel failed render job'
      })
    }

    // 更新状态为已取消
    renderJob.status = 'failed'
    renderJob.error = 'Render cancelled by user'
    renderJob.completedAt = new Date()

    return res.status(200).json({
      success: true,
      message: 'Render job cancelled successfully'
    })

  } catch (error) {
    console.error('Error cancelling render:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}