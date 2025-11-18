import type { NextApiRequest, NextApiResponse } from 'next'
import { prismaHelpers } from '@/lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { method, query } = req

    if (method === 'GET') {
      const sceneId = query.sceneId as string

      if (!sceneId) {
        return res.status(400).json({
          success: false,
          error: 'Scene ID is required'
        })
      }

      const mediaAssets = await prismaHelpers.getMediaAssetsByScene(sceneId)

      return res.status(200).json({
        success: true,
        data: mediaAssets
      })
    }

    if (method === 'POST') {
      const body = req.body

      // 验证必需字段
      if (!body.type || !body.url) {
        return res.status(400).json({
          success: false,
          error: 'Media type and URL are required'
        })
      }

      // 获取场景中下一个排序值
      const sceneMediaAssets = await prismaHelpers.getMediaAssetsByScene(body.sceneId || '')
      const nextSortOrder = sceneMediaAssets.length > 0 ? Math.max(...sceneMediaAssets.map(m => m.sortOrder)) + 1 : 0

      const mediaData = {
        type: body.type, // IMAGE, VIDEO, AUDIO
        source: body.source || 'USER_UPLOADED', // AI_GENERATED, USER_UPLOADED, SYSTEM
        url: body.url,
        fileName: body.fileName || null,
        fileSize: body.fileSize || null,
        mimeType: body.mimeType || null,
        metadata: body.metadata || {},
        prompt: body.prompt || null,
        model: body.model || null,
        sceneId: body.sceneId || null,
        sortOrder: body.sortOrder !== undefined ? body.sortOrder : nextSortOrder,
        isSelected: body.isSelected || false
      }

      const mediaAsset = await prismaHelpers.createMediaAsset(mediaData)

      return res.status(201).json({
        success: true,
        data: mediaAsset
      })
    }

    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  } catch (error) {
    console.error('Error in media API:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}