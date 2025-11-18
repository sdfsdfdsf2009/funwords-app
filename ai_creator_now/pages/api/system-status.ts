import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://developer:secure_dev_password@localhost:5432/ai_creator"
    }
  }
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const timestamp = new Date().toISOString();

    // 测试数据库连接
    let databaseStatus = 'unknown';
    let projectCount = 0;
    let sceneCount = 0;

    try {
      const projects = await prisma.project.findMany({
        take: 1
      });
      projectCount = await prisma.project.count();

      if (projects && projects.length > 0) {
        const projectWithScenes = await prisma.project.findFirst({
          include: {
            scenes: true
          }
        });
        sceneCount = projectWithScenes?.scenes?.length || 0;
      }

      databaseStatus = 'connected';
    } catch (error) {
      databaseStatus = 'error';
      console.error('Database connection error:', error);
    }

    const systemStatus = {
      timestamp,
      database: {
        status: databaseStatus,
        projectCount,
        sceneCount
      },
      application: {
        status: 'running',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      },
      services: {
        api: 'available',
        filesystem: 'accessible'
      },
      configuration: {
        database_url: process.env.DATABASE_URL ? 'configured' : 'missing',
        node_env: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 3003
      }
    };

    res.status(200).json({
      success: true,
      data: systemStatus
    });
  } catch (error) {
    console.error('System status check error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}