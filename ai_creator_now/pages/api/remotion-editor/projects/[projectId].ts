import type { NextApiRequest, NextApiResponse } from 'next'
import { prismaHelpers } from '@/lib/prisma'
import { Project, Scene, RemotionTimeline, RemotionSettings, HistoryEntry } from '@/src/types'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { projectId } = req.query
  const { method } = req

  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Project ID is required'
    })
  }

  try {
    if (method === 'GET') {
      // 获取Remotion编辑器项目
      const project = await prismaHelpers.getProject(projectId)

      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        })
      }

      // 获取Remotion编辑器数据
      const remotionData = await prismaHelpers.getRemotionEditorData(projectId)

      if (!remotionData) {
        return res.status(404).json({
          success: false,
          error: 'Remotion editor data not found'
        })
      }

      // 转换场景数据为Project格式
      const projectData: Project = {
        id: project.id,
        name: project.name,
        description: project.description || '',
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        scenes: project.scenes.map(scene => ({
          id: scene.id,
          sceneNumber: scene.sceneNumber,
          imagePrompt: scene.title || "",
          videoPrompt: scene.videoPrompt || '',
          generatedVideos: (scene.generatedVideos as any[]) || [],
          images: (scene.images as any[]) || [],
          createdAt: scene.createdAt,
          updatedAt: scene.updatedAt,
        })),
        settings: project.settings as any,
      }

      return res.status(200).json({
        success: true,
        data: {
          project: projectData,
          timeline: remotionData.timeline,
          settings: remotionData.settings,
          history: remotionData.history,
        }
      })
    }

    if (method === 'PUT') {
      // 保存Remotion编辑器项目
      const { project, timeline, settings, history } = req.body

      if (!project || !timeline) {
        return res.status(400).json({
          success: false,
          error: 'Project and timeline data are required'
        })
      }

      // 更新项目基本信息
      await prismaHelpers.updateProject(projectId, {
        name: project.name,
        description: project.description,
        settings: project.settings,
        updatedAt: new Date(),
      })

      // 保存或更新Remotion编辑器数据
      await prismaHelpers.saveRemotionEditorData(projectId, {
        timeline,
        settings: settings || {},
        history: history || [],
        updatedAt: new Date(),
      })

      return res.status(200).json({
        success: true,
        message: 'Remotion project saved successfully'
      })
    }

    if (method === 'DELETE') {
      // 删除Remotion编辑器数据
      await prismaHelpers.deleteRemotionEditorData(projectId)

      return res.status(200).json({
        success: true,
        message: 'Remotion editor data deleted successfully'
      })
    }

    res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })

  } catch (error) {
    console.error('Error in Remotion editor project API:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}