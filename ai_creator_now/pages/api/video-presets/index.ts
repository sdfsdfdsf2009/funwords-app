import type { NextApiRequest, NextApiResponse } from 'next'
import { prismaHelpers } from '@/lib/prisma'
import { VideoGenerationPreset } from '@/src/types'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method, query } = req
  const userId = query.userId as string || '00000000-0000-0000-0000-000000000001'

  try {
    if (method === 'GET') {
      // 获取用户预设
      const presets = await prismaHelpers.getVideoPresets(userId)

      return res.status(200).json({
        success: true,
        presets: presets.map(preset => ({
          id: preset.id,
          name: preset.name,
          description: preset.description || '',
          settings: preset.settings,
          isDefault: preset.isDefault,
          isBuiltIn: preset.isBuiltIn,
          createdAt: preset.createdAt,
          updatedAt: preset.updatedAt
        }))
      })
    }

    if (method === 'POST') {
      // 创建新预设
      const { name, description, settings, isDefault, isBuiltIn } = req.body

      if (!name || !settings) {
        return res.status(400).json({
          success: false,
          error: 'Name and settings are required'
        })
      }

      // 如果设置为默认，先清除其他默认预设
      if (isDefault) {
        await prismaHelpers.clearDefaultPresets(userId)
      }

      const preset = await prismaHelpers.createVideoPreset({
        name,
        description,
        settings,
        isDefault: isDefault || false,
        isBuiltIn: isBuiltIn || false,
        userId
      })

      return res.status(201).json({
        success: true,
        preset: {
          id: preset.id,
          name: preset.name,
          description: preset.description,
          settings: preset.settings,
          isDefault: preset.isDefault,
          isBuiltIn: preset.isBuiltIn,
          createdAt: preset.createdAt,
          updatedAt: preset.updatedAt
        }
      })
    }

    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })

  } catch (error) {
    console.error('Error in video presets API:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}