import { Children, isValidElement, type ReactNode } from 'react';
import { Callout } from 'fumadocs-ui/components/callout';
import { Cards as FdCards } from 'fumadocs-ui/components/card';
import { Tabs as FdTabs, Tab as FdTab } from 'fumadocs-ui/components/tabs';
import { Steps as FdSteps, Step as FdStep } from 'fumadocs-ui/components/steps';
import { Accordion as FdAccordion, Accordions as FdAccordions } from 'fumadocs-ui/components/accordion';

/**
 * Thin aliases mapping the Mintlify components used across the imported guide
 * and SDK docs onto their Fumadocs equivalents, so the `.mdx` renders almost
 * verbatim. Mintlify-only props with no Fumadocs analog (icon strings, `cols`)
 * are intentionally dropped.
 */

// Callouts ------------------------------------------------------------------
export const Info = ({ children }: { children?: ReactNode }) => <Callout type="info">{children}</Callout>;
export const Note = ({ children }: { children?: ReactNode }) => <Callout type="info" title="Note">{children}</Callout>;
export const Tip = ({ children }: { children?: ReactNode }) => <Callout type="info" title="Tip">{children}</Callout>;
export const Warning = ({ children }: { children?: ReactNode }) => <Callout type="warn">{children}</Callout>;
export const Check = ({ children }: { children?: ReactNode }) => <Callout type="success">{children}</Callout>;

// Cards ---------------------------------------------------------------------
// Rendered as a plain bordered card (not a link wrapper) so link/code content
// in the body can't produce an invalid nested <a>. Only the title links.
export const Card = ({ title, href, children }: { title?: ReactNode; icon?: ReactNode; href?: string; children?: ReactNode }) => (
  <div className="rounded-xl border bg-fd-card p-4 not-prose">
    {title ? (
      <div className="mb-1 font-semibold">
        {href ? (
          <a href={href} className="text-fd-foreground no-underline hover:text-fd-primary">{title}</a>
        ) : (
          title
        )}
      </div>
    ) : null}
    <div className="text-sm text-fd-muted-foreground">{children}</div>
  </div>
);
export const CardGroup = ({ children }: { cols?: number; children?: ReactNode }) => <FdCards>{children}</FdCards>;

// Steps ---------------------------------------------------------------------
export const Steps = ({ children }: { children?: ReactNode }) => <FdSteps>{children}</FdSteps>;
export const Step = ({ title, children }: { title?: ReactNode; children?: ReactNode }) => (
  <FdStep>
    {title ? <p className="font-semibold m-0">{title}</p> : null}
    {children}
  </FdStep>
);

// Accordions ----------------------------------------------------------------
export const Accordion = ({ title, children }: { title?: string; children?: ReactNode }) => (
  <FdAccordion title={title ?? ''}>{children}</FdAccordion>
);
export const AccordionGroup = ({ children }: { children?: ReactNode }) => (
  <FdAccordions type="single" collapsible>{children}</FdAccordions>
);

// Tabs ----------------------------------------------------------------------
// Mintlify: <Tabs><Tab title="X">…</Tab></Tabs>. Fumadocs wants items[] + values.
export const Tab = ({ children }: { title?: string; children?: ReactNode }) => <>{children}</>;
export const Tabs = ({ children }: { children?: ReactNode }) => {
  const tabs = Children.toArray(children).filter(isValidElement) as Array<{ props: { title?: string; children?: ReactNode } }>;
  const items = tabs.map((t, i) => t.props.title ?? `Tab ${i + 1}`);
  return (
    <FdTabs items={items}>
      {tabs.map((t, i) => (
        <FdTab key={i} value={items[i]}>{t.props.children}</FdTab>
      ))}
    </FdTabs>
  );
};

// Code groups / API examples ------------------------------------------------
// Kept simple: stacked code blocks. Enough for the handful of guide pages.
export const CodeGroup = ({ children }: { children?: ReactNode }) => <div className="my-4 flex flex-col gap-2">{children}</div>;
export const RequestExample = ({ children }: { children?: ReactNode }) => <div className="my-4">{children}</div>;
export const ResponseExample = ({ children }: { children?: ReactNode }) => <div className="my-4">{children}</div>;
export const Frame = ({ children }: { children?: ReactNode }) => <div className="my-4">{children}</div>;
