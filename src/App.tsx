import React, { useState } from 'react';
import { GoogleGenerativeAI } from '@google/genai';
import { marked } from 'marked';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      if (!apiKey) {
        throw new Error('VITE_GEMINI_API_KEY is not set');
      }

      const client = new GoogleGenerativeAI({ apiKey });
      const model = client.getGenerativeModel({ model: 'gemini-3.5-flash' });

      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        parts: [{ text: msg.content }],
      }));

      conversationHistory.push({
        role: 'user',
        parts: [{ text: input }],
      });

      const result = await model.generateContent({
        contents: conversationHistory,
      });

      const responseText =
        result.response.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: '#0f172a',
        color: '#e2e8f0',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid #334155',
          backgroundColor: '#1e293b',
        }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>
            Gemini 3 Flash Messenger
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#94a3b8' }}>
            Chat application powered by Google Gemini API
          </p>
        </div>

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}>
          {messages.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#64748b',
              textAlign: 'center',
            }}>
              <p style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>Welcome to Gemini Chat</p>
              <p>Start a conversation by typing a message below</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                style={{
                  display: 'flex',
                  justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: '70%',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.5rem',
                    backgroundColor: message.role === 'user' ? '#3b82f6' : '#334155',
                    wordWrap: 'break-word',
                  }}
                  dangerouslySetInnerHTML={{
                    __html: marked(message.content, {
                      breaks: true,
                      gfm: true,
                    }),
                  }}
                />
              </div>
            ))
          )}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                backgroundColor: '#334155',
              }}>
                <span style={{ animation: 'pulse 1.5s infinite' }}>Typing...</span>
              </div>
            </div>
          )}
        </div>

        <div style={{
          padding: '1.5rem',
          borderTop: '1px solid #334155',
          backgroundColor: '#1e293b',
        }}>
          <div style={{
            display: 'flex',
            gap: '0.75rem',
          }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !loading) {
                  sendMessage();
                }
              }}
              placeholder="Type your message..."
              disabled={loading}
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                borderRadius: '0.375rem',
                border: '1px solid #475569',
                backgroundColor: '#0f172a',
                color: '#e2e8f0',
                fontSize: '1rem',
                outline: 'none',
              }}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '0.375rem',
                border: 'none',
                backgroundColor: '#3b82f6',
                color: 'white',
                fontWeight: 600,
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                opacity: loading || !input.trim() ? 0.5 : 1,
                fontSize: '1rem',
              }}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
