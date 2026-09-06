// Runs once at server boot. Pre-warm the "Ask AI" docs embeddings so the first
// user isn't blocked on the cold embed (loads from .embed-cache.json if present,
// otherwise embeds the corpus in the background).
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.AI_API_KEY) {
    const { warm } = await import('@/lib/chat-retrieval');
    warm().catch(() => {});
  }
}
