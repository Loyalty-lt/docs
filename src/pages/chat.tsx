import React, { useState, useRef, useEffect, type FormEvent } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import styles from './chat.module.css';

/**
 * Docs "Ask AI" page. Talks only to this site's own /api/chat — nginx routes
 * that to the chat-proxy process (server/chat-proxy.mjs), which is the only
 * thing that holds the ai.loyalty.lt credential. No SDK, no key, nothing
 * secret ships in this bundle.
 */

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
  isError?: boolean;
}

export default function ChatPage(): React.ReactElement {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const message = input.trim();
    if (!message || isLoading) return;

    const history = messages
      .filter((m) => !m.isError)
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, { role: 'user', content: message }]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.error || 'Something went wrong.', isError: true }]);
        return;
      }
      setMessages((prev) => [...prev, { role: 'assistant', content: data.answer, sources: data.sources }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Could not reach the AI service. Please try again shortly.', isError: true },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Layout title="Ask AI" description="Ask a question about the Loyalty.lt API">
      <div className={styles.container}>
        <h1>Ask AI</h1>
        <p>Ask a question about the Shop API, SMS webhooks, or the SDKs. Answers are grounded in these docs.</p>

        <div className={styles.messages}>
          {messages.length === 0 && (
            <div className={styles.empty}>Try: &ldquo;How do I authenticate with the shop API?&rdquo;</div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={[styles.message, styles[m.role], m.isError ? styles.error : ''].filter(Boolean).join(' ')}
            >
              {m.content}
              {m.sources && m.sources.length > 0 && (
                <div className={styles.sources}>
                  {m.sources.map((s) => (
                    <Link key={s} to={s}>
                      {s}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div ref={scrollRef} />
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <input
            className={styles.input}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            maxLength={2000}
            disabled={isLoading}
          />
          <button className={styles.submit} type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? 'Thinking…' : 'Ask'}
          </button>
        </form>
        <p className={styles.disclaimer}>
          AI-generated answers may be wrong. For anything critical, check the{' '}
          <Link to="/api-reference/overview">API Reference</Link>.
        </p>
      </div>
    </Layout>
  );
}
