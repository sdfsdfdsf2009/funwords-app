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

  if (method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }

  try {
    // 先清除所有默认预设
    await prismaHelpers.clearDefaultPresets()

    // 设置指定预设为默认
    const preset = await prismaHelpers.updateVideoPreset(presetId, {
      isDefault: true,
      updatedAt: new Date()
    })

    if (!preset) {
      return res.status(404).json({
        success: false,
        error: 'Preset not found'
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Default preset set successfully'
    })

  } catch (error) {
    console.error('Error setting default preset:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}