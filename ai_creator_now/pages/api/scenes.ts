import type { NextApiRequest, NextApiResponse } from 'next'
import { prismaHelpers } from '@/lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { method, query } = req

    if (method === 'GET') {
      const projectId = query.projectId as string

      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: 'Project ID is required'
        })
      }

      const scenes = await prismaHelpers.getScenesByProject(projectId)

      return res.status(200).json({
        success: true,
        data: scenes
      })
    }

    if (method === 'POST') {
      const body = req.body

      // 验证必需字段
      if (!body.projectId || !body.title) {
        return res.status(400).json({
          success: false,
          error: 'Project ID and title are required'
        })
      }

      let scene;

      if (body.sceneNumber !== undefined) {
        // CSV import or explicit scene number - validate and use provided number
        const providedSceneNumber = parseInt(body.sceneNumber.toString(), 10)

        if (isNaN(providedSceneNumber) || providedSceneNumber < 1) {
          return res.status(400).json({
            success: false,
            error: 'Scene number must be a positive integer'
          })
        }

        // Check for potential invalid scene numbers (like unusually high numbers)
        if (providedSceneNumber > 1000) {
          console.warn(`Warning: Very high scene number provided: ${providedSceneNumber}`, {
            projectId: body.projectId,
            providedSceneNumber
          })
        }

        // Create scene with explicit number using atomic transaction to prevent race conditions
        const sceneData = {
          title: body.title,
          description: body.description || null,
          videoPrompt: body.videoPrompt || null,
          model: body.model || null,
          duration: body.duration || 8,
          status: body.status || 'PENDING',
          transition: body.transition || null,
          focusPeriods: body.focusPeriods || null,
          images: body.images || [],
          videos: body.videos || [],
          generatedVideos: body.generatedVideos || []
        }

        try {
          scene = await prismaHelpers.createSceneWithExplicitNumber(body.projectId, providedSceneNumber, sceneData);
          console.log(`Scene created successfully with explicit number ${providedSceneNumber}`, {
            projectId: body.projectId,
            sceneId: scene.id,
            sceneNumber: scene.sceneNumber,
            title: scene.title
          });
        } catch (error: any) {
          console.error(`Failed to create scene with explicit number ${providedSceneNumber}`, {
            projectId: body.projectId,
            error: error.message
          });

          // Return a user-friendly error for explicit number conflicts
          if (error.message.includes('already exists')) {
            return res.status(409).json({
              success: false,
              error: 'Scene number conflict',
              message: `Scene number ${providedSceneNumber} already exists in this project. Please check your CSV file and use a different scene number.`,
              details: {
                attemptedSceneNumber: providedSceneNumber,
                projectId: body.projectId
              }
            });
          }

          // Re-throw other errors to be handled by the outer catch block
          throw error;
        }
      } else {
        // Manual scene creation - use atomic scene number allocation to prevent race conditions
        const sceneData = {
          title: body.title,
          description: body.description || null,
          videoPrompt: body.videoPrompt || null,
          model: body.model || null,
          duration: body.duration || 8,
          status: body.status || 'PENDING',
          transition: body.transition || null,
          focusPeriods: body.focusPeriods || null,
          images: body.images || [],
          videos: body.videos || [],
          generatedVideos: body.generatedVideos || []
        }

        try {
          scene = await prismaHelpers.createSceneWithAtomicNumber(body.projectId, sceneData);
          console.log(`Scene created successfully with atomic number allocation`, {
            projectId: body.projectId,
            sceneId: scene.id,
            sceneNumber: scene.sceneNumber,
            title: scene.title
          });
        } catch (error: any) {
          console.error(`Failed to create scene with atomic number allocation`, {
            projectId: body.projectId,
            error: error.message,
            code: error.code
          });

          // If atomic creation fails, throw the error to be handled by the outer catch block
          throw error;
        }
      }

      return res.status(201).json({
        success: true,
        data: scene
      })
    }

    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  } catch (error: any) {
    console.error('Error in scenes API:', error)

    // Handle specific error types for better client feedback
    if (error.code === 'P2002' && error.meta?.target?.includes('sceneNumber')) {
      return res.status(409).json({
        success: false,
        error: 'Scene number conflict',
        message: 'A scene with this number already exists. Please try again.',
        details: {
          constraint: 'unique_project_scene_number',
          attemptedSceneNumber: error.meta?.target?.sceneNumber || 'unknown'
        }
      })
    }

    if (error.message?.includes('Unable to allocate scene number') ||
        error.message?.includes('already exists or could not be allocated')) {
      return res.status(503).json({
        success: false,
        error: 'Scene allocation failed',
        message: error.message,
        retryPossible: true
      })
    }

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}