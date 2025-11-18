/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  swcMinify: true,
  images: {
    domains: ['localhost', 'api.evolink.ai', 'cdn.evolink.ai'],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },
  env: {
    ANALYZE: process.env.ANALYZE || 'false',
  },
  // Enhanced webpack config for bundle optimization
  webpack: (config, { isServer, dev }) => {
    // File handling for CSV
    config.module.rules.push({
      test: /\.csv$/,
      use: [
        {
          loader: 'csv-loader',
          options: {
            dynamicTyping: true,
            header: true,
            skipEmptyLines: true,
          },
        },
      ],
    });

    // Optimization for production builds
    if (!dev && !isServer) {
      // Code splitting optimization
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Separate vendor chunks
            vendor: {
              name: 'vendors',
              chunks: 'all',
              test: /[\\/]node_modules[\\/]/,
              priority: 20,
            },
            // Separate common UI components
            ui: {
              name: 'ui',
              chunks: 'all',
              test: /[\\/]src[\\/]components[\\/]ui[\\/]/,
              priority: 15,
              minChunks: 1,
            },
            // Separate Remotion components
            remotion: {
              name: 'remotion',
              chunks: 'all',
              test: /[\\/]src[\\/]remotion[\\/]/,
              priority: 15,
              minChunks: 1,
            },
            // Separate video generation components
            videoGen: {
              name: 'video-generation',
              chunks: 'all',
              test: /[\\/]src[\\/]components[\\/]video-generation[\\/]/,
              priority: 10,
              minChunks: 1,
            },
            // Separate image generation components
            imageGen: {
              name: 'image-generation',
              chunks: 'all',
              test: /[\\/]src[\\/]components[\\/]image-generation[\\/]/,
              priority: 10,
              minChunks: 1,
            },
            // Separate store modules
            stores: {
              name: 'stores',
              chunks: 'all',
              test: /[\\/]src[\\/]stores[\\/]/,
              priority: 5,
              minChunks: 1,
            },
          },
        },
      };

      // Tree shaking and dead code elimination
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;

      // Minification optimizations
      config.optimization.minimize = true;

      // Exclude large dependencies from client bundle
      config.resolve.alias = {
        ...config.resolve.alias,
        // Move these to server side only
        'sharp$': false,
        'canvas$': false,
        'ffmpeg$': false,
        'fluent-ffmpeg$': false,
      };
    }

    // Externalize large libraries when possible
    if (!isServer) {
      config.externals = {
        ...config.externals,
        'fs': 'commonjs fs',
        'path': 'commonjs path',
        'crypto': 'commonjs crypto',
      };
    }

    return config;
  },
  transpilePackages: ['papaparse'],

  // Compression for production
  compress: true,

  // Enable React optimized components
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', 'react-dropzone'],
    scrollRestoration: true,
  },

  // Bundle analyzer for development
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config) => {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
        })
      );
      return config;
    },
  }),
}

module.exports = nextConfig