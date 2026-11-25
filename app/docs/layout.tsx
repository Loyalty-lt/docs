import { source } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '@/lib/layout.shared';
import { AskAI } from '@/components/ask-ai';
import { DocsProvider } from '@/components/providers';

export default function Layout({ children }: LayoutProps<'/docs'>) {
  return (
    <DocsProvider>
      <DocsLayout tree={source.getPageTree()} {...baseOptions()}>
        {children}
        {/* Floating "Ask AI" trigger, per Fumadocs' AI integration pattern */}
        <AskAI />
      </DocsLayout>
    </DocsProvider>
  );
}
