import type { NextApiRequest, NextApiResponse } from 'next'
import { prismaHelpers } from '@/lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { presetId, method } = req.query

  if (!presetId || typeof presetId !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Preset ID is required'
    })
  }

  try {
    if (method === 'PUT') {
      // 更新预设
      const { name, description, settings, isDefault } = req.body

      const updates: any = {}
      if (name !== undefined) updates.name = name
      if (description !== undefined) updates.description = description
      if (settings !== undefined) updates.settings = settings
      if (isDefault !== undefined) {
        updates.isDefault = isDefault
        // 如果设置为默认，先清除其他默认预设
        if (isDefault) {
          await prismaHelpers.clearDefaultPresets()
        }
      }
      updates.updatedAt = new Date()

      const preset = await prismaHelpers.updateVideoPreset(presetId, updates)

      if (!preset) {
        return res.status(404).json({
          success: false,
          error: 'Preset not found'
        })
      }

      return res.status(200).json({
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

    if (method === 'DELETE') {
      // 删除预设
      const deleted = await prismaHelpers.deleteVideoPreset(presetId)

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Preset not found'
        })
      }

      return res.status(200).json({
        success: true,
        message: 'Preset deleted successfully'
      })
    }

    res.setHeader('Allow', ['PUT', 'DELETE'])
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })

  } catch (error) {
    console.error('Error in video preset API:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}