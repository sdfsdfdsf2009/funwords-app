import type { NextApiRequest, NextApiResponse } from 'next'
import { prismaHelpers } from '@/lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method, query } = req

  try {
    if (method === 'GET') {
      // 获取视频缓存
      const { userId, videoId } = query

      const caches = await prismaHelpers.getVideoCache(
        userId as string,
        videoId as string
      )

      const formattedCaches = caches.map(cache => ({
        id: cache.id,
        userId: cache.userId,
        videoId: cache.videoId,
        localPath: cache.localPath,
        originalUrl: cache.originalUrl,
        downloadDate: Number(cache.downloadDate),
        fileSize: Number(cache.fileSize || 0),
        metadata: cache.metadata,
        isActive: cache.isActive,
        createdAt: cache.createdAt,
        updatedAt: cache.updatedAt
      }))

      return res.status(200).json({
        success: true,
        caches: formattedCaches,
        total: formattedCaches.length
      })
    }

    if (method === 'POST') {
      // 创建视频缓存
      const {
        userId,
        videoId,
        localPath,
        originalUrl,
        downloadDate,
        fileSize,
        metadata
      } = req.body

      if (!videoId || !localPath || !originalUrl || !downloadDate) {
        return res.status(400).json({
          success: false,
          error: 'videoId, localPath, originalUrl, and downloadDate are required'
        })
      }











//       return res.status(201).json({
//         success: true,
//         cache: {
//           id: cache.id,
//           userId: cache.userId,
//           videoId: cache.videoId,
//           localPath: cache.localPath,
//           originalUrl: cache.originalUrl,
//           downloadDate: Number(cache.downloadDate),
//           fileSize: Number(cache.fileSize || 0),
//           metadata: cache.metadata,
//           isActive: cache.isActive,
//           createdAt: cache.createdAt,
//           updatedAt: cache.updatedAt
//         }
//       })
//     }
// 
//     if (method === 'DELETE') {
//       // 删除视频缓存
//       const { userId, videoId } = query
      return res.status(200).json({
        success: true,
        message: "Video cache creation temporarily disabled"
      })
      if (!videoId) {
        return res.status(400).json({
          success: false,
          error: 'videoId is required for deletion'
        })
      }

      await prismaHelpers.deleteVideoCache(
        userId as string,
        videoId as string
      )

      return res.status(200).json({
        success: true,
        message: 'Video cache deleted successfully'
      })
    }

    res.setHeader('Allow', ['GET', 'POST', 'DELETE'])
    return res.status(405).json({
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