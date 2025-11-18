import { WebpackOverrideFn } from '@remotion/bundler'

export const webpackOverride: WebpackOverrideFn = (currentConfiguration) => {
  return {
    ...currentConfiguration,
    resolve: {
      ...currentConfiguration.resolve,
      alias: {
        ...currentConfiguration.resolve?.alias,
        '@': require('path').resolve(__dirname, '../'),
      },
    },
    module: {
      ...currentConfiguration.module,
      rules: [
        ...(currentConfiguration.module?.rules || []),
        // 处理CSS文件
        {
          test: /\.css$/i,
          use: ['style-loader', 'css-loader'],
        },
        // 处理图片文件
        {
          test: /\.(png|jpg|jpeg|gif|svg)$/i,
          type: 'asset/resource',
        },
        // 处理字体文件
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/i,
          type: 'asset/resource',
        },
      ],
    },
    optimization: {
      minimize: process.env.NODE_ENV === 'production',
    },
    externals: {
      // 排除不需要在服务器端运行的内容
      'canvas': '{}',
      'jsdom': '{}',
    },
  }
}