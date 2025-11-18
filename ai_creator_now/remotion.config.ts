import { Config } from '@remotion/cli/config';

// Remotion配置
Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);

export const remotionConfig = {
  // 输出配置
  outDir: './out',
  imageFormat: 'jpeg',
  quality: 85,

  // 渲染配置
  concurrency: 4,
  maxConcurrency: 4,

  // 浏览器配置
  chromium: {
    headless: true,
  },

  // Webpack配置
  webpackOverride: (config: any) => {
    return {
      ...config,
      resolve: {
        ...config.resolve,
        alias: {
          ...config.resolve?.alias,
          '@': require('path').resolve(__dirname, './src'),
        },
      },
    };
  },

  // 环境变量
  envVariables: {
    REMOTION_ENV: process.env.NODE_ENV || 'development',
  },

  // 自定义钩子
  onBeforeRender: () => {
    console.log('🎬 开始渲染Remotion视频...');
  },

  onAfterRender: () => {
    console.log('✅ Remotion视频渲染完成！');
  },

  // 错误处理
  onErrorMessage: (err: Error) => {
    console.error('❌ Remotion渲染错误:', err);
    return `视频渲染失败: ${err}`;
  },
};