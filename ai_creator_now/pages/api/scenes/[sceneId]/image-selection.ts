/**
 * API endpoint for managing image selection state for a scene
 * PATCH /api/scenes/[sceneId]/image-selection
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ImageSelectionUpdate {
  selectedImageIds?: string[];
  imageSelectionState?: Record<string, any>;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sceneId } = req.query;
  const { selectedImageIds, imageSelectionState }: ImageSelectionUpdate = req.body;

  if (!sceneId || typeof sceneId !== 'string') {
    return res.status(400).json({ error: 'Scene ID is required' });
  }

  try {
    // Validate scene exists
    const scene = await prisma.scene.findUnique({
      where: { id: sceneId }
    });

    if (!scene) {
      return res.status(404).json({ error: 'Scene not found' });
    }

    // Update scene with new image selection state
    const updatedScene = await prisma.scene.update({
      where: { id: sceneId },
      data: {
        selectedImageIds: selectedImageIds || [],
        imageSelectionState: imageSelectionState || {},
        updatedAt: new Date()
      }
    });

    console.log(`✅ Updated image selection for scene ${sceneId}:`, {
      selectedImageIds,
      imageSelectionState
    });

    return res.status(200).json({
      success: true,
      scene: {
        id: updatedScene.id,
        selectedImageIds: updatedScene.selectedImageIds,
        imageSelectionState: updatedScene.imageSelectionState,
        updatedAt: updatedScene.updatedAt
      }
    });

  } catch (error) {
    console.error('❌ Failed to update image selection:', error);
    return res.status(500).json({
      error: 'Failed to update image selection',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}