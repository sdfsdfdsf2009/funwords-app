import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="zh-CN">
      <Head>
        <meta charSet="utf-8" />
          <meta name="theme-color" content="#2563eb" />
        <meta name="description" content="AI视频创作工作站 - 专业的AI视频制作工具，支持多种视频风格和自定义选项" />
        <meta name="keywords" content="AI视频创作,视频制作,AI工具,内容创作,视频编辑,智能生成" />
        <meta name="author" content="AI Creator Studio" />
        <meta name="robots" content="index, follow" />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="AI视频创作工作站 - 专业AI视频制作工具" />
        <meta property="og:description" content="使用AI技术快速创建专业视频内容，支持多种视频风格和自定义选项" />
        <meta property="og:image" content="/images/og-image.png" />
        <meta property="og:url" content="https://ai-creator-studio.com" />
        <meta property="og:site_name" content="AI视频创作工作站" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content="AI视频创作工作站 - 专业AI视频制作工具" />
        <meta property="twitter:description" content="使用AI技术快速创建专业视频内容，支持多种视频风格和自定义选项" />
        <meta property="twitter:image" content="/images/twitter-image.png" />

        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />

        {/* Manifest */}
        <link rel="manifest" href="/site.webmanifest" />

        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}