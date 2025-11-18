import { NextApiRequest, NextApiResponse } from 'next';
import { withSecurityAndCorsPages } from '@/utils/cors-middleware-pages';
import { SecureLogger } from '@/utils/secureLogger';

async function evolinkImageGenerationsHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract the API key from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const apiKey = authHeader.substring(7); // Remove 'Bearer ' prefix

    // 使用安全日志记录请求详情，防止API密钥泄露
    SecureLogger.info('Evolink API Image Generation Request', {
      isVideoRequest: req.body.video,
      hasImageUrl: !!req.body.imageUrl,
      promptLength: req.body.prompt?.length || 0,
      promptPreview: req.body.prompt?.substring(0, 20) + '...',
      hasSettings: !!req.body.settings,
      requestSize: JSON.stringify(req.body).length,
      timestamp: new Date().toISOString(),
      // 不记录完整请求体，可能包含敏感信息
    });

    // Make request to Evolink API
    const response = await fetch('https://api.evolink.ai/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(req.body),
    });

    // Get response as text first for debugging
    const responseText = await response.text();

    // 使用安全日志记录响应信息，避免敏感数据泄露
    SecureLogger.info('Evolink API Response Received', {
      status: response.status,
      statusText: response.statusText,
      responseLength: responseText.length,
      isEmpty: responseText.length === 0,
      contentType: response.headers.get('content-type'),
      responsePreview: responseText.substring(0, 100) + '...',
      timestamp: new Date().toISOString()
    });

    let data;
    try {
      data = JSON.parse(responseText);

      // 使用安全日志记录解析后的响应
      SecureLogger.info('Evolink API Response Parsed', {
        status: response.status,
        success: response.ok,
        hasUrl: !!data.url,
        hasVideoUrl: !!data.videoUrl,
        hasError: !!data.error,
        responseKeys: Object.keys(data),
        taskId: data.taskId ? '***' : undefined, // 遮蔽敏感ID
        timestamp: new Date().toISOString()
      });
    } catch (parseError) {
      // 使用安全日志记录解析错误
      SecureLogger.error('Failed to parse Evolink API response as JSON', {
        parseError: parseError instanceof Error ? {
          name: parseError.name,
          message: parseError.message,
          stack: parseError.stack
        } : String(parseError),
        responsePreview: responseText.substring(0, 100) + '...',
        responseLength: responseText.length,
        status: response.status,
        timestamp: new Date().toISOString()
      });
      // Return error response
      return res.status(500).json({
        error: 'Invalid JSON response from API',
        details: parseError instanceof Error ? parseError.message : String(parseError),
        rawResponse: responseText.substring(0, 200)
      });
    }

    // Return the response with same status
    res.status(response.status).json(data);
  } catch (error) {
    // 使用安全日志记录代理错误
    SecureLogger.error('Evolink API Proxy Error', {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : String(error),
      requestMethod: req.method,
      requestPath: '/api/evolink/v1/images/generations',
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred while processing your request'
    });
  }
}

export default withSecurityAndCorsPages(evolinkImageGenerationsHandler)