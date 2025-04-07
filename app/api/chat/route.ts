interface ChatMessage {
  role: string;
  content: string;
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const apiKey = process.env.MOR_REST_API_KEY;
    if (!apiKey) {
      throw new Error('MOR_REST_API_KEY is not set in environment variables');
    }

    console.log('Sending request to MOR.rest API with messages:', messages);
    console.log('Using API key:', apiKey.substring(0, 8) + '...');

    const response = await fetch('https://mor.rest/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.3-70b-instruct:free',
        messages: messages.map((msg: ChatMessage) => ({
          role: msg.role,
          content: msg.content
        })),
        stream: true
      })
    });

    // Check for rate limiting before processing the stream
    if (response.status === 429) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { raw: errorText };
      }
      
      console.error('Rate limit detected before stream processing:', {
        status: response.status,
        statusText: response.statusText,
        body: errorData,
        headers: Object.fromEntries(response.headers.entries()),
        retryAfter: response.headers.get('retry-after'),
        timestamp: new Date().toISOString()
      });
      
      return new Response(JSON.stringify({ 
        error: 'Mor.Rest API rate limit exceeded. Please try again later.',
        retryAfter: response.headers.get('retry-after') || '60'
      }), {
        status: 429,
        headers: { 
          'Content-Type': 'application/json',
          'Retry-After': response.headers.get('retry-after') || '60'
        }
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      const isRateLimit = response.status === 429 || errorText.toLowerCase().includes('rate limit');
      
      console.error('MOR.rest API error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        headers: Object.fromEntries(response.headers.entries()),
        isRateLimit,
        retryAfter: response.headers.get('retry-after'),
        timestamp: new Date().toISOString()
      });

      if (isRateLimit) {
        return new Response(JSON.stringify({ 
          error: 'Mor.Rest API rate limit exceeded. Please try again later.',
          retryAfter: response.headers.get('retry-after') || '60'
        }), {
          status: 429,
          headers: { 
            'Content-Type': 'application/json',
            'Retry-After': response.headers.get('retry-after') || '60'
          }
        });
      }
      
      return new Response(JSON.stringify({ 
        error: `HTTP error! status: ${response.status}`,
        details: errorText
      }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Process the stream
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let buffer = '';
          let accumulatedText = '';
          let chunkCount = 0;
          let contentCount = 0;
          let rateLimitDetected = false;

          console.log('Starting to process stream...');

          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              console.log('Stream reading complete, done flag received');
              break;
            }

            chunkCount++;
            const chunk = new TextDecoder().decode(value);
            console.log(`Received chunk #${chunkCount}, length: ${chunk.length}`);
            buffer += chunk;

            // Check for rate limit error in the raw chunk
            if (chunk.includes('Rate limit exceeded') || chunk.includes('rate limit')) {
              console.error('Rate limit detected in stream data:', chunk);
              rateLimitDetected = true;
              
              // Extract retry-after if available
              let retryAfter = '60';
              const retryMatch = chunk.match(/X-RateLimit-Reset["\s:]+(\d+)/);
              if (retryMatch && retryMatch[1]) {
                const resetTime = parseInt(retryMatch[1], 10);
                const now = Date.now();
                retryAfter = Math.ceil((resetTime - now) / 1000).toString();
              }
              
              // Send rate limit error to client
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                error: 'Mor.Rest API rate limit exceeded. Please try again later.',
                retryAfter
              })}\n\n`));
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
              return;
            }

            // Process complete lines
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep the last incomplete line in the buffer

            for (const line of lines) {
              if (!line.trim() || !line.startsWith('data: ')) {
                console.log(`Skipping non-data line: "${line.substring(0, 30)}${line.length > 30 ? '...' : ''}"`);
                continue;
              }
              
              const data = line.replace('data: ', '').trim();
              if (data === '[DONE]') {
                console.log('Received [DONE] signal');
                continue;
              }

              try {
                const parsed = JSON.parse(data);
                console.log('Parsed JSON data:', JSON.stringify(parsed).substring(0, 100) + '...');
                
                // Check for rate limit error in parsed data
                if (parsed.error && (parsed.error.message?.includes('rate limit') || parsed.error.code === 429)) {
                  console.error('Rate limit detected in parsed data:', parsed);
                  rateLimitDetected = true;
                  
                  // Extract retry-after if available
                  let retryAfter = '60';
                  if (parsed.error.metadata?.headers?.['X-RateLimit-Reset']) {
                    const resetTime = parseInt(parsed.error.metadata.headers['X-RateLimit-Reset'], 10);
                    const now = Date.now();
                    retryAfter = Math.ceil((resetTime - now) / 1000).toString();
                  }
                  
                  // Send rate limit error to client
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                    error: 'Mor.Rest API rate limit exceeded. Please try again later.',
                    retryAfter
                  })}\n\n`));
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                  controller.close();
                  return;
                }
                
                if (parsed.choices?.[0]?.delta?.content) {
                  contentCount++;
                  const content = parsed.choices[0].delta.content;
                  accumulatedText += content;
                  console.log(`Content #${contentCount}: "${content}"`);
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                } else {
                  console.log('No content in parsed data:', JSON.stringify(parsed));
                }
              } catch (e) {
                console.error('Error parsing chunk:', e);
                console.error('Failed to parse line:', line);
              }
            }
          }

          // Process any remaining data in the buffer
          if (buffer.trim()) {
            console.log(`Processing remaining buffer: "${buffer.substring(0, 50)}${buffer.length > 50 ? '...' : ''}"`);
            const lines = buffer.split('\n');
            for (const line of lines) {
              if (!line.trim() || !line.startsWith('data: ')) continue;
              
              const data = line.replace('data: ', '').trim();
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                
                // Check for rate limit error in parsed data
                if (parsed.error && (parsed.error.message?.includes('rate limit') || parsed.error.code === 429)) {
                  console.error('Rate limit detected in final parsed data:', parsed);
                  rateLimitDetected = true;
                  
                  // Extract retry-after if available
                  let retryAfter = '60';
                  if (parsed.error.metadata?.headers?.['X-RateLimit-Reset']) {
                    const resetTime = parseInt(parsed.error.metadata.headers['X-RateLimit-Reset'], 10);
                    const now = Date.now();
                    retryAfter = Math.ceil((resetTime - now) / 1000).toString();
                  }
                  
                  // Send rate limit error to client
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                    error: 'Mor.Rest API rate limit exceeded. Please try again later.',
                    retryAfter
                  })}\n\n`));
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                  controller.close();
                  return;
                }
                
                if (parsed.choices?.[0]?.delta?.content) {
                  contentCount++;
                  const content = parsed.choices[0].delta.content;
                  accumulatedText += content;
                  console.log(`Final content #${contentCount}: "${content}"`);
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                }
              } catch (e) {
                console.error('Error parsing final chunk:', e);
              }
            }
          }

          console.log(`Stream complete. Total chunks: ${chunkCount}, Total content pieces: ${contentCount}`);
          console.log(`Accumulated text length: ${accumulatedText.length}`);
          
          // If we didn't detect any content but also didn't detect a rate limit, send an error
          if (contentCount === 0 && !rateLimitDetected) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              error: 'No content received from the API. Please try again.'
            })}\n\n`));
          }
          
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Error in chat route:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
