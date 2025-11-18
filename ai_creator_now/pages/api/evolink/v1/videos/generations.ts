import { NextApiRequest, NextApiResponse } from 'next';
import { withSecurityAndCorsPages } from '@/utils/cors-middleware-pages';
import { SecureLogger } from '@/utils/secureLogger';

async function evolinkVideoGenerationsHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract configuration from request body
    const { _config, ...apiRequest } = req.body;

    let apiKey;
    let targetEndpoint = 'https://api.evolink.ai/v1/videos/generations';

    if (_config && _config.headers) {
      // Use the configuration passed from frontend
      const authHeader = _config.headers.find((h: any) => h.key === 'Authorization');
      if (authHeader && authHeader.value) {
        apiKey = authHeader.value.replace(/^Bearer\s+/, ''); // Remove Bearer prefix if present
      }

      // Always use the official Evolink endpoint for video generation
      // The user's configuration might be using local proxy, but video generation needs direct API access
      if (_config.endpoint) {
        // 使用安全日志记录端点配置信息
        SecureLogger.info('Processing video generation endpoint config', {
          hasEndpoint: !!_config.endpoint,
          isRelative: _config.endpoint?.startsWith('/'),
          startsWithApi: _config.endpoint?.startsWith('/api/evolink/'),
          timestamp: new Date().toISOString()
        });

        // Convert relative proxy endpoint to direct API endpoint
        if (_config.endpoint.startsWith('/api/evolink/')) {
          targetEndpoint = _config.endpoint.replace('/api/evolink/', 'https://api.evolink.ai/');
        } else if (_config.endpoint.startsWith('/')) {
          targetEndpoint = `https://api.evolink.ai${_config.endpoint}`;
        } else {
          targetEndpoint = _config.endpoint;
        }

        console.log('🔧 Converted endpoint:', { targetEndpoint });
      } else {
        targetEndpoint = 'https://api.evolink.ai/v1/videos/generations';
        console.log('🔧 Using default endpoint:', { targetEndpoint });
      }

      // Final validation - ensure we have an absolute URL
      if (!targetEndpoint.startsWith('http')) {
        console.error('❌ Invalid endpoint detected, forcing default:', { targetEndpoint });
        targetEndpoint = 'https://api.evolink.ai/v1/videos/generations';
      }
    } else {
      // Fallback to Authorization header (for direct API calls)
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        apiKey = authHeader.substring(7);
      }
    }

    if (!apiKey) {
      return res.status(401).json({ error: 'Missing or invalid API key' });
    }

    // 使用安全日志记录请求信息，防止API密钥泄露
    SecureLogger.info('Evolink Video Generation API Request', {
      model: apiRequest.model,
      hasImageUrl: !!apiRequest.image_urls,
      promptLength: apiRequest.prompt?.length || 0,
      promptPreview: apiRequest.prompt?.substring(0, 20) + '...',
      aspectRatio: apiRequest.aspect_ratio,
      targetEndpoint,
      hasApiKey: !!apiKey,
      originalConfigEndpoint: _config?.endpoint,
      requestSize: JSON.stringify(apiRequest).length,
      timestamp: new Date().toISOString(),
      // 不记录完整请求体和API密钥前缀，防止泄露
    });

    // Make request to Evolink Video Generation API
    const response = await fetch(targetEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(apiRequest),
    });

    // Get response as text first for debugging
    const responseText = await response.text();

    // 使用安全日志记录响应信息
    SecureLogger.info('Evolink Video API Response Received', {
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
      SecureLogger.info('Evolink Video API Response Parsed', {
        status: response.status,
        success: response.ok,
        hasTaskId: !!data.id,
        hasError: !!data.error,
        responseKeys: Object.keys(data),
        taskId: data.id ? '***' : undefined, // 遮蔽敏感ID
        timestamp: new Date().toISOString()
      });
    } catch (parseError) {
      // 使用安全日志记录解析错误
      SecureLogger.error('Failed to parse Evolink Video API response as JSON', {
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
    SecureLogger.error('Evolink Video API Proxy Error', {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : String(error),
      requestMethod: req.method,
      requestPath: '/api/evolink/v1/videos/generations',
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred while processing your request'
    });
  }
}

export default withSecurityAndCorsPages(evolinkVideoGenerationsHandler)