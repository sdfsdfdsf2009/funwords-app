import type { NextApiRequest, NextApiResponse } from 'next';
import { prismaHelpers } from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(req, res);
      case 'POST':
        return await handlePost(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        });
    }
  } catch (error) {
    console.error('Video tasks API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    // 获取开发用户ID（在实际应用中应该从认证中获取）
    const userId = '00000000-0000-0000-0000-000000000001';

    // 从数据库获取视频任务相关的媒体资产
    const mediaAssets = await prismaHelpers.getMediaAssetsByUser(userId, {
      type: 'VIDEO', // Use MediaType enum value
      includeProcessing: true
    });

    // 转换为VideoTask格式
    const tasks = mediaAssets.map(asset => ({
      id: asset.id,
      originalApiId: (asset.metadata as any)?.originalApiId,
      prompt: asset.prompt || (asset.metadata as any)?.prompt || "",
      status: (asset.metadata as any)?.status || "pending",
      progress: (asset.metadata as any)?.progress || 0,
      model: asset.model || (asset.metadata as any)?.model || "veo3.1-fast",
      createdAt: asset.createdAt,
      completedAt: asset.updatedAt,
      config: (asset.metadata as any)?.config,
      sourceImageId: (asset.metadata as any)?.sourceImageId,
      sceneId: asset.sceneId,
      videoUrl: asset.url,
      errorMessage: (asset.metadata as any)?.errorMessage
    }));

    return res.status(200).json({
      success: true,
      data: {
        tasks,
        count: tasks.length
      }
    });
  } catch (error) {
    console.error('Failed to fetch video tasks:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch video tasks',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  try {
    const taskData = req.body;

    if (!taskData) {
      return res.status(400).json({
        success: false,
        error: 'Task data is required'
      });
    }

    // 获取开发用户ID
    const userId = '00000000-0000-0000-0000-000000000001';

    // 创建媒体资产记录来存储视频任务
    const newAsset = await prismaHelpers.createMediaAsset({
      sceneId: taskData.sceneId,
      type: 'VIDEO', // MediaType enum value
      source: 'AI_GENERATED', // Required source field
      url: '', // 视频URL将在完成后更新
      prompt: taskData.prompt,
      model: taskData.model,
      metadata: {
        originalApiId: taskData.originalApiId,
        prompt: taskData.prompt,
        model: taskData.model,
        progress: taskData.progress || 0,
        config: taskData.config,
        sourceImageId: taskData.sourceImageId,
        sceneId: taskData.sceneId,
        status: taskData.status || 'pending' // Store status in metadata
      }
    });

    // 转换为VideoTask格式
    const task = {
      id: newAsset.id,
      originalApiId: taskData.originalApiId,
      prompt: taskData.prompt,
      status: taskData.status || 'pending',
      progress: taskData.progress || 0,
      model: taskData.model || 'veo3.1-fast',
      createdAt: newAsset.createdAt,
      completedAt: taskData.status === 'completed' ? new Date() : undefined,
      config: taskData.config,
      sourceImageId: taskData.sourceImageId,
      sceneId: taskData.sceneId,
      videoUrl: '',
      errorMessage: undefined
    };

    return res.status(201).json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Failed to create video task:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create video task',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function getProjectIdFromSceneId(sceneId: string): Promise<string | null> {
  try {
    // 从场景ID获取项目ID的辅助函数
    const scene = await prismaHelpers.getSceneById(sceneId);
    return scene?.projectId || null;
  } catch (error) {
    console.error('Failed to get project ID from scene ID:', error);
    return null;
  }
}