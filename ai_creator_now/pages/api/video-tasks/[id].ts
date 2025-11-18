import type { NextApiRequest, NextApiResponse } from 'next';
import { prismaHelpers } from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Valid task ID is required'
    });
  }

  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(req, res, id);
      case 'PUT':
        return await handlePut(req, res, id);
      case 'DELETE':
        return await handleDelete(req, res, id);
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        });
    }
  } catch (error) {
    console.error('Video task API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const asset = await prismaHelpers.getMediaAssetById(id);

    if (!asset || asset.type !== 'VIDEO') {
      return res.status(404).json({
        success: false,
        error: 'Video task not found'
      });
    }

    const task = {
      id: asset.id,
      originalApiId: (asset.metadata as any)?.originalApiId,
      prompt: (asset.metadata as any)?.prompt || "",
      status: (asset.metadata as any)?.status || "pending",
      progress: (asset.metadata as any)?.progress || 0,
      model: (asset.metadata as any)?.model || "veo3.1-fast",
      createdAt: asset.createdAt,
      completedAt: asset.updatedAt,
      config: (asset.metadata as any)?.config,
      sourceImageId: (asset.metadata as any)?.sourceImageId,
      sceneId: (asset.metadata as any)?.sceneId,
      videoUrl: asset.url,
      errorMessage: (asset.metadata as any)?.errorMessage
    };

    return res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Failed to fetch video task:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch video task',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handlePut(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const updates = req.body;

    // 准备更新数据
    const updateData: any = {
      updatedAt: new Date()
    };

    if (updates.status !== undefined) {
      updateData.processingStatus = updates.status;
    }

    if (updates.videoUrl !== undefined) {
      updateData.url = updates.videoUrl;
    }

    // 更新metadata
    if (updates.progress !== undefined ||
        updates.status !== undefined ||
        updates.errorMessage !== undefined ||
        updates.model !== undefined) {

      const existingAsset = await prismaHelpers.getMediaAssetById(id);
      const existingMetadata = existingAsset?.metadata || {};

      updateData.metadata = {
        ...((existingMetadata as any) || {}),
        ...(updates.progress !== undefined && { progress: updates.progress }),
        ...(updates.status !== undefined && { status: updates.status }),
        ...(updates.errorMessage !== undefined && { errorMessage: updates.errorMessage }),
        ...(updates.model !== undefined && { model: updates.model })
      };
    }

    const updatedAsset = await prismaHelpers.updateMediaAsset(id, updateData);

    if (!updatedAsset) {
      return res.status(404).json({
        success: false,
        error: 'Video task not found'
      });
    }

    const task = {
      id: updatedAsset.id,
      originalApiId: (updatedAsset.metadata as any)?.originalApiId,
      prompt: (updatedAsset.metadata as any)?.prompt || "",
      status: (updatedAsset.metadata as any)?.status || "pending",
      progress: (updatedAsset.metadata as any)?.progress || 0,
      model: (updatedAsset.metadata as any)?.model || "veo3.1-fast",
      createdAt: updatedAsset.createdAt,
      completedAt: (updatedAsset.metadata as any)?.status === "completed" ? updatedAsset.updatedAt : undefined,
      config: (updatedAsset.metadata as any)?.config,
      sourceImageId: (updatedAsset.metadata as any)?.sourceImageId,
      sceneId: (updatedAsset.metadata as any)?.sceneId,
      videoUrl: updatedAsset.url,
      errorMessage: (updatedAsset.metadata as any)?.errorMessage
    };

    return res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Failed to update video task:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update video task',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const deleted = await prismaHelpers.deleteMediaAsset(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Video task not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Video task deleted successfully'
    });
  } catch (error) {
    console.error('Failed to delete video task:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete video task',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}