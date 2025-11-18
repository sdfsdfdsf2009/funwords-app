import type { NextApiRequest, NextApiResponse } from 'next'
import { prismaHelpers } from '@/lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method, query } = req

  if (method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }

  try {
    const { userId } = query

    const stats = await prismaHelpers.getSystemLogStats(userId as string)

    return res.status(200).json({
      success: true,
      stats
    })

  } catch (error) {
    console.error('Error getting system log stats:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}