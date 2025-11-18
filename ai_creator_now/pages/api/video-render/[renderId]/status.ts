import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }

  const { renderId } = req.query

  if (!renderId || typeof renderId !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Render ID is required'
    })
  }

  try {
    // 这里应该从之前的渲染存储中获取状态
    // 为了演示，我们返回模拟的状态
    return res.status(200).json({
      success: true,
      renderId,
      status: 'pending',
      progress: 0,
      message: '渲染任务正在处理中...',
      estimatedTime: '30-60秒'
    })

  } catch (error) {
    console.error('Failed to get render status:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to get render status',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}