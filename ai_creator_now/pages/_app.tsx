import '../src/styles/globals.css';
import type { AppProps } from 'next/app';

// 简单的错误调试技能导入
import { errorDebuggingSkill } from '../src/skills/ErrorDebuggingSkill';

export default function MyApp({ Component, pageProps }: AppProps) {
  // 在浏览器环境中启动技能
  if (typeof window !== 'undefined') {
    // 监听全局错误
    window.addEventListener('error', (event) => {
      console.log('🔧 检测到全局错误，启动错误调试技能...');
      errorDebuggingSkill.detectAndStart({
        type: 'javascript',
        message: event.message,
        source: event.filename,
        stack: event.error?.stack
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      console.log('🔧 检测到未处理的Promise拒绝，启动错误调试技能...');
      errorDebuggingSkill.detectAndStart({
        type: 'promise',
        message: `Unhandled Promise Rejection: ${event.reason}`,
        source: 'promise',
        stack: event.reason?.stack
      });
    });
  }

  return <Component {...pageProps} />;
}