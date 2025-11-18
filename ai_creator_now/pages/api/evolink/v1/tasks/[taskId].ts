import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🔍 API Endpoint called:', {
    method: req.method,
    url: req.url,
    taskId: req.query.taskId,
    hasConfigHeader: !!req.headers['x-api-config']
  });

  if (req.method !== 'GET' && req.method !== 'OPTIONS') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 处理CORS预检请求
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-config');
    return res.status(200).end();
  }

  try {
    const { taskId } = req.query;
    const configHeader = req.headers['x-api-config'] as string;

    console.log('🔍 详细请求信息:', {
      method: req.method,
      url: req.url,
      taskId,
      hasConfigHeader: !!configHeader,
      configHeaderLength: configHeader ? configHeader.length : 0,
      configHeaderPreview: configHeader ? configHeader.substring(0, 100) : 'none'
    });

    if (!taskId || typeof taskId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid task_id' });
    }

    // Extract configuration from header
    let apiKey;
    if (configHeader) {
      try {
        console.log('📦 开始解析配置头部...');

        // Decode the URL-encoded config first
        const decodedConfig = decodeURIComponent(configHeader);
        console.log('📦 解码后配置长度:', decodedConfig.length);

        const configData = JSON.parse(decodedConfig);
        console.log('📦 解析后的配置数据:', {
          hasHeaders: !!configData.headers,
          headersCount: configData.headers ? configData.headers.length : 0,
          headers: configData.headers ? configData.headers.map((h: any) => ({
            key: h.key,
            hasValue: !!h.value,
            enabled: h.enabled,
            valuePrefix: h.value ? h.value.substring(0, 20) + '...' : 'none'
          })) : []
        });

        // Find Authorization header
        console.log('🔍 查找Authorization头部:', {
          headers: configData.headers,
          headerKeys: configData.headers?.map((h: any) => h.key),
          lookingFor: 'Authorization'
        });

        // 详细检查每个头部
        configData.headers?.forEach((h: any, index: number) => {
          console.log(`📋 头部 ${index}:`, {
            key: h.key,
            hasValue: !!h.value,
            valueLength: h.value?.length || 0,
            valuePreview: h.value?.substring(0, 30) + '...',
            isAuthorization: h.key === 'Authorization'
          });
        });

        // 多种方式查找Authorization头部
        const authHeader1 = configData.headers?.find((h: any) => h.key === 'Authorization');
        const authHeader2 = configData.headers?.find((h: any) => h.key.toLowerCase() === 'authorization');
        const authHeader3 = configData.headers?.find((h: any) => h.key?.trim() === 'Authorization');

        console.log('🔍 多种方式查找Authorization头部:', {
          authHeader1,
          authHeader2,
          authHeader3,
          headersArray: configData.headers,
          headerKeys: configData.headers?.map((h: any) => ({
            key: h.key,
            keyType: typeof h.key,
            keyLength: h.key?.length,
            keyValue: `"${h.key}"`,
            isExactMatch: h.key === 'Authorization',
            isCaseInsensitiveMatch: h.key?.toLowerCase() === 'authorization'
          }))
        });

        // 使用第一个找到的头部
        const authHeader = authHeader1 || authHeader2 || authHeader3;

        console.log('🔍 最终选择的Authorization头部:', {
          authHeader: authHeader,
          hasAuthHeader: !!authHeader,
          hasValue: authHeader ? !!authHeader.value : false,
          keyValue: authHeader?.key,
          valueLength: authHeader?.value?.length || 0
        });

        if (authHeader && authHeader.value) {
          apiKey = authHeader.value.replace(/^Bearer\s+/, '');
          console.log('✅ 成功提取API密钥:', {
            hasAuthHeader: !!authHeader,
            authValuePrefix: authHeader.value.substring(0, 20) + '...',
            apiKeyPrefix: apiKey.substring(0, 10) + '...'
          });
        } else {
          console.log('❌ 未找到有效的Authorization头部:', {
            headers: configData.headers,
            foundAuth: !!authHeader,
            hasValue: authHeader ? !!authHeader.value : false
          });
        }
      } catch (parseError) {
        console.error('❌ 配置解析失败:', parseError);
        console.log('📦 原始配置头部前100字符:', configHeader.substring(0, 100));
      }
    } else {
      console.log('❌ 未提供配置头部');
    }

    if (!apiKey) {
      console.log('❌ 最终未获得API密钥，返回401错误');
      return res.status(401).json({
        error: 'Missing API key',
        debug: {
          hasConfigHeader: !!configHeader,
          configHeaderLength: configHeader ? configHeader.length : 0,
          parseAttempted: !!configHeader
        }
      });
    }

    console.log('🔍 Checking video task status:', {
      taskId,
      hasApiKey: !!apiKey,
      apiKeyPrefix: apiKey.substring(0, 10) + '...'
    });

    // Make request to Evolink Task Status API
    const targetEndpoint = `https://api.evolink.ai/v1/tasks/${taskId}`;
    console.log('📡 Making request to:', targetEndpoint);

    const response = await fetch(targetEndpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'User-Agent': 'AI-Creator-Workstation/1.0'
      },
    });

    // Get response as text first for debugging
    const responseText = await response.text();

    console.log('Task Status API Response:', {
      status: response.status,
      statusText: response.statusText,
      responseText: responseText.substring(0, 1000),
      responseLength: responseText.length
    });

    // Handle specific error cases
    if (response.status === 403) {
      console.error('❌ 403 Permission Error - Task access denied');
      return res.status(403).json({
        error: 'Permission denied - Cannot access this task',
        code: 403,
        type: 'permission_error',
        details: 'The API key used for this request does not have permission to access the specified task. This may happen if the task was created with a different API key or account.',
        suggestions: [
          'Ensure the same API key is used for both task creation and status checking',
          'Check if the task ID is correct',
          'Verify the task belongs to the same account'
        ]
      });
    }

    if (response.status === 404) {
      console.error('❌ 404 Not Found - Task does not exist or has expired');
      return res.status(404).json({
        error: 'Task not found or expired',
        code: 404,
        type: 'not_found_error',
        details: 'The specified task ID does not exist or has expired.'
      });
    }

    let data;
    try {
      data = JSON.parse(responseText);
      console.log('Parsed Task Status Response:', {
        status: response.status,
        success: response.ok,
        taskId: data.id,
        taskStatus: data.status,
        progress: data.progress,
        hasVideoUrl: !!(data.results && data.results.length > 0)
      });
    } catch (parseError) {
      console.error('Failed to parse task status response as JSON:', {
        parseError: parseError instanceof Error ? parseError.message : String(parseError),
        responseText: responseText.substring(0, 200)
      });
      return res.status(500).json({
        error: 'Invalid JSON response from API',
        details: parseError instanceof Error ? parseError.message : String(parseError),
        rawResponse: responseText.substring(0, 200)
      });
    }

    // Return the response with same status
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Task status API error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
