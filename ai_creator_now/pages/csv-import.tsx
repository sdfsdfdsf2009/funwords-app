import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { CSVImport } from '../src/components/csv-import/CSVImport';
import { ErrorBoundary } from '../src/components/ui/ErrorBoundary';
import { ToastProvider } from '../src/components/ui/Toast';
import { LoadingProvider } from '../src/components/ui/LoadingIndicator';

const CSVImportPage: React.FC = () => {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleImportComplete = (result: any) => {
    console.log('CSV导入完成:', result);
    // 可以在这里添加成功后的逻辑，比如跳转到其他页面
  };

  const handleImportError = (error: Error) => {
    console.error('CSV导入错误:', error);
    // 错误处理逻辑
  };

  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">加载中...</div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>CSV 导入 - AI Creator Now</title>
        <meta name="description" content="导入CSV数据，快速创建场景内容" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <ErrorBoundary>
        <LoadingProvider>
          <ToastProvider>
            <div className="min-h-screen bg-gray-50">
              {/* Header */}
              <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                      <button
                        onClick={() => router.push('/')}
                        className="text-gray-600 hover:text-gray-900 mr-4"
                      >
                        ← 返回主页
                      </button>
                      <h1 className="text-xl font-semibold text-gray-900">
                        CSV 数据导入
                      </h1>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-500">
                        支持批量导入场景数据
                      </span>
                    </div>
                  </div>
                </div>
              </header>

              {/* Main Content */}
              <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    导入CSV文件
                  </h2>
                  <p className="text-gray-600">
                    拖拽或选择CSV文件，系统将自动识别字段并导入到当前项目中。
                    支持的场景字段包括：场景名称、描述、时长、风格等。
                  </p>
                </div>

                {/* CSV Import Component */}
                <div className="bg-white rounded-lg shadow p-6">
                  <CSVImport
                    onComplete={handleImportComplete}
                    onError={handleImportError}
                  />
                </div>

                {/* Instructions */}
                <div className="mt-8 bg-blue-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-blue-900 mb-3">
                    📋 使用说明
                  </h3>
                  <div className="space-y-2 text-blue-800">
                    <p>• <strong>支持的格式</strong>：.csv 文件，UTF-8 编码</p>
                    <p>• <strong>推荐字段</strong>：场景名称、描述、时长(秒)、风格、背景音乐</p>
                    <p>• <strong>文件大小</strong>：建议不超过 10MB</p>
                    <p>• <strong>数据行数</strong>：建议不超过 1000 行</p>
                  </div>
                </div>

                {/* CSV Template */}
                <div className="mt-8 bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    📄 CSV模板示例
                  </h3>
                  <div className="bg-white rounded border p-4 font-mono text-sm">
                    <pre>{`场景名称,描述,时长,风格,背景音乐
开场场景,视频开场介绍,5,现代,轻松愉快
产品展示,展示产品特性,10,专业,商务音乐
结尾场景,总结和呼吁行动,3,温暖,激励音乐`}</pre>
                  </div>
                  <button
                    onClick={() => {
                      const csvContent = `场景名称,描述,时长,风格,背景音乐
开场场景,视频开场介绍,5,现代,轻松愉快
产品展示,展示产品特性,10,专业,商务音乐
结尾场景,总结和呼吁行动,3,温暖,激励音乐`;

                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                      const link = document.createElement('a');
                      const url = URL.createObjectURL(blob);
                      link.setAttribute('href', url);
                      link.setAttribute('download', 'csv_template.csv');
                      link.style.visibility = 'hidden';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    下载模板文件
                  </button>
                </div>
              </main>
            </div>
          </ToastProvider>
        </LoadingProvider>
      </ErrorBoundary>
    </>
  );
};

export default CSVImportPage;