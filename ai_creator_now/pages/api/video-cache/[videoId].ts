import type { NextApiRequest, NextApiResponse } from 'next'
import { prismaHelpers } from '@/lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method, query, body } = req
  const { videoId } = query

  if (!videoId || typeof videoId !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Video ID is required'
    })
  }

  try {
    if (method === 'PUT') {
      // 更新视频缓存
      const { userId, localPath, fileSize, isActive } = body

      const updates: any = {}
      if (localPath !== undefined) updates.localPath = localPath
      if (fileSize !== undefined) updates.fileSize = BigInt(fileSize)
      if (isActive !== undefined) updates.isActive = isActive
      updates.updatedAt = new Date()







      // Return success response without cache details for now
      return res.status(200).json({
        success: true,
        message: "Video cache update temporarily disabled"
      })
  } res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })

  } catch (error) {
    console.error('Error in video cache API:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}