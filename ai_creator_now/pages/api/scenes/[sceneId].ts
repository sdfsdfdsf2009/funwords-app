import type { NextApiRequest, NextApiResponse } from 'next'
import { prismaHelpers } from '@/lib/prisma'
import prisma from '@/lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { method, query } = req
    const { sceneId } = query

    if (!sceneId || typeof sceneId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Scene ID is required'
      })
    }

    if (method === 'GET') {
      // 获取单个场景
      const scene = await prismaHelpers.getSceneById(sceneId)

      if (!scene) {
        return res.status(404).json({
          success: false,
          error: 'Scene not found'
        })
      }

      return res.status(200).json({
        success: true,
        data: scene
      })
    }

    if (method === 'PUT') {
      // 更新场景
      const body = req.body

      const updatedScene = await prismaHelpers.updateScene(sceneId, {
        title: body.title,
        description: body.description,
        videoPrompt: body.videoPrompt,
        model: body.model,
        duration: body.duration,
        status: body.status,
        transition: body.transition,
        focusPeriods: body.focusPeriods,
        images: body.images,
        videos: body.videos,
        generatedVideos: body.generatedVideos,
        generatedVideo: body.generatedVideo,
        selectedImageId: body.selectedImageId,
        selectedVideoId: body.selectedVideoId
      })

      if (!updatedScene) {
        return res.status(404).json({
          success: false,
          error: 'Scene not found'
        })
      }

      return res.status(200).json({
        success: true,
        data: updatedScene
      })
    }

    if (method === 'DELETE') {
      // 删除场景
      const deleted = await prismaHelpers.deleteScene(sceneId)

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Scene not found'
        })
      }

      return res.status(200).json({
        success: true,
        message: 'Scene deleted successfully'
      })
    }

    res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  } catch (error) {
    console.error('Error in scene API:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}