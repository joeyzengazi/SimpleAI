"use client";

import { BotIcon, UserIcon, SimpleAIIcon } from "@/components/icons";
import { useState, useRef, useEffect } from "react";
import { Markdown } from "@/components/markdown";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Countdown timer for rate limiting
  useEffect(() => {
    if (retryAfter === null) return;
    
    const timer = setInterval(() => {
      setRetryAfter(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          setRateLimited(false);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [retryAfter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || rateLimited) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMessage }]
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        console.error('API error response:', errorData);
        
        if (response.status === 429) {
          const retryAfterSeconds = parseInt(errorData.retryAfter || response.headers.get('retry-after') || '60', 10);
          setRateLimited(true);
          setRetryAfter(retryAfterSeconds);
          
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: `Mor.Rest API rate limit exceeded. Please try again in ${retryAfterSeconds} seconds.` 
          }]);
          return;
        }
        
        throw new Error(`Failed to fetch response: ${response.status} ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      console.log('Starting to read response stream');
      let assistantMessage = '';
      let chunkCount = 0;
      let contentCount = 0;
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('Stream reading complete on client side');
          break;
        }

        chunkCount++;
        const chunk = new TextDecoder().decode(value);
        console.log(`Client received chunk #${chunkCount}, length: ${chunk.length}`);
        const lines = chunk.split('\n').filter(line => line.startsWith('data: '));
        console.log(`Found ${lines.length} data lines in chunk`);

        for (const line of lines) {
          const data = line.replace('data: ', '');
          if (data === '[DONE]') {
            console.log('Client received [DONE] signal');
            continue;
          }

          try {
            const parsed = JSON.parse(data);
            console.log('Client parsed data:', JSON.stringify(parsed).substring(0, 100) + '...');
            
            // Check for error messages in the stream
            if (parsed.error) {
              console.error('Error received in stream:', parsed.error);
              const retryAfterSeconds = parseInt(parsed.retryAfter || '60', 10);
              
              // If it's a rate limit error, update the UI state
              if (parsed.error.includes('Rate limit') || parsed.error.includes('rate limit')) {
                setRateLimited(true);
                setRetryAfter(retryAfterSeconds);
              }
              
              // Update the last message with the error
              setMessages(prev => {
                const newMessages = [...prev];
                if (newMessages.length > 0) {
                  newMessages[newMessages.length - 1].content = 
                    `Error: ${parsed.error}${retryAfterSeconds ? ` Please try again in ${retryAfterSeconds} seconds.` : ''}`;
                }
                return newMessages;
              });
              
              // Exit the loop since we've received an error
              return;
            }
            
            if (parsed.content) {
              contentCount++;
              assistantMessage += parsed.content;
              console.log(`Client content #${contentCount}: "${parsed.content}"`);
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1].content = assistantMessage;
                return newMessages;
              });
            } else {
              console.log('No content in parsed data on client:', JSON.stringify(parsed));
            }
          } catch (e) {
            console.error('Error parsing chunk on client:', e);
            console.error('Failed to parse line:', line);
          }
        }
      }
      
      console.log(`Client stream complete. Total chunks: ${chunkCount}, Total content pieces: ${contentCount}`);
      console.log(`Final assistant message length: ${assistantMessage.length}`);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, there was an error processing your request.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-zinc-900">
      <header className="border-b dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-teal-500 text-white">
                <SimpleAIIcon />
              </div>
              <span className="text-xl font-semibold bg-gradient-to-r from-sky-500 to-teal-500 bg-clip-text text-transparent">
                SimpleAI
              </span>
            </div>
            <div className="text-sm text-zinc-500 dark:text-zinc-400">
              Powered by Mor.Rest
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-8">
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center text-zinc-500 dark:text-zinc-400"
            >
              <h2 className="text-2xl font-semibold mb-2">Welcome to SimpleAI</h2>
              <p>Start a conversation with our AI assistant</p>
            </motion.div>
          )}
          <AnimatePresence mode="popLayout">
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={`flex gap-4 mb-8 ${
                  message.role === 'assistant' ? 'items-start' : 'items-start'
                }`}
              >
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.2, delay: 0.1 }}
                  className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                >
                  {message.role === 'assistant' ? <BotIcon /> : <UserIcon />}
                </motion.div>
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: 0.2 }}
                  className="flex-1 min-w-0"
                >
                  <div className="prose dark:prose-invert max-w-none">
                    <Markdown>{message.content}</Markdown>
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-3xl mx-auto px-4 py-4">
          {rateLimited && (
            <div className="mb-2 text-center text-amber-500 dark:text-amber-400 text-sm">
              Mor.Rest API rate limit reached. Please wait {retryAfter} seconds before trying again.
            </div>
          )}
          <form onSubmit={handleSubmit} className="relative">
            <div className="flex items-center bg-zinc-50 dark:bg-zinc-800 rounded-full border border-zinc-200 dark:border-zinc-700 focus-within:border-sky-500 dark:focus-within:border-sky-400 transition-colors">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 bg-transparent outline-none text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500"
                disabled={isLoading || rateLimited}
              />
              <button
                type="submit"
                disabled={isLoading || rateLimited}
                className="px-4 py-2 m-1 bg-gradient-to-r from-sky-500 to-teal-500 text-white rounded-full hover:from-sky-600 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}