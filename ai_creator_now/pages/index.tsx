import { Head } from 'next/head';
import { App } from '../src/App';

export default function Home() {
  return (
    <>
      <Head>
        <title>AI视频创作工作站 - 专业AI视频制作工具</title>
      </Head>
      <App />
    </>
  );
}