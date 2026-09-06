'use client';
import { useEffect, useRef, useState } from 'react';
import { Sparkles, X, Send, ChevronRight, Brain } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Msg = { role: 'user' | 'assistant'; content: string; think?: string };

export function AskAI() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  function patchLast(fn: (m: Msg) => Msg) {
    setMessages((prev) => {
      const copy = [...prev];
      const last = copy[copy.length - 1];
      if (last?.role === 'assistant') copy[copy.length - 1] = fn(last);
      return copy;
    });
  }

  async function send() {
    const q = input.trim();
    if (!q || busy) return;
    setInput('');
    const history = messages.slice(-8).map(({ role, content }) => ({ role, content }));
    setMessages((m) => [...m, { role: 'user', content: q }, { role: 'assistant', content: '', think: '' }]);
    setBusy(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q, history }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        patchLast((m) => ({ ...m, content: err.error || 'Sorry, the assistant is unavailable right now.' }));
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const { t, v } = JSON.parse(line) as { t: 'think' | 'answer'; v: string };
            if (t === 'think') patchLast((m) => ({ ...m, think: (m.think ?? '') + v }));
            else patchLast((m) => ({ ...m, content: m.content + v }));
          } catch {
            /* ignore partial/garbled frame */
          }
        }
      }
    } catch {
      patchLast((m) => ({ ...m, content: m.content || 'Sorry, something went wrong.' }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-1.5 rounded-2xl border bg-fd-secondary px-4 py-2.5 text-sm font-medium text-fd-secondary-foreground shadow-lg transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
        >
          <Sparkles className="size-4 text-fd-primary" /> Ask AI
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[10vh]" onClick={() => setOpen(false)}>
          <div
            className="flex max-h-[75vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border bg-fd-popover text-fd-popover-foreground shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <span className="inline-flex items-center gap-2 font-semibold">
                <Sparkles className="size-4 text-fd-primary" /> Ask AI
              </span>
              <button onClick={() => setOpen(false)} className="text-fd-muted-foreground hover:text-fd-foreground">
                <X className="size-4" />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
              {messages.length === 0 && (
                <p className="py-8 text-center text-sm text-fd-muted-foreground">
                  Ask anything about the Loyalty.lt API, SDKs or integration.
                </p>
              )}
              {messages.map((m, i) => {
                const isLast = i === messages.length - 1;
                return (
                  <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
                    {m.role === 'assistant' && m.think ? (
                      <Thinking text={m.think} live={busy && isLast && !m.content} />
                    ) : null}
                    {m.role === 'user' ? (
                      <div className="inline-block max-w-[85%] whitespace-pre-wrap rounded-xl bg-fd-primary px-3 py-2 text-sm text-fd-primary-foreground">
                        {m.content}
                      </div>
                    ) : m.content || (busy && isLast) ? (
                      <div className="inline-block max-w-[85%] rounded-xl bg-fd-muted px-3 py-2 text-sm text-fd-foreground">
                        {m.content ? <Markdown text={m.content} /> : '…'}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-2 border-t p-3">
              <input
                autoFocus
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
                placeholder="Ask a question…"
                className="flex-1 rounded-lg border bg-fd-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-fd-ring"
              />
              <button
                onClick={send}
                disabled={busy || !input.trim()}
                className="inline-flex items-center justify-center rounded-lg bg-fd-primary p-2 text-fd-primary-foreground disabled:opacity-50"
              >
                <Send className="size-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Markdown({ text }: { text: string }) {
  return (
    <div className="space-y-2 [&_code]:rounded [&_code]:bg-fd-background/70 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_li]:ml-4 [&_li]:list-disc [&_ol_li]:list-decimal [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-fd-background [&_pre]:p-2 [&_pre]:text-xs [&_ul]:space-y-1">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-fd-primary underline underline-offset-2"
            >
              {children}
            </a>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

function Thinking({ text, live }: { text: string; live: boolean }) {
  const [open, setOpen] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  // auto-collapse once the answer starts; keep expanded while actively thinking
  useEffect(() => {
    setOpen(live);
  }, [live]);
  useEffect(() => {
    if (open) ref.current?.scrollTo({ top: ref.current.scrollHeight });
  }, [text, open]);
  return (
    <div className="mb-2 max-w-[85%] rounded-xl border bg-fd-background/50 text-xs">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1.5 px-3 py-2 font-medium text-fd-muted-foreground"
      >
        <Brain className="size-3.5" />
        {live ? 'Thinking…' : 'Thoughts'}
        <ChevronRight className={'ml-auto size-3.5 transition-transform ' + (open ? 'rotate-90' : '')} />
      </button>
      {open && (
        <div ref={ref} className="max-h-40 overflow-y-auto whitespace-pre-wrap px-3 pb-2 text-fd-muted-foreground">
          {text}
        </div>
      )}
    </div>
  );
}
