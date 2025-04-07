export async function GET() {
  try {
    const apiKey = process.env.MOR_REST_API_KEY;
    if (!apiKey) {
      throw new Error('MOR_REST_API_KEY is not set in environment variables');
    }

    console.log('Testing MOR.rest API connection...');
    
    const response = await fetch('https://mor.rest/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.3-70b-instruct:free',
        messages: [
          { role: 'user', content: 'Say hello' }
        ],
        stream: false
      })
    });

    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse API response as JSON:', e);
      responseData = { raw: responseText };
    }

    if (!response.ok) {
      console.error('MOR.rest API test error:', {
        status: response.status,
        statusText: response.statusText,
        body: responseData,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      const isRateLimit = response.status === 429 || 
                         (responseData.error && 
                          (responseData.error.message?.includes('rate limit') || 
                           responseData.error.code === 429));
      
      return new Response(JSON.stringify({ 
        error: `API test failed: ${response.status} ${response.statusText}`,
        isRateLimit,
        retryAfter: response.headers.get('retry-after'),
        details: responseData
      }), {
        status: isRateLimit ? 429 : 500,
        headers: { 
          'Content-Type': 'application/json',
          'Retry-After': response.headers.get('retry-after') || '60'
        }
      });
    }

    console.log('API test successful, received response:', JSON.stringify(responseData).substring(0, 200) + '...');
    
    return new Response(JSON.stringify({ 
      success: true,
      message: 'API test successful',
      response: responseData
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Error in test route:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 