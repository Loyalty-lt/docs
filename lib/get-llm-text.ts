import type { source } from './source';

// Convert a page into plain MDX text for LLM consumption. OpenAPI virtual pages
// have no processed markdown (no getText), so they yield just a heading.
export async function getLLMText(page: (typeof source)['$inferPage']): Promise<string> {
  const data = page.data as { title?: string; getText?: (m: 'processed') => Promise<string> };
  const body = typeof data.getText === 'function' ? await data.getText('processed') : '';
  return `# ${data.title ?? page.url} (${page.url})\n\n${body}`;
}
