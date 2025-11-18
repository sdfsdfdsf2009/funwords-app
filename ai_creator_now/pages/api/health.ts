import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 基本健康检查
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      port: 3003,
      services: {
        database: 'unknown', // 将在后续任务中检查
        apis: 'unknown',
        filesystem: 'accessible'
      }
    };

    // 尝试检查文件系统访问
    try {
      const fs = require('fs');
      fs.accessSync('.', fs.constants.R_OK);
      health.services.filesystem = 'accessible';
    } catch (error) {
      health.services.filesystem = 'error';
    }

    res.status(200).json(health);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}